import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getPrimaryEvent } from "@/lib/live-state";
import {
  createParticipantSession,
  getClientIp,
  getParticipantSession,
  rateLimit,
} from "@/lib/participant";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome completo").max(100),
  email: z.string().trim().email("Informe um e-mail válido").max(120),
  credentialCode: z.string().trim().max(40).optional(),
});

/**
 * Cria ou atualiza a sessão do participante, validando nome e e-mail
 * para vincular e rastrear cada interação, além de vincular credencial de check-in se informada.
 */
export async function POST(req: NextRequest) {
  try {
    const event = await getPrimaryEvent();
    if (!event) {
      return NextResponse.json(
        { ok: false, error: "Evento indisponível no momento." },
        { status: 503 }
      );
    }

    const rawBody = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(rawBody);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Dados de identificação inválidos.";
      return NextResponse.json(
        { ok: false, error: firstError, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { name, email } = parsed.data;
    const explicitCredential = parsed.data.credentialCode?.trim().toUpperCase();

    const ip = await getClientIp();
    if (!rateLimit(`session:${ip}`, 30, 10 * 60 * 1000)) {
      return NextResponse.json(
        { ok: false, error: "Muitas tentativas. Aguarde alguns instantes." },
        { status: 429 }
      );
    }

    let session = await getParticipantSession();

    if (!session || session.eventId !== event.id) {
      session = await createParticipantSession(event.id, { name, email });
    } else {
      session = await prisma.participantSession.update({
        where: { id: session.id },
        data: {
          name,
          email: email.toLowerCase(),
          lastSeenAt: new Date(),
          isConnected: true,
        },
      });
    }

    // Se o usuário informou explicitamente uma credencial, valida e vincula
    if (explicitCredential) {
      const cred = await prisma.participantCredential.findUnique({
        where: {
          eventId_code: {
            eventId: event.id,
            code: explicitCredential,
          },
        },
      });

      if (!cred) {
        return NextResponse.json(
          {
            ok: false,
            error: `Código de credencial "${explicitCredential}" não encontrado para este evento.`,
            code: "INVALID_CREDENTIAL",
          },
          { status: 400 }
        );
      }

      if (cred.isUsed && cred.sessionId && cred.sessionId !== session.id) {
        return NextResponse.json(
          {
            ok: false,
            error: `A credencial "${explicitCredential}" já está vinculada a outro dispositivo ativo.`,
            code: "CREDENTIAL_IN_USE",
          },
          { status: 409 }
        );
      }

      await prisma.$transaction([
        prisma.participantCredential.updateMany({
          where: { sessionId: session.id, id: { not: cred.id } },
          data: { isUsed: false, sessionId: null, validatedAt: null },
        }),
        prisma.participantCredential.update({
          where: { id: cred.id },
          data: {
            isUsed: true,
            sessionId: session.id,
            validatedAt: new Date(),
          },
        }),
        prisma.participantSession.update({
          where: { id: session.id },
          data: {
            credentialCode: cred.code,
            lastSeenAt: new Date(),
            isConnected: true,
          },
        }),
      ]);

      return NextResponse.json({
        ok: true,
        code: session.anonymousCode,
        name: session.name,
        email: session.email,
        credentialCode: cred.code,
      });
    }

    // Se o participante ainda não possui credencial atribuída, gera ou aloca automaticamente
    let assignedCredential = session.credentialCode;
    if (!assignedCredential) {
      // 1. Tentar alocar uma credencial livre pré-cadastrada
      const availableCred = await prisma.participantCredential.findFirst({
        where: { eventId: event.id, isUsed: false },
        orderBy: { createdAt: "asc" },
      });

      if (availableCred) {
        await prisma.$transaction([
          prisma.participantCredential.update({
            where: { id: availableCred.id },
            data: {
              isUsed: true,
              sessionId: session.id,
              validatedAt: new Date(),
            },
          }),
          prisma.participantSession.update({
            where: { id: session.id },
            data: { credentialCode: availableCred.code },
          }),
        ]);
        assignedCredential = availableCred.code;
      } else {
        // 2. Gerar credencial aleatória única (ex: ANM-742)
        let generatedCode = "";
        for (let i = 0; i < 10; i++) {
          const candidate = `ANM-${Math.floor(100 + Math.random() * 900)}`;
          const exists = await prisma.participantCredential.findUnique({
            where: { eventId_code: { eventId: event.id, code: candidate } },
          });
          if (!exists) {
            generatedCode = candidate;
            break;
          }
        }
        if (!generatedCode) {
          generatedCode = `ANM-${Date.now().toString().slice(-4)}`;
        }

        await prisma.$transaction([
          prisma.participantCredential.create({
            data: {
              eventId: event.id,
              code: generatedCode,
              label: `Credencial Automática ${generatedCode}`,
              isUsed: true,
              sessionId: session.id,
              validatedAt: new Date(),
            },
          }),
          prisma.participantSession.update({
            where: { id: session.id },
            data: { credentialCode: generatedCode },
          }),
        ]);
        assignedCredential = generatedCode;
      }
    }

    return NextResponse.json({
      ok: true,
      code: session.anonymousCode,
      name: session.name,
      email: session.email,
      credentialCode: assignedCredential,
    });
  } catch (error) {
    console.error("POST /api/participant/session:", error);
    return NextResponse.json(
      { ok: false, error: "Não foi possível entrar agora. Tente novamente." },
      { status: 500 }
    );
  }
}
