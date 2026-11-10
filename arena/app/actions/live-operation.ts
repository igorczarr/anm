"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission, logAdminAction } from "@/lib/admin-auth";
import {
  ensureLiveState,
  getPrimaryEvent,
  updateLiveStateAtomic,
} from "@/lib/live-state";
import {
  AdjustmentLogEntry,
  closeActiveTimerSession,
  PauseLogEntry,
  startNewTimerSessionForStep,
} from "@/lib/timer-engine";
import { ArenaMode, EventStatus, Prisma } from "@prisma/client";

async function transitionToStep({
  eventId,
  targetStepId,
  operatorId,
  operatorName,
  prevStepStatus = "COMPLETED",
  autoStartTimer = true,
}: {
  eventId: string;
  targetStepId: string;
  operatorId: string;
  operatorName: string;
  prevStepStatus?: "COMPLETED" | "SKIPPED" | "PENDING";
  autoStartTimer?: boolean;
}) {
  const liveState = await ensureLiveState(eventId);

  if (liveState.activeStepId) {
    await closeActiveTimerSession({
      eventId,
      liveState,
      stepStatus: prevStepStatus,
      operatorId,
      operatorName,
    });
  }

  const targetStep = await prisma.scheduleStep.findUnique({
    where: { id: targetStepId },
    include: {
      topic: {
        include: { poll: true },
      },
    },
  });

  if (!targetStep) {
    throw new Error("Etapa de destino não encontrada");
  }

  // Regra §5.5: Captação de perguntas abre quando a pauta começa (Exposição, Provocação, Réplica, Votação)
  // e fecha automaticamente quando começa "Voz da Plateia" (AUDIENCE_VOICE) ou fora de pauta
  const shouldOpenQuestions = Boolean(
    targetStep.topicId &&
      ["EXPOSITION", "PROVOCATION", "REBUTTAL", "POLL", "COLLECTIVE_CONTRIBUTION"].includes(
        targetStep.stepType
      )
  );

  let activePollId = targetStep.topic?.poll?.id ?? null;

  // Se a etapa for POLL (Votação), garante que nenhuma outra votação esteja aberta e abre a votação da pauta atual
  if (targetStep.stepType === "POLL" && activePollId) {
    await prisma.poll.updateMany({
      where: {
        eventId,
        status: "OPEN",
        id: { not: activePollId },
      },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
      },
    });

    await prisma.poll.update({
      where: { id: activePollId },
      data: {
        status: "OPEN",
        openedAt: new Date(),
      },
    });
  }

  // Seleciona automaticamente a pergunta principal da pauta quando entra em Voz da Plateia
  let selectedQuestionId = liveState.selectedQuestionId;
  if (targetStep.topicId) {
    if (targetStep.stepType === "AUDIENCE_VOICE" && targetStep.topic?.primaryQuestionId) {
      selectedQuestionId = targetStep.topic.primaryQuestionId;
      await prisma.question.update({
        where: { id: selectedQuestionId },
        data: { status: "DISPLAYED", displayedAt: new Date() },
      });
    } else if (liveState.activeTopicId !== targetStep.topicId) {
      selectedQuestionId = targetStep.topic?.primaryQuestionId ?? null;
    }
  } else {
    selectedQuestionId = null;
  }

  await startNewTimerSessionForStep({
    eventId,
    step: targetStep,
    operatorId,
    operatorName,
    autoRun: autoStartTimer,
  });

  const now = new Date();
  const nextEventStatus: EventStatus =
    targetStep.stepType === "INTERVAL"
      ? "INTERVAL"
      : autoStartTimer
      ? "LIVE"
      : "PAUSED";

  const topicChanged = liveState.activeTopicId !== targetStep.topicId;

  await updateLiveStateAtomic(
    eventId,
    topicChanged ? "topic.changed" : "stage.started",
    {
      status: nextEventStatus,
      arenaMode: targetStep.arenaMode,
      activeStepId: targetStep.id,
      activeTopicId: targetStep.topicId,
      activePollId,
      selectedQuestionId,
      questionsOpen: shouldOpenQuestions,
      timerStatus: autoStartTimer ? "RUNNING" : "PAUSED",
      timerStartedAt: now,
      timerPausedAt: autoStartTimer ? null : now,
      timerDurationMs: targetStep.durationSec * 1000,
      timerAccumulatedPauseMs: 0,
      timerAdjustmentMs: 0,
      emergencyActive: false,
    }
  );

  return targetStep;
}

