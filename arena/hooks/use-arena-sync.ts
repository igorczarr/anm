"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  computeServerTimerSnapshot,
  ComputedTimerSnapshot,
} from "@/lib/events";
import type {
  ArenaMode,
  EventStatus,
  PollStatus,
  QuestionStatus,
  StepStatus,
  StepType,
  TimerStatus,
} from "@prisma/client";

export interface SyncTopicInfo {
  id: string;
  number: number;
  title: string;
  durationSec: number;
  provokerLabel: string;
  mainSpeaker: {
    id: string;
    name: string;
    photoUrl: string | null;
    roleTitle: string | null;
  };
  provoker: {
    id: string;
    name: string;
    photoUrl: string | null;
    roleTitle: string | null;
  } | null;
}

export interface SyncStepInfo {
  id: string;
  code: string;
  title: string;
  stepType: StepType;
  arenaMode?: ArenaMode;
  sequenceOrder: number;
  macroOrder?: number | null;
  durationSec: number;
  actualDurationSec?: number | null;
  status?: StepStatus;
  phaseLabel?: string;
  responsibleName: string;
  speaker?: {
    id: string;
    name: string;
    photoUrl: string | null;
    roleTitle: string | null;
  } | null;
  topicNumber: number | null;
}

export interface SyncMacroBlockInfo {
  id: string;
  code: string;
  macroOrder: number | null;
  title: string;
  stepType: StepType;
  arenaMode: ArenaMode;
  durationSec: number;
  actualDurationSec?: number | null;
  status: StepStatus;
  responsibleName: string | null;
  topicNumber: number | null;
}

export interface SyncSpeakerInfo {
  id: string;
  slug: string;
  name: string;
  roleTitle: string | null;
  photoUrl: string | null;
  displayOrder: number;
}

export interface SyncTimerSessionRecord {
  id: string;
  stepCode: string;
  stepTitle: string;
  sequenceOrder: number;
  plannedDurationSec: number;
  effectiveDurationSec: number | null;
  pausedTotalSec: number;
  addedTotalSec: number;
  reducedTotalSec: number;
  overrunSec: number;
  status: TimerStatus;
  changedByName: string | null;
  actualStartAt: string;
  actualEndAt: string | null;
}

export interface SyncPollInfo {
  id: string;
  number: number;
  topicId: string | null;
  question: string;
  status: PollStatus;
  durationSec: number;
  isTieBreak?: boolean;
  tieBreakOptionIds?: string[];
  tieBreakJustification?: string | null;
  winningOptionId?: string | null;
  winningQuestionText?: string | null;
  totalVotes: number | null;
  options: Array<{
    id: string;
    optionOrder: number;
    themeLabel?: string;
    label: string;
    isWinner?: boolean;
    votesCount: number | null;
    percentage: number | null;
  }>;
}

export interface ArenaFullSnapshot {
  initialized: boolean;
  unchanged?: boolean;
  eventId: string;
  seq: number;
  lastEventType: string;
  serverNow: number;
  event: {
    id: string;
    slug: string;
    name: string;
    theme: string;
    institution: string;
    estimatedAudience: number;
    programmedDurationMin: number;
    certifiedHours?: number;
    scheduleLocked?: boolean;
    requireCredential?: boolean;
    requireAccessCode?: boolean;
    scheduledStartAt: string | null;
    actualStartAt?: string | null;
    actualEndAt?: string | null;
    questionCharLimit: number;
    maxQuestionsPerTopic: number;
  };
  liveState: {
    status: EventStatus;
    arenaMode: ArenaMode;
    activeStepId?: string | null;
    activeTopicId?: string | null;
    activePollId?: string | null;
    selectedQuestionId?: string | null;
    questionsOpen: boolean;
    showTimerOnArena: boolean;
    soundAlertsEnabled: boolean;
    emergencyActive: boolean;
    emergencyMessage: string | null;
    arenaOnline: boolean;
    arenaLastHeartbeatAt: string | null;
    timerStartedAt: string | null;
    timerPausedAt: string | null;
    timerDurationMs: number;
    timerAccumulatedPauseMs: number;
    timerAdjustmentMs: number;
    timerStatus: TimerStatus;
  };
  timer: ComputedTimerSnapshot;
  speakers?: SyncSpeakerInfo[];
  macroBlocks?: SyncMacroBlockInfo[];
  activeTopic: SyncTopicInfo | null;
  activeStep: SyncStepInfo | null;
  prevStep?: SyncStepInfo | null;
  nextStep: SyncStepInfo | null;
  activePoll: SyncPollInfo | null;
  selectedQuestion: {
    id: string;
    text: string;
    status: QuestionStatus;
    isMediationReserve?: boolean;
    originLabel?: string;
    moderatorName?: string | null;
    topicNumber: number;
    topicTitle: string;
  } | null;
  screenMessage: {
    id: string;
    title: string;
    body: string;
    severity: string;
  } | null;
  metrics: {
    connectedParticipants: number;
    peakConnections: number;
    questionsTotal: number;
    questionsPending: number;
    questionsApproved: number;
    activePollVotes: number;
  };
  operationalSteps?: SyncStepInfo[];
  recentTimerSessions?: SyncTimerSessionRecord[];
}

