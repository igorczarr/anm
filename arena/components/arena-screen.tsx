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

const SIX_SPECIALISTS = [
  {
    name: "Daniel Pereira",
    role: "Pauta 1",
    sub: "Hiperconexão",
    photoUrl: "/img/Daniel.png",
  },
  {
    name: "Janaína Silva",
    role: "Pauta 2",
    sub: "Mercado da Solidão",
    photoUrl: "/img/Janaina.jpeg",
  },
  {
    name: "Denilson Carneiro",
    role: "Pauta 3",
    sub: "Pertencimento",
    photoUrl: "/img/Denilson.png",
  },
  {
    name: "Sérgio Passos",
    role: "Pauta 4",
    sub: "Futuro do Trabalho",
    photoUrl: "/img/Sergio.png",
  },
  {
    name: "Dulcila",
    role: "Pauta 5",
    sub: "Economia da Conexão",
    photoUrl: "/img/Dulcila.jpeg",
  },
  {
    name: "Paula Melo",
    role: "Mediação",
    sub: "Apresentação & Mesa",
    photoUrl: "/img/Paula.jpeg",
  },
];

function resolveSpeakerPhoto(name?: string | null, photoUrl?: string | null): string | null {
  if (photoUrl && photoUrl.trim()) return photoUrl;
  if (!name) return null;
  const n = name.toLowerCase();
  if (n.includes("daniel")) return "/img/Daniel.png";
  if (n.includes("janaina") || n.includes("janaína")) return "/img/Janaina.jpeg";
  if (n.includes("denilson")) return "/img/Denilson.png";
  if (n.includes("sergio") || n.includes("sérgio")) return "/img/Sergio.png";
  if (n.includes("dulcila")) return "/img/Dulcila.jpeg";
  if (n.includes("paula")) return "/img/Paula.jpeg";
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
  size = 140,
}: {
  formatted: string;
  alertLevel: "NORMAL" | "WARNING_2MIN" | "CRITICAL_30S" | "EXPIRED";
  elapsedMs: number;
  totalDurationMs: number;
  phaseLabel?: string;
  size?: number;
}) {
  const strokeWidth = size > 170 ? 8 : 6;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;

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
      ? "drop-shadow(0 0 14px rgba(239, 68, 68, 0.7))"
      : alertLevel === "CRITICAL_30S"
        ? "drop-shadow(0 0 12px rgba(245, 158, 11, 0.6))"
        : alertLevel === "WARNING_2MIN"
          ? "drop-shadow(0 0 10px rgba(252, 211, 77, 0.45))"
          : "drop-shadow(0 0 10px rgba(16, 185, 129, 0.4))";

  return (
    <div className="relative flex flex-col items-center justify-center mx-auto select-none" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(213, 197, 170, 0.12)"
          strokeWidth={strokeWidth}
          fill="none"
        />
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

      <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
        <span
          className={`font-mono font-bold tracking-tight leading-none ${
            size >= 190 ? "text-4xl sm:text-5xl" : size >= 150 ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl"
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
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 mt-1 block">
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
    <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400">
      <span className="flex items-end gap-0.5 h-3" aria-hidden="true">
        <span className="w-1 bg-emerald-400 rounded-full animate-wave-1" />
        <span className="w-1 bg-emerald-400 rounded-full animate-wave-2" />
        <span className="w-1 bg-emerald-400 rounded-full animate-wave-3" />
        <span className="w-1 bg-emerald-400 rounded-full animate-wave-1" />
      </span>
      <span className="uppercase tracking-wider text-[11px] font-bold">{label}</span>
    </div>
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
// SUB-COMPONENTE: Módulo de Participação com QR Code (Autêntico, sem pílulas)
// ---------------------------------------------------------------------------
function ParticipateNowCard({
  title = "Participe pelo Celular",
  subtitle = "Envie perguntas aos debatedores e vote na questão da Mesa-Redonda.",
  compact = false,
  size = "default",
}: {
  title?: string;
  subtitle?: string;
  compact?: boolean;
  size?: "compact" | "default" | "hero";
}) {
  if (compact || size === "compact") {
    return (
      <div className="border border-white/10 bg-[#0A150D]/90 p-3 sm:p-3.5 rounded-2xl flex items-center gap-3.5 shadow-xl max-w-sm w-full backdrop-blur-md select-none group hover:border-emerald-400/40 transition">
        <div className="relative w-14 h-14 bg-white p-1 rounded-xl shrink-0 shadow-md">
          <img src="/api/qr" alt="QR" className="w-full h-full object-contain" />
        </div>
        <div className="text-xs text-[#D5C5AA]/90 text-left space-y-0.5">
          <div className="font-bold text-[#F7DECA] text-xs">
            {title}
          </div>
          <span className="block text-[11px] leading-tight text-[#D5C5AA]/80">{subtitle}</span>
          <span className="text-[10px] text-emerald-400 font-semibold block">Sem necessidade de instalar app</span>
        </div>
      </div>
    );
  }

  const isHero = size === "hero";
  const qrBoxClass = isHero
    ? "w-44 h-44 sm:w-48 sm:h-48 p-2.5 sm:p-3"
    : "w-32 h-32 sm:w-36 sm:h-36 p-2 sm:p-2.5";
  const cardPadding = isHero ? "p-5 sm:p-6 space-y-3" : "p-3.5 sm:p-4 space-y-2";

  return (
    <div className="relative group max-w-sm w-full mx-auto select-none">
      <div className="absolute -inset-1 rounded-3xl bg-emerald-500/10 blur-xl opacity-60 group-hover:opacity-100 transition duration-700" />

      <div className={`relative rounded-3xl border border-white/10 bg-[#0A140E]/95 backdrop-blur-2xl ${cardPadding} text-center shadow-2xl`}>
        {/* Título autêntico sem botão de pílula */}
        <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{title}</span>
        </div>

        <div className={`relative ${qrBoxClass} mx-auto bg-white rounded-2xl shadow-[inset_0_2px_8px_rgba(0,0,0,0.08)] border-2 border-emerald-500/30 flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-300`}>
          <div className="absolute top-1.5 left-1.5 w-3 h-3 border-t-2 border-l-2 border-emerald-700 rounded-tl pointer-events-none" />
          <div className="absolute top-1.5 right-1.5 w-3 h-3 border-t-2 border-r-2 border-emerald-700 rounded-tr pointer-events-none" />
          <div className="absolute bottom-1.5 left-1.5 w-3 h-3 border-b-2 border-l-2 border-emerald-700 rounded-bl pointer-events-none" />
          <div className="absolute bottom-1.5 right-1.5 w-3 h-3 border-b-2 border-r-2 border-emerald-700 rounded-br pointer-events-none" />
          <img src="/api/qr" alt="QR Code de Participação" className="w-full h-full object-contain" />
        </div>

        <div className="space-y-0.5">
          <div className="font-display font-bold text-xs sm:text-sm text-[#F7DECA] tracking-tight">
            Aponte a Câmera do Celular
          </div>
          <p className="text-[10px] sm:text-[11px] text-[#D5C5AA]/85 leading-snug font-medium line-clamp-2">
            {subtitle}
          </p>
        </div>

        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-[#D5C5AA]/70">
          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
            <Smartphone className="w-3 h-3" />
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

  const [isIdle, setIsIdle] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

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
      return "text-red-400 border-red-500/60 bg-red-950/40 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.35)]";
    }
    if (timer.alertLevel === "CRITICAL_30S") {
      return "text-amber-400 border-amber-400/60 bg-amber-950/30 shadow-[0_0_18px_rgba(245,158,11,0.25)] animate-pulse";
    }
    if (timer.alertLevel === "WARNING_2MIN") {
      return "text-amber-200 border-amber-300/40 bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]";
    }
    return "text-[#F7DECA] border-[#D5C5AA]/25 bg-[#0A150D]/80 shadow-[0_0_15px_rgba(20,83,45,0.2)]";
  }, [timer.alertLevel]);

  const activeSpeakerName =
    activeTopic?.mainSpeaker?.name || activeStep?.speaker?.name || activeStep?.responsibleName;
  const activeSpeakerPhoto = resolveSpeakerPhoto(
    activeSpeakerName,
    activeTopic?.mainSpeaker?.photoUrl || activeStep?.speaker?.photoUrl
  );

  // Contagem regressiva autêntica e confiável para início
  const [countdownText, setCountdownText] = useState<string | null>(null);

  useEffect(() => {
    if (currentMode !== "WAITING") {
      setCountdownText(null);
      return;
    }

    const target = snapshot?.event?.scheduledStartAt
      ? new Date(snapshot.event.scheduledStartAt).getTime()
      : null;

    const updateTicker = () => {
      const now = Date.now();
      if (target && target > now && target - now <= 2 * 3600 * 1000) {
        const diff = target - now;
        const totalSec = Math.floor(diff / 1000);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        setCountdownText(
          `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
        );
      } else {
        setCountdownText(timer.formatted || "05:00");
      }
    };

    updateTicker();
    const ticker = setInterval(updateTicker, 1000);
    return () => clearInterval(ticker);
  }, [snapshot?.event?.scheduledStartAt, currentMode, timer.formatted]);

  const countdownDisplay = countdownText || timer.formatted || "05:00";

  // =========================================================================
  // MODO MONITOR DE APOIO DE PALCO (ALTO CONTRASTE PARA O PALESTRANTE)
  // =========================================================================
  if (isStageMonitor) {
    return (
      <main className="relative h-screen max-h-screen w-screen max-w-screen overflow-hidden bg-[#030A06] text-[#F7DECA] flex flex-col justify-between p-6 sm:p-10 select-none box-border">
        {!connected && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-1 rounded-full bg-red-950/90 border border-red-500/60 text-red-200 text-xs font-semibold flex items-center gap-2 shadow-xl backdrop-blur-md">
            <WifiOff className="w-3.5 h-3.5 animate-spin" />
            <span>Tentando reconectar... (horário preservado no servidor)</span>
          </div>
        )}

        <header className="shrink-0 flex items-center justify-between border-b border-white/10 pb-4">
          <div className="space-y-0.5">
            <span className="text-[11px] uppercase tracking-widest text-emerald-400 font-bold">
              Monitor de Apoio de Palco · Arena UEFS
            </span>
            <h1 className="font-display text-xl sm:text-2xl text-[#F7DECA]">
              {activeTopic
                ? `Pauta ${activeTopic.number} — ${activeTopic.title}`
                : activeStep?.title || "A Nova Moeda"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[11px] text-[#D5C5AA]/70 block uppercase tracking-wider">
                Com a Palavra
              </span>
              <strong className="text-base text-[#F7DECA]">
                {activeSpeakerName || "Organização"}
              </strong>
            </div>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-xl border border-white/10 bg-[#0A150D] text-[#D5C5AA] hover:text-[#F7DECA]"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 min-h-0 my-auto flex flex-col items-center justify-center text-center space-y-4">
          <CircularTimer
            formatted={timer.formatted}
            alertLevel={timer.alertLevel}
            elapsedMs={timer.elapsedMs}
            totalDurationMs={timer.totalDurationMs}
            phaseLabel={activeStep?.phaseLabel || "Tempo da Fase"}
            size={220}
          />
          {timer.alertLevel === "EXPIRED" && (
            <div className="text-lg sm:text-xl font-bold text-red-400 uppercase tracking-wider animate-pulse">
              TEMPO DA FASE ENCERRADO (00:00)
            </div>
          )}
        </div>

        <footer className="shrink-0 border-t border-white/10 pt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#D5C5AA]/80">
          <div>
            PRÓXIMA ETAPA:{" "}
            <strong className="text-[#F7DECA]">
              {nextStep ? `${nextStep.title} (${nextStep.responsibleName})` : "Encerramento"}
            </strong>
          </div>
          <div className="flex items-center gap-5">
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
  // TELÃO PÚBLICO DA ARENA (PROJEÇÃO PRINCIPAL IMERSIVA v2.5 — STRICT NO-SCROLL)
  // =========================================================================
  return (
    <main
      className={`arena-stage h-screen max-h-screen w-screen max-w-screen overflow-hidden flex flex-col justify-between p-4 sm:p-6 lg:p-7 select-none box-border ${
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

      {/* Controles Flutuantes Discretos */}
      <div
        className={`fixed bottom-3 right-3 z-50 flex items-center gap-1.5 transition-opacity duration-300 ${
          isIdle ? "opacity-0 pointer-events-none" : "opacity-90 hover:opacity-100"
        }`}
      >
        <ThemeToggle compact />
        <button
          onClick={toggleSound}
          className={`p-2 rounded-xl border backdrop-blur-md cursor-pointer transition ${
            soundEnabled
              ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-md"
              : "bg-[#030A06]/80 border-[#D5C5AA]/20 text-[#D5C5AA]/60 hover:text-white"
          }`}
          title={soundEnabled ? "Desativar Áudio do Telão (M)" : "Ativar Áudio do Telão (M)"}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-xl border border-[#D5C5AA]/20 bg-[#030A06]/80 text-[#D5C5AA]/60 hover:text-white hover:border-[#D5C5AA]/60 transition backdrop-blur-md cursor-pointer"
          title={isFullscreen ? "Sair de Tela Cheia (F)" : "Alternar Tela Cheia (F)"}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Indicador de Conexão */}
      {!connected && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-full bg-red-950/95 border border-red-500/60 text-red-200 text-xs font-semibold flex items-center gap-2 shadow-2xl backdrop-blur-md animate-pulse">
          <WifiOff className="w-3.5 h-3.5 text-red-400" />
          <span>Sincronizando com o servidor... (horário preservado)</span>
        </div>
      )}

      {/* 2. Cabeçalho Nobre e Translúcido com LOGO CLARO e SEM PÍLULAS */}
      <header className="relative z-20 shrink-0 flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-3 sm:gap-3.5">
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#0A150D] border border-white/10 p-1.5 flex items-center justify-center shadow-md shrink-0">
            <img
              src="/img/Ativo 1.png"
              alt="A Nova Moeda"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="font-display font-bold text-lg sm:text-xl text-[#F7DECA] tracking-tight leading-tight">
              A Nova Moeda
            </div>
            <div className="text-[11px] sm:text-xs text-[#D5C5AA]/70 flex items-center gap-1.5">
              <span className="font-semibold text-emerald-400">UEFS</span>
              <span>·</span>
              <span>
                {currentMode === "WAITING"
                  ? "Auditório 2"
                  : activeStep?.phaseLabel || ARENA_MODE_LABELS[currentMode]}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {showTimer &&
            currentMode !== "WAITING" &&
            ![
              "INTRODUCTION",
              "SPEAKER_EXPOSITION",
              "SELECTED_QUESTION",
              "ROUNDTABLE",
              "POLL_OPEN",
            ].includes(currentMode) && (
              <div
                className={`px-3 py-1 rounded-xl border font-mono font-bold text-base sm:text-lg flex items-center gap-1.5 backdrop-blur-md ${timerStyle}`}
              >
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{timer.formatted}</span>
              </div>
            )}

          {/* Marcador autêntico de transmissão (Sem pílula) */}
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] uppercase tracking-widest text-[#D5C5AA]">AO VIVO</span>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 3. CONTEÚDO PRINCIPAL (100% NO-SCROLL · FITTED VIEWPORT)                  */}
      {/* ========================================================================= */}
      <div key={currentMode} className="flex-1 min-h-0 flex items-center justify-center py-2 sm:py-3 relative z-10 overflow-hidden animate-stage-enter">
        {/* ----------------------------------------------------------------------- */}
        {/* 1. MODO DE ESPERA / BOAS-VINDAS (WAITING)                               */}
        {/* ----------------------------------------------------------------------- */}
        {currentMode === "WAITING" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center w-full max-w-7xl mx-auto h-full max-h-full">
            {/* Coluna Esquerda: Apresentação Nobre e Convidativa do Evento */}
            <div className="lg:col-span-7 space-y-3.5 text-left">
              {/* Identidade Institucional Autêntica (Sem pílulas de IA) */}
              <div className="space-y-1">
                <div className="text-[11px] sm:text-xs font-semibold tracking-widest uppercase text-emerald-400">
                  Universidade Estadual de Feira de Santana · Auditório 2
                </div>
                <h1 className="font-display text-3xl sm:text-5xl lg:text-5xl text-[#F7DECA] font-extrabold leading-[1.1] tracking-tight">
                  A Nova Moeda: <br className="hidden sm:inline" />
                  <span className="text-emerald-400">Economia da Solidão</span>
                </h1>
                <p className="text-xs sm:text-sm lg:text-base text-[#D5C5AA]/90 max-w-2xl leading-relaxed pt-0.5">
                  Sejam bem-vindos à Arena de debates. Uma reflexão coletiva sobre conexões humanas, capital social, novas tecnologias e os sentidos do tempo na era contemporânea.
                </p>
              </div>

              {/* Bloco Autêntico de Contagem Regressiva para Abertura */}
              <div className="border border-white/10 bg-[#0A150D]/85 p-3 sm:p-3.5 rounded-2xl flex items-center justify-between gap-4 max-w-xl shadow-lg">
                <div className="space-y-0.5">
                  <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider text-emerald-400 block">
                    Abertura da Sessão
                  </span>
                  <span className="text-xs sm:text-sm text-[#F7DECA] font-medium block">
                    Conecte seu dispositivo para acompanhar a programação
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-mono text-2xl sm:text-3xl font-bold text-[#F7DECA] tracking-wider leading-none">
                    {countdownDisplay}
                  </div>
                  <span className="text-[9px] uppercase tracking-widest text-[#D5C5AA]/60 block mt-1">
                    Contagem Regressiva
                  </span>
                </div>
              </div>

              {/* Os Seis Especialistas com Fotos Reais */}
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between text-xs text-[#D5C5AA]/80">
                  <span className="text-[11px] uppercase font-bold tracking-wider text-[#F7DECA]">
                    Seis Especialistas da Mesa:
                  </span>
                  <span className="text-[11px] text-[#D5C5AA]/60 hidden sm:inline">
                    Exposições individuais e Mesa-Redonda
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {SIX_SPECIALISTS.map((sp) => (
                    <div
                      key={sp.name}
                      className="border border-white/10 bg-[#0A150D]/90 p-2 rounded-xl flex flex-col items-center text-center space-y-1.5 shadow-sm group hover:border-emerald-500/40 transition"
                    >
                      <img
                        src={sp.photoUrl}
                        alt={sp.name}
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg object-cover border border-emerald-500/30 group-hover:scale-105 transition-transform"
                      />
                      <div className="min-w-0 w-full">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 block truncate">
                          {sp.role}
                        </span>
                        <span className="font-semibold text-[11px] text-[#F7DECA] block truncate leading-tight">
                          {sp.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Coluna Direita: QR Code Nobre de Acesso Imediato */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <ParticipateNowCard
                title="Participe pelo Celular"
                subtitle="Aponte a câmera para enviar perguntas aos debatedores e votar na Mesa-Redonda."
                size="hero"
              />
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* 2. MODO ABERTURA OFICIAL (OPENING)                                      */}
        {/* ----------------------------------------------------------------------- */}
        {currentMode === "OPENING" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center w-full max-w-7xl mx-auto h-full max-h-full">
            <div className="lg:col-span-7 space-y-3.5 sm:space-y-4 text-left">
              <div className="space-y-0.5">
                <span className="text-[11px] uppercase tracking-widest text-emerald-400 font-bold block">
                  Etapa 1 de 10 · Mesa Diretora
                </span>
                <h1 className="font-display text-3xl sm:text-5xl text-[#F7DECA] font-extrabold leading-[1.1] tracking-tight">
                  Abertura e Boas-Vindas à Arena
                </h1>
                <p className="text-xs sm:text-sm lg:text-base text-[#D5C5AA]/90 max-w-2xl leading-relaxed font-medium pt-1">
                  Apresentação oficial da Arena A Nova Moeda, diretrizes do debate e acolhimento à plateia pela equipe organizadora e mediação.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl border border-white/10 bg-[#0A150D]/85 backdrop-blur-md flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-[#030A06] border border-emerald-500/40 flex items-center justify-center shrink-0 overflow-hidden">
                  <img src="/img/Paula.jpeg" alt="Paula Melo" className="w-full h-full object-cover" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block">
                    Coordenação &amp; Mediação
                  </span>
                  <div className="font-display font-bold text-base text-[#F7DECA]">
                    Paula Melo &amp; Equipe Organizadora
                  </div>
                  <div className="text-xs text-[#D5C5AA]/70">
                    Apresentação do formato interativo e orientações ao público
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col items-center gap-3">
              {showTimer && (
                <div className="border border-white/10 bg-[#0A150D]/90 p-3 sm:p-4 rounded-3xl text-center shadow-2xl backdrop-blur-xl w-full max-w-sm">
                  <CircularTimer
                    formatted={timer.formatted}
                    alertLevel={timer.alertLevel}
                    elapsedMs={timer.elapsedMs}
                    totalDurationMs={timer.totalDurationMs}
                    phaseLabel="Tempo de Abertura"
                    size={130}
                  />
                </div>
              )}
              <ParticipateNowCard
                title="Participe pelo Celular"
                subtitle="Conecte-se para enviar perguntas e votar na questão da Mesa-Redonda."
                size="default"
              />
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* 3. MODO INTRODUÇÃO E CONTEXTO (INTRODUCTION)                            */}
        {/* ----------------------------------------------------------------------- */}
        {currentMode === "INTRODUCTION" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center w-full max-w-7xl mx-auto h-full max-h-full">
            <div className="lg:col-span-7 space-y-3.5 sm:space-y-4 text-left">
              <div className="space-y-0.5">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] uppercase tracking-widest text-emerald-400 font-bold block">
                    Etapa 2 de 10 · Contexto Geral
                  </span>
                  <SoundWaveBadge label="Com a Palavra" />
                </div>
                <h1 className="font-display text-3xl sm:text-5xl text-[#F7DECA] font-extrabold leading-[1.1] tracking-tight">
                  A Economia da Solidão
                </h1>
                <p className="text-xs sm:text-sm lg:text-base text-[#D5C5AA]/90 max-w-2xl leading-relaxed font-medium pt-1">
                  Contextualização conceitual sobre as transformações sociais, o isolamento contemporâneo e os desafios humanos abordados na Arena.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl border border-white/10 bg-[#0A150D]/85 backdrop-blur-md flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-[#030A06] border-2 border-emerald-500/40 overflow-hidden shrink-0 shadow-lg">
                  <img src="/img/Paula.jpeg" alt="Paula Melo" className="w-full h-full object-cover" />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block">
                    Apresentadora &amp; Mediadora
                  </span>
                  <div className="font-display font-bold text-base text-[#F7DECA]">
                    Paula Melo
                  </div>
                  <div className="text-xs text-[#D5C5AA]/70">
                    10 minutos de introdução antes do início das 5 pautas individuais
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col items-center gap-3">
              {showTimer && (
                <div className="border border-white/10 bg-[#0A150D]/90 p-3 sm:p-4 rounded-3xl text-center shadow-2xl backdrop-blur-xl w-full max-w-sm">
                  <CircularTimer
                    formatted={timer.formatted}
                    alertLevel={timer.alertLevel}
                    elapsedMs={timer.elapsedMs}
                    totalDurationMs={timer.totalDurationMs}
                    phaseLabel="Tempo de Introdução"
                    size={130}
                  />
                </div>
              )}
              <ParticipateNowCard
                title="Participe pelo Celular"
                subtitle="Vote na questão da Mesa-Redonda enquanto acompanha a introdução."
                size="default"
              />
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* 4. MODO VOTAÇÃO DA MESA-REDONDA (POLL_OPEN / POLL_RESULTS)              */}
        {/* ----------------------------------------------------------------------- */}
        {(currentMode === "POLL_OPEN" || currentMode === "POLL_RESULTS") && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center w-full max-w-7xl mx-auto h-full max-h-full">
            <div className="lg:col-span-7 space-y-3 text-left">
              <div className="space-y-0.5">
                <span className="text-[11px] uppercase tracking-widest text-emerald-400 font-bold block">
                  {currentMode === "POLL_RESULTS" || activePoll?.status === "CLOSED" || activePoll?.status === "RESULTS_PUBLISHED"
                    ? "Resultado Oficial · Questão Eleita"
                    : "Decisão da Plateia · Votação Aberta"}
                </span>
                <h1 className="font-display text-2xl sm:text-4xl text-[#F7DECA] font-extrabold leading-tight tracking-tight drop-shadow-sm">
                  {activePoll?.question || "Qual questão crucial deve ser debatida pelos especialistas na Mesa-Redonda?"}
                </h1>
                <p className="text-xs sm:text-sm text-[#D5C5AA]/85 max-w-2xl leading-relaxed pt-0.5">
                  {currentMode === "POLL_RESULTS" || activePoll?.status === "CLOSED" || activePoll?.status === "RESULTS_PUBLISHED"
                    ? "Apuração concluída. Esta é a questão eleita pela plateia para guiar a Mesa-Redonda."
                    : "A escolha do tema é feita pela plateia em tempo real. Aponte a câmera do celular para votar."}
                </p>
              </div>

              {/* Lista das Opções com Padding Calibrado */}
              <div className="space-y-2">
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
                      className={`relative border p-2.5 sm:p-3 rounded-2xl transition-all duration-300 backdrop-blur-xl ${
                        isWinner
                          ? "border-2 border-amber-400 bg-amber-950/40 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
                          : "border-white/10 bg-[#0A150D]/85 hover:border-emerald-500/40"
                      }`}
                    >
                      {isWinner && <ConfettiSparkles />}
                      <div className="relative z-10 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                            {opt.themeLabel || `Questão ${opt.optionOrder}`}
                          </span>
                          {isWinner && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-400 text-slate-950 font-extrabold text-[9px] flex items-center gap-1 shadow-sm">
                              <Trophy className="w-2.5 h-2.5 fill-current" />
                              ELEITA PELO PÚBLICO
                            </span>
                          )}
                        </div>
                        {showPct && (
                          <span className="font-mono font-bold text-base text-[#F7DECA] shrink-0">
                            {pct}%
                          </span>
                        )}
                      </div>

                      <p className="relative z-10 text-xs sm:text-sm font-medium text-[#F7DECA] mt-0.5 leading-snug">
                        &ldquo;{opt.label}&rdquo;
                      </p>

                      {showPct && (
                        <div className="relative z-10 w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/10 mt-1.5">
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

            <div className="lg:col-span-5 flex flex-col items-center gap-3">
              {showTimer && (
                <div className="border border-white/10 bg-[#0A150D]/90 p-3 sm:p-4 rounded-3xl text-center shadow-2xl backdrop-blur-xl w-full max-w-sm">
                  <CircularTimer
                    formatted={timer.formatted}
                    alertLevel={timer.alertLevel}
                    elapsedMs={timer.elapsedMs}
                    totalDurationMs={timer.totalDurationMs}
                    phaseLabel="Tempo de Votação"
                    size={130}
                  />
                </div>
              )}
              <ParticipateNowCard
                title="Vote pelo Celular"
                subtitle="Vote na questão da Mesa-Redonda diretamente pelo navegador."
                size="default"
              />
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* 5. TELA DA EXPOSIÇÃO INDIVIDUAL (15 min) — QUANDO HOUVER PAUTA ATIVA    */}
        {/* ----------------------------------------------------------------------- */}
        {(currentMode === "SPEAKER_EXPOSITION" || currentMode === "TOPIC_OVERVIEW") && activeTopic && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center w-full max-w-7xl mx-auto h-full max-h-full">
            <div className="lg:col-span-7 space-y-4 text-left">
              <div className="space-y-0.5">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] uppercase tracking-widest text-emerald-400 font-bold block">
                    Pauta {activeTopic.number} de 5 · Exposição (15 min)
                  </span>
                  <SoundWaveBadge />
                  {activePoll?.status === "OPEN" && (
                    <span className="text-amber-400 text-xs font-semibold">
                      · Votação Aberta no Celular
                    </span>
                  )}
                </div>
                <h1 className="font-display text-3xl sm:text-5xl text-[#F7DECA] font-bold leading-snug drop-shadow-md">
                  {activeTopic.title}
                </h1>
              </div>

              {/* Card do Palestrante */}
              <div className="flex items-center gap-4 sm:gap-5 border border-white/10 bg-[#0A150D]/90 p-4 sm:p-5 rounded-3xl backdrop-blur-xl shadow-2xl">
                {activeSpeakerPhoto ? (
                  <img
                    src={activeSpeakerPhoto}
                    alt={activeTopic.mainSpeaker.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover object-top border-2 shadow-xl shrink-0 animate-speaker-aura"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#030A06] border-2 border-emerald-500 flex items-center justify-center font-bold text-2xl text-emerald-400 shrink-0 shadow-lg animate-speaker-aura">
                    {activeTopic.mainSpeaker.name.charAt(0)}
                  </div>
                )}
                <div className="space-y-1 min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold block">
                    Especialista Convidado
                  </span>
                  <div className="font-display text-2xl sm:text-3xl text-[#F7DECA] font-bold truncate">
                    {activeTopic.mainSpeaker.name}
                  </div>
                  <div className="text-xs text-[#D5C5AA]/85">
                    15 min de exposição individual · Seguido por 5 min de Pergunta &amp; Resposta
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col items-center gap-3">
              <div className="border border-white/10 bg-[#0A150D]/90 p-4 sm:p-5 rounded-3xl text-center shadow-2xl backdrop-blur-xl w-full max-w-sm">
                <CircularTimer
                  formatted={timer.formatted}
                  alertLevel={timer.alertLevel}
                  elapsedMs={timer.elapsedMs}
                  totalDurationMs={timer.totalDurationMs}
                  phaseLabel="Tempo de Exposição"
                  size={150}
                />
              </div>

              <ParticipateNowCard
                title="Participe pelo Celular"
                subtitle={`Envie sua pergunta ao vivo para ${activeTopic.mainSpeaker.name} pelo celular.`}
                size="default"
              />
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* 6. TELA DE PERGUNTA E RESPOSTA (5 min · SELECTED_QUESTION)              */}
        {/* ----------------------------------------------------------------------- */}
        {currentMode === "SELECTED_QUESTION" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center w-full max-w-7xl mx-auto h-full max-h-full">
            <div className="lg:col-span-7 space-y-4 text-left">
              <div className="space-y-0.5">
                <span className="text-[11px] uppercase tracking-widest text-emerald-400 font-bold block">
                  Pergunta Selecionada · Pauta {selectedQuestion?.topicNumber || activeTopic?.number}
                </span>
                <span className="text-xs sm:text-sm text-[#D5C5AA]/80 block">
                  Respondente: <strong className="text-[#F7DECA]">{activeSpeakerName}</strong>
                </span>
              </div>

              <div className="border-2 border-emerald-500/60 bg-[#0A150D]/95 p-6 sm:p-8 rounded-3xl shadow-2xl relative backdrop-blur-xl">
                <span className="text-6xl text-emerald-500/25 font-serif absolute top-1 left-4 pointer-events-none select-none">
                  “
                </span>
                <p className="font-display text-xl sm:text-3xl text-[#F7DECA] font-semibold leading-relaxed relative z-10 pl-2">
                  {selectedQuestion?.text ||
                    "Pergunta da plateia em resposta pelo especialista com mediação de Paula."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-[#D5C5AA]/80">
                <span className="text-[#F7DECA] font-semibold">
                  Origem: {selectedQuestion?.isMediationReserve ? "Pergunta da Mediação" : "Pergunta da Plateia"}
                </span>
                <span className="flex items-center gap-2">
                  <SoundWaveBadge label="Respondendo" />
                  {activeSpeakerPhoto && (
                    <img
                      src={activeSpeakerPhoto}
                      alt={activeSpeakerName || ""}
                      className="w-7 h-7 rounded-full object-cover object-top border border-emerald-400 shadow-md shrink-0"
                    />
                  )}
                  <strong className="text-[#F7DECA] text-xs sm:text-sm">{activeSpeakerName}</strong>
                </span>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col items-center gap-3">
              <div className="border border-white/10 bg-[#0A150D]/90 p-4 sm:p-5 rounded-3xl text-center shadow-2xl backdrop-blur-xl w-full max-w-sm">
                <CircularTimer
                  formatted={timer.formatted}
                  alertLevel={timer.alertLevel}
                  elapsedMs={timer.elapsedMs}
                  totalDurationMs={timer.totalDurationMs}
                  phaseLabel="Tempo de P&amp;R"
                  size={150}
                />
              </div>

              <ParticipateNowCard
                title="Participe pelo Celular"
                subtitle="Acompanhe pelo celular e vote na questão da Mesa-Redonda."
                size="default"
              />
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* 7. TELA DE MESA-REDONDA (ROUNDTABLE · 6 DEBATEDORES EM ARCO)            */}
        {/* ----------------------------------------------------------------------- */}
        {(currentMode === "ROUNDTABLE" || currentMode === "COLLECTIVE_BUILDING") && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center w-full max-w-7xl mx-auto h-full max-h-full">
            <div className="lg:col-span-8 space-y-4 text-left">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-widest text-emerald-400 font-bold block">
                    Mesa-Redonda Oficial (20 Minutos)
                  </span>
                  <span className="text-amber-400 text-xs font-semibold">
                    · Questão Eleita pelo Público
                  </span>
                </div>
              </div>

              {/* Questão Vencedora */}
              <div className="border-2 border-emerald-500/60 bg-[#0A150D]/95 p-5 sm:p-7 rounded-3xl shadow-2xl space-y-1.5 backdrop-blur-xl">
                <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">
                  Questão Central em Debate
                </div>
                <h1 className="font-display text-xl sm:text-3xl text-[#F7DECA] font-bold leading-relaxed">
                  &ldquo;
                  {activePoll?.winningQuestionText ||
                    activePoll?.options?.find((o) => o.isWinner)?.label ||
                    activePoll?.options?.[0]?.label ||
                    "Como transformar a economia da solidão em uma economia da conexão?"}
                  &rdquo;
                </h1>
              </div>

              {/* Os Seis Especialistas da Mesa-Redonda */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-[#D5C5AA]/75">
                  <span className="uppercase tracking-wider font-semibold text-[11px]">
                    Seis Debatedores da Mesa:
                  </span>
                  <span className="text-emerald-400 font-medium text-xs">
                    Mediação: Paula Melo
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {SIX_SPECIALISTS.map((sp) => (
                    <div
                      key={sp.name}
                      className="border border-white/10 bg-[#0A150D]/90 p-2 rounded-xl flex flex-col items-center text-center space-y-1 shadow-md group hover:border-emerald-500/40 transition"
                    >
                      <img
                        src={sp.photoUrl}
                        alt={sp.name}
                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg object-cover border border-emerald-500/30 group-hover:scale-105 transition-transform"
                      />
                      <div className="min-w-0 w-full">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400 block truncate">
                          {sp.role}
                        </span>
                        <span className="font-bold text-[11px] text-[#F7DECA] leading-tight block truncate">
                          {sp.name}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col items-center gap-4">
              <div className="border border-white/10 bg-[#0A150D]/90 p-5 rounded-3xl text-center space-y-3 shadow-2xl backdrop-blur-xl w-full max-w-sm">
                <CircularTimer
                  formatted={timer.formatted}
                  alertLevel={timer.alertLevel}
                  elapsedMs={timer.elapsedMs}
                  totalDurationMs={timer.totalDurationMs}
                  phaseLabel="Tempo da Mesa"
                  size={150}
                />
              </div>
              <p className="text-xs text-[#D5C5AA]/70 text-center max-w-sm">
                Debate conjunto entre os 6 especialistas sobre a questão eleita pela plateia.
              </p>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* 8. TELA DE ENCERRAMENTO (CLOSING)                                       */}
        {/* ----------------------------------------------------------------------- */}
        {currentMode === "CLOSING" && (
          <div className="space-y-4 max-w-3xl mx-auto text-center animate-stage-enter">
            <span className="text-xs uppercase font-bold tracking-widest text-emerald-400 block">
              Etapa 10 · Encerramento Oficial
            </span>
            <h1 className="font-display text-4xl sm:text-6xl text-[#F7DECA] font-extrabold leading-tight">
              Agradecemos a Sua Participação!
            </h1>
            <p className="text-sm sm:text-lg text-[#D5C5AA]/90 max-w-xl mx-auto leading-relaxed font-medium">
              O encontro <strong>A Nova Moeda</strong> foi construído coletivamente com o envolvimento e as perguntas de todos os participantes.
            </p>
            <div className="pt-3 border-t border-white/10 text-xs text-[#D5C5AA]/70">
              Universidade Estadual de Feira de Santana (UEFS) · A Nova Moeda
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* 9. TELA DE CONTINGÊNCIA / AVISO OPERACIONAL                             */}
        {/* ----------------------------------------------------------------------- */}
        {(currentMode === "CONTINGENCY" || currentMode === "OPERATIONAL_NOTICE") && (
          <div className="space-y-6 max-w-3xl mx-auto text-center animate-stage-enter">
            {ls?.emergencyActive || currentMode === "CONTINGENCY" ? (
              <div className="border-2 border-red-500/60 bg-[#0A150D]/95 p-8 sm:p-10 rounded-3xl space-y-4 shadow-2xl backdrop-blur-xl">
                <div className="w-12 h-12 mx-auto rounded-full bg-red-950/60 border border-red-500/60 text-red-300 flex items-center justify-center animate-pulse">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h1 className="font-display text-3xl sm:text-4xl text-[#F7DECA] font-bold">
                  A Nova Moeda
                </h1>
                <p className="text-lg sm:text-xl text-[#D5C5AA] leading-relaxed font-medium">
                  {ls?.emergencyMessage ||
                    "Estamos realizando um breve ajuste técnico. A programação continuará em instantes."}
                </p>
              </div>
            ) : screenMessage ? (
              <div className="border-2 border-amber-500 bg-[#0A150D]/95 p-6 sm:p-10 rounded-3xl space-y-4 shadow-2xl backdrop-blur-xl">
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400 block">
                  Comunicado da Organização
                </span>
                <h1 className="font-display text-3xl sm:text-5xl text-[#F7DECA] font-bold">
                  {screenMessage.title}
                </h1>
                <p className="text-lg sm:text-2xl text-[#D5C5AA]/95 leading-relaxed">
                  {screenMessage.body}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* 4. Rodapé Autêntico da ARENA: Próxima Etapa & Status (Sem pílulas) */}
      <footer className="relative z-20 shrink-0 border-t border-white/10 pt-2.5 sm:pt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#D5C5AA]/75">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
            Próxima Etapa:
          </span>
          <strong className="text-[#F7DECA] text-xs font-semibold">
            {nextStep ? `${nextStep.title} (${nextStep.responsibleName})` : "Encerramento Oficial"}
          </strong>
        </div>

        <div className="flex items-center gap-4">
          {ls?.questionsOpen && activeTopic && (
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Perguntas abertas: Pauta {activeTopic.number}</span>
            </span>
          )}
          {activePoll?.status === "OPEN" && currentMode !== "POLL_OPEN" && (
            <span className="text-amber-300 font-semibold flex items-center gap-1.5 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>Votação aberta no QR Code</span>
            </span>
          )}
          <span className="text-[#D5C5AA]/50 text-[11px]">UEFS · A Nova Moeda</span>
        </div>
      </footer>
    </main>
  );
}
