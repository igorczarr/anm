import { ArenaMode, EventStatus, TimerStatus } from "@prisma/client";

export type ArenaSyncEventType =
  | "system.initialized"
  | "event.started"
  | "event.paused"
  | "event.resumed"
  | "event.finished"
  | "topic.changed"
  | "stage.started"
  | "stage.finished"
  | "timer.updated"
  | "question.received"
  | "question.approved"
  | "question.selected"
  | "poll.opened"
  | "poll.vote_received"
  | "poll.closed"
  | "poll.results_published"
  | "screen.message_updated"
  | "config.updated";

export interface TimerComputationInput {
  timerStatus: TimerStatus;
  timerStartedAt: Date | string | null;
  timerPausedAt: Date | string | null;
  timerDurationMs: number;
  timerAccumulatedPauseMs: number;
  timerAdjustmentMs: number;
  nowMs?: number;
}

export interface ComputedTimerSnapshot {
  status: TimerStatus;
  totalDurationMs: number;
  elapsedMs: number;
  remainingMs: number;
  overrunMs: number;
  remainingSec: number;
  formatted: string;
  alertLevel: "NORMAL" | "WARNING_2MIN" | "CRITICAL_30S" | "EXPIRED";
}

export function formatSecondsMMSS(totalSec: number): string {
  const absSec = Math.max(0, Math.floor(totalSec));
  const mins = Math.floor(absSec / 60);
  const secs = absSec % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

/**
 * Calcula o tempo restante com base na referência temporal centralizada no servidor.
 * Nunca depende de um contador local que perde sincronia após F5 ou reconexão.
 */
export function computeServerTimerSnapshot(
  input: TimerComputationInput
): ComputedTimerSnapshot {
  const now = input.nowMs ?? Date.now();
  const baseDurationMs = Math.max(
    0,
    (input.timerDurationMs || 0) + (input.timerAdjustmentMs || 0)
  );

  if (
    input.timerStatus === "IDLE" ||
    !input.timerStartedAt ||
    baseDurationMs === 0
  ) {
    const sec = Math.ceil(baseDurationMs / 1000);
    return {
      status: input.timerStatus,
      totalDurationMs: baseDurationMs,
      elapsedMs: 0,
      remainingMs: baseDurationMs,
      overrunMs: 0,
      remainingSec: sec,
      formatted: formatSecondsMMSS(sec),
      alertLevel: "NORMAL",
    };
  }

  const startMs = new Date(input.timerStartedAt).getTime();
  const effectiveNow =
    input.timerStatus === "PAUSED" && input.timerPausedAt
      ? new Date(input.timerPausedAt).getTime()
      : now;

  const rawElapsed = Math.max(
    0,
    effectiveNow - startMs - (input.timerAccumulatedPauseMs || 0)
  );
  const remainingMs = Math.max(0, baseDurationMs - rawElapsed);
  const overrunMs = Math.max(0, rawElapsed - baseDurationMs);
  const remainingSec = Math.ceil(remainingMs / 1000);

  let alertLevel: ComputedTimerSnapshot["alertLevel"] = "NORMAL";
  if (remainingSec <= 0) {
    alertLevel = "EXPIRED";
  } else if (remainingSec <= 30) {
    alertLevel = "CRITICAL_30S";
  } else if (remainingSec <= 120) {
    alertLevel = "WARNING_2MIN";
  }

  const effectiveStatus: TimerStatus =
    remainingSec <= 0 && input.timerStatus === "RUNNING"
      ? "EXPIRED"
      : input.timerStatus;

  return {
    status: effectiveStatus,
    totalDurationMs: baseDurationMs,
    elapsedMs: rawElapsed,
    remainingMs,
    overrunMs,
    remainingSec,
    formatted: formatSecondsMMSS(remainingSec),
    alertLevel,
  };
}

export const ARENA_MODE_LABELS: Record<ArenaMode, string> = {
  WAITING: "Tela de Espera",
  OPENING: "Abertura",
  TOPIC_OVERVIEW: "Pauta em Andamento",
  SPEAKER_EXPOSITION: "Exposição do Palestrante",
  PROVOCATION: "Momento de Provocação",
  REBUTTAL: "Réplica",
  POLL_OPEN: "Votação Aberta",
  POLL_RESULTS: "Resultado da Votação",
  SELECTED_QUESTION: "Pergunta Selecionada (Voz da Plateia)",
  INTERVAL: "Intervalo",
  COLLECTIVE_BUILDING: "Construção Coletiva",
  CLOSING: "Encerramento",
  OPERATIONAL_NOTICE: "Aviso Operacional",
};

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  CONFIGURING: "Em Configuração",
  WAITING: "Aguardando Início",
  LIVE: "Ao Vivo",
  PAUSED: "Pausado",
  INTERVAL: "Em Intervalo",
  FINISHED: "Encerrado",
  EMERGENCY: "Modo de Emergência",
};
