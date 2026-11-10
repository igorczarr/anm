import { prisma } from "@/lib/prisma";
import { getPrimaryEvent } from "@/lib/live-state";
import { formatSecondsMMSS } from "@/lib/events";

export interface ConsolidatedTopicReport {
  number: number;
  title: string;
  speakerName: string;
  provokerLabel: string;
  plannedDurationSec: number;
  actualDurationSec: number;
  expositionDurationSec: number;
  questionsReceived: number;
  questionsApproved: number;
  questionsAnswered: number;
  totalVotes: number;
  pollQuestion: string;
  optionsDistribution: Array<{
    order: number;
    label: string;
    votesCount: number;
    percentage: number;
  }>;
}

export interface ConsolidatedEventReport {
  eventId: string;
  name: string;
  theme: string;
  institution: string;
  scheduledStartAt: string | null;
  actualStartAt: string | null;
  actualEndAt: string | null;
  durationPlannedMin: number;
  durationActualMin: number;
  totalSessionsCount: number;
  peakConnections: number;
  questionsTotal: number;
  questionsApproved: number;
  questionsSelected: number;
  questionsAnswered: number;
  totalVotes: number;
  topics: ConsolidatedTopicReport[];
}

export async function getConsolidatedEventReport(): Promise<ConsolidatedEventReport | null> {
  const event = await getPrimaryEvent();
  if (!event) return null;

  const [
    topics,
    polls,
    questions,
    totalSessions,
    operationalSteps,
  ] = await Promise.all([
    prisma.topic.findMany({
      where: { eventId: event.id },
      include: {
        mainSpeaker: true,
        provoker: true,
      },
      orderBy: { number: "asc" },
    }),
    prisma.poll.findMany({
      where: { eventId: event.id },
      include: {
        options: { orderBy: { optionOrder: "asc" } },
      },
      orderBy: { number: "asc" },
    }),
    prisma.question.findMany({
      where: { eventId: event.id },
      select: {
        id: true,
        topicId: true,
        status: true,
        isPrimary: true,
        isReserve: true,
      },
    }),
    prisma.participantSession.count({ where: { eventId: event.id } }),
    prisma.scheduleStep.findMany({
      where: { eventId: event.id, isMacroBlock: false },
      select: {
        id: true,
        topicId: true,
        stepType: true,
        durationSec: true,
        actualDurationSec: true,
      },
    }),
  ]);

  // Cálculo de duração efetiva global
  const totalActualOpSec = operationalSteps.reduce(
    (acc, s) => acc + (s.actualDurationSec || s.durationSec),
    0
  );
  const actualDurationMin = Math.round(totalActualOpSec / 60);

  const questionsApprovedCount = questions.filter((q) =>
    ["APPROVED", "SELECTED", "DISPLAYED", "ANSWERED"].includes(q.status)
  ).length;

  const questionsSelectedCount = questions.filter(
    (q) => q.isPrimary || q.isReserve || ["SELECTED", "DISPLAYED"].includes(q.status)
  ).length;

  const questionsAnsweredCount = questions.filter(
    (q) => q.status === "ANSWERED"
  ).length;

  const totalVotesCount = polls.reduce((acc, p) => acc + p.totalVotes, 0);

  const topicsReport: ConsolidatedTopicReport[] = topics.map((t) => {
    const topicQuestions = questions.filter((q) => q.topicId === t.id);
    const topicSteps = operationalSteps.filter((s) => s.topicId === t.id);

    const topicPlannedSec = topicSteps.reduce((acc, s) => acc + s.durationSec, 0) || t.durationSec;
    const topicActualSec = topicSteps.reduce(
      (acc, s) => acc + (s.actualDurationSec || s.durationSec),
      0
    );

    const expositionStep = topicSteps.find((s) => s.stepType === "EXPOSITION");
    const expositionActualSec = expositionStep?.actualDurationSec || expositionStep?.durationSec || 600;

    const poll = polls.find((p) => p.topicId === t.id);

    return {
      number: t.number,
      title: t.title,
      speakerName: t.mainSpeaker.name,
      provokerLabel: t.provokerLabel,
      plannedDurationSec: topicPlannedSec,
      actualDurationSec: topicActualSec,
      expositionDurationSec: expositionActualSec,
      questionsReceived: topicQuestions.length,
      questionsApproved: topicQuestions.filter((q) =>
        ["APPROVED", "SELECTED", "DISPLAYED", "ANSWERED"].includes(q.status)
      ).length,
      questionsAnswered: topicQuestions.filter((q) => q.status === "ANSWERED").length,
      totalVotes: poll?.totalVotes ?? 0,
      pollQuestion: poll?.question ?? "—",
      optionsDistribution: (poll?.options || []).map((opt) => ({
        order: opt.optionOrder,
        label: opt.label,
        votesCount: opt.votesCount,
        percentage:
          (poll?.totalVotes ?? 0) > 0
            ? Math.round((opt.votesCount / poll!.totalVotes) * 1000) / 10
            : 0,
      })),
    };
  });

  return {
    eventId: event.id,
    name: event.name,
    theme: event.theme,
    institution: event.institution,
    scheduledStartAt: event.scheduledStartAt ? event.scheduledStartAt.toISOString() : null,
    actualStartAt: event.actualStartAt ? event.actualStartAt.toISOString() : null,
    actualEndAt: event.actualEndAt ? event.actualEndAt.toISOString() : null,
    durationPlannedMin: event.programmedDurationMin,
    durationActualMin: actualDurationMin,
    totalSessionsCount: totalSessions,
    peakConnections: Math.max(event.peakConnections, totalSessions),
    questionsTotal: questions.length,
    questionsApproved: questionsApprovedCount,
    questionsSelected: questionsSelectedCount,
    questionsAnswered: questionsAnsweredCount,
    totalVotes: totalVotesCount,
    topics: topicsReport,
  };
}
