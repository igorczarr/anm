import { prisma } from "@/lib/prisma";
import { LiveState, Prisma, ScheduleStep } from "@prisma/client";

export interface PauseLogEntry {
  pausedAt: string;
  resumedAt?: string;
  durationSec?: number;
  operatorName: string;
}

export interface AdjustmentLogEntry {
  at: string;
  deltaSec: number;
  operatorName: string;
  justification?: string;
}

/**
 * Calcula estatísticas exatas de execução de um TimerSession com base no estado atual do LiveState
 */
export function computeSessionClosureMetrics(
  liveState: LiveState,
  plannedDurationSec: number,
  nowMs: number = Date.now()
) {
  if (!liveState.timerStartedAt) {
    return {
      effectiveDurationSec: 0,
      pausedTotalSec: 0,
      overrunSec: 0,
    };
  }

  const startMs = new Date(liveState.timerStartedAt).getTime();
  const extraPauseMs =
    liveState.timerStatus === "PAUSED" && liveState.timerPausedAt
      ? Math.max(0, nowMs - new Date(liveState.timerPausedAt).getTime())
      : 0;

  const totalPausedMs = (liveState.timerAccumulatedPauseMs || 0) + extraPauseMs;
  const effectiveElapsedMs = Math.max(0, nowMs - startMs - totalPausedMs);
  const effectiveDurationSec = Math.round(effectiveElapsedMs / 1000);
  const pausedTotalSec = Math.round(totalPausedMs / 1000);

  const adjustedTargetSec = Math.max(
    0,
    plannedDurationSec + Math.round((liveState.timerAdjustmentMs || 0) / 1000)
  );
  const overrunSec = Math.max(0, effectiveDurationSec - adjustedTargetSec);

  return {
    effectiveDurationSec,
    pausedTotalSec,
    overrunSec,
  };
}

/**
 * Encerra a sessão de cronômetro ativa (se existir) para a etapa atual e consolida os tempos em ScheduleStep e Topic
 */
export async function closeActiveTimerSession({
  eventId,
  liveState,
  stepStatus = "COMPLETED",
  operatorId,
  operatorName,
}: {
  eventId: string;
  liveState: LiveState;
  stepStatus?: "COMPLETED" | "SKIPPED" | "PENDING";
  operatorId: string;
  operatorName: string;
}) {
  if (!liveState.activeStepId) return;

  const now = new Date();
  const nowMs = now.getTime();

  const step = await prisma.scheduleStep.findUnique({
    where: { id: liveState.activeStepId },
  });
  if (!step) return;

  const metrics = computeSessionClosureMetrics(
    liveState,
    step.durationSec,
    nowMs
  );

  const openSession = await prisma.timerSession.findFirst({
    where: {
      eventId,
      stepId: step.id,
      status: { in: ["RUNNING", "PAUSED", "EXPIRED"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (openSession) {
    await prisma.timerSession.update({
      where: { id: openSession.id },
      data: {
        actualEndAt: now,
        effectiveDurationSec: metrics.effectiveDurationSec,
        pausedTotalSec: metrics.pausedTotalSec,
        overrunSec: metrics.overrunSec,
        status: "FINISHED",
        changedByUserId: operatorId,
        changedByName: operatorName,
      },
    });
  }

  await prisma.scheduleStep.update({
    where: { id: step.id },
    data: {
      status: stepStatus,
      actualEndAt: now,
      actualDurationSec:
        metrics.effectiveDurationSec > 0
          ? metrics.effectiveDurationSec
          : step.actualDurationSec,
    },
  });

  // Se o bloco macro correspondente tiver todas as etapas concluídas, marca-o como COMPLETED
  if (step.macroOrder) {
    const siblingSteps = await prisma.scheduleStep.findMany({
      where: {
        eventId,
        macroOrder: step.macroOrder,
        isMacroBlock: false,
      },
    });
    const allCompleted = siblingSteps.every(
      (s) => s.status === "COMPLETED" || s.status === "SKIPPED"
    );
    if (allCompleted) {
      const totalMacroActual = siblingSteps.reduce(
        (acc, s) => acc + (s.actualDurationSec || 0),
        0
      );
      await prisma.scheduleStep.updateMany({
        where: {
          eventId,
          macroOrder: step.macroOrder,
          isMacroBlock: true,
        },
        data: {
          status: "COMPLETED",
          actualEndAt: now,
          actualDurationSec: totalMacroActual,
        },
      });
    }
  }

  // Se a etapa pertence a uma pauta, consolida o tempo total realizado, tempo de exposição (15m) e tempo de P&R (5m)
  if (step.topicId) {
    const topicSteps = await prisma.scheduleStep.findMany({
      where: { eventId, topicId: step.topicId, isMacroBlock: false },
    });

    const totalTopicActual = topicSteps.reduce(
      (acc, s) => acc + (s.actualDurationSec || 0),
      0
    );
    const expositionStep = topicSteps.find((s) => s.stepType === "EXPOSITION");
    const qaStep = topicSteps.find((s) => s.stepType === "AUDIENCE_VOICE");
    const allTopicStepsCompleted = topicSteps.every(
      (s) => s.status === "COMPLETED" || s.status === "SKIPPED"
    );

    await prisma.topic.update({
      where: { id: step.topicId },
      data: {
        actualDurationSec: totalTopicActual,
        expositionDurationSec: expositionStep?.actualDurationSec ?? null,
        qaDurationSec: qaStep?.actualDurationSec ?? null,
        ...(allTopicStepsCompleted ? { status: "COMPLETED" } : {}),
      },
    });
  }
}

/**
 * Abre uma nova TimerSession ao iniciar uma etapa no motor de fluxo
 */
export async function startNewTimerSessionForStep({
  eventId,
  step,
  operatorId,
  operatorName,
  autoRun = true,
}: {
  eventId: string;
  step: ScheduleStep;
  operatorId: string;
  operatorName: string;
  autoRun?: boolean;
}) {
  const now = new Date();
  const plannedEndAt = new Date(now.getTime() + step.durationSec * 1000);

  await prisma.scheduleStep.update({
    where: { id: step.id },
    data: {
      status: autoRun ? "ACTIVE" : "PAUSED",
      actualStartAt: step.actualStartAt ?? now,
      plannedStartAt: step.plannedStartAt ?? now,
      plannedEndAt,
      alertTwoMinFired: false,
      alertThirtySecFired: false,
      alertZeroFired: false,
    },
  });

  if (step.macroOrder) {
    await prisma.scheduleStep.updateMany({
      where: {
        eventId,
        macroOrder: step.macroOrder,
        isMacroBlock: true,
      },
      data: {
        status: autoRun ? "ACTIVE" : "PAUSED",
        actualStartAt: now,
      },
    });
  }

  if (step.topicId) {
    await prisma.topic.update({
      where: { id: step.topicId },
      data: { status: "ACTIVE" },
    });
  }

  const session = await prisma.timerSession.create({
    data: {
      eventId,
      stepId: step.id,
      plannedStartAt: now,
      actualStartAt: now,
      plannedEndAt,
      plannedDurationSec: step.durationSec,
      pausedTotalSec: 0,
      addedTotalSec: 0,
      reducedTotalSec: 0,
      overrunSec: 0,
      pausesLog: [] as unknown as Prisma.InputJsonValue,
      adjustmentsLog: [] as unknown as Prisma.InputJsonValue,
      changedByUserId: operatorId,
      changedByName: operatorName,
      status: autoRun ? "RUNNING" : "PAUSED",
    },
  });

  return session;
}
