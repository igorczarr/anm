import { prisma } from "@/lib/prisma";
import {
  ArenaSyncEventType,
  computeServerTimerSnapshot,
} from "@/lib/events";
import { Prisma } from "@prisma/client";

export const DEFAULT_EVENT_SLUG = "a-nova-moeda-2026";

export async function getPrimaryEvent() {
  const event = await prisma.event.findUnique({
    where: { slug: DEFAULT_EVENT_SLUG },
    include: {
      liveState: true,
    },
  });

  if (event) return event;

  return prisma.event.findFirst({
    include: {
      liveState: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function ensureLiveState(eventId: string) {
  const existing = await prisma.liveState.findUnique({
    where: { eventId },
  });
  if (existing) return existing;

  return prisma.liveState.create({
    data: {
      eventId,
      seq: 1,
      lastEventType: "system.initialized",
      status: "WAITING",
      arenaMode: "WAITING",
    },
  });
}

export async function updateLiveStateAtomic(
  eventId: string,
  eventType: ArenaSyncEventType,
  patch: Prisma.LiveStateUpdateInput
) {
  await ensureLiveState(eventId);
  return prisma.liveState.update({
    where: { eventId },
    data: {
      ...patch,
      lastEventType: eventType,
      seq: { increment: 1 },
    },
  });
}

export async function getArenaSyncSnapshot(options?: {
  sinceSeq?: number;
  includeAdminStats?: boolean;
}) {
  const serverNow = Date.now();
  const event = await getPrimaryEvent();

  if (!event) {
    return {
      initialized: false,
      seq: 0,
      serverNow,
    };
  }

  const liveState = event.liveState ?? (await ensureLiveState(event.id));

  const timerSnapshot = computeServerTimerSnapshot({
    timerStatus: liveState.timerStatus,
    timerStartedAt: liveState.timerStartedAt,
    timerPausedAt: liveState.timerPausedAt,
    timerDurationMs: liveState.timerDurationMs,
    timerAccumulatedPauseMs: liveState.timerAccumulatedPauseMs,
    timerAdjustmentMs: liveState.timerAdjustmentMs,
    nowMs: serverNow,
  });

  if (
    options?.sinceSeq &&
    options.sinceSeq >= liveState.seq &&
    !options?.includeAdminStats
  ) {
    return {
      initialized: true,
      unchanged: true,
      eventId: event.id,
      seq: liveState.seq,
      lastEventType: liveState.lastEventType,
      serverNow,
      timer: timerSnapshot,
    };
  }

  const activeCutoff = new Date(serverNow - 1000 * 60 * 3); // últimos 3 min

  const [
    activeTopic,
    activeStep,
    allOperationalSteps,
    activePoll,
    selectedQuestionRaw,
    activeScreenMessage,
    connectedParticipants,
    questionsTotal,
    questionsPending,
    questionsApproved,
    recentTimerSessions,
  ] = await Promise.all([
    liveState.activeTopicId
      ? prisma.topic.findUnique({
          where: { id: liveState.activeTopicId },
          include: {
            mainSpeaker: true,
            provoker: true,
          },
        })
      : null,
    liveState.activeStepId
      ? prisma.scheduleStep.findUnique({
          where: { id: liveState.activeStepId },
          include: {
            speaker: true,
            topic: {
              include: { mainSpeaker: true, provoker: true },
            },
          },
        })
      : null,
    prisma.scheduleStep.findMany({
      where: { eventId: event.id, isMacroBlock: false },
      orderBy: { sequenceOrder: "asc" },
      include: {
        speaker: true,
        topic: {
          include: { mainSpeaker: true, provoker: true },
        },
      },
    }),
    liveState.activePollId
      ? prisma.poll.findUnique({
          where: { id: liveState.activePollId },
          include: {
            options: { orderBy: { optionOrder: "asc" } },
          },
        })
      : null,
    liveState.selectedQuestionId
      ? prisma.question.findUnique({
          where: { id: liveState.selectedQuestionId },
          include: {
            topic: { select: { number: true, title: true } },
          },
        })
      : null,
    liveState.screenMessageId
      ? prisma.screenMessage.findUnique({
          where: { id: liveState.screenMessageId },
        })
      : null,
    prisma.participantSession.count({
      where: {
        eventId: event.id,
        lastSeenAt: { gte: activeCutoff },
      },
    }),
    prisma.question.count({ where: { eventId: event.id } }),
    prisma.question.count({
      where: {
        eventId: event.id,
        status: { in: ["RECEIVED", "ANALYZING"] },
      },
    }),
    prisma.question.count({
      where: {
        eventId: event.id,
        status: {
          in: ["APPROVED", "SELECTED", "DISPLAYED", "ANSWERED"],
        },
      },
    }),
    options?.includeAdminStats
      ? prisma.timerSession.findMany({
          where: { eventId: event.id },
          include: {
            step: {
              select: {
                code: true,
                title: true,
                sequenceOrder: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 15,
        })
      : Promise.resolve([]),
  ]);

  let nextStep = null;
  let prevStep = null;
  if (activeStep) {
    nextStep =
      allOperationalSteps.find(
        (s) => s.sequenceOrder > activeStep.sequenceOrder
      ) ?? null;
    const prevCandidates = allOperationalSteps.filter(
      (s) => s.sequenceOrder < activeStep.sequenceOrder
    );
    prevStep =
      prevCandidates.length > 0
        ? prevCandidates[prevCandidates.length - 1]
        : null;
  } else {
    nextStep = allOperationalSteps[0] ?? null;
  }

  // Regra inegociável §5.6 e §10.2: perguntas não aprovadas NUNCA saem para exibição pública
  const safeSelectedQuestion =
    selectedQuestionRaw &&
    ["APPROVED", "SELECTED", "DISPLAYED", "ANSWERED"].includes(
      selectedQuestionRaw.status
    )
      ? {
          id: selectedQuestionRaw.id,
          text: selectedQuestionRaw.text,
          status: selectedQuestionRaw.status,
          topicNumber: selectedQuestionRaw.topic.number,
          topicTitle: selectedQuestionRaw.topic.title,
        }
      : null;

  // Regra inegociável §6.2: Não exibir resultados públicos antes do fechamento da votação
  const showPollResultsPublicly =
    activePoll &&
    (activePoll.status === "CLOSED" ||
      activePoll.status === "RESULTS_PUBLISHED");

  const sanitizedPoll = activePoll
    ? {
        id: activePoll.id,
        number: activePoll.number,
        topicId: activePoll.topicId,
        question: activePoll.question,
        status: activePoll.status,
        durationSec: activePoll.durationSec,
        totalVotes:
          showPollResultsPublicly || options?.includeAdminStats
            ? activePoll.totalVotes
            : null,
        options: activePoll.options.map((opt) => ({
          id: opt.id,
          optionOrder: opt.optionOrder,
          label: opt.label,
          votesCount:
            showPollResultsPublicly || options?.includeAdminStats
              ? opt.votesCount
              : null,
          percentage:
            (showPollResultsPublicly || options?.includeAdminStats) &&
            activePoll.totalVotes > 0
              ? Math.round((opt.votesCount / activePoll.totalVotes) * 1000) /
                10
              : null,
        })),
      }
    : null;

  const arenaOnline =
    liveState.arenaLastHeartbeatAt &&
    serverNow - new Date(liveState.arenaLastHeartbeatAt).getTime() < 15000;

  return {
    initialized: true,
    unchanged: false,
    eventId: event.id,
    seq: liveState.seq,
    lastEventType: liveState.lastEventType,
    serverNow,
    event: {
      id: event.id,
      slug: event.slug,
      name: event.name,
      theme: event.theme,
      institution: event.institution,
      estimatedAudience: event.estimatedAudience,
      programmedDurationMin: event.programmedDurationMin,
      scheduledStartAt: event.scheduledStartAt,
      actualStartAt: event.actualStartAt,
      actualEndAt: event.actualEndAt,
      questionCharLimit: event.questionCharLimit,
      maxQuestionsPerTopic: event.maxQuestionsPerTopic,
    },
    liveState: {
      status: liveState.status,
      arenaMode: liveState.arenaMode,
      activeStepId: liveState.activeStepId,
      activeTopicId: liveState.activeTopicId,
      activePollId: liveState.activePollId,
      selectedQuestionId: liveState.selectedQuestionId,
      questionsOpen: liveState.questionsOpen,
      showTimerOnArena: liveState.showTimerOnArena,
      soundAlertsEnabled: liveState.soundAlertsEnabled,
      emergencyActive: liveState.emergencyActive,
      emergencyMessage: liveState.emergencyMessage,
      arenaOnline: Boolean(arenaOnline),
      arenaLastHeartbeatAt: liveState.arenaLastHeartbeatAt,
      timerStartedAt: liveState.timerStartedAt,
      timerPausedAt: liveState.timerPausedAt,
      timerDurationMs: liveState.timerDurationMs,
      timerAccumulatedPauseMs: liveState.timerAccumulatedPauseMs,
      timerAdjustmentMs: liveState.timerAdjustmentMs,
      timerStatus: liveState.timerStatus,
    },
    timer: timerSnapshot,
    activeTopic: activeTopic
      ? {
          id: activeTopic.id,
          number: activeTopic.number,
          title: activeTopic.title,
          durationSec: activeTopic.durationSec,
          provokerLabel: activeTopic.provokerLabel,
          mainSpeaker: {
            id: activeTopic.mainSpeaker.id,
            name: activeTopic.mainSpeaker.name,
            photoUrl: activeTopic.mainSpeaker.photoUrl,
            roleTitle: activeTopic.mainSpeaker.roleTitle,
          },
          provoker: activeTopic.provoker
            ? {
                id: activeTopic.provoker.id,
                name: activeTopic.provoker.name,
                photoUrl: activeTopic.provoker.photoUrl,
                roleTitle: activeTopic.provoker.roleTitle,
              }
            : null,
        }
      : null,
    activeStep: activeStep
      ? {
          id: activeStep.id,
          code: activeStep.code,
          title: activeStep.title,
          stepType: activeStep.stepType,
          arenaMode: activeStep.arenaMode,
          sequenceOrder: activeStep.sequenceOrder,
          durationSec: activeStep.durationSec,
          actualDurationSec: activeStep.actualDurationSec,
          status: activeStep.status,
          responsibleName:
            activeStep.responsibleName ||
            activeStep.speaker?.name ||
            activeStep.topic?.mainSpeaker.name ||
            "Organização",
          topicNumber: activeStep.topic?.number ?? null,
        }
      : null,
    prevStep: prevStep
      ? {
          id: prevStep.id,
          code: prevStep.code,
          title: prevStep.title,
          stepType: prevStep.stepType,
          sequenceOrder: prevStep.sequenceOrder,
          durationSec: prevStep.durationSec,
          responsibleName:
            prevStep.responsibleName ||
            prevStep.speaker?.name ||
            prevStep.topic?.mainSpeaker.name ||
            "Organização",
          topicNumber: prevStep.topic?.number ?? null,
        }
      : null,
    nextStep: nextStep
      ? {
          id: nextStep.id,
          code: nextStep.code,
          title: nextStep.title,
          stepType: nextStep.stepType,
          sequenceOrder: nextStep.sequenceOrder,
          durationSec: nextStep.durationSec,
          responsibleName:
            nextStep.responsibleName ||
            nextStep.speaker?.name ||
            nextStep.topic?.mainSpeaker.name ||
            "Organização",
          topicNumber: nextStep.topic?.number ?? null,
        }
      : null,
    activePoll: sanitizedPoll,
    selectedQuestion: safeSelectedQuestion,
    screenMessage:
      activeScreenMessage && activeScreenMessage.isActive
        ? {
            id: activeScreenMessage.id,
            title: activeScreenMessage.title,
            body: activeScreenMessage.body,
            severity: activeScreenMessage.severity,
          }
        : null,
    metrics: {
      connectedParticipants,
      peakConnections: Math.max(event.peakConnections, connectedParticipants),
      questionsTotal,
      questionsPending,
      questionsApproved,
      activePollVotes: activePoll?.totalVotes ?? 0,
    },
    ...(options?.includeAdminStats
      ? {
          operationalSteps: allOperationalSteps.map((st) => ({
            id: st.id,
            code: st.code,
            title: st.title,
            stepType: st.stepType,
            arenaMode: st.arenaMode,
            sequenceOrder: st.sequenceOrder,
            macroOrder: st.macroOrder,
            durationSec: st.durationSec,
            actualDurationSec: st.actualDurationSec,
            status: st.status,
            responsibleName:
              st.responsibleName ||
              st.speaker?.name ||
              st.topic?.mainSpeaker.name ||
              "Organização",
            topicNumber: st.topic?.number ?? null,
          })),
          recentTimerSessions: recentTimerSessions.map((ts) => ({
            id: ts.id,
            stepCode: ts.step.code,
            stepTitle: ts.step.title,
            sequenceOrder: ts.step.sequenceOrder,
            plannedDurationSec: ts.plannedDurationSec,
            effectiveDurationSec: ts.effectiveDurationSec,
            pausedTotalSec: ts.pausedTotalSec,
            addedTotalSec: ts.addedTotalSec,
            reducedTotalSec: ts.reducedTotalSec,
            overrunSec: ts.overrunSec,
            status: ts.status,
            changedByName: ts.changedByName,
            actualStartAt: ts.actualStartAt,
            actualEndAt: ts.actualEndAt,
          })),
        }
      : {}),
  };
}