export function useArenaSync(options?: {
  isAdmin?: boolean;
  isArenaScreen?: boolean;
}) {
  const [snapshot, setSnapshot] = useState<ArenaFullSnapshot | null>(null);
  const [timer, setTimer] = useState<ComputedTimerSnapshot>({
    status: "IDLE",
    totalDurationMs: 0,
    elapsedMs: 0,
    remainingMs: 0,
    overrunMs: 0,
    remainingSec: 0,
    formatted: "00:00",
    alertLevel: "NORMAL",
  });
  const [connected, setConnected] = useState<boolean>(true);
  const [lastSyncedAt, setLastSyncedAt] = useState<number>(Date.now());

  const seqRef = useRef<number>(0);
  const clockOffsetMsRef = useRef<number>(0);
  const snapshotRef = useRef<ArenaFullSnapshot | null>(null);

  const applyIncomingPayload = useCallback((data: ArenaFullSnapshot) => {
    if (!data || !data.initialized) return;

    if (typeof data.serverNow === "number") {
      clockOffsetMsRef.current = data.serverNow - Date.now();
    }

    setConnected(true);
    setLastSyncedAt(Date.now());

    // Proteção contra pacotes atrasados (§11.2 e §16.4):
    // nunca permite que uma mensagem com seq menor sobrescreva um estado mais recente
    if (data.seq < seqRef.current) {
      return;
    }

    if (data.unchanged && snapshotRef.current) {
      if (data.timer) {
        setTimer(data.timer);
      }
      return;
    }

    seqRef.current = data.seq;
    snapshotRef.current = data;
    setSnapshot(data);
    if (data.timer) {
      setTimer(data.timer);
    }
  }, []);

  const fetchStateSnapshot = useCallback(
    async (forceFull = false) => {
      try {
        const params = new URLSearchParams();
        if (!forceFull && seqRef.current > 0) {
          params.set("since", String(seqRef.current));
        }
        if (options?.isAdmin) {
          params.set("admin", "1");
        }
        const res = await fetch(`/api/state?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        applyIncomingPayload(data);
      } catch {
        setConnected(false);
      }
    },
    [applyIncomingPayload, options?.isAdmin]
  );

  // Conexão SSE + Polling de redundância (2s) + Heartbeat da tela ARENA
  useEffect(() => {
    let active = true;
    let es: EventSource | null = null;

    fetchStateSnapshot(true);

    const connectSSE = () => {
      if (!active) return;
      try {
        const url = options?.isAdmin ? "/api/stream?admin=1" : "/api/stream";
        es = new EventSource(url);
        es.addEventListener("sync", (ev) => {
          try {
            const parsed = JSON.parse((ev as MessageEvent).data);
            applyIncomingPayload(parsed);
          } catch {
            // ignore
          }
        });
        es.onerror = () => {
          es?.close();
          setTimeout(() => {
            if (active) connectSSE();
          }, 3000);
        };
      } catch {
        // Fallback puro de polling já garante operação
      }
    };

    connectSSE();

    const pollInterval = setInterval(() => {
      fetchStateSnapshot(false);
    }, 2000);

    let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
    if (options?.isArenaScreen) {
      const sendHeartbeat = () => {
        fetch("/api/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source: "ARENA_SCREEN" }),
        }).catch(() => {});
      };
      sendHeartbeat();
      heartbeatInterval = setInterval(sendHeartbeat, 6000);
    }

    return () => {
      active = false;
      es?.close();
      clearInterval(pollInterval);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, [
    fetchStateSnapshot,
    applyIncomingPayload,
    options?.isAdmin,
    options?.isArenaScreen,
  ]);

  // Atualização local suave (250ms) baseada estritamente na referência temporal do servidor
  useEffect(() => {
    const tick = setInterval(() => {
      const current = snapshotRef.current;
      if (!current?.liveState) return;
      const ls = current.liveState;
      const estimatedServerNow = Date.now() + clockOffsetMsRef.current;
      const computed = computeServerTimerSnapshot({
        timerStatus: ls.timerStatus,
        timerStartedAt: ls.timerStartedAt,
        timerPausedAt: ls.timerPausedAt,
        timerDurationMs: ls.timerDurationMs,
        timerAccumulatedPauseMs: ls.timerAccumulatedPauseMs,
        timerAdjustmentMs: ls.timerAdjustmentMs,
        nowMs: estimatedServerNow,
      });
      setTimer(computed);
    }, 250);

    return () => clearInterval(tick);
  }, []);

  return {
    snapshot,
    timer,
    connected,
    lastSyncedAt,
    refreshNow: () => fetchStateSnapshot(true),
  };
}
