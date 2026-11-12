"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useArenaSync } from "@/hooks/use-arena-sync";
import { ARENA_MODE_LABELS, formatSecondsMMSS } from "@/lib/events";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  Clock,
  Maximize2,
  Minimize2,
  MessageSquare,
  Mic,
  Radio,
  Smartphone,
  Sparkles,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Vote,
  WifiOff,
} from "lucide-react";

function resolveSpeakerPhoto(name?: string | null, photoUrl?: string | null): string | null {
  if (photoUrl && photoUrl.trim()) return photoUrl;
  if (!name) return null;
  const n = name.toLowerCase();
  if (n.includes("daniel")) return "/img/Daniel.jpeg";
  if (n.includes("janaina") || n.includes("janaína")) return "/img/Janaina.jpeg";
  if (n.includes("denilson")) return "/img/Denilson.png";
  if (n.includes("sergio") || n.includes("sérgio")) return "/img/Sergio.jpeg";
  if (n.includes("dulcila")) return "/img/Dulcila.jpeg";
  return null;
}

// ---------------------------------------------------------------------------
// ÁUDIO CINEMATOGRÁFICO DO TELÃO (Chimes e Efeitos Web Audio em 60fps)
// ---------------------------------------------------------------------------
function playPresentationChime(kind: "STAGE_START" | "POLL_WINNER") {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (kind === "STAGE_START") {
      // Acorde suave de início de etapa (F4 -> A4 -> C5)
      const notes = [
        { freq: 349.23, time: 0, dur: 0.8, gain: 0.04 },
        { freq: 440.0, time: 0.08, dur: 0.9, gain: 0.05 },
        { freq: 523.25, time: 0.16, dur: 1.2, gain: 0.06 },
      ];
      notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(n.freq, ctx.currentTime + n.time);
        g.gain.setValueAtTime(0.001, ctx.currentTime + n.time);
        g.gain.exponentialRampToValueAtTime(n.gain, ctx.currentTime + n.time + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + n.time + n.dur);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(ctx.currentTime + n.time);
        osc.stop(ctx.currentTime + n.time + n.dur);
      });
    } else if (kind === "POLL_WINNER") {
      // Acorde comemorativo nobre (C4 -> E4 -> G4 -> C5)
      const notes = [
        { freq: 261.63, time: 0, dur: 1.1, gain: 0.05 },
        { freq: 329.63, time: 0.1, dur: 1.3, gain: 0.06 },
        { freq: 392.0, time: 0.2, dur: 1.5, gain: 0.07 },
        { freq: 523.25, time: 0.3, dur: 2.0, gain: 0.08 },
      ];
      notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(n.freq, ctx.currentTime + n.time);
        g.gain.setValueAtTime(0.001, ctx.currentTime + n.time);
        g.gain.exponentialRampToValueAtTime(n.gain, ctx.currentTime + n.time + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + n.time + n.dur);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(ctx.currentTime + n.time);
        osc.stop(ctx.currentTime + n.time + n.dur);
      });
    }
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// SUB-COMPONENTE: Anel de Progresso Circular que Esvazia Suavemente
// ---------------------------------------------------------------------------
function CircularTimer({
  formatted,
  alertLevel,
  elapsedMs,
  totalDurationMs,
  phaseLabel,
  size = 200,
}: {
  formatted: string;
  alertLevel: "NORMAL" | "WARNING_2MIN" | "CRITICAL_30S" | "EXPIRED";
  elapsedMs: number;
  totalDurationMs: number;
  phaseLabel?: string;
  size?: number;
}) {
  const strokeWidth = 9;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  // O anel esvazia conforme o tempo passa (de 1 a 0)
  const remainingFraction =
    totalDurationMs > 0 ? Math.max(0, Math.min(1, 1 - elapsedMs / totalDurationMs)) : 1;
  const strokeDashoffset = circumference * (1 - remainingFraction);

  const strokeColor =
    alertLevel === "EXPIRED"
      ? "#EF4444"
      : alertLevel === "CRITICAL_30S"
        ? "#F59E0B"
        : alertLevel === "WARNING_2MIN"
          ? "#FCD34D"
          : "#10B981";

  const glowShadow =
    alertLevel === "EXPIRED"
      ? "drop-shadow(0 0 18px rgba(239, 68, 68, 0.7))"
      : alertLevel === "CRITICAL_30S"
        ? "drop-shadow(0 0 16px rgba(245, 158, 11, 0.6))"
        : alertLevel === "WARNING_2MIN"
          ? "drop-shadow(0 0 12px rgba(252, 211, 77, 0.45))"
          : "drop-shadow(0 0 14px rgba(16, 185, 129, 0.4))";

  return (
    <div className="relative flex flex-col items-center justify-center mx-auto" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        {/* Trilho de fundo translúcido */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(213, 197, 170, 0.14)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Anel de progresso ativo que esvazia suavemente */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          style={{
            filter: glowShadow,
            transition: "stroke-dashoffset 0.5s linear, stroke 0.3s ease",
          }}
        />
      </svg>

      {/* Dígitos com Rolagem e Tipografia de Palco */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
        <span
          className={`font-mono font-bold tracking-tight leading-none ${
            size >= 190 ? "text-5xl sm:text-6xl" : "text-4xl sm:text-5xl"
          } ${
            alertLevel === "EXPIRED"
              ? "text-red-400 animate-pulse"
              : alertLevel === "CRITICAL_30S"
                ? "text-amber-400"
                : alertLevel === "WARNING_2MIN"
                  ? "text-amber-200"
                  : "text-[#F7DECA]"
          }`}
        >
          {formatted}
        </span>
        {phaseLabel && (
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 mt-2 block">
            {phaseLabel}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SUB-COMPONENTE: Indicador de Onda Sonora para "Com a Palavra"
// ---------------------------------------------------------------------------
function SoundWaveBadge({ label = "Com a Palavra" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-md">
      <span className="flex items-end gap-0.5 h-3.5" aria-hidden="true">
        <span className="w-1 bg-emerald-400 rounded-full animate-wave-1" />
        <span className="w-1 bg-emerald-400 rounded-full animate-wave-2" />
        <span className="w-1 bg-emerald-400 rounded-full animate-wave-3" />
        <span className="w-1 bg-emerald-400 rounded-full animate-wave-1" />
      </span>
      <span>{label}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// SUB-COMPONENTE: Confetes Dourados em CSS para a Questão Vencedora
// ---------------------------------------------------------------------------
function ConfettiSparkles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl z-0">
      {[...Array(14)].map((_, i) => (
        <div
          key={i}
          className="sparkle-dot"
          style={{
            left: `${5 + i * 7}%`,
            bottom: `${8 + (i % 3) * 14}%`,
            animationDelay: `${i * 0.18}s`,
            animationDuration: `${2.3 + (i % 4) * 0.35}s`,
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SUB-COMPONENTE: Módulo Executivo de Participação com QR Code & Micro-Interações
// ---------------------------------------------------------------------------
function ParticipateNowCard({
  title = "Participe Agora",
  subtitle = "Envie perguntas ao vivo e vote na questão da Mesa-Redonda.",
  compact = false,
}: {
  title?: string;
  subtitle?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="animate-card-float border border-emerald-500/40 bg-[#0A150D]/90 p-4 rounded-2xl flex items-center gap-4 shadow-xl max-w-sm w-full backdrop-blur-md select-none group hover:border-emerald-400 transition">
        <div className="relative w-16 h-16 bg-white p-1 rounded-xl shrink-0 shadow-md">
          <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-emerald-600 rounded-tl-xs pointer-events-none" />
          <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-emerald-600 rounded-tr-xs pointer-events-none" />
          <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-emerald-600 rounded-bl-xs pointer-events-none" />
          <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-emerald-600 rounded-br-xs pointer-events-none" />
          <img src="/api/qr" alt="QR" className="w-full h-full object-contain" />
        </div>
        <div className="text-xs text-[#D5C5AA]/90 text-left space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-[#F7DECA]">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>{title}</span>
          </div>
          <span className="block leading-relaxed">{subtitle}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group max-w-sm w-full mx-auto select-none">
      {/* Halo de luz suave em esmeralda e âmbar */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-emerald-500/25 via-amber-500/15 to-emerald-500/25 blur-xl opacity-75 group-hover:opacity-100 transition duration-700 animate-pulse" />

      <div className="relative rounded-3xl border border-emerald-500/40 bg-[#0A140E]/95 backdrop-blur-2xl p-6 sm:p-7 text-center shadow-2xl space-y-4">
        {/* Botão / Badge 'Participe Agora' de alto padrão */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 border border-emerald-400/60 text-xs font-bold uppercase tracking-widest text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>{title}</span>
        </div>

        {/* Moldura de Alta Precisão do QR Code com Mira nos Cantos */}
        <div className="relative w-56 h-56 mx-auto p-3.5 bg-white rounded-2xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.08)] border-2 border-emerald-500/30 flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-300">
          <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-700 rounded-tl pointer-events-none" />
          <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-emerald-700 rounded-tr pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-700 rounded-bl pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-emerald-700 rounded-br pointer-events-none" />

          <img
            src="/api/qr"
            alt="QR Code de Participação"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Orientações Claras e Elegantes */}
        <div className="space-y-1">
          <div className="font-display font-bold text-base text-[#F7DECA] tracking-tight">
            Aponte a Câmera do Celular
          </div>
          <p className="text-xs text-[#D5C5AA]/85 leading-relaxed font-medium">
            {subtitle}
          </p>
        </div>

        {/* Micro-rodapé de confiança */}
        <div className="pt-3 border-t border-[#D5C5AA]/15 flex items-center justify-between text-[11px] text-[#D5C5AA]/70">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Interação Instantânea</span>
          </span>
          <span className="font-mono text-emerald-300/90 font-medium">
            Sem baixar app
          </span>
        </div>
      </div>
    </div>
  );
}

export function ArenaScreen() {
  const searchParams = useSearchParams();
  const isStageMonitor = searchParams.get("modo") === "palco";

  const { snapshot, timer, connected } = useArenaSync({ isArenaScreen: true });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // FASE C: Ocultação automática de cursor e controles após 2.8s de inatividade
  const [isIdle, setIsIdle] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // FASE C: Som ambiente / efeitos do telão (com persistência local)
  const [soundEnabled, setSoundEnabled] = useState(false);
  const lastModeRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("anm_arena_sound");
      if (saved === "true") setSoundEnabled(true);
    }
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("anm_arena_sound", String(next));
      }
      return next;
    });
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // FASE C: Gerenciador de Inatividade do Mouse (Cursor Auto-Hide)
  useEffect(() => {
    const handleActivity = () => {
      setIsIdle(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setIsIdle(true);
      }, 2800);
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("mousedown", handleActivity);
    window.addEventListener("keydown", handleActivity);

    idleTimerRef.current = setTimeout(() => {
      setIsIdle(true);
    }, 2800);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("mousedown", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  // FASE C: Atalhos de Teclado Globais do Telão (F = Tela Cheia, M = Som)
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFsChange);

    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleSound();
      }
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [toggleFullscreen, toggleSound]);

  // Contador dinâmico de participantes na espera (sempre > 98, com pulso orgânico)
  const [participantCount, setParticipantCount] = useState(104);

  useEffect(() => {
    const base = snapshot?.metrics?.connectedParticipants || 0;
    const initial = Math.max(99, base > 0 ? base + 18 : 104);
    setParticipantCount(initial);

    const interval = setInterval(() => {
      setParticipantCount((prev) => {
        const delta = Math.random() > 0.4 ? 1 : 0;
        return prev + delta;
      });
    }, 12000);

    return () => clearInterval(interval);
  }, [snapshot?.metrics?.connectedParticipants]);

  const ls = snapshot?.liveState;
  const activeTopic = snapshot?.activeTopic;
  const activeStep = snapshot?.activeStep;
  const nextStep = snapshot?.nextStep;
  const activePoll = snapshot?.activePoll;
  const selectedQuestion = snapshot?.selectedQuestion;
  const screenMessage = snapshot?.screenMessage;

  const currentMode = useMemo(() => {
    if (ls?.emergencyActive) return "CONTINGENCY";
    return ls?.arenaMode || "WAITING";
  }, [ls?.emergencyActive, ls?.arenaMode]);

  // FASE C: Disparo de chimes ao trocar de modo se o som estiver ativado
  useEffect(() => {
    if (!soundEnabled) return;
    const prev = lastModeRef.current;
    lastModeRef.current = currentMode;

    if (prev && prev !== currentMode) {
      if (currentMode === "POLL_RESULTS") {
        playPresentationChime("POLL_WINNER");
      } else if (
        currentMode === "OPENING" ||
        currentMode === "SPEAKER_EXPOSITION" ||
        currentMode === "ROUNDTABLE"
      ) {
        playPresentationChime("STAGE_START");
      }
    }
  }, [currentMode, soundEnabled]);

  const showTimer = isStageMonitor || (ls?.showTimerOnArena ?? true);

  const timerStyle = useMemo(() => {
    if (timer.alertLevel === "EXPIRED") {
      return "text-red-400 border-red-500/60 bg-red-950/40 animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.35)]";
    }
    if (timer.alertLevel === "CRITICAL_30S") {
      return "text-amber-400 border-amber-400/60 bg-amber-950/30 shadow-[0_0_25px_rgba(245,158,11,0.25)] animate-pulse";
    }
    if (timer.alertLevel === "WARNING_2MIN") {
      return "text-amber-200 border-amber-300/40 bg-amber-950/20 shadow-[0_0_20px_rgba(245,158,11,0.15)]";
    }
    return "text-[#F7DECA] border-[#D5C5AA]/25 bg-[#0A150D]/80 shadow-[0_0_20px_rgba(20,83,45,0.2)]";
  }, [timer.alertLevel]);

  // Resolutores de foto
  const activeSpeakerName =
    activeTopic?.mainSpeaker?.name || activeStep?.speaker?.name || activeStep?.responsibleName;
  const activeSpeakerPhoto = resolveSpeakerPhoto(
    activeSpeakerName,
    activeTopic?.mainSpeaker?.photoUrl || activeStep?.speaker?.photoUrl
  );

  // FASE C: Contagem regressiva para abertura programada (se houver no futuro)
  const [countdownText, setCountdownText] = useState<string | null>(null);

  useEffect(() => {
    if (!snapshot?.event?.scheduledStartAt || currentMode !== "WAITING") {
      setCountdownText(null);
      return;
    }
    const target = new Date(snapshot.event.scheduledStartAt).getTime();

    const updateTicker = () => {
      const diff = target - Date.now();
      if (diff > 0) {
        const totalSec = Math.floor(diff / 1000);
        const hrs = Math.floor(totalSec / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const secs = totalSec % 60;
        if (hrs > 0) {
          setCountdownText(
            `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
          );
        } else {
          setCountdownText(`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
        }
      } else {
        setCountdownText(null);
      }
    };

    updateTicker();
    const ticker = setInterval(updateTicker, 1000);
    return () => clearInterval(ticker);
  }, [snapshot?.event?.scheduledStartAt, currentMode]);

  // =========================================================================
  // MODO MONITOR DE APOIO DE PALCO (ALTO CONTRASTE PARA O PALESTRANTE)
  // =========================================================================
  if (isStageMonitor) {
    return (
      <main className="relative min-h-screen w-full bg-[#030A06] text-[#F7DECA] flex flex-col justify-between p-8 sm:p-14 select-none">
        {!connected && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-2 rounded-full bg-red-950/90 border border-red-500/60 text-red-200 text-sm font-semibold flex items-center gap-2 shadow-xl backdrop-blur-md">
            <WifiOff className="w-4 h-4 animate-spin" />
            <span>Tentando reconectar... (horário preservado no servidor)</span>
          </div>
        )}

        <header className="flex items-center justify-between border-b border-[#D5C5AA]/20 pb-6">
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-[0.25em] text-emerald-400 font-bold">
              Monitor de Apoio de Palco · Arena UEFS
            </span>
            <h1 className="font-display text-2xl sm:text-3xl text-[#F7DECA]">
              {activeTopic
                ? `Pauta ${activeTopic.number} — ${activeTopic.title}`
                : activeStep?.title || "A Nova Moeda"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-xs text-[#D5C5AA]/70 block uppercase tracking-wider">
                Com a Palavra
              </span>
              <strong className="text-lg text-[#F7DECA]">
                {activeSpeakerName || "Organização"}
              </strong>
            </div>
            <button
              onClick={toggleFullscreen}
              className="p-2.5 rounded-xl border border-[#D5C5AA]/30 bg-[#0A150D] text-[#D5C5AA] hover:text-[#F7DECA]"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="my-auto py-10 flex flex-col items-center justify-center text-center space-y-8">
          <CircularTimer
            formatted={timer.formatted}
            alertLevel={timer.alertLevel}
            elapsedMs={timer.elapsedMs}
            totalDurationMs={timer.totalDurationMs}
            phaseLabel={activeStep?.phaseLabel || "Tempo da Fase"}
            size={280}
          />
          {timer.alertLevel === "EXPIRED" && (
            <div className="text-xl sm:text-2xl font-bold text-red-400 uppercase tracking-wider animate-pulse">
              TEMPO DA FASE ENCERRADO (00:00)
            </div>
          )}
        </div>

        <footer className="border-t border-[#D5C5AA]/20 pt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-[#D5C5AA]/80">
          <div>
            PRÓXIMA ETAPA:{" "}
            <strong className="text-[#F7DECA]">
              {nextStep ? `${nextStep.title} (${nextStep.responsibleName})` : "Encerramento"}
            </strong>
          </div>
          <div className="flex items-center gap-6">
            <span>
              Perguntas aprovadas:{" "}
              <strong className="text-emerald-400">{snapshot?.metrics?.questionsApproved ?? 0}</strong>
            </span>
            <span>
              Votos computados:{" "}
              <strong className="text-emerald-400">{snapshot?.metrics?.activePollVotes ?? 0}</strong>
            </span>
          </div>
        </footer>
      </main>
    );
  }

  // =========================================================================
  // TELÃO PÚBLICO DA ARENA (PROJEÇÃO PRINCIPAL IMERSIVA v2.5)
  // =========================================================================
  return (
    <main
      className={`arena-stage min-h-screen w-full flex flex-col justify-between p-6 sm:p-12 select-none ${
        isIdle ? "cursor-none" : "cursor-default"
      }`}
      data-mode={currentMode}
    >
      {/* 1. Camadas de Fundo Vivo e Dinâmico */}
      <div className="arena-orb-1" />
      <div className="arena-orb-2" />
      <div className="arena-orb-accent" />
      <div className="arena-grid-mesh" />
      <div className="arena-vignette" />

      {/* FASE C: Botões Flutuantes Discretos (Ocultam automaticamente quando inativo) */}
      <div
        className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 transition-opacity duration-300 ${
          isIdle ? "opacity-0 pointer-events-none" : "opacity-90 hover:opacity-100"
        }`}
      >
        <ThemeToggle compact />
        <button
          onClick={toggleSound}
          className={`p-2.5 rounded-xl border backdrop-blur-md cursor-pointer transition ${
            soundEnabled
              ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-md"
              : "bg-[#030A06]/80 border-[#D5C5AA]/20 text-[#D5C5AA]/60 hover:text-white"
          }`}
          title={soundEnabled ? "Desativar Áudio do Telão (M)" : "Ativar Áudio do Telão (M)"}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        <button
          onClick={toggleFullscreen}
          className="p-2.5 rounded-xl border border-[#D5C5AA]/20 bg-[#030A06]/80 text-[#D5C5AA]/60 hover:text-white hover:border-[#D5C5AA]/60 transition backdrop-blur-md cursor-pointer"
          title={isFullscreen ? "Sair de Tela Cheia (F)" : "Alternar Tela Cheia (F)"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* FASE C: Indicador Mínimo de Conexão (Só surge em caso de oscilação real) */}
      {!connected && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-2 rounded-full bg-red-950/95 border border-red-500/60 text-red-200 text-xs sm:text-sm font-semibold flex items-center gap-2.5 shadow-2xl backdrop-blur-md animate-pulse">
          <WifiOff className="w-4 h-4 text-red-400" />
          <span>Sincronizando com o servidor... (horário preservado)</span>
        </div>
      )}

      {/* 2. Cabeçalho Nobre e Translúcido da ARENA */}
      <header className="relative z-20 flex items-center justify-between border-b border-[#D5C5AA]/20 pb-5">
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12 rounded-2xl bg-[#0A150D] border border-emerald-500/40 p-1 flex items-center justify-center shadow-xl">
            <img
              src="/img/logo.png"
              alt="A Nova Moeda"
              className="w-full h-full object-contain filter drop-shadow"
            />
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#030A06] animate-pulse" />
          </div>
          <div>
            <div className="font-display font-bold text-xl sm:text-2xl text-[#F7DECA] tracking-tight drop-shadow-sm">
              A Nova Moeda
            </div>
            <div className="text-xs sm:text-sm text-[#D5C5AA]/75 flex items-center gap-2">
              <span className="font-semibold text-emerald-400">UEFS</span>
              <span>·</span>
              <span>{activeStep?.phaseLabel || ARENA_MODE_LABELS[currentMode]}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {showTimer &&
            ![
              "INTRODUCTION",
              "SPEAKER_EXPOSITION",
              "SELECTED_QUESTION",
              "ROUNDTABLE",
              "POLL_OPEN",
            ].includes(currentMode) && (
              <div
                className={`px-4 py-1.5 rounded-2xl border font-mono font-bold text-lg sm:text-xl flex items-center gap-2 backdrop-blur-md ${timerStyle}`}
              >
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>{timer.formatted}</span>
              </div>
            )}

          <div className="px-3.5 py-1.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>AO VIVO</span>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3. CONTEÚDO PRINCIPAL (TRANSIÇÃO SUAVE ENTRE MODOS VIA KEY={CURRENTMODE})  */}
      {/* ========================================================================= */}
      <div key={currentMode} className="my-auto py-8 relative z-10 animate-stage-enter">
        {/* ----------------------------------------------------------------------- */}
        {/* 1. QUANDO NÃO HOUVER PAUTA ATIVA: EXIBIMOS A VOTAÇÃO DA MESA-REDONDA    */}
        {/* (Válido para WAITING, OPENING, INTRODUCTION, POLL_OPEN, etc.)          */}
        {/* ----------------------------------------------------------------------- */}
        {!activeTopic &&
          currentMode !== "ROUNDTABLE" &&
          currentMode !== "COLLECTIVE_BUILDING" &&
          currentMode !== "CLOSING" &&
          currentMode !== "CONTINGENCY" &&
          currentMode !== "OPERATIONAL_NOTICE" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              {/* Coluna Principal: Card da Votação Oficial da Mesa-Redonda */}
              <div className="lg:col-span-7 space-y-6">
                <div className="animate-stagger-1 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#14532D] text-white text-xs sm:text-sm font-bold uppercase tracking-wider shadow-lg">
                    <Vote className="w-4 h-4 text-emerald-300" />
                    {activePoll?.status === "TIE_BREAK"
                      ? "Desempate Rápido da Mesa-Redonda"
                      : activePoll?.status === "CLOSED" ||
                          activePoll?.status === "RESULTS_PUBLISHED" ||
                          currentMode === "POLL_RESULTS"
                        ? "Resultado Oficial · Questão da Mesa-Redonda"
                        : currentMode === "OPENING"
                          ? "Etapa 1 · Abertura Oficial · Votação da Mesa-Redonda"
                          : currentMode === "INTRODUCTION"
                            ? "Etapa 2 · Introdução (Paula) · Votação da Mesa-Redonda"
                            : "Votação da Mesa-Redonda Aberta"}
                  </span>

                  {countdownText ? (
                    <span className="px-3.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm">
                      <Clock className="w-3.5 h-3.5 animate-pulse" />
                      <span>Início em {countdownText}</span>
                    </span>
                  ) : null}

                  <span className="text-xs text-[#D5C5AA]/70 px-3 py-1 rounded-full bg-white/5 border border-white/10 hidden sm:inline">
                    {activeStep?.phaseLabel || ARENA_MODE_LABELS[currentMode]}
                  </span>
                </div>

                <div className="space-y-2">
                  <h1 className="animate-stagger-2 font-display text-3xl sm:text-5xl text-[#F7DECA] font-extrabold leading-tight tracking-tight drop-shadow-sm">
                    {activePoll?.question ||
                      "Qual questão crucial deve ser debatida pelos 5 especialistas na Mesa-Redonda?"}
                  </h1>
                  <p className="animate-stagger-3 text-sm sm:text-lg text-[#D5C5AA]/90 max-w-2xl leading-relaxed">
                    {activePoll?.status === "CLOSED" ||
                    activePoll?.status === "RESULTS_PUBLISHED" ||
                    currentMode === "POLL_RESULTS"
                      ? "Apuração concluída. Esta é a questão eleita pela plateia para orientar o debate entre os 5 palestrantes."
                      : "A escolha do tema da Mesa-Redonda é feita pela plateia em tempo real. Aponte a câmera do celular para votar."}
                  </p>
                </div>

                {/* Lista das Questões Temáticas da Votação */}
                <div className="animate-stagger-3 space-y-3">
                  {activePoll?.options.map((opt) => {
                    const pct = opt.percentage ?? 0;
                    const isWinner = opt.isWinner;
                    const showPct =
                      (activePoll?.status === "CLOSED" ||
                        activePoll?.status === "RESULTS_PUBLISHED" ||
                        currentMode === "POLL_RESULTS") &&
                      opt.percentage !== null &&
                      opt.percentage !== undefined;

                    return (
                      <div
                        key={opt.id}
                        className={`relative border p-4 sm:p-5 rounded-2xl transition-all duration-300 backdrop-blur-xl ${
                          isWinner
                            ? "border-2 border-amber-400 bg-amber-950/40 shadow-[0_0_30px_rgba(245,158,11,0.3)]"
                            : "border-[#D5C5AA]/20 bg-[#0A150D]/85 hover:border-emerald-500/40"
                        }`}
                      >
                        {isWinner && <ConfettiSparkles />}
                        <div className="relative z-10 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                              {opt.themeLabel || `Questão ${opt.optionOrder}`}
                            </span>
                            {isWinner && (
                              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-extrabold text-[10px] flex items-center gap-1 shadow-sm">
                                <Trophy className="w-3 h-3 fill-current" />
                                ELEITA PELO PÚBLICO
                              </span>
                            )}
                          </div>
                          {showPct && (
                            <span className="font-mono font-bold text-lg text-[#F7DECA] shrink-0">
                              {pct}%
                            </span>
                          )}
                        </div>

                        <p className="relative z-10 text-xs sm:text-sm font-medium text-[#F7DECA] mt-1.5 leading-relaxed">
                          &ldquo;{opt.label}&rdquo;
                        </p>

                        {showPct && (
                          <div className="relative z-10 w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-[#D5C5AA]/15 mt-2.5">
                            <div
                              className={`h-full transition-all duration-1000 ease-out ${
                                isWinner
                                  ? "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]"
                                  : "bg-gradient-to-r from-[#14532D] to-emerald-500"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Coluna Lateral: Timer Circular + Card 'Participe Agora' de Alto Padrão */}
              <div className="lg:col-span-5 animate-stagger-4 flex flex-col items-center gap-6">
                {showTimer && (
                  <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 rounded-3xl text-center space-y-3 shadow-2xl backdrop-blur-xl w-full max-w-sm">
                    <CircularTimer
                      formatted={timer.formatted}
                      alertLevel={timer.alertLevel}
                      elapsedMs={timer.elapsedMs}
                      totalDurationMs={timer.totalDurationMs}
                      phaseLabel={activeStep?.phaseLabel || "Tempo da Fase"}
                      size={170}
                    />
                  </div>
                )}

                <ParticipateNowCard
                  title="Participe Agora"
                  subtitle="Vote na questão da Mesa-Redonda e envie perguntas ao vivo para os palestrantes."
                />
              </div>
            </div>
          )}

        {/* ----------------------------------------------------------------------- */}
        {/* 2. TELA DA EXPOSIÇÃO INDIVIDUAL (15 min) — QUANDO HOUVER PAUTA ATIVA    */}
        {/* ----------------------------------------------------------------------- */}
        {(currentMode === "SPEAKER_EXPOSITION" || currentMode === "TOPIC_OVERVIEW") && activeTopic && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="animate-stagger-1 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#14532D] text-white text-xs sm:text-sm font-bold uppercase tracking-wider shadow-md">
                  <Mic className="w-4 h-4" />
                  Pauta {activeTopic.number} de 5 · Exposição (15 min)
                </span>
                <SoundWaveBadge />
                {activePoll?.status === "OPEN" && (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-bold uppercase shadow-md animate-pulse">
                    <Vote className="w-3.5 h-3.5" />
                    Votação Aberta no Celular!
                  </span>
                )}
              </div>

              <h1 className="animate-stagger-2 font-display text-4xl sm:text-6xl text-[#F7DECA] font-bold leading-snug drop-shadow-md">
                {activeTopic.title}
              </h1>

              {/* Card do Palestrante com Moldura Luminosa */}
              <div className="animate-stagger-3 flex items-center gap-6 border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 rounded-3xl backdrop-blur-xl shadow-2xl">
                {activeSpeakerPhoto ? (
                  <img
                    src={activeSpeakerPhoto}
                    alt={activeTopic.mainSpeaker.name}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 shadow-xl shrink-0 animate-speaker-aura"
                  />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-[#030A06] border-2 border-emerald-500 flex items-center justify-center font-bold text-2xl text-emerald-400 shrink-0 shadow-lg animate-speaker-aura">
                    {activeTopic.mainSpeaker.name.charAt(0)}
                  </div>
                )}
                <div className="space-y-1.5 min-w-0">
                  <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold block">
                    Especialista Convidado
                  </span>
                  <div className="font-display text-3xl sm:text-4xl text-[#F7DECA] font-bold truncate">
                    {activeTopic.mainSpeaker.name}
                  </div>
                  <div className="text-sm text-[#D5C5AA]/85">
                    15 min de exposição individual · Seguido por 5 min de Pergunta &amp; Resposta
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 animate-stagger-4 flex flex-col items-center gap-6">
              {/* Cronômetro Circular que Esvazia */}
              <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-8 rounded-3xl text-center space-y-4 shadow-2xl backdrop-blur-xl w-full max-w-sm">
                <CircularTimer
                  formatted={timer.formatted}
                  alertLevel={timer.alertLevel}
                  elapsedMs={timer.elapsedMs}
                  totalDurationMs={timer.totalDurationMs}
                  phaseLabel="Tempo de Exposição"
                  size={200}
                />
              </div>

              {/* Módulo Executivo de Participação */}
              <ParticipateNowCard
                title="Participe Agora"
                subtitle={`Envie sua pergunta ao vivo para ${activeTopic.mainSpeaker.name} pelo celular.`}
              />
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* 3. TELA DE PERGUNTA E RESPOSTA (5 min · SELECTED_QUESTION)              */}
        {/* ----------------------------------------------------------------------- */}
        {currentMode === "SELECTED_QUESTION" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="animate-stagger-1 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-bold uppercase tracking-wider shadow-md">
                  <MessageSquare className="w-4 h-4" />
                  Pergunta Selecionada · 5 Minutos
                </span>
                <span className="text-sm text-[#D5C5AA]/80">
                  Pauta {selectedQuestion?.topicNumber || activeTopic?.number}:{" "}
                  <strong className="text-[#F7DECA]">{activeSpeakerName}</strong>
                </span>
              </div>

              {/* Caixa da Pergunta com Aspas Grandes e Destaque Editorial */}
              <div className="animate-stagger-2 border-2 border-emerald-500/60 bg-[#0A150D]/95 p-8 sm:p-10 rounded-3xl shadow-2xl relative backdrop-blur-xl">
                <span className="text-7xl sm:text-8xl text-emerald-500/25 font-serif absolute top-2 left-5 pointer-events-none select-none">
                  “
                </span>
                <p className="font-display text-2xl sm:text-4xl text-[#F7DECA] font-semibold leading-relaxed relative z-10 pl-2">
                  {selectedQuestion?.text ||
                    "Pergunta da plateia em resposta pelo especialista com mediação de Paula."}
                </p>
              </div>

              <div className="animate-stagger-3 flex flex-wrap items-center gap-4 text-xs sm:text-sm text-[#D5C5AA]/80">
                <span className="px-3.5 py-1.5 rounded-full bg-[#0A150D] border border-[#D5C5AA]/25 text-[#F7DECA] font-semibold">
                  Origem: {selectedQuestion?.isMediationReserve ? "Pergunta da Mediação" : "Pergunta da Plateia"}
                </span>
                <span className="flex items-center gap-2.5">
                  <SoundWaveBadge label="Respondendo" />
                  {activeSpeakerPhoto && (
                    <img
                      src={activeSpeakerPhoto}
                      alt={activeSpeakerName || ""}
                      className="w-8 h-8 rounded-full object-cover border border-emerald-400 shadow-md shrink-0"
                    />
                  )}
                  <strong className="text-[#F7DECA] text-sm">{activeSpeakerName}</strong>
                </span>
              </div>
            </div>

            <div className="lg:col-span-5 animate-stagger-4 flex flex-col items-center gap-6">
              <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-8 rounded-3xl text-center space-y-4 shadow-2xl backdrop-blur-xl w-full max-w-sm">
                <CircularTimer
                  formatted={timer.formatted}
                  alertLevel={timer.alertLevel}
                  elapsedMs={timer.elapsedMs}
                  totalDurationMs={timer.totalDurationMs}
                  phaseLabel="Tempo de P&amp;R"
                  size={200}
                />
              </div>

              <ParticipateNowCard
                title="Participe Agora"
                subtitle="Acompanhe pelo celular e vote na questão da Mesa-Redonda."
              />
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* 4. TELA DE MESA-REDONDA (ROUNDTABLE · 5 DEBATEDORES EM ARCO)            */}
        {/* ----------------------------------------------------------------------- */}
        {(currentMode === "ROUNDTABLE" || currentMode === "COLLECTIVE_BUILDING") && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-8 space-y-6">
              <div className="animate-stagger-1 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#14532D] text-white text-xs sm:text-sm font-bold uppercase tracking-wider shadow-md">
                  <Users className="w-4 h-4" />
                  Mesa-Redonda Oficial (20 Minutos)
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/50 text-amber-300 text-xs font-bold">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  Questão Eleita pelo Público
                </span>
              </div>

              {/* Questão Vencedora */}
              <div className="animate-stagger-2 border-2 border-emerald-500/60 bg-[#0A150D]/95 p-7 sm:p-9 rounded-3xl shadow-2xl space-y-2 backdrop-blur-xl">
                <div className="text-xs uppercase tracking-widest text-emerald-400 font-bold">
                  Questão Central em Debate
                </div>
                <h1 className="font-display text-2xl sm:text-4xl text-[#F7DECA] font-bold leading-relaxed">
                  &ldquo;
                  {activePoll?.winningQuestionText ||
                    activePoll?.options?.find((o) => o.isWinner)?.label ||
                    activePoll?.options?.[0]?.label ||
                    "Como transformar a economia da solidão em uma economia da conexão?"}
                  &rdquo;
                </h1>
              </div>

              {/* Os 5 Especialistas em Disposição de Arco (com fotos grandes) */}
              <div className="animate-stagger-3 space-y-3">
                <div className="flex items-center justify-between text-xs text-[#D5C5AA]/75">
                  <span className="uppercase tracking-wider font-semibold">
                    Debatedores da Mesa-Redonda:
                  </span>
                  <span className="text-emerald-400 font-medium">Mediação: Paula</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { id: "1", name: "Daniel Pereira", pauta: "Pauta 1", photoUrl: "/img/Daniel.jpeg" },
                    { id: "2", name: "Janaína Silva", pauta: "Pauta 2", photoUrl: "/img/Janaina.jpeg" },
                    { id: "3", name: "Denilson Barbosa", pauta: "Pauta 3", photoUrl: "/img/Denilson.png" },
                    { id: "4", name: "Sérgio Santos", pauta: "Pauta 4", photoUrl: "/img/Sergio.jpeg" },
                    { id: "5", name: "Dulcila", pauta: "Pauta 5", photoUrl: "/img/Dulcila.jpeg" },
                  ].map((sp) => (
                    <div
                      key={sp.id}
                      className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-3 rounded-2xl flex flex-col items-center text-center space-y-2 shadow-lg backdrop-blur-md group hover:border-emerald-500/50 transition"
                    >
                      <img
                        src={sp.photoUrl}
                        alt={sp.name}
                        className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500/40 shadow-md group-hover:scale-105 transition-transform"
                      />
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                          {sp.pauta}
                        </span>
                        <span className="font-bold text-xs text-[#F7DECA] leading-tight block truncate max-w-[90px]">
                          {sp.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 animate-stagger-4 flex flex-col items-center gap-6">
              <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-8 rounded-3xl text-center space-y-4 shadow-2xl backdrop-blur-xl w-full max-w-sm">
                <CircularTimer
                  formatted={timer.formatted}
                  alertLevel={timer.alertLevel}
                  elapsedMs={timer.elapsedMs}
                  totalDurationMs={timer.totalDurationMs}
                  phaseLabel="Tempo da Mesa"
                  size={200}
                />
              </div>
              <p className="text-xs text-[#D5C5AA]/70 text-center max-w-sm">
                Debate conjunto entre os 5 especialistas sobre a questão eleita pela plateia.
              </p>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* 9. TELA DE ENCERRAMENTO (CLOSING)                                       */}
        {/* ----------------------------------------------------------------------- */}
        {currentMode === "CLOSING" && (
          <div className="space-y-8 max-w-4xl mx-auto text-center animate-stage-enter">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#14532D] text-white text-xs sm:text-sm font-bold uppercase tracking-wider shadow-lg">
              Etapa 10 · Encerramento Oficial
            </span>
            <h1 className="font-display text-5xl sm:text-7xl text-[#F7DECA] font-extrabold leading-tight animate-shimmer-text">
              Agradecemos a Sua Participação!
            </h1>
            <p className="text-lg sm:text-2xl text-[#D5C5AA]/90 max-w-2xl mx-auto leading-relaxed font-medium">
              O encontro <strong>A Nova Moeda</strong> foi construído coletivamente com o envolvimento e as perguntas de todos os participantes.
            </p>
            <div className="pt-6 border-t border-[#D5C5AA]/20 text-sm text-[#D5C5AA]/70">
              Universidade Estadual de Feira de Santana (UEFS) · A Nova Moeda
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* 10. TELA DE CONTINGÊNCIA / AVISO OPERACIONAL                            */}
        {/* ----------------------------------------------------------------------- */}
        {(currentMode === "CONTINGENCY" || currentMode === "OPERATIONAL_NOTICE") && (
          <div className="space-y-8 max-w-4xl mx-auto text-center animate-stage-enter">
            {ls?.emergencyActive || currentMode === "CONTINGENCY" ? (
              <div className="border-2 border-red-500/60 bg-[#0A150D]/95 p-10 sm:p-14 rounded-3xl space-y-6 shadow-2xl backdrop-blur-xl">
                <div className="w-16 h-16 mx-auto rounded-full bg-red-950/60 border border-red-500/60 text-red-300 flex items-center justify-center animate-pulse">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h1 className="font-display text-4xl sm:text-5xl text-[#F7DECA] font-bold">
                  A Nova Moeda
                </h1>
                <p className="text-xl sm:text-2xl text-[#D5C5AA] leading-relaxed font-medium">
                  {ls?.emergencyMessage ||
                    "Estamos realizando um breve ajuste técnico. A programação continuará em instantes."}
                </p>
              </div>
            ) : screenMessage ? (
              <div className="border-2 border-amber-500 bg-[#0A150D]/95 p-8 sm:p-14 rounded-3xl space-y-6 shadow-2xl backdrop-blur-xl">
                <span className="inline-block px-4 py-1.5 rounded-full bg-amber-500 text-slate-950 text-xs sm:text-sm font-bold uppercase tracking-wider">
                  Comunicado da Organização
                </span>
                <h1 className="font-display text-4xl sm:text-6xl text-[#F7DECA] font-bold">
                  {screenMessage.title}
                </h1>
                <p className="text-xl sm:text-3xl text-[#D5C5AA]/95 leading-relaxed">
                  {screenMessage.body}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* 4. Rodapé Translúcido da ARENA: Próxima Etapa & Status em Tempo Real */}
      <footer className="relative z-20 border-t border-[#D5C5AA]/20 pt-4 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-[#D5C5AA]/75">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-0.5 rounded-md bg-[#14532D]/60 border border-emerald-500/40 text-[#F7DECA] font-bold uppercase tracking-wider text-xs flex items-center gap-1 shadow-sm">
            <span>Próxima Etapa</span>
            <ArrowRight className="w-3 h-3 text-emerald-400" />
          </span>
          <strong className="text-[#F7DECA]">
            {nextStep ? `${nextStep.title} (${nextStep.responsibleName})` : "Encerramento Oficial"}
          </strong>
        </div>

        <div className="flex items-center gap-4">
          {ls?.questionsOpen && activeTopic && (
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Captação de perguntas aberta para a Pauta {activeTopic.number}</span>
            </span>
          )}
          {activePoll?.status === "OPEN" && (
            <span className="text-amber-300 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Votação da Mesa-Redonda aberta no QR Code</span>
            </span>
          )}
          <span className="text-[#D5C5AA]/50">UEFS · A Nova Moeda</span>
        </div>
      </footer>
    </main>
  );
}
