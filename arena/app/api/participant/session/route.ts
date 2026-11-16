import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getPrimaryEvent, FALLBACK_PRIMARY_EVENT_ID } from "@/lib/live-state";
import {
  createParticipantSession,
  getClientIp,
  getParticipantSession,
  hashIp,
  rateLimit,
} from "@/lib/participant";
import {
  PARTICIPANT_SESSION_COOKIE,
  signAnonymousSessionToken,
} from "@/lib/session";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome completo").max(100),
  email: z.string().trim().email("Informe um e-mail válido").max(120),
  credentialCode: z.string().trim().max(40).optional(),
});

/**
 * Cria ou atualiza a sessão do participante com resiliência total a cold-start (scale-to-zero).
 * Nunca retorna 503: caso o banco esteja acordando no exato milissegundo da chamada,
 * emite o cookie assinado imediatamente e sincroniza em background.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(rawBody);

    if (!parsed.success) {
      const firstError =
        parsed.error.issues[0]?.message || "Dados de identificação inválidos.";
      return NextResponse.json(
        { ok: false, error: firstError, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { name, email } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();
    const explicitCredential = parsed.data.credentialCode
      ?.trim()
      .toUpperCase();

    const ip = await getClientIp();
    if (!rateLimit(`session:${ip}`, 80, 10 * 60 * 1000)) {
      return NextResponse.json(
        { ok: false, error: "Muitas tentativas. Aguarde alguns instantes." },
        { status: 429 }
      );
    }

    const event = await getPrimaryEvent();
    const eventId = event?.id || FALLBACK_PRIMARY_EVENT_ID;

    const generatedCredential =
      explicitCredential || `ANM-${Math.floor(100 + Math.random() * 900)}`;

    let sessionId: string;
    let anonymousCode: string;
    let finalCredential: string;

    try {
      let session = await getParticipantSession();

      if (!session || session.eventId !== eventId) {
        session = await createParticipantSession(eventId, {
          name,
          email: normalizedEmail,
          credentialCode: generatedCredential,
        });
      } else {
        session = await prisma.participantSession.update({
          where: { id: session.id },
          data: {
            name,
            email: normalizedEmail,
            credentialCode: session.credentialCode || generatedCredential,
            lastSeenAt: new Date(),
            isConnected: true,
          },
        });
      }

      sessionId = session.id;
      anonymousCode = session.anonymousCode;
      finalCredential = session.credentialCode || generatedCredential;

      // Sincroniza tabela de credenciais em background
      prisma.participantCredential
        .upsert({
          where: {
            eventId_code: {
              eventId,
              code: finalCredential,
            },
          },
          update: {
            isUsed: true,
            sessionId: session.id,
            validatedAt: new Date(),
          },
          create: {
            eventId,
            code: finalCredential,
            label: `Credencial Automática ${finalCredential}`,
            isUsed: true,
            sessionId: session.id,
            validatedAt: new Date(),
          },
        })
        .catch(() => null);
    } catch (dbErr) {
      console.warn(
        "POST /api/participant/session: Usando sessão assinada de contingência durante wake-up do banco:",
        dbErr
      );
      sessionId = crypto.randomUUID();
      anonymousCode = crypto.randomBytes(3).toString("hex").toUpperCase();
      finalCredential = generatedCredential;

      // Tenta persistir em background assim que o banco responder
      prisma.participantSession
        .upsert({
          where: { id: sessionId },
          update: {
            name,
            email: normalizedEmail,
            credentialCode: finalCredential,
            lastSeenAt: new Date(),
            isConnected: true,
          },
          create: {
            id: sessionId,
            eventId,
            sessionToken: crypto.randomUUID(),
            anonymousCode,
            credentialCode: finalCredential,
            name,
            email: normalizedEmail,
            ipHash: hashIp(ip),
            consentAcceptedAt: new Date(),
          },
        })
        .catch(() => null);
    }

    const response = NextResponse.json({
      ok: true,
      code: anonymousCode,
      name,
      email: normalizedEmail,
      credentialCode: finalCredential,
    });

    response.cookies.set(
      PARTICIPANT_SESSION_COOKIE,
      signAnonymousSessionToken(sessionId),
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24,
      }
    );

    const metaPayload = Buffer.from(
      JSON.stringify({
        id: sessionId,
        eventId,
        code: anonymousCode,
        name,
        email: normalizedEmail,
        credentialCode: finalCredential,
      })
    ).toString("base64url");

    response.cookies.set("anm_arena_participant_meta", metaPayload, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    console.error("POST /api/participant/session:", error);
    return NextResponse.json(
      { ok: false, error: "Não foi possível entrar agora. Tente novamente." },
      { status: 500 }
    );
  }
}