export async function startEventAction() {
  const admin = await requireAdminPermission("canOperateTimer");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const liveState = await ensureLiveState(event.id);

  let firstStepId = liveState.activeStepId;
  if (!firstStepId) {
    const firstStep = await prisma.scheduleStep.findFirst({
      where: { eventId: event.id, isMacroBlock: false },
      orderBy: { sequenceOrder: "asc" },
    });
    firstStepId = firstStep?.id ?? null;
  }

  if (!firstStepId) {
    throw new Error("Nenhuma etapa operacional cadastrada");
  }

  await prisma.event.update({
    where: { id: event.id },
    data: {
      status: "LIVE",
      actualStartAt: event.actualStartAt ?? new Date(),
    },
  });

  const step = await transitionToStep({
    eventId: event.id,
    targetStepId: firstStepId,
    operatorId: admin.id,
    operatorName: admin.fullName,
    prevStepStatus: "PENDING",
    autoStartTimer: true,
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "EVENT_STARTED",
    entityType: "Event",
    entityId: event.id,
    metadata: { stepCode: step.code, stepTitle: step.title },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/operacao");
}

export async function pauseTimerAction() {
  const admin = await requireAdminPermission("canOperateTimer");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const liveState = await ensureLiveState(event.id);
  if (liveState.timerStatus !== "RUNNING" && liveState.timerStatus !== "EXPIRED") {
    return;
  }

  const now = new Date();

  if (liveState.activeStepId) {
    const openSession = await prisma.timerSession.findFirst({
      where: {
        eventId: event.id,
        stepId: liveState.activeStepId,
        status: { in: ["RUNNING", "EXPIRED"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (openSession) {
      const currentLog = Array.isArray(openSession.pausesLog)
        ? (openSession.pausesLog as unknown as PauseLogEntry[])
        : [];
      currentLog.push({
        pausedAt: now.toISOString(),
        operatorName: admin.fullName,
      });

      await prisma.timerSession.update({
        where: { id: openSession.id },
        data: {
          status: "PAUSED",
          pausesLog: currentLog as unknown as Prisma.InputJsonValue,
          changedByUserId: admin.id,
          changedByName: admin.fullName,
        },
      });
    }
  }

  await updateLiveStateAtomic(event.id, "event.paused", {
    status: "PAUSED",
    timerStatus: "PAUSED",
    timerPausedAt: now,
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "TIMER_PAUSED",
    entityType: "LiveState",
    entityId: liveState.id,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/operacao");
}

export async function resumeTimerAction() {
  const admin = await requireAdminPermission("canOperateTimer");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const liveState = await ensureLiveState(event.id);
  const now = new Date();

  // Se o cronômetro estava IDLE (nunca iniciado para a etapa atual), inicia do zero
  if (liveState.timerStatus === "IDLE" || !liveState.timerStartedAt) {
    if (liveState.activeStepId) {
      await transitionToStep({
        eventId: event.id,
        targetStepId: liveState.activeStepId,
        operatorId: admin.id,
        operatorName: admin.fullName,
        prevStepStatus: "PENDING",
        autoStartTimer: true,
      });
      revalidatePath("/admin");
      revalidatePath("/admin/operacao");
      return;
    }
  }

  if (liveState.timerStatus !== "PAUSED" || !liveState.timerPausedAt) {
    return;
  }

  const pauseDeltaMs = Math.max(
    0,
    now.getTime() - new Date(liveState.timerPausedAt).getTime()
  );
  const newAccumulatedPauseMs =
    (liveState.timerAccumulatedPauseMs || 0) + pauseDeltaMs;

  if (liveState.activeStepId) {
    const openSession = await prisma.timerSession.findFirst({
      where: {
        eventId: event.id,
        stepId: liveState.activeStepId,
        status: "PAUSED",
      },
      orderBy: { createdAt: "desc" },
    });

    if (openSession) {
      const currentLog = Array.isArray(openSession.pausesLog)
        ? (openSession.pausesLog as unknown as PauseLogEntry[])
        : [];
      if (currentLog.length > 0) {
        const last = currentLog[currentLog.length - 1];
        if (!last.resumedAt) {
          last.resumedAt = now.toISOString();
          last.durationSec = Math.round(pauseDeltaMs / 1000);
        }
      }

      await prisma.timerSession.update({
        where: { id: openSession.id },
        data: {
          status: "RUNNING",
          pausedTotalSec: Math.round(newAccumulatedPauseMs / 1000),
          pausesLog: currentLog as unknown as Prisma.InputJsonValue,
          changedByUserId: admin.id,
          changedByName: admin.fullName,
        },
      });
    }
  }

  await updateLiveStateAtomic(event.id, "event.resumed", {
    status: "LIVE",
    timerStatus: "RUNNING",
    timerPausedAt: null,
    timerAccumulatedPauseMs: newAccumulatedPauseMs,
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "TIMER_RESUMED",
    entityType: "LiveState",
    entityId: liveState.id,
    metadata: { pauseDurationSec: Math.round(pauseDeltaMs / 1000) },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/operacao");
}

export async function resetTimerAction() {
  const admin = await requireAdminPermission("canOperateTimer");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const liveState = await ensureLiveState(event.id);
  const now = new Date();

  let durationMs = liveState.timerDurationMs || 480000;
  if (liveState.activeStepId) {
    const step = await prisma.scheduleStep.findUnique({
      where: { id: liveState.activeStepId },
    });
    if (step) {
      durationMs = step.durationSec * 1000;
    }
  }

  await updateLiveStateAtomic(event.id, "timer.updated", {
    status: "LIVE",
    timerStatus: "RUNNING",
    timerStartedAt: now,
    timerPausedAt: null,
    timerDurationMs: durationMs,
    timerAccumulatedPauseMs: 0,
    timerAdjustmentMs: 0,
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "TIMER_RESET",
    entityType: "LiveState",
    entityId: liveState.id,
    metadata: { durationSec: Math.round(durationMs / 1000) },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/operacao");
}

export async function adjustTimerAction(deltaSec: number) {
  const admin = await requireAdminPermission("canOperateTimer");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const liveState = await ensureLiveState(event.id);
  const deltaMs = deltaSec * 1000;
  const minAllowedAdjustmentMs = -(liveState.timerDurationMs - 5000);
  const newAdjustmentMs = Math.max(
    minAllowedAdjustmentMs,
    (liveState.timerAdjustmentMs || 0) + deltaMs
  );

  if (liveState.activeStepId) {
    const openSession = await prisma.timerSession.findFirst({
      where: {
        eventId: event.id,
        stepId: liveState.activeStepId,
        status: { in: ["RUNNING", "PAUSED", "EXPIRED"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (openSession) {
      const currentAdj = Array.isArray(openSession.adjustmentsLog)
        ? (openSession.adjustmentsLog as unknown as AdjustmentLogEntry[])
        : [];
      currentAdj.push({
        at: new Date().toISOString(),
        deltaSec,
        operatorName: admin.fullName,
      });

      await prisma.timerSession.update({
        where: { id: openSession.id },
        data: {
          addedTotalSec:
            deltaSec > 0
              ? openSession.addedTotalSec + deltaSec
              : openSession.addedTotalSec,
          reducedTotalSec:
            deltaSec < 0
              ? openSession.reducedTotalSec + Math.abs(deltaSec)
              : openSession.reducedTotalSec,
          adjustmentsLog: currentAdj as unknown as Prisma.InputJsonValue,
          changedByUserId: admin.id,
          changedByName: admin.fullName,
        },
      });
    }
  }

  await updateLiveStateAtomic(event.id, "timer.updated", {
    timerAdjustmentMs: newAdjustmentMs,
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: deltaSec >= 0 ? "TIMER_TIME_ADDED" : "TIMER_TIME_REDUCED",
    entityType: "LiveState",
    entityId: liveState.id,
    metadata: { deltaSec, totalAdjustmentSec: Math.round(newAdjustmentMs / 1000) },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/operacao");
}

export async function nextStepAction() {
  const admin = await requireAdminPermission("canOperateTimer");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const liveState = await ensureLiveState(event.id);
  const allSteps = await prisma.scheduleStep.findMany({
    where: { eventId: event.id, isMacroBlock: false },
    orderBy: { sequenceOrder: "asc" },
  });

  const currentIdx = allSteps.findIndex((s) => s.id === liveState.activeStepId);
  const nextStep =
    currentIdx >= 0 && currentIdx + 1 < allSteps.length
      ? allSteps[currentIdx + 1]
      : allSteps[0];

  if (!nextStep) return;

  const target = await transitionToStep({
    eventId: event.id,
    targetStepId: nextStep.id,
    operatorId: admin.id,
    operatorName: admin.fullName,
    prevStepStatus: "COMPLETED",
    autoStartTimer: true,
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "STAGE_NEXT",
    entityType: "ScheduleStep",
    entityId: target.id,
    metadata: { code: target.code, title: target.title },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/operacao");
}

export async function previousStepAction() {
  const admin = await requireAdminPermission("canOperateTimer");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const liveState = await ensureLiveState(event.id);
  const allSteps = await prisma.scheduleStep.findMany({
    where: { eventId: event.id, isMacroBlock: false },
    orderBy: { sequenceOrder: "asc" },
  });

  const currentIdx = allSteps.findIndex((s) => s.id === liveState.activeStepId);
  const prevStep =
    currentIdx > 0 ? allSteps[currentIdx - 1] : allSteps[0];

  if (!prevStep) return;

  const target = await transitionToStep({
    eventId: event.id,
    targetStepId: prevStep.id,
    operatorId: admin.id,
    operatorName: admin.fullName,
    prevStepStatus: "PENDING",
    autoStartTimer: true,
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "STAGE_PREVIOUS",
    entityType: "ScheduleStep",
    entityId: target.id,
    metadata: { code: target.code, title: target.title },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/operacao");
}

export async function skipStepAction() {
  const admin = await requireAdminPermission("canOperateTimer");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const liveState = await ensureLiveState(event.id);
  const allSteps = await prisma.scheduleStep.findMany({
    where: { eventId: event.id, isMacroBlock: false },
    orderBy: { sequenceOrder: "asc" },
  });

  const currentIdx = allSteps.findIndex((s) => s.id === liveState.activeStepId);
  const nextStep =
    currentIdx >= 0 && currentIdx + 1 < allSteps.length
      ? allSteps[currentIdx + 1]
      : null;

  if (!nextStep) return;

  const target = await transitionToStep({
    eventId: event.id,
    targetStepId: nextStep.id,
    operatorId: admin.id,
    operatorName: admin.fullName,
    prevStepStatus: "SKIPPED",
    autoStartTimer: true,
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "STAGE_SKIPPED",
    entityType: "ScheduleStep",
    entityId: target.id,
    metadata: { skippedTo: target.code },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/operacao");
}

export async function jumpToStepAction(stepId: string) {
  const admin = await requireAdminPermission("canOperateTimer");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const target = await transitionToStep({
    eventId: event.id,
    targetStepId: stepId,
    operatorId: admin.id,
    operatorName: admin.fullName,
    prevStepStatus: "COMPLETED",
    autoStartTimer: true,
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "STAGE_JUMPED",
    entityType: "ScheduleStep",
    entityId: target.id,
    metadata: { code: target.code, title: target.title },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/operacao");
}

export async function finishCurrentStepAction() {
  const admin = await requireAdminPermission("canOperateTimer");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const liveState = await ensureLiveState(event.id);

  await closeActiveTimerSession({
    eventId: event.id,
    liveState,
    stepStatus: "COMPLETED",
    operatorId: admin.id,
    operatorName: admin.fullName,
  });

  await updateLiveStateAtomic(event.id, "stage.finished", {
    timerStatus: "FINISHED",
    timerPausedAt: new Date(),
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "STAGE_FINISHED_EARLY",
    entityType: "ScheduleStep",
    entityId: liveState.activeStepId,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/operacao");
}

export async function setArenaModeManualAction(arenaMode: ArenaMode) {
  const admin = await requireAdminPermission("canOperateTimer");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  await updateLiveStateAtomic(event.id, "screen.message_updated", {
    arenaMode,
    emergencyActive: false,
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "ARENA_MODE_CHANGED",
    entityType: "LiveState",
    metadata: { arenaMode },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/operacao");
}

export async function toggleQuestionsOpenAction(open: boolean) {
  const admin = await requireAdminPermission("canModerateQuestions");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  await updateLiveStateAtomic(event.id, "config.updated", {
    questionsOpen: open,
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: open ? "QUESTIONS_GATE_OPENED" : "QUESTIONS_GATE_CLOSED",
    entityType: "LiveState",
  });

  revalidatePath("/admin");
  revalidatePath("/admin/operacao");
}

export async function openCurrentTopicPollAction() {
  const admin = await requireAdminPermission("canManagePolls");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const liveState = await ensureLiveState(event.id);

  let poll = liveState.activePollId
    ? await prisma.poll.findUnique({ where: { id: liveState.activePollId } })
    : null;

  if (!poll && liveState.activeTopicId) {
    poll = await prisma.poll.findUnique({
      where: { topicId: liveState.activeTopicId },
    });
  }

  if (!poll) {
    poll = await prisma.poll.findFirst({
      where: { eventId: event.id },
      orderBy: { number: "asc" },
    });
  }

  if (!poll) throw new Error("Nenhuma votação encontrada");

  // Regra §6.2: Impedir que duas votações sejam abertas simultaneamente
  await prisma.poll.updateMany({
    where: {
      eventId: event.id,
      status: "OPEN",
      id: { not: poll.id },
    },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
    },
  });

  await prisma.poll.update({
    where: { id: poll.id },
    data: {
      status: "OPEN",
      openedAt: new Date(),
    },
  });

  await updateLiveStateAtomic(event.id, "poll.opened", {
    activePollId: poll.id,
    arenaMode: "POLL_OPEN",
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "POLL_OPENED",
    entityType: "Poll",
    entityId: poll.id,
    metadata: { number: poll.number },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/operacao");
  revalidatePath("/admin/votacoes");
}

export async function closeActivePollAction() {
  const admin = await requireAdminPermission("canManagePolls");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const liveState = await ensureLiveState(event.id);
  if (!liveState.activePollId) return;

  const poll = await prisma.poll.update({
    where: { id: liveState.activePollId },
    data: {
      status: "RESULTS_PUBLISHED",
      closedAt: new Date(),
      resultsPublishedAt: new Date(),
    },
  });

  await updateLiveStateAtomic(event.id, "poll.results_published", {
    arenaMode: "POLL_RESULTS",
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "POLL_CLOSED_AND_PUBLISHED",
    entityType: "Poll",
    entityId: poll.id,
    metadata: { number: poll.number, totalVotes: poll.totalVotes },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/operacao");
  revalidatePath("/admin/votacoes");
}

export async function publishOperationalNoticeAction(formData: FormData) {
  const admin = await requireAdminPermission("canOperateTimer");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const title = String(formData.get("title") || "Aviso Operacional").trim();
  const body = String(formData.get("body") || "").trim();
  const severity = String(formData.get("severity") || "INFO").trim();

  if (!body) return;

  await prisma.screenMessage.updateMany({
    where: { eventId: event.id, isActive: true },
    data: { isActive: false },
  });

  const msg = await prisma.screenMessage.create({
    data: {
      eventId: event.id,
      title,
      body,
      severity,
      isActive: true,
      createdByUserId: admin.id,
    },
  });

  await updateLiveStateAtomic(event.id, "screen.message_updated", {
    screenMessageId: msg.id,
    arenaMode: "OPERATIONAL_NOTICE",
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "OPERATIONAL_NOTICE_PUBLISHED",
    entityType: "ScreenMessage",
    entityId: msg.id,
    metadata: { title, severity },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/operacao");
}

export async function clearOperationalNoticeAction() {
  const admin = await requireAdminPermission("canOperateTimer");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const liveState = await ensureLiveState(event.id);

  await prisma.screenMessage.updateMany({
    where: { eventId: event.id, isActive: true },
    data: { isActive: false },
  });

  let fallbackMode: ArenaMode = "TOPIC_OVERVIEW";
  if (liveState.activeStepId) {
    const step = await prisma.scheduleStep.findUnique({
      where: { id: liveState.activeStepId },
    });
    if (step) fallbackMode = step.arenaMode;
  }

  await updateLiveStateAtomic(event.id, "screen.message_updated", {
    screenMessageId: null,
    arenaMode: fallbackMode,
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "OPERATIONAL_NOTICE_CLEARED",
    entityType: "LiveState",
  });

  revalidatePath("/admin");
  revalidatePath("/admin/operacao");
}

export async function toggleEmergencyModeAction(
  active: boolean,
  customMessage?: string
) {
  const admin = await requireAdminPermission("canOperateTimer");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const defaultMsg =
    "Estamos realizando um ajuste técnico. A Arena continuará em instantes.";

  await updateLiveStateAtomic(event.id, "screen.message_updated", {
    emergencyActive: active,
    emergencyMessage: active ? customMessage || defaultMsg : null,
    status: active ? "EMERGENCY" : "LIVE",
    arenaMode: active ? "OPERATIONAL_NOTICE" : "TOPIC_OVERVIEW",
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: active ? "EMERGENCY_MODE_ACTIVATED" : "EMERGENCY_MODE_DEACTIVATED",
    entityType: "LiveState",
  });

  revalidatePath("/admin");
  revalidatePath("/admin/operacao");
}

export async function finishEventAction() {
  const admin = await requireAdminPermission("canOperateTimer");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const liveState = await ensureLiveState(event.id);

  await closeActiveTimerSession({
    eventId: event.id,
    liveState,
    stepStatus: "COMPLETED",
    operatorId: admin.id,
    operatorName: admin.fullName,
  });

  await prisma.event.update({
    where: { id: event.id },
    data: {
      status: "FINISHED",
      actualEndAt: new Date(),
    },
  });

  await updateLiveStateAtomic(event.id, "event.finished", {
    status: "FINISHED",
    arenaMode: "CLOSING",
    timerStatus: "FINISHED",
    timerPausedAt: new Date(),
    questionsOpen: false,
    emergencyActive: false,
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "EVENT_FINISHED",
    entityType: "Event",
    entityId: event.id,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/operacao");
}
