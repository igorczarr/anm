import { prisma } from "@/lib/prisma";
import {
  ArenaSyncEventType,
  computeServerTimerSnapshot,
} from "@/lib/events";
import { Prisma } from "@prisma/client";

export const DEFAULT_EVENT_SLUG = "a-nova-moeda-2026";

// Cache em memória de dados estáticos do evento (pautas, speakers, etapas) para navegação instantânea no Admin
let staticEventCache: {
  eventId: string;
  cachedAt: number;
  allOperationalSteps: any[];
  allMacroBlocks: any[];
  allSpeakers: any[];
  allTopics: any[];
} | null = null;

export function invalidateStaticEventCache() {
  staticEventCache = null;
}

export async function getPrimaryEvent() {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  try {
    const event = await prisma.event.findUnique({
      where: { slug: DEFAULT_EVENT_SLUG },
      include: {
        liveState: true,
      },
    });

    if (event) return event;

    return await prisma.event.findFirst({
      include: {
        liveState: true,
      },
      orderBy: { createdAt: "asc" },
    });
  } catch (err) {
    console.warn("getPrimaryEvent: Banco de dados inacessível ou não configurado:", err);
    return null;
  }
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

  // Retorno ultrarrápido quando nada mudou no seq do servidor
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

  // Carrega ou reaproveita cache estático (revalida a cada 60s ou quando invalidado)
  const isStaticCacheValid =
    staticEventCache &&
    staticEventCache.eventId === event.id &&
    serverNow - staticEventCache.cachedAt < 60000;

  if (!isStaticCacheValid) {
    const [opSteps, mbSteps, spkList, topList] = await Promise.all([
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
      prisma.scheduleStep.findMany({
        where: { eventId: event.id, isMacroBlock: true },
        orderBy: { macroOrder: "asc" },
        include: {
          speaker: true,
          topic: {
            include: { mainSpeaker: true },
          },
        },
      }),
      prisma.speaker.findMany({
        where: { eventId: event.id },
        orderBy: { displayOrder: "asc" },
      }),
      prisma.topic.findMany({
        where: { eventId: event.id },
        include: {
          mainSpeaker: true,
          provoker: true,
        },
        orderBy: { number: "asc" },
      }),
    ]);

    staticEventCache = {
      eventId: event.id,
      cachedAt: serverNow,
      allOperationalSteps: opSteps,
      allMacroBlocks: mbSteps,
      allSpeakers: spkList,
      allTopics: topList,
    };
  }

  const { allOperationalSteps, allMacroBlocks, allSpeakers, allTopics } = staticEventCache!;

  const activeTopic = liveState.activeTopicId
    ? allTopics.find((t) => t.id === liveState.activeTopicId) ?? null
    : null;

  const activeStep = liveState.activeStepId
    ? allOperationalSteps.find((s) => s.id === liveState.activeStepId) ?? null
    : null;

  // Consulta apenas as entidades dinâmicas que mudam em tempo real
  const [
    activePoll,
    selectedQuestionRaw,
    activeScreenMessage,
    connectedParticipants,
    questionsTotal,
    questionsPending,
    questionsApproved,
    recentTimerSessions,
  ] = await Promise.all([
    liveState.activePollId
      ? prisma.poll.findUnique({
          where: { id: liveState.activePollId },
          include: {
            options: { orderBy: { optionOrder: "asc" } },
          },
        })
      : prisma.poll.findFirst({
          where: { eventId: event.id },
          orderBy: { number: "asc" },
          include: {
            options: { orderBy: { optionOrder: "asc" } },
          },
        }),
    liveState.selectedQuestionId
      ? prisma.question.findUnique({
          where: { id: liveState.selectedQuestionId },
          include: {
            topic: { select: { number: true, title: true } },
            moderatedBy: { select: { fullName: true } },
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
        lastSeenAt: { gte: new Date(serverNow - 1000 * 60 * 3) },
      },
    }),
    prisma.question.count({
      where: { eventId: event.id, isMediationReserve: false },
    }),
    prisma.question.count({
      where: {
        eventId: event.id,
        isMediationReserve: false,
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
          take: 10,
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

  // Regra inegociável: perguntas não aprovadas NUNCA saem para exibição pública
  const safeSelectedQuestion =
    selectedQuestionRaw &&
    ["APPROVED", "SELECTED", "DISPLAYED", "ANSWERED"].includes(
      selectedQuestionRaw.status
    )
      ? {
          id: selectedQuestionRaw.id,
          text: selectedQuestionRaw.text,
          status: selectedQuestionRaw.status,
          isMediationReserve: selectedQuestionRaw.isMediationReserve,
          originLabel: selectedQuestionRaw.isMediationReserve
            ? "Pergunta da Mediação"
            : "Pergunta da Plateia",
          moderatorName: selectedQuestionRaw.moderatedBy?.fullName ?? null,
          topicNumber: selectedQuestionRaw.topic.number,
          topicTitle: selectedQuestionRaw.topic.title,
        }
      : null;

  // Regra inegociável: Não exibir resultados públicos antes do fechamento da votação
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
        isTieBreak: activePoll.isTieBreak,
        tieBreakOptionIds: activePoll.tieBreakOptionIds ?? [],
        tieBreakJustification: activePoll.tieBreakJustification ?? null,
        winningOptionId:
          showPollResultsPublicly || options?.includeAdminStats
            ? activePoll.winningOptionId
            : null,
        winningQuestionText:
          showPollResultsPublicly ||
          options?.includeAdminStats ||
          liveState.arenaMode === "ROUNDTABLE" ||
          liveState.arenaMode === "POLL_RESULTS"
            ? activePoll.winningQuestionText
            : null,
        totalVotes:
          showPollResultsPublicly || options?.includeAdminStats
            ? activePoll.totalVotes
            : null,
        options: activePoll.options.map((opt) => ({
          id: opt.id,
          optionOrder: opt.optionOrder,
          themeLabel: opt.themeLabel ?? `Questão ${opt.optionOrder}`,
          label: opt.label,
          isWinner: activePoll.winningOptionId === opt.id,
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
      certifiedHours: event.certifiedHours,
      scheduleLocked: event.scheduleLocked,
      requireCredential: event.requireCredential,
      requireAccessCode: event.requireAccessCode,
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
    speakers: allSpeakers.map((sp) => ({
      id: sp.id,
      slug: sp.slug,
      name: sp.name,
      roleTitle: sp.roleTitle,
      photoUrl: sp.photoUrl,
      displayOrder: sp.displayOrder,
    })),
    macroBlocks: allMacroBlocks.map((mb) => ({
      id: mb.id,
      code: mb.code,
      macroOrder: mb.macroOrder,
      title: mb.title,
      stepType: mb.stepType,
      arenaMode: mb.arenaMode,
      durationSec: mb.durationSec,
      actualDurationSec: mb.actualDurationSec,
      status: mb.status,
      responsibleName: mb.responsibleName,
      topicNumber: mb.topic?.number ?? null,
    })),
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
          macroOrder: activeStep.macroOrder,
          durationSec: activeStep.durationSec,
          actualDurationSec: activeStep.actualDurationSec,
          status: activeStep.status,
          phaseLabel:
            activeStep.stepType === "EXPOSITION"
              ? "Exposição (15 min)"
              : activeStep.stepType === "AUDIENCE_VOICE"
                ? "Pergunta e Resposta (5 min)"
                : activeStep.stepType === "INTRODUCTION"
                  ? "Introdução e Contexto (10 min)"
                  : activeStep.stepType === "ROUNDTABLE"
                    ? "Mesa-Redonda (20 min)"
                    : activeStep.title,
          responsibleName:
            activeStep.responsibleName ||
            activeStep.speaker?.name ||
            activeStep.topic?.mainSpeaker.name ||
            "Organização",
          speaker: activeStep.speaker
            ? {
                id: activeStep.speaker.id,
                name: activeStep.speaker.name,
                photoUrl: activeStep.speaker.photoUrl,
                roleTitle: activeStep.speaker.roleTitle,
              }
            : activeStep.topic?.mainSpeaker
              ? {
                  id: activeStep.topic.mainSpeaker.id,
                  name: activeStep.topic.mainSpeaker.name,
                  photoUrl: activeStep.topic.mainSpeaker.photoUrl,
                  roleTitle: activeStep.topic.mainSpeaker.roleTitle,
                }
              : null,
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
          status: prevStep.status,
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
          status: nextStep.status,
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
