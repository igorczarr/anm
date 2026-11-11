import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedAdmin } from "@/lib/session";
import { getPrimaryEvent } from "@/lib/live-state";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const event = await getPrimaryEvent();
  if (!event) {
    return NextResponse.json(
      { error: "Evento não encontrado" },
      { status: 404 }
    );
  }

  const [topics, questions, polls, voteHistoryCount] = await Promise.all([
    prisma.topic.findMany({
      where: { eventId: event.id },
      include: { mainSpeaker: true, provoker: true },
      orderBy: { number: "asc" },
    }),
    prisma.question.findMany({
      where: { eventId: event.id },
      include: {
        topic: { select: { id: true, number: true, title: true } },
        session: { select: { anonymousCode: true, credentialCode: true } },
        moderatedBy: { select: { fullName: true } },
        history: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.poll.findMany({
      where: { eventId: event.id },
      include: {
        topic: { include: { mainSpeaker: true } },
        options: { orderBy: { optionOrder: "asc" } },
      },
      orderBy: { number: "asc" },
    }),
    prisma.voteHistory.count({
      where: { poll: { eventId: event.id } },
    }),
  ]);

  return NextResponse.json(
    {
      seq: event.liveState?.seq ?? 1,
      activeTopicId: event.liveState?.activeTopicId ?? null,
      selectedQuestionId: event.liveState?.selectedQuestionId ?? null,
      questionsOpen: event.liveState?.questionsOpen ?? false,
      voteHistoryCount,
      topics,
      questions,
      polls,
    },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}
