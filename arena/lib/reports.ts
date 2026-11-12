import { prisma } from "@/lib/prisma";
import { getPrimaryEvent } from "@/lib/live-state";

export interface ConsolidatedTopicReport {
  number: number;
  title: string;
  speakerName: string;
  provokerLabel: string;
  plannedDurationSec: number;
  actualDurationSec: number;
  expositionDurationSec: number;
  qaDurationSec: number;
  questionsReceived: number;
  questionsApproved: number;
  questionsAnswered: number;
  answeredQuestionText: string | null;
  answeredQuestionOrigin: "Plateia" | "Mediação" | null;
  answeredQuestionModerator: string | null;
  totalVotes: number;
  pollQuestion: string;
  optionsDistribution: Array<{
    order: number;
    themeLabel: string;
    label: string;
    votesCount: number;
    percentage: number;
    isWinner: boolean;
  }>;
}

export interface ConsolidatedRoundtableReport {
  pollId: string | null;
  question: string;
  status: string;
  totalVotes: number;
  voteChangesCount: number;
  isTieBreak: boolean;
  tieBreakJustification: string | null;
  winningOptionId: string | null;
  winningQuestionText: string | null;
  options: Array<{
    order: number;
    themeLabel: string;
    label: string;
    votesCount: number;
    percentage: number;
    isWinner: boolean;
  }>;
}

export interface ConsolidatedAuditItem {
  id: string;
  action: string;
  entityType: string;
  userName: string;
  justification: string | null;
  createdAt: string;
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
  certifiedHours: number;
  totalSessionsCount: number;
  validatedCredentialsCount: number;
  peakConnections: number;
  questionsTotal: number;
  questionsApproved: number;
  questionsSelected: number;
  questionsAnswered: number;
  mediationReserveUsedCount: number;
  totalVotes: number;
  voteChangesCount: number;
  roundtablePoll: ConsolidatedRoundtableReport;
  topics: ConsolidatedTopicReport[];
  justifiedAuditLogs: ConsolidatedAuditItem[];
}

