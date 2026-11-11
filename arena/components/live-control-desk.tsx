"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useArenaSync } from "@/hooks/use-arena-sync";
import {
  ARENA_MODE_LABELS,
  EVENT_STATUS_LABELS,
  formatSecondsMMSS,
} from "@/lib/events";
import {
  adjustTimerAction,
  clearOperationalNoticeAction,
  closeActivePollAction,
  finishCurrentStepAction,
  finishEventAction,
  jumpToStepAction,
  nextStepAction,
  openCurrentTopicPollAction,
  pauseTimerAction,
  previousStepAction,
  publishOperationalNoticeAction,
  resetTimerAction,
  resumeTimerAction,
  setArenaModeManualAction,
  skipStepAction,
  startEventAction,
  startTopicQAPhaseAction,
  toggleEmergencyModeAction,
  toggleQuestionsOpenAction,
} from "@/app/actions/live-operation";
import type { ArenaMode } from "@prisma/client";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  FastForward,
  History,
  Layers,
  Megaphone,
  MessageSquareMore,
  MonitorPlay,
  Pause,
  Play,
  Plus,
  Minus,
  RotateCcw,
  ShieldAlert,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
  VolumeX,
  Vote,
  Wifi,
  WifiOff,
  Users,
} from "lucide-react";

const OFFICIAL_ARENA_MODES: ArenaMode[] = [
  "WAITING",
  "OPENING",
  "INTRODUCTION",
  "SPEAKER_EXPOSITION",
  "SELECTED_QUESTION",
  "TRANSITION",
  "POLL_OPEN",
  "POLL_RESULTS",
  "ROUNDTABLE",
  "CLOSING",
  "CONTINGENCY",
  "OPERATIONAL_NOTICE",
];

function playDiscreteAlertBeep(
  kind: "WARNING_2MIN" | "CRITICAL_30S" | "EXPIRED"
) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
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
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        ctx.currentTime + note.delay + note.dur
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + note.delay);
      osc.stop(ctx.currentTime + note.delay + note.dur);
    }
  } catch {
    // ignore audio block
  }
}

interface PendingConfirmAction {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  requireJustification?: boolean;
  execute: (justification?: string) => Promise<void>;
}

