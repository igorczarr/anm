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
 * para vincular e rastrear cada interação, atribuindo credencial automaticamente.
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
    const explicitCredential = parsed.data.credentialCode
      ?.trim()
      .toUpperCase();

    const ip = await getClientIp();
    if (!rateLimit(`session:${ip}`, 50, 10 * 60 * 1000)) {
      return NextResponse.json(
        { ok: false, error: "Muitas tentativas. Aguarde alguns instantes." },
        { status: 429 }
      );
    }

    const event = await getPrimaryEvent();
    if (!event) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Conexão com o banco de dados em inicialização. Tente novamente em alguns segundos.",
        },
        { status: 503 }
      );
    }

    let session = await getParticipantSession();
    const generatedCredential =
      explicitCredential ||
      session?.credentialCode ||
      `ANM-${Math.floor(100 + Math.random() * 900)}`;

    if (!session || session.eventId !== event.id) {
      session = await createParticipantSession(event.id, {
        name,
        email,
        credentialCode: generatedCredential,
      });
    } else {
      session = await prisma.participantSession.update({
        where: { id: session.id },
        data: {
          name,
          email: email.toLowerCase(),
          credentialCode: session.credentialCode || generatedCredential,
          lastSeenAt: new Date(),
          isConnected: true,
        },
      });
    }

    const finalCredential = session.credentialCode || generatedCredential;

    // Registra a credencial em background sem bloquear a resposta do participante
    prisma.participantCredential
      .upsert({
        where: {
          eventId_code: {
            eventId: event.id,
            code: finalCredential,
          },
        },
        update: {
          isUsed: true,
          sessionId: session.id,
          validatedAt: new Date(),
        },
        create: {
          eventId: event.id,
          code: finalCredential,
          label: `Credencial Automática ${finalCredential}`,
          isUsed: true,
          sessionId: session.id,
          validatedAt: new Date(),
        },
      })
      .catch(() => null);

    return NextResponse.json({
      ok: true,
      code: session.anonymousCode,
      name: session.name,
      email: session.email,
      credentialCode: finalCredential,
    });
  } catch (error) {
    console.error("POST /api/participant/session:", error);
    return NextResponse.json(
      { ok: false, error: "Não foi possível entrar agora. Tente novamente." },
      { status: 500 }
    );
  }
}
