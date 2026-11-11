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

const CreateBodySchema = z.object({
  text: z.string(),
  clientRequestId: z.string().min(8).max(80),
  topicId: z.string().optional(),
  questionId: z.string().optional(),
});

const EditBodySchema = z.object({
  questionId: z.string().min(1),
  text: z.string(),
});

function fail(message: string, status: number, code: string) {
  return NextResponse.json({ ok: false, error: message, code }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getParticipantSession();
    if (!session)
      return fail("Entre na Arena para enviar perguntas.", 401, "NO_SESSION");

    const parsed = CreateBodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success)
      return fail("Requisição inválida.", 400, "BAD_REQUEST");

    const { clientRequestId, questionId } = parsed.data;

    // Idempotência (§14.3): se o servidor já registrou, devolve a mesma pergunta sem duplicar.
    const already = await prisma.question.findUnique({
      where: { clientRequestId },
    });
    if (already) {
      if (already.sessionId !== session.id)
        return fail("Requisição inválida.", 400, "BAD_REQUEST");
      return NextResponse.json({ ok: true, id: already.id, duplicate: true });
    }

    if (!rateLimit(`q:${session.id}`, 12, 60 * 1000)) {
      return fail(
        "Muitos envios seguidos. Aguarde um instante.",
        429,
        "RATE_LIMIT"
      );
    }

    const event = await getPrimaryEvent();
    const ls = event?.liveState;
    if (!event || !ls) return fail("Evento indisponível.", 503, "UNAVAILABLE");

    if (event.requireCredential && !session.credentialCode) {
      return fail(
        "Valide seu código de credencial de check-in (ex.: ANM-001) para enviar perguntas.",
        403,
        "CREDENTIAL_REQUIRED"
      );
    }

    // No formato v2.0, o envio e a edição ocorrem durante a Exposição de 15 min da pauta ativa
    if (!ls.questionsOpen && ls.status === "LIVE") {
      return fail(
        "O recebimento e a edição de perguntas desta pauta já foram encerrados (a fase de Exposição terminou).",
        403,
        "QUESTIONS_CLOSED"
      );
    }

    // Associa automaticamente à pauta ativa (ou à Pauta 1 se em espera/ensaio)
    let topicId = ls.activeTopicId || parsed.data.topicId || null;
    if (!topicId) {
      const firstTopic = await prisma.topic.findFirst({
        where: { eventId: event.id },
        orderBy: { number: "asc" },
      });
      topicId = firstTopic?.id ?? null;
    }

    if (!topicId) {
      return fail(
        "Nenhuma pauta disponível para associar a pergunta.",
        400,
        "NO_TOPIC"
      );
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

    // Verifica se o participante já possui pergunta nesta pauta (v2.0: 1 pergunta ativa editável por pauta)
    const existingForTopic = await prisma.question.findFirst({
      where: {
        sessionId: session.id,
        topicId,
        isMediationReserve: false,
      },
      orderBy: { createdAt: "desc" },
    });

    if (
      (questionId || existingForTopic) &&
      existingForTopic &&
      (!questionId || existingForTopic.id === questionId) &&
      event.maxQuestionsPerTopic <= 1
    ) {
      const lockedStatuses = [
        "SELECTED",
        "DISPLAYED",
        "ANSWERED",
        "REJECTED",
        "DUPLICATE",
      ];
      if (
        existingForTopic.isPrimary ||
        lockedStatuses.includes(existingForTopic.status)
      ) {
        return fail(
          "Sua pergunta já foi processada ou selecionada pela moderação e não pode mais ser alterada.",
          403,
          "QUESTION_LOCKED"
        );
      }

      const updated = await prisma.question.update({
        where: { id: existingForTopic.id },
        data: {
          text,
          editCount: { increment: 1 },
          history: {
            create: {
              fromStatus: existingForTopic.status,
              toStatus: existingForTopic.status,
              note: "Pergunta editada pelo participante durante a exposição",
            },
          },
        },
      });

      await updateLiveStateAtomic(event.id, "question.edited", {});

      return NextResponse.json({
        ok: true,
        id: updated.id,
        edited: true,
        editCount: updated.editCount,
      });
    }

    const [usedCount, last] = await Promise.all([
      prisma.question.count({
        where: { sessionId: session.id, topicId, isMediationReserve: false },
      }),
      prisma.question.findFirst({
        where: { sessionId: session.id, isMediationReserve: false },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    if (usedCount >= event.maxQuestionsPerTopic) {
      return fail(
        `Você já enviou sua pergunta para esta pauta. Você pode editá-la enquanto ela não for selecionada pela moderação.`,
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

      return NextResponse.json({ ok: true, id: created.id, edited: false });
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

/**
 * Edita a pergunta ativa do participante na pauta em andamento,
 * desde que a fase de Exposição esteja aberta e a pergunta ainda não tenha sido selecionada.
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getParticipantSession();
    if (!session)
      return fail("Entre na Arena para editar sua pergunta.", 401, "NO_SESSION");

    const parsed = EditBodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success)
      return fail("Requisição inválida.", 400, "BAD_REQUEST");

    if (!rateLimit(`qe:${session.id}`, 15, 60 * 1000)) {
      return fail(
        "Muitas edições seguidas. Aguarde um instante.",
        429,
        "RATE_LIMIT"
      );
    }

    const event = await getPrimaryEvent();
    const ls = event?.liveState;
    if (!event || !ls) return fail("Evento indisponível.", 503, "UNAVAILABLE");

    if (!ls.questionsOpen && ls.status === "LIVE") {
      return fail(
        "A fase de exposição encerrou; não é mais possível editar a pergunta.",
        403,
        "QUESTIONS_CLOSED"
      );
    }

    const existing = await prisma.question.findUnique({
      where: { id: parsed.data.questionId },
    });

    if (!existing || existing.sessionId !== session.id) {
      return fail("Pergunta não encontrada.", 404, "NOT_FOUND");
    }

    const lockedStatuses = [
      "SELECTED",
      "DISPLAYED",
      "ANSWERED",
      "REJECTED",
      "DUPLICATE",
    ];
    if (existing.isPrimary || lockedStatuses.includes(existing.status)) {
      return fail(
        "Sua pergunta já foi selecionada pela moderação para resposta e está bloqueada para edição.",
        403,
        "QUESTION_LOCKED"
      );
    }

    const text = sanitizeQuestionText(parsed.data.text);
    if (text.length === 0)
      return fail("O texto da pergunta não pode ficar vazio.", 400, "EMPTY");
    if (text.length > event.questionCharLimit) {
      return fail(
        `A pergunta excede o limite de ${event.questionCharLimit} caracteres.`,
        400,
        "TOO_LONG"
      );
    }

    const updated = await prisma.question.update({
      where: { id: existing.id },
      data: {
        text,
        editCount: { increment: 1 },
        history: {
          create: {
            fromStatus: existing.status,
            toStatus: existing.status,
            note: "Pergunta editada pelo participante durante a exposição",
          },
        },
      },
    });

    await updateLiveStateAtomic(event.id, "question.edited", {});

    return NextResponse.json({
      ok: true,
      id: updated.id,
      edited: true,
      editCount: updated.editCount,
    });
  } catch (error) {
    console.error("PUT /api/participant/question:", error);
    return fail(
      "Não foi possível salvar a edição da sua pergunta.",
      500,
      "SERVER"
    );
  }
}
