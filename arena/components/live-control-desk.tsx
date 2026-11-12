"use client";

import { useState, useTransition, useEffect, useRef, useCallback } from "react";
import { useArenaSync } from "@/hooks/use-arena-sync";
import {
  ARENA_MODE_LABELS,
  EVENT_STATUS_LABELS,
  formatSecondsMMSS,
} from "@/lib/events";
import {
  adjustTimerAction,
  clearOperationalNoticeAction,
  finishEventAction,
  jumpToStepAction,
  nextStepAction,
  openCurrentTopicPollAction,
  pauseTimerAction,
  publishOperationalNoticeAction,
  resetEntireEventAction,
  resetTimerAction,
  resumeTimerAction,
  setArenaModeManualAction,
  startEventAction,
  startTopicQAPhaseAction,
  toggleEmergencyModeAction,
  toggleQuestionsOpenAction,
} from "@/app/actions/live-operation";
import type { ArenaMode } from "@prisma/client";
import { CurationDesk } from "@/components/curation-desk";
import { PollsDesk } from "@/components/polls-desk";
import { getSpeakerPhoto } from "@/lib/speakers";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Layers,
  Megaphone,
  MessageSquareMore,
  Minus,
  MonitorPlay,
  Pause,
  Play,
  Plus,
  Radio,
  RotateCcw,
  ShieldAlert,
  SkipForward,
  Undo2,
  Users,
  Volume2,
  VolumeX,
  Vote,
  Wifi,
  WifiOff,
} from "lucide-react";

interface PendingConfirmAction {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  requireJustification?: boolean;
  execute: (justification?: string) => Promise<void>;
}

function playDiscreteAlertBeep(kind: "WARNING_2MIN" | "CRITICAL_30S" | "EXPIRED") {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const pattern =
      kind === "WARNING_2MIN"
        ? [{ freq: 587.33, dur: 0.14, delay: 0 }]
        : kind === "CRITICAL_30S"
          ? [
              { freq: 783.99, dur: 0.14, delay: 0 },
              { freq: 783.99, dur: 0.14, delay: 0.2 },
            ]
          : [
              { freq: 880, dur: 0.2, delay: 0 },
              { freq: 659.25, dur: 0.25, delay: 0.25 },
              { freq: 880, dur: 0.3, delay: 0.55 },
            ];

    for (const note of pattern) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = note.freq;
      gain.gain.setValueAtTime(0.08, ctx.currentTime + note.delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.delay + note.dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + note.delay);
      osc.stop(ctx.currentTime + note.delay + note.dur);
    }
  } catch {
    // audio block ignore
  }
}

