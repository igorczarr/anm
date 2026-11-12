"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  requireAdminPermission,
  requireAudiovisualOrOperator,
  logAdminAction,
} from "@/lib/admin-auth";
import {
  ensureLiveState,
  getPrimaryEvent,
  updateLiveStateAtomic,
  invalidateStaticEventCache,
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
  allowException = false,
  justification,
}: {
  eventId: string;
  targetStepId: string;
  operatorId: string;
  operatorName: string;
  prevStepStatus?: "COMPLETED" | "SKIPPED" | "PENDING";
  autoStartTimer?: boolean;
  allowException?: boolean;
  justification?: string;
}) {
  const liveState = await ensureLiveState(eventId);

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

  // Regra Central (§1 e §2): Uma etapa concluída não pode ser reaberta pelo operador comum;
  // exige ação administrativa com justificativa registrada.
  if (
    targetStep.status === "COMPLETED" &&
    liveState.activeStepId !== targetStep.id &&
    !allowException
  ) {
    throw new Error(
      "Esta etapa já foi formalmente concluída. Para reabri-la excepcionalmente, informe uma justificativa administrativa."
    );
  }

  // Regra Central (§4 e §5): A Mesa-Redonda não pode ser iniciada enquanto a votação estiver aberta
  // ou sem questão vencedora definida.
  if (targetStep.stepType === "ROUNDTABLE" && !allowException) {
    const poll = await prisma.poll.findFirst({
      where: { eventId },
      orderBy: { number: "asc" },
    });
    if (poll && (poll.status === "OPEN" || poll.status === "TIE_BREAK")) {
      throw new Error(
        "A Mesa-Redonda não pode ser iniciada enquanto a votação do público ainda estiver aberta. Encerre a votação e publique o resultado antes de iniciar a Mesa-Redonda."
      );
    }
  }

  if (liveState.activeStepId && liveState.activeStepId !== targetStep.id) {
    await closeActiveTimerSession({
      eventId,
      liveState,
      stepStatus: prevStepStatus,
      operatorId,
      operatorName,
    });
  }

  // Regra (§2 e §3): O envio de perguntas fica disponível APENAS durante os 15 minutos de Exposição da pauta ativa,
  // sendo encerrado automaticamente ao iniciar os 5 minutos de Pergunta e Resposta.
  const shouldOpenQuestions = Boolean(
    targetStep.topicId && targetStep.stepType === "EXPOSITION"
  );

  const officialPoll = await prisma.poll.findFirst({
    where: { eventId },
    orderBy: { number: "asc" },
  });
  const activePollId = officialPoll?.id ?? liveState.activePollId ?? null;

  // Ao entrar em Pergunta e Resposta (AUDIENCE_VOICE), projeta automaticamente a pergunta principal
  // selecionada pela moderação ou a pergunta de reserva da mediação caso nenhuma pergunta do público tenha sido selecionada.
  let selectedQuestionId = liveState.selectedQuestionId;
  if (targetStep.topicId) {
    if (targetStep.stepType === "AUDIENCE_VOICE") {
      const candidateId =
        targetStep.topic?.primaryQuestionId ||
        targetStep.topic?.reserveQuestionId ||
        null;
      if (candidateId) {
        selectedQuestionId = candidateId;
        await prisma.question.update({
          where: { id: candidateId },
          data: { status: "DISPLAYED", displayedAt: new Date() },
        });
      }
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

  if (justification) {
    await logAdminAction({
      eventId,
      userId: operatorId,
      action: "STAGE_TRANSITION_EXCEPTION",
      entityType: "ScheduleStep",
      entityId: targetStep.id,
      justification,
      metadata: { code: targetStep.code, title: targetStep.title },
    });
  }

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

  // Bloqueia edições comuns no cronograma assim que o evento entra AO VIVO (§2 e §7)
  await prisma.event.update({
    where: { id: event.id },
    data: {
      status: "LIVE",
      scheduleLocked: true,
      actualStartAt: event.actualStartAt ?? new Date(),
    },
  });

  // Votação Oficial da Mesa-Redonda fica aberta desde o início do evento
  const officialPoll = await prisma.poll.findFirst({
    where: { eventId: event.id },
    orderBy: { number: "asc" },
  });
  if (officialPoll && (officialPoll.status === "DRAFT" || !officialPoll.openedAt)) {
    await prisma.poll.update({
      where: { id: officialPoll.id },
      data: { status: "OPEN", openedAt: new Date() },
    });
  }

  const step = await transitionToStep({
    eventId: event.id,
    targetStepId: firstStepId,
    operatorId: admin.id,
    operatorName: admin.fullName,
    prevStepStatus: "PENDING",
    autoStartTimer: true,
    allowException: true,
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
  revalidatePath("/admin/cronograma");
}

export async function pauseTimerAction() {
  const admin = await requireAdminPermission("canOperateTimer");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const liveState = await ensureLiveState(event.id);
  if (
    liveState.timerStatus !== "RUNNING" &&
    liveState.timerStatus !== "EXPIRED"
  ) {
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

  if (liveState.timerStatus === "IDLE" || !liveState.timerStartedAt) {
    if (liveState.activeStepId) {
      await transitionToStep({
        eventId: event.id,
        targetStepId: liveState.activeStepId,
        operatorId: admin.id,
        operatorName: admin.fullName,
        prevStepStatus: "PENDING",
        autoStartTimer: true,
        allowException: true,
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

export async function resetTimerAction(justification?: string) {
  const admin = await requireAdminPermission("canOperateTimer");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const liveState = await ensureLiveState(event.id);
  const now = new Date();

  let durationMs = liveState.timerDurationMs || 300000;
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
    justification: justification || "Reinício operacional do cronômetro da etapa",
    metadata: { durationSec: Math.round(durationMs / 1000) },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/operacao");
}

export async function adjustTimerAction(
  deltaSec: number,
  justification?: string
) {
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
        justification,
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
    justification: justification || `Ajuste manual de ${deltaSec}s`,
    metadata: {
      deltaSec,
      totalAdjustmentSec: Math.round(newAdjustmentMs / 1000),
    },
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
    allowException: true,
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

/**
 * Ação explícita para Pautas 1 a 5: Encerrar Exposição (15m) e Iniciar Pergunta e Resposta (5m)
 */
export async function startTopicQAPhaseAction() {
  const admin = await requireAdminPermission("canOperateTimer");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const liveState = await ensureLiveState(event.id);
  if (!liveState.activeTopicId) {
    throw new Error("Nenhuma pauta ativa no momento.");
  }

  const qaStep = await prisma.scheduleStep.findFirst({
    where: {
      eventId: event.id,
      topicId: liveState.activeTopicId,
      stepType: "AUDIENCE_VOICE",
      isMacroBlock: false,
    },
  });

  if (!qaStep) {
    throw new Error("Fase de Pergunta e Resposta não encontrada para esta pauta.");
  }

  const target = await transitionToStep({
    eventId: event.id,
    targetStepId: qaStep.id,
    operatorId: admin.id,
    operatorName: admin.fullName,
    prevStepStatus: "COMPLETED",
    autoStartTimer: true,
    allowException: true,
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "TOPIC_QA_PHASE_STARTED",
    entityType: "ScheduleStep",
    entityId: target.id,
    metadata: { code: target.code, title: target.title },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/operacao");
}

export async function previousStepAction(justification?: string) {
  const admin = await requireAdminPermission("canOperateTimer");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const liveState = await ensureLiveState(event.id);
  const allSteps = await prisma.scheduleStep.findMany({
    where: { eventId: event.id, isMacroBlock: false },
    orderBy: { sequenceOrder: "asc" },
  });

  const currentIdx = allSteps.findIndex((s) => s.id === liveState.activeStepId);
  const prevStep = currentIdx > 0 ? allSteps[currentIdx - 1] : allSteps[0];

  if (!prevStep) return;

  const target = await transitionToStep({
    eventId: event.id,
    targetStepId: prevStep.id,
    operatorId: admin.id,
    operatorName: admin.fullName,
    prevStepStatus: "PENDING",
    autoStartTimer: true,
    allowException: true,
    justification:
      justification || "Retorno operacional autorizado à etapa anterior",
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "STAGE_PREVIOUS",
    entityType: "ScheduleStep",
    entityId: target.id,
    justification:
      justification || "Retorno operacional autorizado à etapa anterior",
    metadata: { code: target.code, title: target.title },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/operacao");
}

export async function skipStepAction(justification?: string) {
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
    allowException: true,
    justification: justification || "Etapa pulada pelo operador de palco",
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "STAGE_SKIPPED",
    entityType: "ScheduleStep",
    entityId: target.id,
    justification: justification || "Etapa pulada pelo operador de palco",
    metadata: { skippedTo: target.code },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/operacao");
}

export async function jumpToStepAction(stepId: string, justification?: string) {
  const admin = await requireAdminPermission("canOperateTimer");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const stepToActivate = await prisma.scheduleStep.findUnique({
    where: { id: stepId },
  });
  if (!stepToActivate) throw new Error("Etapa não encontrada");

  // Se a etapa já estava COMPLETED, exige justificativa para reabrir (§2 e §7)
  const isReopeningCompleted = stepToActivate.status === "COMPLETED";
  if (isReopeningCompleted && !justification?.trim()) {
    throw new Error(
      "Para reabrir uma etapa já concluída, é obrigatório registrar uma justificativa."
    );
  }

  const target = await transitionToStep({
    eventId: event.id,
    targetStepId: stepId,
    operatorId: admin.id,
    operatorName: admin.fullName,
    prevStepStatus: "COMPLETED",
    autoStartTimer: true,
    allowException: true,
    justification:
      justification ||
      (isReopeningCompleted ? "Reabertura excepcional autorizada" : undefined),
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: isReopeningCompleted ? "STAGE_REOPENED_EXCEPTION" : "STAGE_JUMPED",
    entityType: "ScheduleStep",
    entityId: target.id,
    justification: justification || null,
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
    questionsOpen: false,
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "STAGE_FINISHED_FORMALLY",
    entityType: "ScheduleStep",
    entityId: liveState.activeStepId,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/operacao");
}

export async function setArenaModeManualAction(arenaMode: ArenaMode) {
  const admin = await requireAudiovisualOrOperator();
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  await updateLiveStateAtomic(event.id, "screen.message_updated", {
    arenaMode,
    emergencyActive: arenaMode === "CONTINGENCY",
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

  if (!poll) {
    poll = await prisma.poll.findFirst({
      where: { eventId: event.id },
      orderBy: { number: "asc" },
    });
  }

  if (!poll) throw new Error("Votação da Mesa-Redonda não encontrada");

  await prisma.poll.update({
    where: { id: poll.id },
    data: {
      status: "OPEN",
      isTieBreak: false,
      openedAt: new Date(),
    },
  });

  // Mantém o modo da Arena na exposição da Pauta 5 se estiver em andamento, ou muda para POLL_OPEN se estiver em transição
  const nextArenaMode =
    liveState.arenaMode === "SPEAKER_EXPOSITION"
      ? "SPEAKER_EXPOSITION"
      : "POLL_OPEN";

  await updateLiveStateAtomic(event.id, "poll.opened", {
    activePollId: poll.id,
    arenaMode: nextArenaMode,
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "ROUNDTABLE_POLL_OPENED",
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
  const pollId = liveState.activePollId;
  const pollRecord = pollId
    ? await prisma.poll.findUnique({
        where: { id: pollId },
        include: { options: { orderBy: { optionOrder: "asc" } } },
      })
    : await prisma.poll.findFirst({
        where: { eventId: event.id },
        include: { options: { orderBy: { optionOrder: "asc" } } },
      });

  if (!pollRecord) return;

  // Apura automaticamente a questão vencedora caso não haja empate no 1º lugar
  const sorted = [...pollRecord.options].sort(
    (a, b) => b.votesCount - a.votesCount
  );
  const topVotes = sorted[0]?.votesCount ?? 0;
  const tiedTop = sorted.filter((o) => o.votesCount === topVotes && topVotes > 0);

  const autoWinner = tiedTop.length === 1 ? tiedTop[0] : sorted[0] ?? null;

  const updatedPoll = await prisma.poll.update({
    where: { id: pollRecord.id },
    data: {
      status: "RESULTS_PUBLISHED",
      closedAt: new Date(),
      resultsPublishedAt: new Date(),
      closedByUserId: admin.id,
      winningOptionId:
        pollRecord.winningOptionId ?? (autoWinner ? autoWinner.id : null),
      winningQuestionText:
        pollRecord.winningQuestionText ??
        (autoWinner ? autoWinner.label : null),
    },
  });

  await updateLiveStateAtomic(event.id, "poll.results_published", {
    activePollId: updatedPoll.id,
    arenaMode: "POLL_RESULTS",
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "POLL_CLOSED_AND_PUBLISHED",
    entityType: "Poll",
    entityId: updatedPoll.id,
    metadata: {
      number: updatedPoll.number,
      totalVotes: updatedPoll.totalVotes,
      winningOptionId: updatedPoll.winningOptionId,
    },
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

  let fallbackMode: ArenaMode = "SPEAKER_EXPOSITION";
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
  const admin = await requireAudiovisualOrOperator();
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const liveState = await ensureLiveState(event.id);

  let fallbackMode: ArenaMode = "SPEAKER_EXPOSITION";
  if (liveState.activeStepId) {
    const step = await prisma.scheduleStep.findUnique({
      where: { id: liveState.activeStepId },
    });
    if (step) fallbackMode = step.arenaMode;
  }

  const defaultMsg =
    "Estamos realizando um ajuste técnico. A programação continuará em instantes.";

  await updateLiveStateAtomic(event.id, "screen.message_updated", {
    emergencyActive: active,
    emergencyMessage: active ? customMessage || defaultMsg : null,
    status: active ? "EMERGENCY" : "LIVE",
    arenaMode: active ? "CONTINGENCY" : fallbackMode,
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: active ? "CONTINGENCY_MODE_ACTIVATED" : "CONTINGENCY_MODE_DEACTIVATED",
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

/**
 * Reinicia completamente o evento para permitir múltiplas execuções (testes ou nova rodada).
 * Retorna o evento para WAITING, zera o cronograma, perguntas de teste e votos,
 * permitindo executar o evento novamente desde o passo 1.
 */
export async function resetEntireEventAction(options?: {
  clearAudienceQuestions?: boolean;
  clearAudienceVotes?: boolean;
}) {
  const admin = await requireAdminPermission("canOperateTimer");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const clearQuestions = options?.clearAudienceQuestions ?? true;
  const clearVotes = options?.clearAudienceVotes ?? true;

  // 1. Resetar o evento para WAITING e desbloquear cronograma
  await prisma.event.update({
    where: { id: event.id },
    data: {
      status: "WAITING",
      scheduleLocked: false,
      actualStartAt: null,
      actualEndAt: null,
    },
  });

  // 2. Resetar todas as etapas operacionais e blocos macro para PENDING
  await prisma.scheduleStep.updateMany({
    where: { eventId: event.id },
    data: {
      status: "PENDING",
      actualStartAt: null,
      actualEndAt: null,
      actualDurationSec: null,
      alertTwoMinFired: false,
      alertThirtySecFired: false,
      alertZeroFired: false,
    },
  });

  // 3. Resetar pautas para PENDING
  await prisma.topic.updateMany({
    where: { eventId: event.id },
    data: {
      status: "PENDING",
      primaryQuestionId: null,
    },
  });

  // 4. Limpar perguntas da plateia (preservando perguntas de reserva da mediação)
  if (clearQuestions) {
    await prisma.question.deleteMany({
      where: { eventId: event.id, isMediationReserve: false },
    });
    await prisma.question.updateMany({
      where: { eventId: event.id, isMediationReserve: true },
      data: {
        status: "APPROVED",
        isPrimary: false,
        isReserve: true,
        displayedAt: null,
        answeredAt: null,
        moderatedById: null,
      },
    });
  }

  // 5. Resetar votação e votos
  if (clearVotes) {
    await prisma.voteHistory.deleteMany({
      where: { poll: { eventId: event.id } },
    });
    await prisma.vote.deleteMany({
      where: { poll: { eventId: event.id } },
    });
  }

  const poll = await prisma.poll.findFirst({
    where: { eventId: event.id },
    orderBy: { number: "asc" },
  });

  if (poll) {
    await prisma.pollOption.updateMany({
      where: { pollId: poll.id },
      data: { votesCount: 0 },
    });

    await prisma.poll.update({
      where: { id: poll.id },
      data: {
        status: "OPEN",
        totalVotes: 0,
        winningOptionId: null,
        winningQuestionText: null,
        isTieBreak: false,
        tieBreakOptionIds: [],
        tieBreakJustification: null,
        openedAt: new Date(),
        closedAt: null,
        resultsPublishedAt: null,
      },
    });
  }

  // 6. Limpar sessões de cronômetro
  await prisma.timerSession.deleteMany({
    where: { eventId: event.id },
  });

  // 7. Localizar primeira etapa (Abertura)
  const firstStep = await prisma.scheduleStep.findFirst({
    where: { eventId: event.id, isMacroBlock: false },
    orderBy: { sequenceOrder: "asc" },
  });

  // 8. Resetar LiveState para WAITING
  await updateLiveStateAtomic(event.id, "system.initialized", {
    status: "WAITING",
    arenaMode: "WAITING",
    activeStepId: firstStep?.id ?? null,
    activeTopicId: null,
    activePollId: poll?.id ?? null,
    selectedQuestionId: null,
    questionsOpen: false,
    timerStatus: "IDLE",
    timerStartedAt: null,
    timerPausedAt: null,
    timerDurationMs: (firstStep?.durationSec ?? 300) * 1000,
    timerAccumulatedPauseMs: 0,
    timerAdjustmentMs: 0,
    emergencyActive: false,
    emergencyMessage: null,
  });

  // 9. Invalidar cache em memória
  invalidateStaticEventCache();

  // 10. Registrar auditoria
  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "EVENT_RESET_FOR_NEW_RUN",
    entityType: "Event",
    entityId: event.id,
    metadata: {
      clearedQuestions: clearQuestions,
      clearedVotes: clearVotes,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/operacao");
  revalidatePath("/admin/cronograma");
  revalidatePath("/admin/votacoes");
  revalidatePath("/admin/perguntas");
  revalidatePath("/arena");
  revalidatePath("/participar");
}