export async function getConsolidatedEventReport(): Promise<ConsolidatedEventReport | null> {
  const event = await getPrimaryEvent();
  if (!event) return null;

  const [
    topics,
    polls,
    questions,
    totalSessions,
    validatedCredentialsCount,
    voteChangesCount,
    operationalSteps,
    justifiedLogs,
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
      include: {
        moderatedBy: { select: { fullName: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.participantSession.count({ where: { eventId: event.id } }),
    prisma.participantCredential.count({
      where: { eventId: event.id, isUsed: true },
    }),
    prisma.voteHistory.count({
      where: { poll: { eventId: event.id }, previousOptionId: { not: null } },
    }),
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
    prisma.auditLog.findMany({
      where: {
        eventId: event.id,
        justification: { not: null },
      },
      include: {
        user: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
  ]);

  // Cálculo de duração efetiva global
  const totalActualOpSec = operationalSteps.reduce(
    (acc, s) => acc + (s.actualDurationSec || s.durationSec),
    0
  );
  const actualDurationMin = Math.round(totalActualOpSec / 60);

  const audienceQuestions = questions.filter((q) => !q.isMediationReserve);

  const questionsApprovedCount = audienceQuestions.filter((q) =>
    ["APPROVED", "SELECTED", "DISPLAYED", "ANSWERED"].includes(q.status)
  ).length;

  const questionsSelectedCount = questions.filter(
    (q) =>
      q.isPrimary || ["SELECTED", "DISPLAYED", "ANSWERED"].includes(q.status)
  ).length;

  const questionsAnsweredCount = questions.filter(
    (q) => q.status === "ANSWERED"
  ).length;

  const mediationReserveUsedCount = questions.filter(
    (q) =>
      q.isMediationReserve &&
      (q.isPrimary || ["SELECTED", "DISPLAYED", "ANSWERED"].includes(q.status))
  ).length;

  const totalVotesCount = polls.reduce((acc, p) => acc + p.totalVotes, 0);

  const primaryPoll = polls[0] ?? null;

  const roundtablePoll: ConsolidatedRoundtableReport = primaryPoll
    ? {
        pollId: primaryPoll.id,
        question: primaryPoll.question,
        status: primaryPoll.status,
        totalVotes: primaryPoll.totalVotes,
        voteChangesCount,
        isTieBreak: primaryPoll.isTieBreak,
        tieBreakJustification: primaryPoll.tieBreakJustification ?? null,
        winningOptionId: primaryPoll.winningOptionId ?? null,
        winningQuestionText: primaryPoll.winningQuestionText ?? null,
        options: primaryPoll.options.map((opt) => ({
          order: opt.optionOrder,
          themeLabel: opt.themeLabel ?? `Questão ${opt.optionOrder}`,
          label: opt.label,
          votesCount: opt.votesCount,
          percentage:
            primaryPoll.totalVotes > 0
              ? Math.round((opt.votesCount / primaryPoll.totalVotes) * 1000) /
                10
              : 0,
          isWinner: primaryPoll.winningOptionId === opt.id,
        })),
      }
    : {
        pollId: null,
        question: "Votação da Mesa-Redonda",
        status: "DRAFT",
        totalVotes: 0,
        voteChangesCount: 0,
        isTieBreak: false,
        tieBreakJustification: null,
        winningOptionId: null,
        winningQuestionText: null,
        options: [],
      };

  const topicsReport: ConsolidatedTopicReport[] = topics.map((t) => {
    const topicAudienceQuestions = audienceQuestions.filter(
      (q) => q.topicId === t.id
    );
    const topicAllQuestions = questions.filter((q) => q.topicId === t.id);
    const topicSteps = operationalSteps.filter((s) => s.topicId === t.id);

    const topicPlannedSec =
      topicSteps.reduce((acc, s) => acc + s.durationSec, 0) ||
      t.durationSec + (t.qaDurationSec ?? 300);
    const topicActualSec = topicSteps.reduce(
      (acc, s) => acc + (s.actualDurationSec || s.durationSec),
      0
    );

    const expositionStep = topicSteps.find((s) => s.stepType === "EXPOSITION");
    const qaStep = topicSteps.find((s) => s.stepType === "AUDIENCE_VOICE");

    const expositionActualSec =
      expositionStep?.actualDurationSec ||
      expositionStep?.durationSec ||
      t.durationSec ||
      900;
    const qaActualSec =
      qaStep?.actualDurationSec || qaStep?.durationSec || t.qaDurationSec || 300;

    const chosenQuestion =
      topicAllQuestions.find(
        (q) =>
          q.status === "ANSWERED" ||
          q.status === "DISPLAYED" ||
          q.status === "SELECTED" ||
          q.isPrimary
      ) ?? null;

    const poll =
      polls.find((p) => p.topicId === t.id) ||
      (t.number === 5 ? primaryPoll : null);

    return {
      number: t.number,
      title: t.title,
      speakerName: t.mainSpeaker.name,
      provokerLabel: t.provokerLabel,
      plannedDurationSec: topicPlannedSec,
      actualDurationSec: topicActualSec,
      expositionDurationSec: expositionActualSec,
      qaDurationSec: qaActualSec,
      questionsReceived: topicAudienceQuestions.length,
      questionsApproved: topicAudienceQuestions.filter((q) =>
        ["APPROVED", "SELECTED", "DISPLAYED", "ANSWERED"].includes(q.status)
      ).length,
      questionsAnswered: topicAllQuestions.filter(
        (q) => q.status === "ANSWERED"
      ).length,
      answeredQuestionText: chosenQuestion?.text ?? null,
      answeredQuestionOrigin: chosenQuestion
        ? chosenQuestion.isMediationReserve
          ? "Mediação"
          : "Plateia"
        : null,
      answeredQuestionModerator: chosenQuestion?.moderatedBy?.fullName ?? null,
      totalVotes: poll?.totalVotes ?? 0,
      pollQuestion:
        poll?.question ??
        (t.number === 5
          ? "Exposição + 1 Pergunta e Resposta (5 min) · Votação da Mesa-Redonda Aberta"
          : "Exposição + 1 Pergunta e Resposta (5 min)"),
      optionsDistribution: (poll?.options || []).map((opt) => ({
        order: opt.optionOrder,
        themeLabel: opt.themeLabel ?? `Questão ${opt.optionOrder}`,
        label: opt.label,
        votesCount: opt.votesCount,
        percentage:
          (poll?.totalVotes ?? 0) > 0
            ? Math.round((opt.votesCount / poll!.totalVotes) * 1000) / 10
            : 0,
        isWinner: poll?.winningOptionId === opt.id,
      })),
    };
  });

  return {
    eventId: event.id,
    name: event.name,
    theme: event.theme,
    institution: event.institution,
    scheduledStartAt: event.scheduledStartAt
      ? event.scheduledStartAt.toISOString()
      : null,
    actualStartAt: event.actualStartAt ? event.actualStartAt.toISOString() : null,
    actualEndAt: event.actualEndAt ? event.actualEndAt.toISOString() : null,
    durationPlannedMin: event.programmedDurationMin,
    durationActualMin: actualDurationMin,
    certifiedHours: event.certifiedHours ?? 4,
    totalSessionsCount: totalSessions,
    validatedCredentialsCount,
    peakConnections: Math.max(event.peakConnections, totalSessions),
    questionsTotal: audienceQuestions.length,
    questionsApproved: questionsApprovedCount,
    questionsSelected: questionsSelectedCount,
    questionsAnswered: questionsAnsweredCount,
    mediationReserveUsedCount,
    totalVotes: totalVotesCount,
    voteChangesCount,
    roundtablePoll,
    topics: topicsReport,
    justifiedAuditLogs: justifiedLogs.map((l) => ({
      id: l.id,
      action: l.action,
      entityType: l.entityType,
      userName: l.user?.fullName ?? "Operador",
      justification: l.justification,
      createdAt: l.createdAt.toISOString(),
    })),
  };
}
