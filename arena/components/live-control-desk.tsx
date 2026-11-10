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
  toggleEmergencyModeAction,
  toggleQuestionsOpenAction,
} from "@/app/actions/live-operation";
import type { ArenaMode } from "@prisma/client";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
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
} from "lucide-react";

/**
 * Sintetizador de alerta sonoro discreto via Web Audio API (§4.2 Alertas)
 */
function playDiscreteAlertBeep(kind: "WARNING_2MIN" | "CRITICAL_30S" | "EXPIRED") {
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
  execute: () => Promise<void>;
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
  const [soundMutedLocal, setSoundMutedLocal] = useState(false);
  const lastAlertLevelRef = useRef<string>("NORMAL");

  // Disparo automático de alertas sonoros discretos ao atingir 2m, 30s e 0s (§4.2)
  useEffect(() => {
    const prev = lastAlertLevelRef.current;
    const curr = timer.alertLevel;
    lastAlertLevelRef.current = curr;

    if (
      timer.status !== "RUNNING" &&
      timer.status !== "EXPIRED"
    ) {
      return;
    }

    const soundAllowed =
      snapshot?.liveState.soundAlertsEnabled && !soundMutedLocal;
    if (!soundAllowed) return;

    if (curr !== prev && curr !== "NORMAL") {
      playDiscreteAlertBeep(curr);
    }
  }, [timer.alertLevel, timer.status, snapshot?.liveState.soundAlertsEnabled, soundMutedLocal]);

  const runAction = (fn: () => Promise<void>) => {
    startTransition(async () => {
      await fn();
      await refreshNow();
    });
  };

  const askConfirm = (action: PendingConfirmAction) => {
    setConfirmModal(action);
  };

  const ls = snapshot?.liveState;
  const activeStep = snapshot?.activeStep;
  const nextStep = snapshot?.nextStep;
  const prevStep = snapshot?.prevStep;
  const activeTopic = snapshot?.activeTopic;
  const activePoll = snapshot?.activePoll;

  const progressPercent =
    timer.totalDurationMs > 0
      ? Math.min(100, Math.round((timer.elapsedMs / timer.totalDurationMs) * 100))
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
      {/* Modal de Confirmação para Ações Críticas (§4.1) */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
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
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-xs font-semibold border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  const fn = confirmModal.execute;
                  setConfirmModal(null);
                  runAction(fn);
                }}
                className={`px-4 py-2 text-xs font-semibold rounded-xl text-white cursor-pointer ${
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

      {/* Alerta de Queda de Conexão (§14.2) */}
      {!connected && (
        <div className="border border-red-500/50 bg-red-950/30 p-4 rounded-2xl flex items-center justify-between gap-4 text-xs text-red-200">
          <div className="flex items-center gap-2.5">
            <WifiOff className="w-5 h-5 shrink-0" />
            <div>
              <strong className="block text-sm">
                Conexão com o servidor oscilando — reconectando automaticamente
              </strong>
              <span>
                O cronômetro permanece preservado no servidor e será sincronizado
                assim que a rede responder.
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

      {/* Alerta de Modo de Emergência Ativo (§14.4) */}
      {ls?.emergencyActive && (
        <div className="border-2 border-red-500 bg-red-950/30 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-red-300 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              Modo de Emergência Ativo no Telão ARENA
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
            Desativar Emergência e Retomar Telão
          </button>
        </div>
      )}

      {/* Painel Principal: Cronômetro Inteligente + Etapa Atual + Controles de Tempo (§4.1 & §4.2) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Bloco Esquerdo (7 cols): Cronômetro Gigante + Controles Diretos */}
        <div className="lg:col-span-7 border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8 rounded-2xl flex flex-col justify-between gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#14532D] text-white text-xs font-bold">
                {ls ? EVENT_STATUS_LABELS[ls.status] : "Aguardando"}
              </span>
              <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${alertColors}`}>
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

          {/* Informações da Etapa e Palestrante em Destaque */}
          <div className="space-y-1.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-[#14532D]">
              {activeTopic
                ? `Pauta ${activeTopic.number} · ${activeTopic.title}`
                : "Roteiro Geral da Arena"}
            </div>
            <h2 className="font-display text-2xl sm:text-3xl text-[#F7DECA]">
              {activeStep
                ? `#${activeStep.sequenceOrder} — ${activeStep.title}`
                : "Abertura e explicação da dinâmica"}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#D5C5AA]/85">
              <span>
                Responsável pela fala:{" "}
                <strong className="text-[#F7DECA]">
                  {activeStep?.responsibleName || "Mediação & Organização"}
                </strong>
              </span>
              {activeTopic && (
                <span>
                  Provocador(a):{" "}
                  <strong className="text-[#F7DECA]">
                    {activeTopic.provokerLabel}
                  </strong>
                </span>
              )}
              <span>
                Duração prevista:{" "}
                <strong className="font-mono text-[#F7DECA]">
                  {formatSecondsMMSS(activeStep?.durationSec ?? 480)}
                </strong>
              </span>
            </div>
          </div>

          {/* Display Gigante do Cronômetro Centralizado no Servidor */}
          <div className="border border-[#D5C5AA]/20 bg-[#030A06] p-6 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-[#D5C5AA]/70 block">
                  Tempo Restante (Referência Servidor)
                </span>
                <div
                  className={`font-mono font-bold text-6xl sm:text-7xl tracking-tight ${
                    timer.alertLevel === "EXPIRED"
                      ? "text-red-600"
                      : timer.alertLevel === "CRITICAL_30S"
                      ? "text-amber-600"
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
                  / Total:{" "}
                  <strong className="font-mono text-[#F7DECA]">
                    {formatSecondsMMSS(Math.floor(timer.totalDurationMs / 1000))}
                  </strong>
                </div>
                {overrunSec > 0 && (
                  <div className="px-3 py-1 rounded-full bg-red-950/30 text-red-300 font-mono font-bold text-xs inline-block">
                    Tempo Excedido: +{formatSecondsMMSS(overrunSec)}
                  </div>
                )}
              </div>
            </div>

            {/* Barra de Andamento Visual */}
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
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

            {/* Aviso de Tempo Encerrado sem Auto-Avanço (§4.2 & §9.4) */}
            {timer.alertLevel === "EXPIRED" && (
              <div className="p-3.5 border border-red-500/40 bg-red-950/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="text-red-200 font-semibold">
                  ⏱ Tempo regulamentar encerrado! O sistema aguarda sua confirmação
                  para iniciar a próxima etapa.
                </div>
                {nextStep && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => runAction(() => nextStepAction())}
                    className="px-4 py-2 bg-[#14532D] text-white font-bold rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <SkipForward className="w-4 h-4" />
                    <span>Avançar para: {nextStep.title}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Botões Principais de Operação do Cronômetro e Etapas (§4.1 & §4.2) */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {ls?.status === "WAITING" || ls?.timerStatus === "IDLE" ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    askConfirm({
                      title: "Iniciar Evento A Nova Moeda",
                      description:
                        "Isso colocará a Arena AO VIVO, sincronizará o telão ARENA e iniciará o cronômetro da etapa atual. Deseja prosseguir?",
                      confirmLabel: "Iniciar Evento Agora",
                      execute: () => startEventAction(),
                    })
                  }
                  className="col-span-2 py-3.5 px-4 bg-[#D5C5AA] text-[#030A06] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  <span>Iniciar Evento / Cronômetro</span>
                </button>
              ) : ls?.timerStatus === "PAUSED" || ls?.timerStatus === "FINISHED" ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => runAction(() => resumeTimerAction())}
                  className="col-span-2 py-3.5 px-4 bg-[#D5C5AA] text-[#030A06] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-4 h-4" />
                  <span>Retomar Cronômetro</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => runAction(() => pauseTimerAction())}
                  className="col-span-2 py-3.5 px-4 bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Pause className="w-4 h-4" />
                  <span>Pausar Cronômetro</span>
                </button>
              )}

              <button
                type="button"
                disabled={isPending || !nextStep}
                onClick={() =>
                  askConfirm({
                    title: "Avançar para a Próxima Etapa",
                    description: `Deseja encerrar "${
                      activeStep?.title || "etapa atual"
                    }" e iniciar imediatamente "${nextStep?.title}" (${formatSecondsMMSS(
                      nextStep?.durationSec ?? 0
                    )})?`,
                    confirmLabel: "Confirmar Próxima Etapa",
                    execute: () => nextStepAction(),
                  })
                }
                className="py-3.5 px-4 bg-[#D5C5AA] text-[#030A06] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <SkipForward className="w-4 h-4" />
                <span>Próxima Etapa</span>
              </button>

              <button
                type="button"
                disabled={isPending || !prevStep}
                onClick={() =>
                  askConfirm({
                    title: "Voltar à Etapa Anterior",
                    description: `Deseja retornar para a etapa anterior "${prevStep?.title}" e reiniciar seu cronômetro?`,
                    confirmLabel: "Voltar Etapa",
                    execute: () => previousStepAction(),
                  })
                }
                className="py-3.5 px-4 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <SkipBack className="w-4 h-4" />
                <span>Etapa Anterior</span>
              </button>
            </div>

            {/* Ajustes de Tempo (+ / -) e Ações Secundárias com Confirmação */}
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
                        "O tempo restante voltará para a duração total prevista desta etapa. Confirmar reinício?",
                      confirmLabel: "Reiniciar Cronômetro",
                      execute: () => resetTimerAction(),
                    })
                  }
                  className="px-3 py-1.5 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] font-medium flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reiniciar</span>
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    askConfirm({
                      title: "Encerrar Etapa Antecipadamente",
                      description:
                        "Deseja finalizar a contagem desta etapa agora e registrar sua duração efetiva sem avançar ainda para a próxima?",
                      confirmLabel: "Encerrar Etapa",
                      execute: () => finishCurrentStepAction(),
                    })
                  }
                  className="px-3 py-1.5 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Encerrar Etapa</span>
                </button>

                <button
                  type="button"
                  disabled={isPending || !nextStep}
                  onClick={() =>
                    askConfirm({
                      title: "Pular Etapa Atual",
                      description: `A etapa "${activeStep?.title}" será marcada como PULADA (SKIPPED) e o sistema avançará para "${nextStep?.title}". Confirmar?`,
                      confirmLabel: "Pular Etapa",
                      danger: true,
                      execute: () => skipStepAction(),
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

        {/* Bloco Direito (5 cols): Próxima Etapa, Telão ARENA, Perguntas e Votação */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4">
          {/* Card Próxima Etapa */}
          <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-xs text-[#D5C5AA]/70">
              <span className="font-semibold uppercase tracking-wider text-[#14532D]">
                Próxima Etapa na Sequência
              </span>
              <span className="font-mono">
                {nextStep ? formatSecondsMMSS(nextStep.durationSec) : "—"}
              </span>
            </div>
            <div className="font-bold text-base text-[#F7DECA]">
              {nextStep
                ? `#${nextStep.sequenceOrder} — ${nextStep.title}`
                : "Fim do roteiro programado"}
            </div>
            <div className="text-xs text-[#D5C5AA]/80">
              Próximo responsável:{" "}
              <strong className="text-[#F7DECA]">
                {nextStep?.responsibleName || "—"}
              </strong>
            </div>
          </div>

          {/* Controle Rápido de Perguntas & Votação da Pauta (§4.1, §5.5 e §6.2) */}
          <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F7DECA] flex items-center gap-1.5">
                <MessageSquareMore className="w-4 h-4 text-[#14532D]" />
                Recebimento de Perguntas
              </span>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runAction(() =>
                    toggleQuestionsOpenAction(!ls?.questionsOpen)
                  )
                }
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl cursor-pointer ${
                  ls?.questionsOpen
                    ? "bg-emerald-950/30 text-emerald-300 border border-emerald-500/30"
                    : "bg-slate-200 text-slate-700"
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
                  Votação da Pauta{" "}
                  {activePoll ? `#${activePoll.number}` : "Atual"}
                </span>
                <span className="font-mono text-[#D5C5AA]/80">
                  Status: <strong>{activePoll?.status || "DRAFT"}</strong> ·{" "}
                  {snapshot?.metrics.activePollVotes ?? 0} votos
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => runAction(() => openCurrentTopicPollAction())}
                  className="py-2 px-3 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Vote className="w-3.5 h-3.5" />
                  <span>Abrir Votação</span>
                </button>
                <button
                  type="button"
                  disabled={isPending || !activePoll}
                  onClick={() => runAction(() => closeActivePollAction())}
                  className="py-2 px-3 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#14532D]" />
                  <span>Encerrar & Exibir Gráfico</span>
                </button>
              </div>
            </div>
          </div>

          {/* Controle Manual do Modo do Telão ARENA (13 modos §3.2) + Monitor de Palco */}
          <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#F7DECA] flex items-center gap-1.5">
                <MonitorPlay className="w-4 h-4 text-[#14532D]" />
                Modo de Exibição da Tela ARENA
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                  ls?.arenaOnline ? "text-emerald-700" : "text-slate-500"
                }`}
              >
                <Wifi className="w-3 h-3" />
                {ls?.arenaOnline ? "Telão Conectado" : "Telão Offline"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {(Object.entries(ARENA_MODE_LABELS) as [ArenaMode, string][]).map(
                ([mode, label]) => {
                  const isCurrent = ls?.arenaMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        runAction(() => setArenaModeManualAction(mode))
                      }
                      className={`px-2.5 py-1.5 text-[11px] font-medium text-left truncate cursor-pointer border ${
                        isCurrent
                          ? "bg-[#14532D] text-white border-[#14532D] font-bold"
                          : "bg-[#030A06] text-[#F7DECA] border-[#D5C5AA]/20 hover:border-[#14532D]"
                      }`}
                      title={label}
                    >
                      {label}
                    </button>
                  );
                }
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#D5C5AA]/15 text-xs">
              <div className="flex items-center gap-2">
                <a
                  href="/arena"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] font-semibold"
                >
                  Abrir Telão Público ↗
                </a>
                <a
                  href="/arena?modo=palco"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] font-semibold"
                >
                  Monitor de Palco (§7.4) ↗
                </a>
              </div>

              <button
                type="button"
                onClick={() =>
                  askConfirm({
                    title: ls?.emergencyActive
                      ? "Desativar Modo de Emergência"
                      : "Ativar Modo de Emergência no Telão (§14.4)",
                    description: ls?.emergencyActive
                      ? "O telão voltará à exibição normal da pauta."
                      : 'O telão exibirá imediatamente o aviso de contingência: "Estamos realizando um ajuste técnico. A Arena continuará em instantes."',
                    confirmLabel: ls?.emergencyActive
                      ? "Retomar Normalidade"
                      : "Ativar Tela de Emergência",
                    danger: !ls?.emergencyActive,
                    execute: () =>
                      toggleEmergencyModeAction(!ls?.emergencyActive),
                  })
                }
                className="px-3 py-1.5 border border-red-500/40 bg-red-950/30 text-red-300 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Emergência</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Aviso Operacional no Telão (§3.2 item 13 e §4.1) */}
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
                className="px-3 py-1.5 bg-red-950/30 text-red-300 border border-red-500/30 text-xs font-semibold cursor-pointer"
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
                defaultValue="Aviso da Organização"
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
                placeholder="Ex.: Envie suas perguntas pelo QR Code! A Voz da Plateia começará em 2 minutos."
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

      {/* Linha do Tempo Interativa das 40 Etapas Operacionais (§9.1 e §9.2) */}
      {!compact && snapshot?.operationalSteps && (
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-6 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-display text-lg text-[#F7DECA] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#14532D]" />
                Motor de Fluxo Completo (40 Etapas Operacionais)
              </h3>
              <p className="text-xs text-[#D5C5AA]/75">
                Clique em &ldquo;Ativar&rdquo; em qualquer etapa para posicionar o
                evento imediatamente naquele ponto (com confirmação).
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                askConfirm({
                  title: "Encerrar Evento A Nova Moeda",
                  description:
                    "Deseja finalizar oficialmente o evento, fechar o cronômetro ativo e exibir a tela de encerramento?",
                  confirmLabel: "Encerrar Evento",
                  danger: true,
                  execute: () => finishEventAction(),
                })
              }
              className="px-3.5 py-2 border border-red-500/40 bg-red-950/30 text-red-300 text-xs font-semibold cursor-pointer self-start"
            >
              Finalizar Evento Completo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
            {snapshot.operationalSteps.map((st) => {
              const isCurrent = st.id === activeStep?.id;
              return (
                <div
                  key={st.id}
                  className={`border p-3 rounded-xl flex items-center justify-between gap-3 text-xs ${
                    isCurrent
                      ? "border-[#14532D] bg-emerald-950/30"
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
                          EM CURSO
                        </span>
                      )}
                      {!isCurrent && st.status === "COMPLETED" && (
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-950/30 text-emerald-300 font-semibold">
                          CONCLUÍDA
                        </span>
                      )}
                      {!isCurrent && st.status === "SKIPPED" && (
                        <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-950/30 text-amber-300 font-semibold">
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
                          title: `Ir para Etapa #${st.sequenceOrder}`,
                          description: `Deseja ativar imediatamente "${st.title}" (${formatSecondsMMSS(
                            st.durationSec
                          )}) sob responsabilidade de ${st.responsibleName}?`,
                          confirmLabel: "Ativar Etapa",
                          execute: () => jumpToStepAction(st.id),
                        })
                      }
                      className="px-3 py-1.5 border border-[#D5C5AA]/30 bg-[#0A150D] text-[#F7DECA] font-semibold shrink-0 cursor-pointer"
                    >
                      Ativar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Histórico de Execução em Tempo Real (`TimerSession` — §4.2) */}
      {!compact && snapshot?.recentTimerSessions && (
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg text-[#F7DECA] flex items-center gap-2">
              <History className="w-4 h-4 text-[#14532D]" />
              Registro de Tempo Real e Cumprimento do Cronograma (`TimerSession`)
            </h3>
            <span className="text-xs text-[#D5C5AA]/70">
              Auditoria automática de início, término, pausas, acréscimos e excessos
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
                    <td colSpan={8} className="p-4 text-center text-[#D5C5AA]/70">
                      Nenhuma sessão de cronômetro iniciada ainda. Clique em
                      &ldquo;Iniciar Evento&rdquo; acima para começar.
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
                        {ts.changedByName || "Operador"}
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
