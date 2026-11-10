import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPrimaryEvent, updateLiveStateAtomic } from "@/lib/live-state";
import {
  getParticipantSession,
  rateLimit,
  sanitizeQuestionText,
} from "@/lib/participant";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  text: z.string(),
  clientRequestId: z.string().min(8).max(80),
  topicId: z.string().optional(),
});

function fail(message: string, status: number, code: string) {
  return NextResponse.json({ ok: false, error: message, code }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getParticipantSession();
    if (!session)
      return fail("Entre na Arena para enviar perguntas.", 401, "NO_SESSION");

    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success)
      return fail("Requisição inválida.", 400, "BAD_REQUEST");

    const { clientRequestId } = parsed.data;

    // Idempotência (§14.3): se o servidor já registrou, devolve a mesma pergunta sem duplicar.
    const already = await prisma.question.findUnique({
      where: { clientRequestId },
    });
    if (already) {
      if (already.sessionId !== session.id)
        return fail("Requisição inválida.", 400, "BAD_REQUEST");
      return NextResponse.json({ ok: true, id: already.id, duplicate: true });
    }

    if (!rateLimit(`q:${session.id}`, 8, 60 * 1000)) {
      return fail(
        "Muitos envios seguidos. Aguarde um instante.",
        429,
        "RATE_LIMIT"
      );
    }

    const event = await getPrimaryEvent();
    const ls = event?.liveState;
    if (!event || !ls) return fail("Evento indisponível.", 503, "UNAVAILABLE");

    // Se questionsOpen estiver fechado no momento e não houver pauta selecionada
    if (!ls.questionsOpen && ls.status === "LIVE") {
      return fail(
        "O recebimento de perguntas para esta rodada já foi encerrado.",
        403,
        "QUESTIONS_CLOSED"
      );
    }

    // Associa automaticamente à pauta ativa (ou à Pauta 1 se estiver na abertura/espera e captação liberada)
    let topicId = ls.activeTopicId || parsed.data.topicId || null;
    if (!topicId) {
      const firstTopic = await prisma.topic.findFirst({
        where: { eventId: event.id },
        orderBy: { number: "asc" },
      });
      topicId = firstTopic?.id ?? null;
    }

    if (!topicId) {
      return fail("Nenhuma pauta disponível para associar a pergunta.", 400, "NO_TOPIC");
    }

    const text = sanitizeQuestionText(parsed.data.text);
    if (text.length === 0)
      return fail("Escreva sua pergunta antes de enviar.", 400, "EMPTY");
    if (text.length > event.questionCharLimit) {
      return fail(
        `A pergunta excede o limite de ${event.questionCharLimit} caracteres.`,
        400,
        "TOO_LONG"
      );
    }

    const [usedCount, last] = await Promise.all([
      prisma.question.count({ where: { sessionId: session.id, topicId } }),
      prisma.question.findFirst({
        where: { sessionId: session.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    if (usedCount >= event.maxQuestionsPerTopic) {
      return fail(
        `Você já enviou o limite de ${event.maxQuestionsPerTopic} pergunta(s) nesta pauta.`,
        403,
        "QUOTA"
      );
    }

    if (last) {
      const waitMs =
        event.minQuestionIntervalSec * 1000 -
        (Date.now() - last.createdAt.getTime());
      if (waitMs > 0) {
        return fail(
          `Aguarde ${Math.ceil(waitMs / 1000)}s antes de enviar outra pergunta.`,
          429,
          "INTERVAL"
        );
      }
    }

    try {
      const created = await prisma.question.create({
        data: {
          eventId: event.id,
          topicId,
          sessionId: session.id,
          clientRequestId,
          text,
          status: "RECEIVED",
          history: {
            create: {
              fromStatus: null,
              toStatus: "RECEIVED",
              note: "Recebida do participante via QR Code",
            },
          },
        },
      });

      await updateLiveStateAtomic(event.id, "question.received", {});

      return NextResponse.json({ ok: true, id: created.id });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002"
      ) {
        const dup = await prisma.question.findUnique({
          where: { clientRequestId },
        });
        if (dup && dup.sessionId === session.id) {
          return NextResponse.json({ ok: true, id: dup.id, duplicate: true });
        }
      }
      throw e;
    }
  } catch (error) {
    console.error("POST /api/participant/question:", error);
    return fail(
      "Não foi possível registrar sua pergunta. Tente novamente.",
      500,
      "SERVER"
    );
  }
}
