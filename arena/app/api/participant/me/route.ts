import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPrimaryEvent } from "@/lib/live-state";
import { getParticipantSession, toPublicQuestionStatus } from "@/lib/participant";

export const dynamic = "force-dynamic";

/** Participações do próprio dispositivo: perguntas (com status público), voto(s) e cota. */
export async function GET() {
  try {
    const session = await getParticipantSession();
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const event = await getPrimaryEvent();
    let topicId = event?.liveState?.activeTopicId ?? null;
    if (!topicId && event) {
      const firstTopic = await prisma.topic.findFirst({
        where: { eventId: event.id },
        orderBy: { number: "asc" },
      });
      topicId = firstTopic?.id ?? null;
    }

    const [questions, votes, usedOnActiveTopic] = await Promise.all([
      prisma.question.findMany({
        where: { sessionId: session.id },
        include: { topic: { select: { number: true, title: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.vote.findMany({
        where: { sessionId: session.id },
        include: {
          poll: { select: { number: true, status: true, question: true } },
          option: { select: { label: true, optionOrder: true } },
        },
      }),
      topicId
        ? prisma.question.count({
            where: { sessionId: session.id, topicId },
          })
        : Promise.resolve(0),
      prisma.participantSession.update({
        where: { id: session.id },
        data: { lastSeenAt: new Date(), isConnected: true },
      }),
    ]);

    // Atualiza pico de conexões simultâneas se aplicável (§15.1)
    if (event) {
      const activeCutoff = new Date(Date.now() - 1000 * 60 * 3);
      const currentActive = await prisma.participantSession.count({
        where: { eventId: event.id, lastSeenAt: { gte: activeCutoff } },
      });
      if (currentActive > event.peakConnections) {
        await prisma.event.update({
          where: { id: event.id },
          data: { peakConnections: currentActive },
        });
      }
    }

    return NextResponse.json(
      {
        authenticated: true,
        code: session.anonymousCode,
        questions: questions.map((q) => ({
          id: q.id,
          text: q.text,
          topicNumber: q.topic.number,
          topicTitle: q.topic.title,
          status: toPublicQuestionStatus(q.status),
          createdAt: q.createdAt,
        })),
        votes: votes.map((v) => ({
          pollId: v.pollId,
          pollNumber: v.poll.number,
          pollQuestion: v.poll.question,
          pollStatus: v.poll.status,
          optionId: v.optionId,
          optionLabel: v.option.label,
          optionOrder: v.option.optionOrder,
        })),
        quota: {
          topicId,
          used: usedOnActiveTopic,
          max: event?.maxQuestionsPerTopic ?? 2,
          charLimit: event?.questionCharLimit ?? 400,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("GET /api/participant/me:", error);
    return NextResponse.json(
      { error: "Falha ao consultar participações." },
      { status: 500 }
    );
  }
}