export function LiveControlDesk({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { snapshot, timer, connected, refreshNow } = useArenaSync({
    isAdmin: true,
  });
  const [isPending, startTransition] = useTransition();
  const [confirmModal, setConfirmModal] = useState<PendingConfirmAction | null>(
    null
  );
  const [justificationText, setJustificationText] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [soundMutedLocal, setSoundMutedLocal] = useState(false);
  const lastAlertLevelRef = useRef<string>("NORMAL");

  useEffect(() => {
    const prev = lastAlertLevelRef.current;
    const curr = timer.alertLevel;
    lastAlertLevelRef.current = curr;

    if (timer.status !== "RUNNING" && timer.status !== "EXPIRED") {
      return;
    }

    const soundAllowed =
      snapshot?.liveState.soundAlertsEnabled && !soundMutedLocal;
    if (!soundAllowed) return;

    if (curr !== prev && curr !== "NORMAL") {
      playDiscreteAlertBeep(curr);
    }
  }, [
    timer.alertLevel,
    timer.status,
    snapshot?.liveState.soundAlertsEnabled,
    soundMutedLocal,
  ]);

  const runAction = (fn: () => Promise<void>) => {
    setActionError(null);
    startTransition(async () => {
      try {
        await fn();
        await refreshNow();
      } catch (err) {
        setActionError(
          err instanceof Error
            ? err.message
            : "Erro ao executar ação operacional."
        );
      }
    });
  };

  const askConfirm = (action: PendingConfirmAction) => {
    setJustificationText("");
    setConfirmModal(action);
  };

  const ls = snapshot?.liveState;
  const activeStep = snapshot?.activeStep;
  const nextStep = snapshot?.nextStep;
  const prevStep = snapshot?.prevStep;
  const activeTopic = snapshot?.activeTopic;
  const activePoll = snapshot?.activePoll;
  const macroBlocks = snapshot?.macroBlocks || [];

  const isTopicExpositionPhase =
    activeStep?.stepType === "EXPOSITION" && Boolean(activeTopic);
  const isTopicQAPhase =
    activeStep?.stepType === "AUDIENCE_VOICE" && Boolean(activeTopic);
  const isTopic5Active = activeTopic?.number === 5;

  const progressPercent =
    timer.totalDurationMs > 0
      ? Math.min(
          100,
          Math.round((timer.elapsedMs / timer.totalDurationMs) * 100)
        )
      : 0;

  const overrunSec = Math.floor(timer.overrunMs / 1000);

  const alertColors =
    timer.alertLevel === "EXPIRED"
      ? "border-red-500/60 bg-red-950/30 text-red-200"
      : timer.alertLevel === "CRITICAL_30S"
        ? "border-amber-500/60 bg-amber-950/30 text-amber-200"
        : timer.alertLevel === "WARNING_2MIN"
          ? "border-amber-400/50 bg-amber-950/20 text-amber-300"
          : "border-emerald-500/30 bg-emerald-950/20 text-emerald-300";

  return (
    <div className="space-y-6">
      {/* Modal de Confirmação & Justificativa Excepcional (§2 e §7) */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md border border-[#D5C5AA]/30 bg-[#0A150D] p-6 rounded-2xl space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-[#F7DECA]">
              <AlertTriangle
                className={`w-5 h-5 ${
                  confirmModal.danger ? "text-red-500" : "text-amber-500"
                }`}
              />
              <h3 className="font-display text-lg">{confirmModal.title}</h3>
            </div>
            <p className="text-xs text-[#D5C5AA]/85 leading-relaxed">
              {confirmModal.description}
            </p>

            {confirmModal.requireJustification && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#F7DECA]">
                  Justificativa Obrigatória (Registrada em Auditoria):
                </label>
                <textarea
                  rows={2}
                  value={justificationText}
                  onChange={(e) => setJustificationText(e.target.value)}
                  placeholder="Informe o motivo operacional desta ação excepcional..."
                  className="w-full px-3 py-2 text-xs border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] rounded-xl"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-xs font-semibold border border-[#D5C5AA]/30 rounded-xl text-[#D5C5AA] hover:bg-[#030A06] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  isPending ||
                  (confirmModal.requireJustification &&
                    justificationText.trim().length < 5)
                }
                onClick={() => {
                  const fn = confirmModal.execute;
                  const just = justificationText.trim() || undefined;
                  setConfirmModal(null);
                  runAction(() => fn(just));
                }}
                className={`px-4 py-2 text-xs font-semibold rounded-xl text-white cursor-pointer disabled:opacity-40 ${
                  confirmModal.danger
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-[#14532D] hover:bg-[#166534]"
                }`}
              >
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {actionError && (
        <div className="border border-red-500/60 bg-red-950/40 p-4 rounded-2xl flex items-center justify-between gap-4 text-xs text-red-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{actionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="px-3 py-1 bg-red-800/60 text-white rounded-lg cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Alerta de Queda de Conexão */}
      {!connected && (
        <div className="border border-red-500/50 bg-red-950/30 p-4 rounded-2xl flex items-center justify-between gap-4 text-xs text-red-200">
          <div className="flex items-center gap-2.5">
            <WifiOff className="w-5 h-5 shrink-0" />
            <div>
              <strong className="block text-sm">
                Conexão com o servidor oscilando — reconectando automaticamente
              </strong>
              <span>
                O cronômetro permanece preservado no servidor e será
                sincronizado assim que a rede responder.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={refreshNow}
            className="px-3.5 py-2 bg-red-600 text-white font-semibold rounded-xl cursor-pointer shrink-0"
          >
            Reconectar Agora
          </button>
        </div>
      )}

      {/* Alerta de Modo de Contingência Ativo */}
      {ls?.emergencyActive && (
        <div className="border-2 border-red-500 bg-red-950/30 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-red-300 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              Tela de Contingência Técnica Ativa na ARENA
            </div>
            <p className="text-sm font-semibold text-[#F7DECA]">
              &ldquo;{ls.emergencyMessage}&rdquo;
            </p>
          </div>
          <button
            type="button"
            onClick={() => runAction(() => toggleEmergencyModeAction(false))}
            className="px-4 py-2.5 bg-emerald-700 text-white text-xs font-semibold rounded-xl cursor-pointer shrink-0"
          >
            Desativar Contingência e Retomar Exibição
          </button>
        </div>
      )}

      {/* Painel Principal: Cronômetro + Etapa Atual + Fases 15m/5m */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bloco Esquerdo (7 cols): Cronômetro Gigante + Controles do Produtor */}
        <div className="lg:col-span-7 border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8 rounded-2xl flex flex-col justify-between gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#14532D] text-white text-xs font-bold">
                {ls ? EVENT_STATUS_LABELS[ls.status] : "Aguardando"}
              </span>
              {activeStep?.phaseLabel && (
                <span className="px-3 py-1 rounded-full bg-[#D5C5AA]/20 text-[#F7DECA] border border-[#D5C5AA]/30 text-xs font-bold">
                  Fase: {activeStep.phaseLabel}
                </span>
              )}
              <span
                className={`px-3 py-1 rounded-full border text-xs font-semibold ${alertColors}`}
              >
                {timer.alertLevel === "EXPIRED"
                  ? "00:00 · TEMPO ENCERRADO"
                  : timer.alertLevel === "CRITICAL_30S"
                    ? "ALERTA FINAL: ≤ 30 SEGUNDOS"
                    : timer.alertLevel === "WARNING_2MIN"
                      ? "ATENÇÃO: ≤ 2 MINUTOS"
                      : `Timer: ${timer.status}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSoundMutedLocal((v) => !v)}
                className="px-3 py-1.5 border border-[#D5C5AA]/25 bg-[#030A06] text-xs font-medium text-[#F7DECA] flex items-center gap-1.5 cursor-pointer"
                title="Alternar som de alerta neste navegador"
              >
                {soundMutedLocal ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-red-500" />
                    <span>Som Mudo</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-[#14532D]" />
                    <span>Alerta Sonoro Ativo</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => playDiscreteAlertBeep("WARNING_2MIN")}
                className="px-2.5 py-1.5 border border-[#D5C5AA]/25 bg-[#030A06] text-[11px] text-[#D5C5AA] cursor-pointer"
                title="Testar som discreto"
              >
                <Bell className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Informações da Etapa e Especialista em Destaque */}
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#14532D]">
              {activeTopic
                ? `Pauta ${activeTopic.number} de 5 · ${activeTopic.title}`
                : "Fluxo Oficial · A Nova Moeda (145 min)"}
            </div>
            <h2 className="font-display text-2xl sm:text-3xl text-[#F7DECA]">
              {activeStep
                ? `#${activeStep.sequenceOrder} — ${activeStep.title}`
                : "Abertura — Apresentação do evento"}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#D5C5AA]/85">
              <span>
                Especialista / Responsável:{" "}
                <strong className="text-[#F7DECA]">
                  {activeStep?.responsibleName || "Organização"}
                </strong>
              </span>
              {activeTopic && (
                <span>
                  Estrutura da Pauta:{" "}
                  <strong className="text-[#F7DECA]">
                    15 min Exposição + 5 min Pergunta e Resposta
                  </strong>
                </span>
              )}
              <span>
                Tempo da Fase:{" "}
                <strong className="font-mono text-[#F7DECA]">
                  {formatSecondsMMSS(activeStep?.durationSec ?? 300)}
                </strong>
              </span>
            </div>
          </div>

          {/* Display Gigante do Cronômetro Centralizado no Servidor */}
          <div className="border border-[#D5C5AA]/20 bg-[#030A06] p-6 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-[#D5C5AA]/70 block">
                  Tempo Restante ·{" "}
                  {isTopicExpositionPhase
                    ? "Exposição do Especialista (15:00)"
                    : isTopicQAPhase
                      ? "Pergunta e Resposta (05:00)"
                      : "Etapa Atual"}
                </span>
                <div
                  className={`font-mono font-bold text-6xl sm:text-7xl tracking-tight ${
                    timer.alertLevel === "EXPIRED"
                      ? "text-red-500"
                      : timer.alertLevel === "CRITICAL_30S"
                        ? "text-amber-400"
                        : "text-[#F7DECA]"
                  }`}
                >
                  {timer.formatted}
                </div>
              </div>

              <div className="space-y-1 text-right">
                <div className="text-xs text-[#D5C5AA]/75">
                  Decorrido:{" "}
                  <strong className="font-mono text-[#F7DECA]">
                    {formatSecondsMMSS(Math.floor(timer.elapsedMs / 1000))}
                  </strong>{" "}
                  / Previsto:{" "}
                  <strong className="font-mono text-[#F7DECA]">
                    {formatSecondsMMSS(
                      Math.floor(timer.totalDurationMs / 1000)
                    )}
                  </strong>
                </div>
                {overrunSec > 0 && (
                  <div className="px-3 py-1 rounded-full bg-red-950/30 text-red-300 font-mono font-bold text-xs inline-block">
                    Tempo Excedido: +{formatSecondsMMSS(overrunSec)}
                  </div>
                )}
              </div>
            </div>

            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  timer.alertLevel === "EXPIRED"
                    ? "bg-red-600"
                    : timer.alertLevel === "CRITICAL_30S"
                      ? "bg-amber-500"
                      : timer.alertLevel === "WARNING_2MIN"
                        ? "bg-amber-400"
                        : "bg-[#14532D]"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Regra Central: O cronômetro chega a 00:00 e aguarda confirmação do operador */}
            {timer.alertLevel === "EXPIRED" && (
              <div className="p-3.5 border border-red-500/40 bg-red-950/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="text-red-200 font-semibold">
                  ⏱ Tempo esgotado (00:00). O sistema nunca avança sozinho —
                  confirme o encerramento da fase para prosseguir.
                </div>
                {isTopicExpositionPhase ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => runAction(() => startTopicQAPhaseAction())}
                    className="px-4 py-2 bg-[#14532D] text-white font-bold rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <MessageSquareMore className="w-4 h-4" />
                    <span>Iniciar Pergunta e Resposta (5m)</span>
                  </button>
                ) : (
                  nextStep && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => runAction(() => nextStepAction())}
                      className="px-4 py-2 bg-[#14532D] text-white font-bold rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <SkipForward className="w-4 h-4" />
                      <span>Encerrar e Iniciar: {nextStep.title}</span>
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* Controles do Produtor: Iniciar/Pausar + Transição de Fase 15m -> 5m -> Próxima Etapa */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {ls?.status === "WAITING" || ls?.timerStatus === "IDLE" ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    askConfirm({
                      title: "Iniciar Evento A Nova Moeda (145 min)",
                      description:
                        "Isso colocará o evento AO VIVO, bloqueará edições comuns no cronograma e iniciará o cronômetro da etapa atual. Confirmar início?",
                      confirmLabel: "Iniciar Evento Agora",
                      execute: () => startEventAction(),
                    })
                  }
                  className="py-3.5 px-4 bg-[#D5C5AA] text-[#030A06] font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  <span>Iniciar Etapa / Cronômetro</span>
                </button>
              ) : ls?.timerStatus === "PAUSED" ||
                ls?.timerStatus === "FINISHED" ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => runAction(() => resumeTimerAction())}
                  className="py-3.5 px-4 bg-[#D5C5AA] text-[#030A06] font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  <span>Retomar Cronômetro</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => runAction(() => pauseTimerAction())}
                  className="py-3.5 px-4 bg-amber-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pausar Cronômetro</span>
                </button>
              )}

              {/* Se estiver na Exposição de uma Pauta (15 min), destaca o botão para Iniciar Pergunta e Resposta (5 min) */}
              {isTopicExpositionPhase ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    askConfirm({
                      title: `Iniciar Pergunta e Resposta (5 min) — Pauta ${activeTopic?.number}`,
                      description:
                        "Isso encerrará formalmente os 15 minutos de Exposição, fechará o envio de novas perguntas desta pauta, projetará a pergunta selecionada na ARENA e iniciará o cronômetro de 05:00.",
                      confirmLabel: "Iniciar P&R (05:00)",
                      execute: () => startTopicQAPhaseAction(),
                    })
                  }
                  className="py-3.5 px-4 bg-[#14532D] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <MessageSquareMore className="w-4 h-4" />
                  <span>Encerrar Exposição e Iniciar P&R (5m)</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isPending || !nextStep}
                  onClick={() =>
                    askConfirm({
                      title: isTopicQAPhase
                        ? `Encerrar Pauta ${activeTopic?.number} e Avançar`
                        : "Encerrar Etapa Atual e Iniciar Próxima",
                      description: `Confirma o encerramento formal de "${
                        activeStep?.title || "etapa atual"
                      }" para iniciar "${nextStep?.title}" (${formatSecondsMMSS(
                        nextStep?.durationSec ?? 0
                      )})?`,
                      confirmLabel: "Encerrar e Avançar",
                      execute: () => nextStepAction(),
                    })
                  }
                  className="py-3.5 px-4 bg-[#14532D] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <SkipForward className="w-4 h-4" />
                  <span>
                    {isTopicQAPhase
                      ? "Encerrar Pauta e Avançar"
                      : "Encerrar Etapa e Avançar"}
                  </span>
                </button>
              )}

              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  askConfirm({
                    title: "Encerrar Etapa Atual (Sem Avançar)",
                    description:
                      "A etapa atual será marcada como CONCLUÍDA e o cronômetro ficará parado até que você inicie a próxima etapa.",
                    confirmLabel: "Encerrar Etapa",
                    execute: () => finishCurrentStepAction(),
                  })
                }
                className="py-3.5 px-4 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Square className="w-4 h-4" />
                <span>Apenas Encerrar Etapa</span>
              </button>
            </div>

            {/* Ajustes de Tempo (+ / -) e Operações com Justificativa */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#D5C5AA]/15 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[#D5C5AA]/70 mr-1 font-medium">
                  Ajustar tempo:
                </span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => runAction(() => adjustTimerAction(-60))}
                  className="px-2.5 py-1.5 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] font-mono font-semibold flex items-center gap-0.5 cursor-pointer"
                >
                  <Minus className="w-3 h-3" />
                  1m
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => runAction(() => adjustTimerAction(-30))}
                  className="px-2.5 py-1.5 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] font-mono font-semibold flex items-center gap-0.5 cursor-pointer"
                >
                  <Minus className="w-3 h-3" />
                  30s
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => runAction(() => adjustTimerAction(30))}
                  className="px-2.5 py-1.5 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] font-mono font-semibold flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-[#14532D]" />
                  30s
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => runAction(() => adjustTimerAction(60))}
                  className="px-2.5 py-1.5 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] font-mono font-semibold flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-[#14532D]" />
                  1m
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => runAction(() => adjustTimerAction(120))}
                  className="px-2.5 py-1.5 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] font-mono font-semibold flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-[#14532D]" />
                  2m
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => runAction(() => adjustTimerAction(300))}
                  className="px-2.5 py-1.5 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] font-mono font-semibold flex items-center gap-0.5 cursor-pointer"
                >
                  <Plus className="w-3 h-3 text-[#14532D]" />
                  5m
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    askConfirm({
                      title: "Reiniciar Cronômetro da Etapa",
                      description:
                        "O tempo restante voltará para a duração prevista desta fase.",
                      confirmLabel: "Reiniciar Cronômetro",
                      execute: (just) => resetTimerAction(just),
                    })
                  }
                  className="px-3 py-1.5 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] font-medium flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reiniciar</span>
                </button>

                <button
                  type="button"
                  disabled={isPending || !prevStep}
                  onClick={() =>
                    askConfirm({
                      title: "Reabrir Etapa Anterior (Ação Excepcional)",
                      description: `Reabrir a etapa "${prevStep?.title}" exige justificativa registrada no log de auditoria.`,
                      confirmLabel: "Reabrir com Justificativa",
                      requireJustification: true,
                      execute: (just) => previousStepAction(just),
                    })
                  }
                  className="px-3 py-1.5 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] font-medium flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                  <span>Etapa Anterior</span>
                </button>

                <button
                  type="button"
                  disabled={isPending || !nextStep}
                  onClick={() =>
                    askConfirm({
                      title: "Pular Etapa Atual",
                      description: `A etapa "${activeStep?.title}" será marcada como PULADA e registrada em auditoria.`,
                      confirmLabel: "Pular Etapa",
                      danger: true,
                      requireJustification: true,
                      execute: (just) => skipStepAction(just),
                    })
                  }
                  className="px-3 py-1.5 border border-amber-500/40 bg-amber-950/30 text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <FastForward className="w-3.5 h-3.5" />
                  <span>Pular</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bloco Direito (5 cols): Próxima Etapa, Votação da Mesa-Redonda e Telão ARENA */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4">
          {/* Card Próxima Etapa */}
          <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs text-[#D5C5AA]/70">
              <span className="font-semibold uppercase tracking-wider text-[#14532D]">
                Próxima Etapa na Sequência Oficial
              </span>
              <span className="font-mono">
                {nextStep ? formatSecondsMMSS(nextStep.durationSec) : "—"}
              </span>
            </div>
            <div className="font-bold text-base text-[#F7DECA]">
              {nextStep
                ? `#${nextStep.sequenceOrder} — ${nextStep.title}`
                : "Fim da programação oficial"}
            </div>
            <div className="text-xs text-[#D5C5AA]/80">
              Próximo responsável:{" "}
              <strong className="text-[#F7DECA]">
                {nextStep?.responsibleName || "—"}
              </strong>
            </div>
          </div>

          {/* Controle de Perguntas da Pauta & Votação Única da Mesa-Redonda */}
          <div
            className={`border p-5 rounded-2xl space-y-4 ${
              isTopic5Active
                ? "border-2 border-[#14532D] bg-emerald-950/20"
                : "border-[#D5C5AA]/20 bg-[#0A150D]/80"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F7DECA] flex items-center gap-1.5">
                <MessageSquareMore className="w-4 h-4 text-[#14532D]" />
                Envio de Perguntas (15m Exposição)
              </span>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runAction(() => toggleQuestionsOpenAction(!ls?.questionsOpen))
                }
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl cursor-pointer ${
                  ls?.questionsOpen
                    ? "bg-emerald-950/30 text-emerald-300 border border-emerald-500/30"
                    : "bg-slate-800 text-[#D5C5AA]"
                }`}
              >
                {ls?.questionsOpen
                  ? "Captação ABERTA (Clique p/ Fechar)"
                  : "Captação FECHADA (Clique p/ Abrir)"}
              </button>
            </div>

            <div className="pt-3 border-t border-[#D5C5AA]/15 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#F7DECA] flex items-center gap-1.5">
                  <Vote className="w-4 h-4 text-[#14532D]" />
                  Votação da Mesa-Redonda (Pauta 5)
                </span>
                <span className="font-mono text-[#D5C5AA]/80">
                  Status: <strong>{activePoll?.status || "DRAFT"}</strong> ·{" "}
                  {snapshot?.metrics.activePollVotes ?? 0} votos
                </span>
              </div>

              {isTopic5Active && activePoll?.status === "DRAFT" && (
                <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-[11px] text-amber-200 font-medium">
                  ⚡ Pauta 5 em andamento! Abra a Votação da Mesa-Redonda agora
                  para que o público vote simultaneamente no celular.
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => runAction(() => openCurrentTopicPollAction())}
                  className="py-2 px-3 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Vote className="w-3.5 h-3.5" />
                  <span>Abrir Votação (Pauta 5)</span>
                </button>
                <button
                  type="button"
                  disabled={isPending || !activePoll}
                  onClick={() =>
                    askConfirm({
                      title: "Encerrar Votação da Mesa-Redonda",
                      description:
                        "Isso bloqueará novos votos, apurará a questão mais votada e projetará o resultado oficial na ARENA antes da Mesa-Redonda.",
                      confirmLabel: "Encerrar e Publicar Resultado",
                      execute: () => closeActivePollAction(),
                    })
                  }
                  className="py-2 px-3 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#14532D]" />
                  <span>Encerrar & Apurar</span>
                </button>
              </div>
            </div>
          </div>

          {/* Controle Manual do Modo do Telão ARENA */}
          <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#F7DECA] flex items-center gap-1.5">
                <MonitorPlay className="w-4 h-4 text-[#14532D]" />
                Exibição da Tela ARENA
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                  ls?.arenaOnline ? "text-emerald-400" : "text-[#D5C5AA]/60"
                }`}
              >
                <Wifi className="w-3 h-3" />
                {ls?.arenaOnline ? "Telão Conectado" : "Telão Offline"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {OFFICIAL_ARENA_MODES.map((mode) => {
                const label = ARENA_MODE_LABELS[mode];
                const isCurrent = ls?.arenaMode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      runAction(() => setArenaModeManualAction(mode))
                    }
                    className={`px-2.5 py-1.5 text-[11px] font-medium text-left truncate cursor-pointer border rounded-lg ${
                      isCurrent
                        ? "bg-[#14532D] text-white border-[#14532D] font-bold"
                        : "bg-[#030A06] text-[#F7DECA] border-[#D5C5AA]/20 hover:border-[#14532D]"
                    }`}
                    title={label}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#D5C5AA]/15 text-xs">
              <div className="flex items-center gap-2">
                <a
                  href="/arena"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] font-semibold rounded-lg"
                >
                  Abrir Telão ARENA ↗
                </a>
                <a
                  href="/arena?modo=palco"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] font-semibold rounded-lg"
                >
                  Monitor de Palco ↗
                </a>
              </div>

              <button
                type="button"
                onClick={() =>
                  askConfirm({
                    title: ls?.emergencyActive
                      ? "Desativar Contingência Técnica"
                      : "Ativar Tela de Contingência Técnica",
                    description: ls?.emergencyActive
                      ? "O telão voltará à exibição normal da etapa ativa."
                      : 'O telão exibirá imediatamente o aviso institucional de contingência: "Estamos realizando um ajuste técnico. A programação continuará em instantes."',
                    confirmLabel: ls?.emergencyActive
                      ? "Retomar Normalidade"
                      : "Ativar Contingência",
                    danger: !ls?.emergencyActive,
                    execute: () =>
                      toggleEmergencyModeAction(!ls?.emergencyActive),
                  })
                }
                className="px-3 py-1.5 border border-red-500/40 bg-red-950/30 text-red-300 font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Contingência</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sequência Oficial de 10 Etapas Macro do Evento (§1 e §2) */}
      {macroBlocks.length > 0 && (
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/85 p-6 rounded-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-lg text-[#F7DECA] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#14532D]" />
                Sequência Oficial do Evento (10 Etapas · 145 Minutos / 2h25)
              </h3>
              <p className="text-xs text-[#D5C5AA]/75">
                Visão estrutural da programação com status em tempo real (Concluída, Em andamento, Pendente).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {macroBlocks.map((mb) => {
              const isCurrentMacro =
                activeStep?.macroOrder === mb.macroOrder;
              const isDone = mb.status === "COMPLETED";
              return (
                <div
                  key={mb.id}
                  className={`border p-3.5 rounded-xl space-y-1.5 text-xs ${
                    isCurrentMacro
                      ? "border-2 border-[#14532D] bg-emerald-950/30"
                      : isDone
                        ? "border-emerald-500/30 bg-[#030A06]/90 opacity-85"
                        : "border-[#D5C5AA]/15 bg-[#030A06]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono font-bold text-[#D5C5AA]">
                      Etapa {mb.macroOrder}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isCurrentMacro
                          ? "bg-[#14532D] text-white"
                          : isDone
                            ? "bg-emerald-950/60 text-emerald-300"
                            : "bg-slate-800 text-[#D5C5AA]/70"
                      }`}
                    >
                      {isCurrentMacro
                        ? "EM ANDAMENTO"
                        : isDone
                          ? "CONCLUÍDA"
                          : "PENDENTE"}
                    </span>
                  </div>
                  <div className="font-semibold text-[#F7DECA] line-clamp-2">
                    {mb.title}
                  </div>
                  <div className="text-[11px] text-[#D5C5AA]/75 flex items-center justify-between pt-1">
                    <span className="truncate">{mb.responsibleName}</span>
                    <strong className="font-mono text-[#F7DECA] shrink-0 ml-1">
                      {Math.round(mb.durationSec / 60)}m
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Aviso Operacional no Telão */}
      {!compact && (
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg text-[#F7DECA] flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#14532D]" />
              Aviso Operacional no Telão (`ScreenMessage`)
            </h3>
            {snapshot?.screenMessage && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => runAction(() => clearOperationalNoticeAction())}
                className="px-3 py-1.5 bg-red-950/30 text-red-300 border border-red-500/30 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Retirar Aviso do Telão
              </button>
            )}
          </div>

          <form
            action={(fd) => runAction(() => publishOperationalNoticeAction(fd))}
            className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end text-xs"
          >
            <div className="sm:col-span-3">
              <label className="block font-semibold text-[#D5C5AA]/80 mb-1">
                Título do Aviso
              </label>
              <input
                type="text"
                name="title"
                defaultValue="Orientação ao Público"
                required
                className="w-full px-3 py-2 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA]"
              />
            </div>
            <div className="sm:col-span-5">
              <label className="block font-semibold text-[#D5C5AA]/80 mb-1">
                Mensagem para o Público no Telão
              </label>
              <input
                type="text"
                name="body"
                required
                placeholder="Ex.: A votação para a questão da Mesa-Redonda está aberta! Acesse pelo QR Code."
                className="w-full px-3 py-2 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-semibold text-[#D5C5AA]/80 mb-1">
                Destaque
              </label>
              <select
                name="severity"
                defaultValue="INFO"
                className="w-full px-3 py-2 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA]"
              >
                <option value="INFO">Informativo</option>
                <option value="WARNING">Atenção</option>
                <option value="EMERGENCY">Urgente</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2.5 px-4 bg-[#D5C5AA] text-[#030A06] font-semibold cursor-pointer"
              >
                Exibir no Telão
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Linha do Tempo Interativa das 15 Fases Operacionais */}
      {!compact && snapshot?.operationalSteps && (
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-6 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-lg text-[#F7DECA] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#14532D]" />
                Controle Detalhado de Fases Operacionais (Exposição 15m / P&R 5m / Mesa 20m)
              </h3>
              <p className="text-xs text-[#D5C5AA]/75">
                Etapas concluídas ficam protegidas contra reabertura acidental (exigem justificativa administrativa).
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                askConfirm({
                  title: "Encerrar Evento A Nova Moeda",
                  description:
                    "Deseja finalizar oficialmente o evento, fechar o cronômetro ativo e exibir a tela institucional de encerramento?",
                  confirmLabel: "Encerrar Evento",
                  danger: true,
                  execute: () => finishEventAction(),
                })
              }
              className="px-3.5 py-2 border border-red-500/40 bg-red-950/30 text-red-300 text-xs font-semibold rounded-xl cursor-pointer self-start"
            >
              Finalizar Evento Completo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {snapshot.operationalSteps.map((st) => {
              const isCurrent = st.id === activeStep?.id;
              const isCompleted = st.status === "COMPLETED";
              return (
                <div
                  key={st.id}
                  className={`border p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs ${
                    isCurrent
                      ? "border-2 border-[#14532D] bg-emerald-950/30"
                      : "border-[#D5C5AA]/15 bg-[#030A06]"
                  }`}
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#14532D]">
                        #{String(st.sequenceOrder).padStart(2, "0")}
                      </span>
                      <span className="font-semibold text-[#F7DECA] truncate">
                        {st.title}
                      </span>
                      {isCurrent && (
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-[#14532D] text-white font-bold">
                          EM ANDAMENTO
                        </span>
                      )}
                      {!isCurrent && isCompleted && (
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-950/40 text-emerald-300 font-semibold">
                          CONCLUÍDA
                        </span>
                      )}
                      {!isCurrent && st.status === "SKIPPED" && (
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-950/40 text-amber-300 font-semibold">
                          PULADA
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#D5C5AA]/75">
                      {st.responsibleName} · Previsto:{" "}
                      <strong className="font-mono">
                        {formatSecondsMMSS(st.durationSec)}
                      </strong>
                      {typeof st.actualDurationSec === "number" && (
                        <span>
                          {" "}
                          · Realizado:{" "}
                          <strong className="font-mono text-emerald-300">
                            {formatSecondsMMSS(st.actualDurationSec)}
                          </strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {!isCurrent && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        askConfirm({
                          title: isCompleted
                            ? `Reabrir Etapa Concluída #${st.sequenceOrder}`
                            : `Iniciar Etapa #${st.sequenceOrder}`,
                          description: isCompleted
                            ? `A etapa "${st.title}" já foi concluída. Para reabri-la excepcionalmente, registre uma justificativa obrigatória.`
                            : `Deseja encerrar a etapa atual e iniciar "${st.title}" (${formatSecondsMMSS(
                                st.durationSec
                              )}) sob responsabilidade de ${st.responsibleName}?`,
                          confirmLabel: isCompleted
                            ? "Reabrir com Justificativa"
                            : "Iniciar Etapa",
                          requireJustification: isCompleted,
                          execute: (just) => jumpToStepAction(st.id, just),
                        })
                      }
                      className="px-3 py-1.5 border border-[#D5C5AA]/30 bg-[#0A150D] text-[#F7DECA] font-semibold rounded-lg shrink-0 cursor-pointer"
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

      {/* Histórico de Execução em Tempo Real (`TimerSession`) */}
      {!compact && snapshot?.recentTimerSessions && (
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg text-[#F7DECA] flex items-center gap-2">
              <History className="w-4 h-4 text-[#14532D]" />
              Registro de Tempo Real e Cumprimento do Cronograma (`TimerSession`)
            </h3>
            <span className="text-xs text-[#D5C5AA]/70">
              Auditoria automática de início, término, pausas, acréscimos e
              excessos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#D5C5AA]/20 bg-[#030A06] text-[10px] uppercase tracking-wider text-[#D5C5AA]/80">
                  <th className="p-3">Etapa</th>
                  <th className="p-3">Início Efetivo</th>
                  <th className="p-3">Previsto</th>
                  <th className="p-3">Realizado</th>
                  <th className="p-3">Pausas</th>
                  <th className="p-3">Ajustes (+ / -)</th>
                  <th className="p-3">Excedido</th>
                  <th className="p-3">Operador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D5C5AA]/15">
                {snapshot.recentTimerSessions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-4 text-center text-[#D5C5AA]/70"
                    >
                      Nenhuma sessão de cronômetro iniciada ainda.
                    </td>
                  </tr>
                ) : (
                  snapshot.recentTimerSessions.map((ts) => (
                    <tr key={ts.id}>
                      <td className="p-3 font-semibold text-[#F7DECA]">
                        #{ts.sequenceOrder} {ts.stepTitle}
                      </td>
                      <td className="p-3 font-mono text-[#D5C5AA]">
                        {new Date(ts.actualStartAt).toLocaleTimeString("pt-BR")}
                      </td>
                      <td className="p-3 font-mono text-[#F7DECA]">
                        {formatSecondsMMSS(ts.plannedDurationSec)}
                      </td>
                      <td className="p-3 font-mono font-bold text-[#F7DECA]">
                        {ts.effectiveDurationSec !== null
                          ? formatSecondsMMSS(ts.effectiveDurationSec)
                          : "Em andamento"}
                      </td>
                      <td className="p-3 font-mono text-[#D5C5AA]">
                        {ts.pausedTotalSec}s
                      </td>
                      <td className="p-3 font-mono text-[#D5C5AA]">
                        +{ts.addedTotalSec}s / -{ts.reducedTotalSec}s
                      </td>
                      <td className="p-3 font-mono">
                        {ts.overrunSec > 0 ? (
                          <span className="text-red-300 font-bold">
                            +{formatSecondsMMSS(ts.overrunSec)}
                          </span>
                        ) : (
                          <span className="text-emerald-300">No prazo</span>
                        )}
                      </td>
                      <td className="p-3 text-[#D5C5AA]/80">
                        {ts.changedByName || "Produtor"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
