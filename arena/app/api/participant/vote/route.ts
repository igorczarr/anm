import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { updateLiveStateAtomic } from "@/lib/live-state";
import { getParticipantSession, rateLimit } from "@/lib/participant";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  pollId: z.string().min(1).max(60),
  optionId: z.string().min(1).max(60),
  clientRequestId: z.string().max(80).optional(),
});

class VoteError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string
  ) {
    super(message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getParticipantSession();
    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Entre na Arena para votar.", code: "NO_SESSION" },
        { status: 401 }
      );
    }

    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Requisição inválida.", code: "BAD_REQUEST" },
        { status: 400 }
      );
    }
    const { pollId, optionId, clientRequestId } = parsed.data;

    if (!rateLimit(`v:${session.id}`, 25, 60 * 1000)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Muitas tentativas. Aguarde um instante.",
          code: "RATE_LIMIT",
        },
        { status: 429 }
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const poll = await tx.poll.findUnique({
          where: { id: pollId },
          include: { event: { select: { requireCredential: true } } },
        });
        if (!poll || poll.eventId !== session.eventId) {
          throw new VoteError("Votação não encontrada.", 404, "NOT_FOUND");
        }

        if (poll.event.requireCredential && !session.credentialCode) {
          throw new VoteError(
            "Informe seu código de credencial de check-in (ex.: ANM-001) para registrar o voto.",
            403,
            "CREDENTIAL_REQUIRED"
          );
        }

        if (poll.status !== "OPEN" && poll.status !== "TIE_BREAK") {
          throw new VoteError(
            "Votação encerrada. Confira o resultado no telão.",
            403,
            "POLL_CLOSED"
          );
        }

        const option = await tx.pollOption.findUnique({
          where: { id: optionId },
        });
        if (!option || option.pollId !== poll.id) {
          throw new VoteError("Alternativa inválida.", 400, "BAD_OPTION");
        }

        // Se estiver em rodada de desempate (TIE_BREAK), valida se a opção participa do desempate
        if (
          poll.status === "TIE_BREAK" &&
          poll.tieBreakOptionIds &&
          poll.tieBreakOptionIds.length > 0 &&
          !poll.tieBreakOptionIds.includes(option.id)
        ) {
          throw new VoteError(
            "Esta questão não está na rodada rápida de desempate.",
            400,
            "OPTION_NOT_IN_TIE_BREAK"
          );
        }

        const existing = await tx.vote.findUnique({
          where: { pollId_sessionId: { pollId, sessionId: session.id } },
        });

        let changed = false;
        let isUpdatedVote = false;

        if (existing) {
          if (existing.optionId !== optionId) {
            const previousOptionId = existing.optionId;
            await tx.vote.update({
              where: { id: existing.id },
              data: { optionId, clientRequestId: clientRequestId ?? null },
            });
            await tx.voteHistory.create({
              data: {
                pollId,
                sessionId: session.id,
                previousOptionId,
                newOptionId: optionId,
              },
            });
            changed = true;
            isUpdatedVote = true;
          }
        } else {
          await tx.vote.create({
            data: {
              pollId,
              optionId,
              sessionId: session.id,
              clientRequestId: clientRequestId ?? null,
            },
          });
          await tx.voteHistory.create({
            data: {
              pollId,
              sessionId: session.id,
              previousOptionId: null,
              newOptionId: optionId,
            },
          });
          changed = true;
        }

        // Recalcula contadores de maneira exata a partir da tabela Vote para evitar deriva
        if (changed) {
          const allOptions = await tx.pollOption.findMany({
            where: { pollId },
          });
          let total = 0;
          for (const opt of allOptions) {
            const count = await tx.vote.count({
              where: { pollId, optionId: opt.id },
            });
            total += count;
            await tx.pollOption.update({
              where: { id: opt.id },
              data: { votesCount: count },
            });
          }
          await tx.poll.update({
            where: { id: pollId },
            data: { totalVotes: total },
          });
        }

        return { changed, isUpdatedVote, eventId: poll.eventId };
      },
      { timeout: 15000, maxWait: 15000 }
    );

    if (result.changed) {
      await updateLiveStateAtomic(result.eventId, "poll.vote_received", {});
    }

    return NextResponse.json({
      ok: true,
      changed: result.changed,
      updated: result.isUpdatedVote,
    });
  } catch (error) {
    if (error instanceof VoteError) {
      return NextResponse.json(
        { ok: false, error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error("POST /api/participant/vote:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Seu voto não foi registrado. Tente novamente.",
        code: "SERVER",
      },
      { status: 500 }
    );
  }
}