export function LiveControlDesk({ compact = false }: { compact?: boolean }) {
  const { snapshot, timer, connected, refreshNow } = useArenaSync({ isAdmin: true });
  const [isPending, startTransition] = useTransition();

  // Abas internas instantâneas
  const [activeTab, setActiveTab] = useState<"palco" | "perguntas" | "votacoes">("palco");

  // Modal centralizado
  const [confirmModal, setConfirmModal] = useState<PendingConfirmAction | null>(null);
  const [justificationText, setJustificationText] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  // Undo de avanço (8s)
  const [undoState, setUndoState] = useState<{
    stepId: string;
    stepTitle: string;
    expiresAt: number;
  } | null>(null);
  const [undoSecondsLeft, setUndoSecondsLeft] = useState<number>(0);

  // Seções recolhíveis
  const [showSecondaryActions, setShowSecondaryActions] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  // Áudio
  const [soundMutedLocal, setSoundMutedLocal] = useState(false);
  const lastAlertLevelRef = useRef<string>("NORMAL");

  // Sincroniza query param ?aba= se presente na URL inicial
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const aba = params.get("aba");
      if (aba === "perguntas") setActiveTab("perguntas");
      else if (aba === "votacao" || aba === "votacoes") setActiveTab("votacoes");
    }
  }, []);

  // Timer do Undo (8s)
  useEffect(() => {
    if (!undoState) {
      setUndoSecondsLeft(0);
      return;
    }
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((undoState.expiresAt - Date.now()) / 1000));
      setUndoSecondsLeft(remaining);
      if (remaining <= 0) {
        setUndoState(null);
      }
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 500);
    return () => clearInterval(interval);
  }, [undoState]);

  // Alerta sonoro por nível de timer
  useEffect(() => {
    const prev = lastAlertLevelRef.current;
    const curr = timer.alertLevel;
    lastAlertLevelRef.current = curr;

    if (timer.status !== "RUNNING" && timer.status !== "EXPIRED") return;

    const soundAllowed = snapshot?.liveState.soundAlertsEnabled && !soundMutedLocal;
    if (!soundAllowed) return;

    if (curr !== prev && curr !== "NORMAL") {
      playDiscreteAlertBeep(curr);
    }
  }, [timer.alertLevel, timer.status, snapshot?.liveState.soundAlertsEnabled, soundMutedLocal]);

  const runAction = useCallback(
    (fn: () => Promise<void>) => {
      setActionError(null);
      startTransition(async () => {
        try {
          await fn();
          await refreshNow();
        } catch (err) {
          setActionError(err instanceof Error ? err.message : "Erro ao executar ação operacional.");
        }
      });
    },
    [refreshNow]
  );

  const askConfirm = (action: PendingConfirmAction) => {
    setJustificationText("");
    setConfirmModal(action);
  };

  const ls = snapshot?.liveState;
  const activeStep = snapshot?.activeStep;
  const nextStep = snapshot?.nextStep;
  const activeTopic = snapshot?.activeTopic;
  const activePoll = snapshot?.activePoll;
  const macroBlocks = snapshot?.macroBlocks || [];

  const isTopicExpositionPhase = activeStep?.stepType === "EXPOSITION" && Boolean(activeTopic);
  const isTopicQAPhase = activeStep?.stepType === "AUDIENCE_VOICE" && Boolean(activeTopic);

  // A votação só tem prioridade após a Pauta 5
  const isAfterTopic5 = activeTopic ? activeTopic.number >= 5 : Boolean(activeStep?.sequenceOrder && activeStep.sequenceOrder >= 11);

  const progressPercent =
    timer.totalDurationMs > 0
      ? Math.min(100, Math.round((timer.elapsedMs / timer.totalDurationMs) * 100))
      : 0;

  const overrunSec = Math.floor(timer.overrunMs / 1000);

  const speakerName = activeStep?.speaker?.name || activeTopic?.mainSpeaker?.name || activeStep?.responsibleName;
  const speakerPhoto = getSpeakerPhoto(speakerName, activeStep?.speaker?.photoUrl || activeTopic?.mainSpeaker?.photoUrl);

  const handleQuickAdvance = () => {
    if (!activeStep) return;

    if (ls?.status === "WAITING" || ls?.timerStatus === "IDLE") {
      askConfirm({
        title: "Iniciar Evento A Nova Moeda (145 min)",
        description:
          "Isso colocará o evento AO VIVO, bloqueará edições comuns no cronograma e iniciará o cronômetro da primeira etapa. Confirmar início?",
        confirmLabel: "Iniciar Evento Agora",
        execute: () => startEventAction(),
      });
      return;
    }

    if (isTopicExpositionPhase) {
      const stepToRemember = activeStep;
      runAction(async () => {
        await startTopicQAPhaseAction();
        setUndoState({
          stepId: stepToRemember.id,
          stepTitle: stepToRemember.title,
          expiresAt: Date.now() + 8000,
        });
      });
      return;
    }

    if (nextStep) {
      const stepToRemember = activeStep;
      runAction(async () => {
        await nextStepAction();
        setUndoState({
          stepId: stepToRemember.id,
          stepTitle: stepToRemember.title,
          expiresAt: Date.now() + 8000,
        });
      });
    } else {
      askConfirm({
        title: "Finalizar Evento A Nova Moeda",
        description: "Deseja encerrar oficialmente o evento e exibir a tela de encerramento?",
        confirmLabel: "Finalizar Evento",
        danger: true,
        execute: () => finishEventAction(),
      });
    }
  };

  const handleUndo = () => {
    if (!undoState) return;
    const targetId = undoState.stepId;
    setUndoState(null);
    runAction(() => jumpToStepAction(targetId, "Desfeito pelo operador (8s)"));
  };

  return (
    <div className="space-y-6">
      {/* Modal de Confirmação Centralizado */}
      {confirmModal && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg border border-white/[0.12] bg-[#0A120D] p-6 sm:p-7 rounded-2xl space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-[#F7DECA]">
              <AlertTriangle
                className={`w-5 h-5 shrink-0 ${
                  confirmModal.danger ? "text-red-400" : "text-amber-400"
                }`}
              />
              <h3 className="font-display text-lg font-bold leading-snug">{confirmModal.title}</h3>
            </div>

            <p className="text-xs sm:text-sm text-[#D5C5AA]/85 leading-relaxed">
              {confirmModal.description}
            </p>

            {confirmModal.requireJustification && (
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold text-[#F7DECA]">
                  Justificativa Obrigatória (Auditoria):
                </label>
                <textarea
                  rows={2}
                  value={justificationText}
                  onChange={(e) => setJustificationText(e.target.value)}
                  placeholder="Informe o motivo operacional desta ação..."
                  className="w-full px-3.5 py-2 text-xs border border-white/[0.12] bg-[#030A06] text-[#F7DECA] rounded-xl outline-none focus:border-emerald-500"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-xs font-medium border border-white/[0.12] rounded-xl text-[#D5C5AA] hover:bg-white/5 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  isPending ||
                  (confirmModal.requireJustification && justificationText.trim().length < 5)
                }
                onClick={() => {
                  const fn = confirmModal.execute;
                  const just = justificationText.trim() || undefined;
                  setConfirmModal(null);
                  runAction(() => fn(just));
                }}
                className={`px-5 py-2 text-xs font-semibold rounded-xl text-white cursor-pointer disabled:opacity-40 shadow-sm transition ${
                  confirmModal.danger
                    ? "bg-red-600 hover:bg-red-500"
                    : "bg-emerald-600 hover:bg-emerald-500"
                }`}
              >
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner de Desfazer (8s) */}
      {undoState && (
        <div className="border border-emerald-500/40 bg-emerald-950/80 text-white p-3.5 rounded-2xl flex items-center justify-between gap-4 shadow-xl animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span>
              Avanço efetuado. Etapa anterior: <strong>&ldquo;{undoState.stepTitle}&rdquo;</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={handleUndo}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>Desfazer ({undoSecondsLeft}s)</span>
          </button>
        </div>
      )}

      {/* Erro de Ação */}
      {actionError && (
        <div className="border border-red-500/50 bg-red-950/30 p-3.5 rounded-2xl flex items-center justify-between gap-4 text-xs text-red-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="px-3 py-1 bg-red-900/60 text-white rounded-lg cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Alerta de Desconexão */}
      {!connected && (
        <div className="border border-amber-500/40 bg-amber-950/20 p-3.5 rounded-2xl flex items-center justify-between gap-4 text-xs text-amber-200">
          <div className="flex items-center gap-2.5">
            <WifiOff className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Conexão temporariamente instável. Sincronizando com o servidor...</span>
          </div>
          <button
            type="button"
            onClick={refreshNow}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg cursor-pointer"
          >
            Reconectar
          </button>
        </div>
      )}

      {/* Alerta de Contingência Ativa */}
      {ls?.emergencyActive && (
        <div className="border border-red-500/60 bg-red-950/30 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-red-300 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              Tela de Contingência Técnica Ativa no Telão
            </div>
            <p className="text-xs text-[#F7DECA] opacity-90">&ldquo;{ls.emergencyMessage}&rdquo;</p>
          </div>
          <button
            type="button"
            onClick={() => runAction(() => toggleEmergencyModeAction(false))}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl cursor-pointer shrink-0"
          >
            Desativar Contingência
          </button>
        </div>
      )}

      {/* Navegação Superior da Mesa: Segmented Control Moderno */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
        <div className="inline-flex items-center gap-1 bg-[#050C07] p-1 rounded-xl border border-white/[0.06]">
          <button
            type="button"
            onClick={() => setActiveTab("palco")}
            className={`px-4 py-2 rounded-lg font-medium text-xs flex items-center gap-2 transition cursor-pointer ${
              activeTab === "palco"
                ? "bg-[#14532D] text-white shadow-sm font-semibold"
                : "text-[#D5C5AA]/70 hover:text-[#F7DECA] hover:bg-white/[0.03]"
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mesa de Palco</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("perguntas")}
            className={`px-4 py-2 rounded-lg font-medium text-xs flex items-center gap-2 transition cursor-pointer ${
              activeTab === "perguntas"
                ? "bg-[#14532D] text-white shadow-sm font-semibold"
                : "text-[#D5C5AA]/70 hover:text-[#F7DECA] hover:bg-white/[0.03]"
            }`}
          >
            <MessageSquareMore className="w-3.5 h-3.5 text-emerald-400" />
            <span>Curadoria de Perguntas</span>
            {snapshot?.metrics?.questionsPending ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500 text-[#030A06] font-bold">
                {snapshot.metrics.questionsPending}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("votacoes")}
            className={`px-4 py-2 rounded-lg font-medium text-xs flex items-center gap-2 transition cursor-pointer ${
              activeTab === "votacoes"
                ? "bg-[#14532D] text-white shadow-sm font-semibold"
                : "text-[#D5C5AA]/70 hover:text-[#F7DECA] hover:bg-white/[0.03]"
            }`}
          >
            <Vote className="w-3.5 h-3.5 text-emerald-400" />
            <span>Votação da Mesa</span>
            {snapshot?.metrics?.activePollVotes ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#D5C5AA] text-[#030A06] font-bold">
                {snapshot.metrics.activePollVotes}
              </span>
            ) : null}
          </button>
        </div>

        {/* Acesso Rápido ao Telão ARENA */}
        <div className="flex items-center gap-2 text-xs">
          <a
            href="/arena"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg border border-white/[0.08] bg-[#0A120D] text-[#D5C5AA]/80 hover:text-[#F7DECA] hover:border-emerald-500/30 flex items-center gap-1.5 transition"
          >
            <MonitorPlay className="w-3.5 h-3.5 text-emerald-400" />
            <span>Abrir Telão ARENA</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-50" />
          </a>
        </div>
      </div>

      {/* ABA 1: MESA DE PALCO */}
      {activeTab === "palco" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Coluna Esquerda: Palco Hero Principal */}
            <div className="lg:col-span-7 border border-white/[0.08] bg-[#0A120D]/90 p-6 sm:p-7 rounded-2xl space-y-6 shadow-xl backdrop-blur-md">
              {/* Top Capsule do Card Hero */}
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-semibold text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {ls ? EVENT_STATUS_LABELS[ls.status] : "Aguardando"}
                  </span>

                  {activeStep?.phaseLabel && (
                    <span className="px-3 py-1 rounded-full bg-white/[0.04] text-[#F7DECA]/80 border border-white/[0.08] text-[11px]">
                      {activeStep.phaseLabel}
                    </span>
                  )}

                  {timer.alertLevel === "EXPIRED" && (
                    <span className="px-3 py-1 rounded-full bg-red-950/60 border border-red-500/40 text-red-300 font-semibold text-[11px] animate-pulse">
                      Tempo Esgotado
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSoundMutedLocal((v) => !v)}
                    className="p-2 border border-white/[0.08] bg-[#050C07] rounded-lg text-[#D5C5AA] hover:text-[#F7DECA] cursor-pointer"
                    title={soundMutedLocal ? "Ativar alertas sonoros" : "Silenciar alertas"}
                  >
                    {soundMutedLocal ? (
                      <VolumeX className="w-3.5 h-3.5 text-red-400" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => playDiscreteAlertBeep("WARNING_2MIN")}
                    className="p-2 border border-white/[0.08] bg-[#050C07] rounded-lg text-[#D5C5AA] hover:text-[#F7DECA] cursor-pointer"
                    title="Testar sinal sonoro de 2 minutos"
                  >
                    <Bell className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Informações do Palestrante Ativo e Pauta */}
              <div className="flex items-center gap-4">
                <img
                  src={speakerPhoto}
                  alt={speakerName || "Palestrante"}
                  className="w-16 h-16 sm:w-18 sm:h-18 rounded-full object-cover ring-2 ring-emerald-500/40 shadow-lg shrink-0 bg-[#050C07]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/img/auditorio.png";
                  }}
                />

                <div className="space-y-1 min-w-0 flex-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 block truncate">
                    {activeTopic
                      ? `Pauta ${activeTopic.number} de 5 · ${activeTopic.title}`
                      : "Programação Oficial da Arena"}
                  </span>
                  <h2 className="font-display text-xl sm:text-2xl text-[#F7DECA] font-bold leading-tight line-clamp-2">
                    {activeStep ? activeStep.title : "Abertura Institucional"}
                  </h2>
                  <p className="text-xs text-[#D5C5AA]/70 truncate">
                    Com a palavra:{" "}
                    <strong className="text-[#F7DECA] font-semibold">
                      {speakerName || "Coordenação"}
                    </strong>
                    {activeTopic && (
                      <span className="text-[#D5C5AA]/50 ml-1.5">
                        · 15m exposição + 5m P&amp;R
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Display do Cronômetro Oficial */}
              <div className="border border-white/[0.06] bg-[#050C07] p-5 sm:p-6 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#D5C5AA]/60 block font-semibold">
                      {isTopicExpositionPhase
                        ? "Exposição do Palestrante (15:00)"
                        : isTopicQAPhase
                          ? "Pergunta & Resposta da Plateia (05:00)"
                          : "Contagem Regressiva da Etapa"}
                    </span>
                    <div
                      className={`font-mono font-bold text-5xl sm:text-6xl tracking-tight transition-colors ${
                        timer.alertLevel === "EXPIRED"
                          ? "text-red-400 animate-pulse"
                          : timer.alertLevel === "CRITICAL_30S"
                            ? "text-amber-400"
                            : "text-[#F7DECA]"
                      }`}
                    >
                      {timer.formatted}
                    </div>
                  </div>

                  <div className="text-xs text-[#D5C5AA]/70 sm:text-right space-y-0.5">
                    <div>
                      Decorrido:{" "}
                      <strong className="font-mono text-[#F7DECA]">
                        {formatSecondsMMSS(Math.floor(timer.elapsedMs / 1000))}
                      </strong>{" "}
                      / Previsto:{" "}
                      <strong className="font-mono text-[#F7DECA]">
                        {formatSecondsMMSS(Math.floor(timer.totalDurationMs / 1000))}
                      </strong>
                    </div>
                    {overrunSec > 0 && (
                      <div className="text-[11px] font-mono text-red-400 font-semibold">
                        Tempo excedido: +{formatSecondsMMSS(overrunSec)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Barra de Progresso Fina */}
                <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      timer.alertLevel === "EXPIRED"
                        ? "bg-red-500"
                        : timer.alertLevel === "CRITICAL_30S"
                          ? "bg-amber-400"
                          : timer.alertLevel === "WARNING_2MIN"
                            ? "bg-amber-300"
                            : "bg-emerald-500"
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Botão Primário Heroico de Ação */}
              <div className="space-y-3">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleQuickAdvance}
                  className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base flex items-center justify-between cursor-pointer shadow-lg transition active:scale-[0.99] ${
                    timer.alertLevel === "EXPIRED"
                      ? "bg-amber-500 hover:bg-amber-400 text-black animate-pulse"
                      : ls?.status === "WAITING" || ls?.timerStatus === "IDLE"
                        ? "bg-[#D5C5AA] hover:bg-[#E2D4BE] text-[#030A06]"
                        : "bg-emerald-600 hover:bg-emerald-500 text-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {ls?.status === "WAITING" || ls?.timerStatus === "IDLE" ? (
                      <>
                        <Play className="w-5 h-5 fill-current" />
                        <span>Iniciar Evento · Abertura Oficial (05:00)</span>
                      </>
                    ) : timer.alertLevel === "EXPIRED" ? (
                      <>
                        <SkipForward className="w-5 h-5" />
                        <span>Tempo Esgotado · Concluir Fase e Avançar</span>
                      </>
                    ) : isTopicExpositionPhase ? (
                      <>
                        <MessageSquareMore className="w-5 h-5" />
                        <span>Concluir Exposição e Abrir Pergunta &amp; Resposta (05:00)</span>
                      </>
                    ) : isTopicQAPhase ? (
                      <>
                        <SkipForward className="w-5 h-5" />
                        <span>Concluir Pauta {activeTopic?.number} e Avançar Etapa</span>
                      </>
                    ) : nextStep ? (
                      <>
                        <SkipForward className="w-5 h-5" />
                        <span>Avançar para #{nextStep.sequenceOrder} · {nextStep.title}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Finalizar Programação Oficial</span>
                      </>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 opacity-75" />
                </button>

                {/* Barra Compacta de Ajuste Fino (+ / - / Pausa) */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                  <div className="inline-flex items-center gap-1 bg-[#050C07] p-1 rounded-xl border border-white/[0.06]">
                    <span className="text-[10px] text-[#D5C5AA]/50 px-2 font-medium">Ajuste:</span>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => runAction(() => adjustTimerAction(-60))}
                      className="px-2 py-1 rounded-lg text-[#F7DECA] font-mono hover:bg-white/[0.05] cursor-pointer"
                    >
                      <Minus className="w-2.5 h-2.5 inline" />1m
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => runAction(() => adjustTimerAction(-30))}
                      className="px-2 py-1 rounded-lg text-[#F7DECA] font-mono hover:bg-white/[0.05] cursor-pointer"
                    >
                      <Minus className="w-2.5 h-2.5 inline" />30s
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => runAction(() => adjustTimerAction(30))}
                      className="px-2 py-1 rounded-lg text-emerald-400 font-mono hover:bg-white/[0.05] cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5 inline" />30s
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => runAction(() => adjustTimerAction(60))}
                      className="px-2 py-1 rounded-lg text-emerald-400 font-mono hover:bg-white/[0.05] cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5 inline" />1m
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => runAction(() => adjustTimerAction(120))}
                      className="px-2 py-1 rounded-lg text-emerald-400 font-mono hover:bg-white/[0.05] cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5 inline" />2m
                    </button>
                  </div>

                  <div className="inline-flex items-center gap-1">
                    {ls?.timerStatus === "PAUSED" ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => runAction(() => resumeTimerAction())}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-xl cursor-pointer flex items-center gap-1"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Retomar</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isPending || ls?.timerStatus !== "RUNNING"}
                        onClick={() => runAction(() => pauseTimerAction())}
                        className="px-3 py-1.5 border border-white/[0.12] bg-[#050C07] text-[#D5C5AA] hover:text-[#F7DECA] hover:bg-white/[0.05] font-medium text-xs rounded-xl cursor-pointer flex items-center gap-1.5"
                      >
                        <Pause className="w-3 h-3" />
                        <span>Pausar</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        askConfirm({
                          title: "Reiniciar Cronômetro da Fase Atual",
                          description: "O tempo voltará para o previsto original desta etapa.",
                          confirmLabel: "Reiniciar Timer",
                          execute: (just) => resetTimerAction(just),
                        })
                      }
                      className="p-1.5 border border-white/[0.12] bg-[#050C07] text-[#D5C5AA] hover:text-[#F7DECA] rounded-xl cursor-pointer"
                      title="Reiniciar tempo desta etapa"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Próxima Etapa + Controles de Audiência & Telão */}
            <div className="lg:col-span-5 space-y-4">
              {/* Card Próxima Etapa */}
              <div className="border border-white/[0.08] bg-[#0A120D]/90 p-5 rounded-2xl space-y-2 backdrop-blur-md">
                <div className="flex items-center justify-between text-xs text-[#D5C5AA]/60">
                  <span className="font-semibold uppercase tracking-wider text-emerald-400 text-[10px]">
                    Próxima Etapa na Sequência
                  </span>
                  <span className="font-mono text-[#F7DECA] text-[11px]">
                    {nextStep ? formatSecondsMMSS(nextStep.durationSec) : "—"}
                  </span>
                </div>
                <div className="font-semibold text-sm text-[#F7DECA]">
                  {nextStep ? `#${nextStep.sequenceOrder} · ${nextStep.title}` : "Encerramento Oficial"}
                </div>
                <div className="text-xs text-[#D5C5AA]/70">
                  Responsável: <strong className="text-[#F7DECA]">{nextStep?.responsibleName || "Coordenação"}</strong>
                </div>
              </div>

              {/* Card de Captação de Perguntas da Plateia */}
              <div className="border border-white/[0.08] bg-[#0A120D]/90 p-5 rounded-2xl space-y-3 backdrop-blur-md">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#F7DECA] flex items-center gap-1.5">
                    <MessageSquareMore className="w-4 h-4 text-emerald-400" />
                    Captação de Perguntas da Plateia
                  </span>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => runAction(() => toggleQuestionsOpenAction(!ls?.questionsOpen))}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg cursor-pointer transition ${
                      ls?.questionsOpen
                        ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                        : "bg-[#050C07] text-[#D5C5AA]/50 border border-white/[0.08]"
                    }`}
                  >
                    {ls?.questionsOpen ? "✓ Aberta para Envio" : "Bloqueada"}
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-[#D5C5AA]/70 pt-1">
                  <span>
                    Perguntas pendentes: <strong className="text-emerald-400">{snapshot?.metrics?.questionsPending ?? 0}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab("perguntas")}
                    className="text-xs text-emerald-400 hover:text-emerald-300 underline font-medium cursor-pointer"
                  >
                    Abrir Curadoria →
                  </button>
                </div>
              </div>

              {/* Card de Votação da Mesa-Redonda (Prioritária após Pauta 5) */}
              <div
                className={`border p-5 rounded-2xl space-y-3 backdrop-blur-md transition ${
                  isAfterTopic5
                    ? "border-amber-500/40 bg-amber-950/20 shadow-md"
                    : "border-white/[0.08] bg-[#0A120D]/90"
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="font-semibold text-[#F7DECA] flex items-center gap-1.5">
                      <Vote className="w-4 h-4 text-emerald-400" />
                      Votação da Mesa-Redonda
                    </span>
                    <span className="text-[10px] text-[#D5C5AA]/60 block">
                      {isAfterTopic5
                        ? "Prioritária agora (Pós-Pauta 5)"
                        : "Aberta em segundo plano · Prioritária após Pauta 5"}
                    </span>
                  </div>

                  <span className="font-mono text-xs font-bold text-emerald-400">
                    {snapshot?.metrics?.activePollVotes ?? 0} votos
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isPending || activePoll?.status === "OPEN"}
                    onClick={() => runAction(() => openCurrentTopicPollAction())}
                    className="py-2 px-3 bg-[#D5C5AA] hover:bg-[#E2D4BE] text-[#030A06] font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 transition"
                  >
                    <Vote className="w-3.5 h-3.5" />
                    <span>{activePoll?.status === "OPEN" ? "Votação Aberta" : "Abrir Votação"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("votacoes")}
                    className="py-2 px-3 border border-white/[0.12] bg-[#050C07] text-[#F7DECA] hover:bg-white/[0.04] font-medium text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Apurar Votos</span>
                  </button>
                </div>
              </div>

              {/* Card de Projeção no Telão ARENA */}
              <div className="border border-white/[0.08] bg-[#0A120D]/90 p-5 rounded-2xl space-y-3 backdrop-blur-md">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#F7DECA] flex items-center gap-1.5">
                    <MonitorPlay className="w-4 h-4 text-emerald-400" />
                    Modo do Telão ARENA
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                      ls?.arenaOnline ? "text-emerald-400" : "text-[#D5C5AA]/60"
                    }`}
                  >
                    <Wifi className="w-3 h-3" />
                    {ls?.arenaOnline ? "Online" : "Aguardando"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      "WAITING",
                      "OPENING",
                      "SPEAKER_EXPOSITION",
                      "SELECTED_QUESTION",
                      "POLL_RESULTS",
                      "ROUNDTABLE",
                    ] as ArenaMode[]
                  ).map((mode) => {
                    const isCurrent = ls?.arenaMode === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        disabled={isPending}
                        onClick={() => runAction(() => setArenaModeManualAction(mode))}
                        className={`px-2.5 py-1.5 text-[11px] font-medium truncate rounded-lg border text-center cursor-pointer transition ${
                          isCurrent
                            ? "bg-[#14532D] text-white border-emerald-500 font-semibold shadow-xs"
                            : "bg-[#050C07] text-[#D5C5AA]/70 border-white/[0.06] hover:border-white/[0.2] hover:text-[#F7DECA]"
                        }`}
                      >
                        {mode === "WAITING"
                          ? "Espera"
                          : mode === "OPENING"
                            ? "Abertura"
                            : mode === "SPEAKER_EXPOSITION"
                              ? "Exposição"
                              : mode === "SELECTED_QUESTION"
                                ? "P&R"
                                : mode === "POLL_RESULTS"
                                  ? "Votação"
                                  : "Mesa"}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() =>
                      askConfirm({
                        title: ls?.emergencyActive
                          ? "Desativar Contingência Técnica"
                          : "Ativar Tela de Contingência Técnica",
                        description: ls?.emergencyActive
                          ? "O telão voltará à exibição normal da etapa ativa."
                          : 'O telão exibirá imediatamente o aviso institucional de ajuste técnico.',
                        confirmLabel: ls?.emergencyActive ? "Retomar Normalidade" : "Ativar Contingência",
                        danger: !ls?.emergencyActive,
                        execute: () => toggleEmergencyModeAction(!ls?.emergencyActive),
                      })
                    }
                    className="px-3 py-1.5 border border-red-500/30 bg-red-950/20 text-red-300 hover:bg-red-950/40 font-medium text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Contingência</span>
                  </button>

                  <a
                    href="/arena"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#D5C5AA]/60 hover:text-[#F7DECA] flex items-center gap-1"
                  >
                    <span>Abrir Telão ↗</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Seções Secundárias em Acordeões Discretos */}
          <div className="border border-white/[0.06] bg-[#0A120D]/60 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTimeline((v) => !v)}
              className="w-full p-4 flex items-center justify-between text-xs font-semibold text-[#F7DECA] hover:bg-white/[0.02] cursor-pointer transition select-none"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Linha do Tempo das 10 Etapas Macro &amp; Fases (145 Minutos)</span>
              </div>
              <div className="flex items-center gap-2 text-[#D5C5AA]/50 text-[11px]">
                <span>{showTimeline ? "Recolher" : "Expandir"}</span>
                {showTimeline ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showTimeline && (
              <div className="p-5 pt-0 space-y-4 border-t border-white/[0.06] animate-in fade-in duration-150">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3">
                  {macroBlocks.map((mb) => {
                    const isCurrent = activeStep?.macroOrder === mb.macroOrder;
                    const isDone = mb.status === "COMPLETED";
                    return (
                      <div
                        key={mb.id}
                        className={`p-3 rounded-xl border text-xs space-y-1 ${
                          isCurrent
                            ? "border-emerald-500 bg-emerald-950/30 text-white"
                            : isDone
                              ? "border-white/[0.06] bg-[#050C07] text-[#D5C5AA]/60"
                              : "border-white/[0.04] bg-[#050C07] text-[#D5C5AA]/40"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span>Etapa {mb.macroOrder}</span>
                          <span>{Math.round(mb.durationSec / 60)}m</span>
                        </div>
                        <div className="font-semibold truncate text-[#F7DECA]">{mb.title}</div>
                        <div className="text-[10px] text-[#D5C5AA]/60 truncate">{mb.responsibleName}</div>
                      </div>
                    );
                  })}
                </div>

                {snapshot?.operationalSteps && (
                  <div className="space-y-2 pt-3 border-t border-white/[0.06]">
                    <div className="text-xs font-medium text-[#D5C5AA]/70">
                      Fases Operacionais Detalhadas:
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                      {snapshot.operationalSteps.map((st) => {
                        const isCurrent = st.id === activeStep?.id;
                        const isCompleted = st.status === "COMPLETED";
                        return (
                          <div
                            key={st.id}
                            className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                              isCurrent
                                ? "border-emerald-500/60 bg-emerald-950/30"
                                : "border-white/[0.06] bg-[#050C07]"
                            }`}
                          >
                            <div className="truncate">
                              <span className="font-mono text-emerald-400 font-bold mr-1.5">
                                #{String(st.sequenceOrder).padStart(2, "0")}
                              </span>
                              <span className="text-[#F7DECA] font-medium">{st.title}</span>
                              <span className="text-[#D5C5AA]/50 text-[10px] block">
                                {st.responsibleName} · {formatSecondsMMSS(st.durationSec)}
                              </span>
                            </div>
                            {!isCurrent && (
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() =>
                                  askConfirm({
                                    title: isCompleted
                                      ? `Reabrir Etapa #${st.sequenceOrder}`
                                      : `Iniciar Etapa #${st.sequenceOrder}`,
                                    description: isCompleted
                                      ? `A etapa "${st.title}" já foi concluída. Reabri-la exige justificativa.`
                                      : `Deseja ir diretamente para "${st.title}"?`,
                                    confirmLabel: isCompleted ? "Reabrir" : "Iniciar",
                                    requireJustification: isCompleted,
                                    execute: (just) => jumpToStepAction(st.id, just),
                                  })
                                }
                                className="px-2.5 py-1 text-[11px] font-medium border border-white/[0.12] rounded-lg bg-[#0A120D] text-[#F7DECA] hover:bg-white/[0.05] cursor-pointer shrink-0"
                              >
                                {isCompleted ? "Reabrir" : "Iniciar"}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Aviso Operacional no Telão */}
          <div className="border border-white/[0.06] bg-[#0A120D]/60 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowSecondaryActions((v) => !v)}
              className="w-full p-4 flex items-center justify-between text-xs font-semibold text-[#F7DECA] hover:bg-white/[0.02] cursor-pointer transition select-none"
            >
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-emerald-400" />
                <span>Aviso Operacional de Texto no Telão (`ScreenMessage`)</span>
              </div>
              <div className="flex items-center gap-2 text-[#D5C5AA]/50 text-[11px]">
                <span>{showSecondaryActions ? "Recolher" : "Expandir"}</span>
                {showSecondaryActions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showSecondaryActions && (
              <div className="p-5 pt-0 space-y-4 border-t border-white/[0.06] animate-in fade-in duration-150">
                {snapshot?.screenMessage && (
                  <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-200">
                    <div>
                      Aviso ativo: <strong>&ldquo;{snapshot.screenMessage.title} — {snapshot.screenMessage.body}&rdquo;</strong>
                    </div>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => runAction(() => clearOperationalNoticeAction())}
                      className="px-3 py-1 bg-red-950/40 border border-red-500/30 text-red-300 rounded-lg cursor-pointer font-medium"
                    >
                      Remover do Telão
                    </button>
                  </div>
                )}

                <form
                  action={(fd) => runAction(() => publishOperationalNoticeAction(fd))}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end text-xs"
                >
                  <div className="sm:col-span-3">
                    <label className="block text-[#D5C5AA]/70 mb-1 font-medium">Título</label>
                    <input
                      type="text"
                      name="title"
                      defaultValue="Aviso da Coordenação"
                      required
                      className="w-full px-3 py-2 border border-white/[0.12] bg-[#050C07] text-[#F7DECA] rounded-xl outline-none"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <label className="block text-[#D5C5AA]/70 mb-1 font-medium">Mensagem para o Telão</label>
                    <input
                      type="text"
                      name="body"
                      required
                      placeholder="Ex: A votação da Mesa-Redonda está aberta pelo celular!"
                      className="w-full px-3 py-2 border border-white/[0.12] bg-[#050C07] text-[#F7DECA] rounded-xl outline-none"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="w-full py-2 px-4 bg-[#D5C5AA] hover:bg-[#E2D4BE] text-[#030A06] font-semibold rounded-xl cursor-pointer"
                    >
                      Publicar no Telão
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 2: CURADORIA DE PERGUNTAS */}
      {activeTab === "perguntas" && (
        <div className="animate-in fade-in duration-150">
          <CurationDesk />
        </div>
      )}

      {/* ABA 3: VOTAÇÕES DA MESA-REDONDA */}
      {activeTab === "votacoes" && (
        <div className="animate-in fade-in duration-150">
          <PollsDesk />
        </div>
      )}
    </div>
  );
}
