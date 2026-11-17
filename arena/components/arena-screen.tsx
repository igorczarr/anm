"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useArenaSync } from "@/hooks/use-arena-sync";
import { ARENA_MODE_LABELS } from "@/lib/events";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { ArenaParticleField } from "@/components/arena-particle-field";
import { SlideMiniScreen } from "@/components/slide-mini-screen";
import {
  AlertTriangle,
  Maximize2,
  Minimize2,
  Smartphone,
  Trophy,
  Volume2,
  VolumeX,
  WifiOff,
} from "lucide-react";

const SIX_SPECIALISTS = [
  {
    name: "Daniel Pereira",
    role: "Pauta 1",
    sub: "Hiperconexão",
    photoUrl: "/img/Daniel.png?v=3",
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
    photoUrl: "/img/Sergio.png?v=3",
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
  if (!name && photoUrl && photoUrl.trim()) return photoUrl;
  const n = (name || "").toLowerCase();
  if (n.includes("daniel")) return "/img/Daniel.png?v=3";
  if (n.includes("janaina") || n.includes("janaína")) return "/img/Janaina.jpeg";
  if (n.includes("denilson")) return "/img/Denilson.png";
  if (n.includes("sergio") || n.includes("sérgio")) return "/img/Sergio.png?v=3";
  if (n.includes("dulcila")) return "/img/Dulcila.jpeg";
  if (n.includes("paula")) return "/img/Paula.jpeg";
  if (photoUrl && photoUrl.trim()) return photoUrl;
  return null;
}

// ---------------------------------------------------------------------------
// ÁUDIO CINEMATOGRÁFICO DO TELÃO (Chimes Web Audio)
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
// SUB-COMPONENTE: Cronômetro Horológico de Precisão (Sem caixa, sem rótulo redundante)
// ---------------------------------------------------------------------------
function CircularTimer({
  formatted,
  alertLevel,
  elapsedMs,
  totalDurationMs,
  size = 168,
}: {
  formatted: string;
  alertLevel: "NORMAL" | "WARNING_2MIN" | "CRITICAL_30S" | "EXPIRED";
  elapsedMs: number;
  totalDurationMs: number;
  phaseLabel?: string;
  size?: number;
}) {
  const strokeWidth = size >= 190 ? 4.5 : 3.5;
  const center = size / 2;
  const outerTickRadius = center - 2;
  const radius = center - 14;
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
          : "#34D399";

  const glowShadow =
    alertLevel === "EXPIRED"
      ? "drop-shadow(0 0 18px rgba(239, 68, 68, 0.75))"
      : alertLevel === "CRITICAL_30S"
        ? "drop-shadow(0 0 16px rgba(245, 158, 11, 0.65))"
        : alertLevel === "WARNING_2MIN"
          ? "drop-shadow(0 0 14px rgba(252, 211, 77, 0.5))"
          : "drop-shadow(0 0 16px rgba(52, 211, 153, 0.45))";

  const textGlow =
    alertLevel === "EXPIRED"
      ? "0 0 32px rgba(239, 68, 68, 0.55)"
      : alertLevel === "CRITICAL_30S"
        ? "0 0 28px rgba(245, 158, 11, 0.45)"
        : "0 0 28px rgba(52, 211, 153, 0.28)";

  // Posição do ponto orbital na ponta do arco
  const tipAngle = -Math.PI / 2 + 2 * Math.PI * remainingFraction;
  const tipX = center + radius * Math.cos(tipAngle);
  const tipY = center + radius * Math.sin(tipAngle);

  const tickCount = 60;
  const activeTicks = Math.round(remainingFraction * tickCount);

  return (
    <div
      className="relative flex items-center justify-center mx-auto select-none overflow-visible"
      style={{ width: size, height: size }}
    >
      {/* Halo radial atmosférico livre de caixa */}
      <div
        className="absolute -inset-6 rounded-full pointer-events-none opacity-40 blur-2xl"
        style={{
          background: `radial-gradient(circle, ${strokeColor}33 0%, transparent 70%)`,
        }}
      />

      <svg
        className="w-full h-full overflow-visible"
        style={{ overflow: "visible" }}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* 60 marcações horológicas de alta precisão */}
        {Array.from({ length: tickCount }).map((_, idx) => {
          const a = (idx / tickCount) * Math.PI * 2 - Math.PI / 2;
          const isMajor = idx % 5 === 0;
          const rOuter = outerTickRadius;
          const rInner = rOuter - (isMajor ? 6 : 3);
          const x1 = center + rInner * Math.cos(a);
          const y1 = center + rInner * Math.sin(a);
          const x2 = center + rOuter * Math.cos(a);
          const y2 = center + rOuter * Math.sin(a);
          const lit = idx <= activeTicks;
          return (
            <line
              key={idx}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={lit ? strokeColor : "rgba(213, 197, 170, 0.14)"}
              strokeOpacity={lit ? (isMajor ? 0.75 : 0.38) : 0.2}
              strokeWidth={isMajor ? 1.4 : 0.9}
              strokeLinecap="round"
            />
          );
        })}

        {/* Trilha fina de base */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(213, 197, 170, 0.1)"
          strokeWidth={1.25}
          fill="none"
        />

        {/* Arco principal de precisão */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${center} ${center})`}
          style={{
            filter: glowShadow,
            transition: "stroke-dashoffset 0.5s linear, stroke 0.3s ease",
          }}
        />

        {/* Ponto luminoso orbital na extremidade ativa */}
        {remainingFraction > 0.01 && (
          <circle
            cx={tipX}
            cy={tipY}
            r={strokeWidth * 1.15}
            fill="#F7DECA"
            style={{
              filter: glowShadow,
              transition: "cx 0.5s linear, cy 0.5s linear",
            }}
          />
        )}
      </svg>

      {/* Dígitos tabulares esculpidos sem qualquer texto redundante */}
      <div className="absolute inset-0 flex items-center justify-center text-center select-none pointer-events-none">
        <span
          style={{ textShadow: textGlow }}
          className={`font-mono font-bold tabular-nums tracking-tight leading-none ${
            size >= 190
              ? "text-5xl sm:text-6xl"
              : size >= 150
                ? "text-4xl sm:text-[42px]"
                : "text-3xl sm:text-4xl"
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
        <span className="w-0.5 bg-emerald-400 rounded-full animate-wave-1" />
        <span className="w-0.5 bg-emerald-400 rounded-full animate-wave-2" />
        <span className="w-0.5 bg-emerald-400 rounded-full animate-wave-3" />
        <span className="w-0.5 bg-emerald-400 rounded-full animate-wave-1" />
      </span>
      <span className="uppercase tracking-[0.2em] text-[10px] font-bold">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SUB-COMPONENTE: Confetes Dourados em CSS para a Questão Vencedora
// ---------------------------------------------------------------------------
function ConfettiSparkles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
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
// SUB-COMPONENTE: QR Code Arquitetônico Flutuante (Zero Caixas Pesadas)
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
      <div className="flex items-center gap-4 max-w-sm w-full select-none">
        <div className="relative w-14 h-14 bg-white p-1.5 rounded-xl shrink-0 shadow-[0_0_25px_rgba(16,185,129,0.2)]">
          <img src="/api/qr" alt="QR" className="w-full h-full object-contain" />
        </div>
        <div className="text-xs text-[#D5C5AA]/90 text-left space-y-0.5">
          <div className="font-bold text-[#F7DECA] text-xs tracking-wide uppercase">
            {title}
          </div>
          <span className="block text-[11px] leading-tight text-[#D5C5AA]/75">{subtitle}</span>
        </div>
      </div>
    );
  }

  const isHero = size === "hero";
  const qrBoxClass = isHero
    ? "w-44 h-44 sm:w-52 sm:h-52 p-3"
    : "w-32 h-32 sm:w-36 sm:h-36 p-2.5";

  return (
    <div className="relative flex flex-col items-center text-center max-w-xs w-full mx-auto select-none space-y-3">
      {/* Rótulo superior de telemetria */}
      <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span>{title}</span>
      </div>

      {/* Superfície óptica do QR Code flutuando sem moldura de card em volta */}
      <div className="relative group">
        <div className="absolute -inset-4 rounded-3xl bg-emerald-500/15 blur-2xl opacity-75 pointer-events-none" />
        <div
          className={`relative ${qrBoxClass} mx-auto bg-white rounded-2xl shadow-[0_18px_50px_rgba(0,0,0,0.55)] flex items-center justify-center`}
        >
          <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-emerald-700/80 pointer-events-none" />
          <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-emerald-700/80 pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-emerald-700/80 pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-emerald-700/80 pointer-events-none" />
          <img
            src="/api/qr"
            alt="QR Code de Participação"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      {/* Tipografia editorial direta, sem caixas */}
      <div className="space-y-1 pt-0.5">
        <div className="font-display font-bold text-xs sm:text-sm text-[#F7DECA] tracking-tight">
          Aponte a Câmera do Celular
        </div>
        <p className="text-[11px] text-[#D5C5AA]/75 leading-snug max-w-[240px] mx-auto">
          {subtitle}
        </p>
        <div className="pt-1 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.18em] text-emerald-400/90 font-semibold">
          <Smartphone className="w-3 h-3" />
          <span>Acesso Instantâneo · Web</span>
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

  const slideDeck = ls?.slideDeck ?? null;
  const slideIndex = ls?.slideIndex ?? 0;
  const slidesActive = Boolean(slideDeck);

  const activeSpeakerName =
    activeTopic?.mainSpeaker?.name || activeStep?.speaker?.name || activeStep?.responsibleName;
  const activeSpeakerPhoto = resolveSpeakerPhoto(
    activeSpeakerName,
    activeTopic?.mainSpeaker?.photoUrl || activeStep?.speaker?.photoUrl
  );

  // Contagem regressiva de alta precisão (HH:MM:SS) para abertura
  const [countdownParts, setCountdownParts] = useState<{
    hours: string;
    minutes: string;
    seconds: string;
  } | null>(null);

  useEffect(() => {
    if (currentMode !== "WAITING") {
      setCountdownParts(null);
      return;
    }

    const target = snapshot?.event?.scheduledStartAt
      ? new Date(snapshot.event.scheduledStartAt).getTime()
      : new Date("2026-11-17T21:30:00.000Z").getTime();

    const updateTicker = () => {
      const now = Date.now();
      if (target && target > now) {
        const totalSec = Math.floor((target - now) / 1000);
        const hours = Math.floor(totalSec / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const secs = totalSec % 60;
        setCountdownParts({
          hours: String(hours).padStart(2, "0"),
          minutes: String(mins).padStart(2, "0"),
          seconds: String(secs).padStart(2, "0"),
        });
      } else {
        const parts = (timer.formatted || "05:00").split(":");
        setCountdownParts({
          hours: "00",
          minutes: parts[0] || "05",
          seconds: parts[1] || "00",
        });
      }
    };

    updateTicker();
    const ticker = setInterval(updateTicker, 1000);
    return () => clearInterval(ticker);
  }, [snapshot?.event?.scheduledStartAt, currentMode, timer.formatted]);

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

        <header className="shrink-0 flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="space-y-0.5">
            <span className="text-[11px] uppercase tracking-[0.22em] text-emerald-400 font-bold">
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
              <span className="text-[10px] text-[#D5C5AA]/60 block uppercase tracking-[0.2em]">
                Com a Palavra
              </span>
              <strong className="text-base text-[#F7DECA]">
                {activeSpeakerName || "Organização"}
              </strong>
            </div>
            <button
              onClick={toggleFullscreen}
              className="p-2 text-[#D5C5AA] hover:text-[#F7DECA] cursor-pointer"
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
            size={240}
          />
          {timer.alertLevel === "EXPIRED" && (
            <div className="text-lg sm:text-xl font-bold text-red-400 uppercase tracking-[0.2em] animate-pulse">
              TEMPO DA FASE ENCERRADO (00:00)
            </div>
          )}
        </div>

        <footer className="shrink-0 border-t border-white/[0.08] pt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#D5C5AA]/80">
          <div>
            PRÓXIMA ETAPA:{" "}
            <strong className="text-[#F7DECA]">
              {currentMode === "WAITING"
                ? nextStep
                  ? `${nextStep.title} (${nextStep.responsibleName})`
                  : "Abertura — Apresentação do evento e orientações ao público (Organização)"
                : nextStep
                  ? `${nextStep.title} (${nextStep.responsibleName})`
                  : "Encerramento"}
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
  // TELÃO PÚBLICO DA ARENA — ARQUITETURA EDITORIAL INTERNACIONAL (SEM CAIXAS)
  // =========================================================================
  return (
    <main
      className={`arena-stage h-screen max-h-screen w-screen max-w-screen overflow-hidden flex flex-col justify-between px-6 sm:px-10 lg:px-14 py-5 sm:py-6 select-none box-border ${
        isIdle ? "cursor-none" : "cursor-default"
      }`}
      data-mode={currentMode}
    >
      {/* 1. Camadas Atmosféricas + Motor Generativo de Partículas 3D */}
      <div className="arena-orb-1" />
      <div className="arena-orb-2" />
      <div className="arena-orb-accent" />
      <ArenaParticleField
        accent={currentMode === "POLL_OPEN" || currentMode === "POLL_RESULTS" ? "amber" : "emerald"}
      />
      <div className="arena-vignette" />

      {/* Controles Flutuantes Discretos */}
      <div
        className={`fixed bottom-4 right-5 z-50 flex items-center gap-2 transition-opacity duration-300 ${
          isIdle ? "opacity-0 pointer-events-none" : "opacity-85 hover:opacity-100"
        }`}
      >
        <ThemeToggle compact />
        <button
          onClick={toggleSound}
          className={`p-2 rounded-full backdrop-blur-md cursor-pointer transition ${
            soundEnabled
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-black/40 text-[#D5C5AA]/60 hover:text-white"
          }`}
          title={soundEnabled ? "Desativar Áudio do Telão (M)" : "Ativar Áudio do Telão (M)"}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-full bg-black/40 text-[#D5C5AA]/60 hover:text-white transition backdrop-blur-md cursor-pointer"
          title={isFullscreen ? "Sair de Tela Cheia (F)" : "Alternar Tela Cheia (F)"}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Indicador de Sincronização */}
      {!connected && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-full bg-red-950/90 text-red-200 text-xs font-semibold flex items-center gap-2 backdrop-blur-md animate-pulse">
          <WifiOff className="w-3.5 h-3.5 text-red-400" />
          <span>Sincronizando com o servidor...</span>
        </div>
      )}

      {/* 2. Masthead Arquitetônico de 3 Zonas — Padrão Fórum Internacional */}
      <header className="relative z-20 shrink-0 pb-4">
        <div className="grid grid-cols-12 items-center gap-4">
          {/* ZONA ESQUERDA (4 col): Assinatura Institucional & Marca */}
          <div className="col-span-6 lg:col-span-4 flex items-center gap-3.5 min-w-0">
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shrink-0">
              <div className="absolute inset-0 rounded-full bg-emerald-400/15 blur-md pointer-events-none" />
              <BrandLogo className="relative w-full h-full object-contain drop-shadow-[0_0_14px_rgba(52,211,153,0.35)]" />
            </div>

            <div className="h-7 w-[1px] bg-gradient-to-b from-transparent via-[#D5C5AA]/35 to-transparent shrink-0" />

            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[9px] uppercase tracking-[0.28em] text-emerald-400 font-bold truncate">
                <span>UEFS</span>
                <span className="text-[#D5C5AA]/30">/</span>
                <span className="text-[#D5C5AA]/70">Auditório 02</span>
              </div>
              <div className="truncate">
                <span className="font-display font-extrabold text-base sm:text-lg text-[#F7DECA] tracking-tight">
                  A Nova Moeda
                </span>
              </div>
            </div>
          </div>

          {/* ZONA CENTRAL (4 col): Eixo de Progressão das 10 Etapas & Fase Ativa */}
          <div className="hidden lg:flex lg:col-span-4 flex-col items-center justify-center space-y-1.5">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] font-semibold">
              <span className="text-emerald-400 font-mono font-bold">
                {currentMode === "WAITING"
                  ? "PRÉ-ABERTURA"
                  : activeStep?.macroOrder
                    ? `ETAPA ${String(activeStep.macroOrder).padStart(2, "0")}/10`
                    : "EM SESSÃO"}
              </span>
              <span className="text-[#D5C5AA]/30">—</span>
              <span className="text-[#F7DECA]/90 truncate max-w-[220px]">
                {currentMode === "WAITING"
                  ? "Recepção & Votação Antecipada"
                  : activeStep?.phaseLabel || ARENA_MODE_LABELS[currentMode]}
              </span>
            </div>

            {/* Trilha Óptica de 10 Segmentos Macro */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 10 }).map((_, idx) => {
                const stepNum = idx + 1;
                const activeMacro =
                  currentMode === "WAITING" ? 0 : activeStep?.macroOrder || 1;
                const isCompleted = stepNum < activeMacro;
                const isCurrent = stepNum === activeMacro;
                return (
                  <span
                    key={stepNum}
                    className={`h-[2px] rounded-full transition-all duration-500 ${
                      isCurrent
                        ? "w-6 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]"
                        : isCompleted
                          ? "w-3 bg-emerald-500/55"
                          : "w-3 bg-white/[0.12]"
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* ZONA DIREITA (4 col): Status de Transmissão Limpo */}
          <div className="col-span-6 lg:col-span-4 flex items-center justify-end">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
              </span>
              <span className="text-[10px] uppercase tracking-[0.26em] text-[#F7DECA] font-bold">
                Ao Vivo
              </span>
            </div>
          </div>
        </div>

        {/* Linha Capilar Óptica com Foco Luminoso */}
        <div className="mt-3.5 h-[1px] w-full bg-gradient-to-r from-emerald-400/50 via-white/[0.12] to-emerald-400/30" />
      </header>

      {/* ========================================================================= */}
      {/* 3. PALCO CENTRAL (100% NO-SCROLL · COMPOSIÇÃO EDITORIAL ABERTA)           */}
      {/* ========================================================================= */}
      <div
        key={currentMode}
        className="flex-1 min-h-0 flex items-center justify-center py-3 relative z-10 overflow-visible animate-stage-enter"
      >
        {/* ----------------------------------------------------------------------- */}
        {/* 1. MODO DE ESPERA / BOAS-VINDAS (WAITING)                               */}
        {/* ----------------------------------------------------------------------- */}
        {currentMode === "WAITING" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full max-w-7xl mx-auto">
            {/* Coluna Esquerda: Tipografia Editorial + Contador Escultural + Especialistas */}
            <div className="lg:col-span-8 space-y-6 text-left">
              <div className="space-y-2">
                <div className="text-[11px] font-bold tracking-[0.26em] uppercase text-emerald-400">
                  Universidade Estadual de Feira de Santana · Auditório 2
                </div>
                <h1 className="font-display text-4xl sm:text-6xl lg:text-[64px] text-[#F7DECA] font-extrabold leading-[1.04] tracking-tight">
                  A Nova Moeda:{" "}
                  <span className="text-emerald-400 font-light italic">Economia da Solidão</span>
                </h1>
                <p className="text-xs sm:text-sm lg:text-base text-[#D5C5AA]/80 max-w-2xl leading-relaxed pt-1">
                  Reflexão estratégica sobre conexões humanas, capital social e o mercado contemporâneo do isolamento. Aponte a câmera do celular para registrar seu voto na pauta da Mesa-Redonda.
                </p>
              </div>

              {/* Contador Escultural de Alta Precisão — Sem Caixa Envolvente */}
              <div className="border-l-2 border-emerald-400/70 pl-5 sm:pl-6 py-1 space-y-1.5 overflow-visible">
                <div className="text-[10px] uppercase tracking-[0.26em] text-emerald-400 font-bold">
                  Início do ANM em
                </div>
                {countdownParts ? (
                  <div
                    className="flex items-baseline gap-3 sm:gap-4 font-mono tabular-nums text-[#F7DECA] overflow-visible"
                    style={{
                      textShadow:
                        "0 0 36px rgba(52, 211, 153, 0.35), 0 0 70px rgba(16, 185, 129, 0.18)",
                    }}
                  >
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl sm:text-6xl font-bold tracking-tight leading-none">
                        {countdownParts.hours}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-400/80 font-sans font-bold">
                        h
                      </span>
                    </div>
                    <span className="text-2xl sm:text-4xl text-emerald-400/50 font-light">:</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl sm:text-6xl font-bold tracking-tight leading-none">
                        {countdownParts.minutes}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-400/80 font-sans font-bold">
                        m
                      </span>
                    </div>
                    <span className="text-2xl sm:text-4xl text-emerald-400/50 font-light">:</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl sm:text-6xl font-bold tracking-tight leading-none text-emerald-300">
                        {countdownParts.seconds}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-400/80 font-sans font-bold">
                        s
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    className="font-mono text-4xl sm:text-6xl font-bold tabular-nums text-[#F7DECA] tracking-tight leading-none"
                    style={{
                      textShadow:
                        "0 0 36px rgba(52, 211, 153, 0.35), 0 0 70px rgba(16, 185, 129, 0.18)",
                    }}
                  >
                    {timer.formatted || "05:00"}
                  </div>
                )}
              </div>

              {/* Lineup Editorial dos 6 Especialistas — Sem Caixas Retangulares */}
              <div className="pt-2 border-t border-white/[0.08]">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 pt-3">
                  {SIX_SPECIALISTS.map((sp) => (
                    <div
                      key={sp.name}
                      className="flex items-center gap-2.5 min-w-0 group"
                    >
                      <img
                        src={sp.photoUrl}
                        alt={sp.name}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover object-top ring-1 ring-emerald-400/40 shrink-0 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                      />
                      <div className="min-w-0">
                        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-400 block truncate">
                          {sp.role}
                        </span>
                        <span className="font-semibold text-xs text-[#F7DECA] block truncate leading-tight">
                          {sp.name.split(" ")[0]}
                        </span>
                        <span className="text-[10px] text-[#D5C5AA]/55 block truncate">
                          {sp.sub}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Coluna Direita: QR Code Flutuante */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center">
              <ParticipateNowCard
                title="Votação Aberta no Celular"
                subtitle="Aponte a câmera para votar na questão da Mesa-Redonda e habilitar sua credencial ao sorteio."
                size="hero"
              />
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* 2. MODO ABERTURA OFICIAL (OPENING)                                      */}
        {/* ----------------------------------------------------------------------- */}
        {currentMode === "OPENING" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full max-w-7xl mx-auto">
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="space-y-2">
                <span className="text-[11px] uppercase tracking-[0.26em] text-emerald-400 font-bold block">
                  Etapa 01 / 10 · Sessão de Abertura
                </span>
                <h1 className="font-display text-4xl sm:text-6xl text-[#F7DECA] font-extrabold leading-[1.06] tracking-tight">
                  Abertura e Boas-Vindas à Arena
                </h1>
                <p className="text-xs sm:text-base text-[#D5C5AA]/85 max-w-2xl leading-relaxed pt-1">
                  Apresentação oficial da Arena A Nova Moeda, diretrizes do debate e acolhimento à plateia pela equipe organizadora e mediação.
                </p>
              </div>

              {/* Assinatura Editorial da Mediação — Sem Caixa */}
              <div className="border-l-2 border-emerald-400/70 pl-5 flex items-center gap-4">
                <img
                  src="/img/Paula.jpeg"
                  alt="Paula Melo"
                  className="w-14 h-14 rounded-full object-cover object-top ring-2 ring-emerald-400/50 shrink-0 shadow-lg"
                />
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold tracking-[0.22em] text-emerald-400 block">
                    Coordenação &amp; Mediação
                  </span>
                  <div className="font-display font-bold text-xl text-[#F7DECA]">
                    Paula Melo &amp; Equipe Organizadora
                  </div>
                  <div className="text-xs text-[#D5C5AA]/65">
                    Apresentação do formato interativo e orientações ao público
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col items-center gap-6">
              {showTimer && (
                <CircularTimer
                  formatted={timer.formatted}
                  alertLevel={timer.alertLevel}
                  elapsedMs={timer.elapsedMs}
                  totalDurationMs={timer.totalDurationMs}
                  size={168}
                />
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full max-w-7xl mx-auto">
            <div
              className={`${
                slidesActive && slideDeck === "intro" ? "lg:col-span-5" : "lg:col-span-7"
              } space-y-6 text-left`}
            >
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <span className="text-[11px] uppercase tracking-[0.26em] text-emerald-400 font-bold">
                    Etapa 02 / 10 · Contexto Estratégico
                  </span>
                  <SoundWaveBadge label="Com a Palavra" />
                </div>
                <h1 className="font-display text-4xl sm:text-6xl text-[#F7DECA] font-extrabold leading-[1.06] tracking-tight">
                  A Economia da Solidão
                </h1>
                <p className="text-xs sm:text-base text-[#D5C5AA]/85 max-w-2xl leading-relaxed pt-1">
                  Contextualização conceitual sobre as transformações sociais, o isolamento contemporâneo e os impactos humanos e econômicos debatidos na Arena.
                </p>
              </div>

              <div className="border-l-2 border-emerald-400/70 pl-5 flex items-center gap-4">
                <img
                  src="/img/Paula.jpeg"
                  alt="Paula Melo"
                  className="w-14 h-14 rounded-full object-cover object-top ring-2 ring-emerald-400/50 shrink-0 shadow-lg"
                />
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-bold tracking-[0.22em] text-emerald-400 block">
                    Apresentadora &amp; Mediadora
                  </span>
                  <div className="font-display font-bold text-xl text-[#F7DECA]">
                    Paula Melo
                  </div>
                  <div className="text-xs text-[#D5C5AA]/65">
                    Panorama introdutório antes das 5 exposições individuais
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`${
                slidesActive && slideDeck === "intro" ? "lg:col-span-7" : "lg:col-span-5"
              } flex flex-col items-center gap-6`}
            >
              {slidesActive && slideDeck === "intro" ? (
                <SlideMiniScreen deck="intro" index={slideIndex} />
              ) : (
                <>
                  {showTimer && (
                    <CircularTimer
                      formatted={timer.formatted}
                      alertLevel={timer.alertLevel}
                      elapsedMs={timer.elapsedMs}
                      totalDurationMs={timer.totalDurationMs}
                      size={168}
                    />
                  )}
                  <ParticipateNowCard
                    title="Participe pelo Celular"
                    subtitle="Vote na questão da Mesa-Redonda enquanto acompanha a introdução."
                    size="default"
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* 4. MODO VOTAÇÃO DA MESA-REDONDA (POLL_OPEN / POLL_RESULTS)              */}
        {/* ----------------------------------------------------------------------- */}
        {(currentMode === "POLL_OPEN" || currentMode === "POLL_RESULTS") && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full max-w-7xl mx-auto">
            <div className="lg:col-span-7 space-y-5 text-left">
              <div className="space-y-1.5">
                <span className="text-[11px] uppercase tracking-[0.26em] text-amber-400 font-bold block">
                  {currentMode === "POLL_RESULTS" ||
                  activePoll?.status === "CLOSED" ||
                  activePoll?.status === "RESULTS_PUBLISHED"
                    ? "Resultado Oficial · Questão Eleita pelo Auditório"
                    : "Decisão Coletiva · Votação em Tempo Real"}
                </span>
                <h1 className="font-display text-2xl sm:text-4xl text-[#F7DECA] font-extrabold leading-tight tracking-tight">
                  {activePoll?.question ||
                    "Qual questão deve orientar a mesa-redonda?"}
                </h1>
              </div>

              {/* Linhas Arquitetônicas de Apuração — Sem Caixas Fechadas */}
              <div className="divide-y divide-white/[0.08] border-t border-b border-white/[0.08]">
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
                      className={`relative py-3.5 pl-4 sm:pl-5 transition-all duration-500 border-l-2 ${
                        isWinner
                          ? "border-amber-400 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent"
                          : "border-emerald-500/40"
                      }`}
                    >
                      {isWinner && <ConfettiSparkles />}
                      <div className="relative z-10 flex items-baseline justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-[0.22em] ${
                              isWinner ? "text-amber-300" : "text-emerald-400"
                            }`}
                          >
                            {opt.themeLabel || `Questão 0${opt.optionOrder}`}
                          </span>
                          {isWinner && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-amber-400">
                              <Trophy className="w-3 h-3" />
                              <span>Eleita</span>
                            </span>
                          )}
                        </div>
                        {showPct && (
                          <span className="font-mono font-bold tabular-nums text-xl sm:text-2xl text-[#F7DECA] shrink-0">
                            {pct}%
                          </span>
                        )}
                      </div>

                      <p className="relative z-10 text-xs sm:text-sm font-medium text-[#F7DECA]/95 mt-1 leading-snug max-w-2xl">
                        {opt.label}
                      </p>

                      {showPct && (
                        <div className="relative z-10 w-full h-[3px] bg-white/[0.07] overflow-hidden mt-2.5">
                          <div
                            className={`h-full transition-all duration-1000 ease-out ${
                              isWinner
                                ? "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)]"
                                : "bg-emerald-400/80"
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

            <div className="lg:col-span-5 flex flex-col items-center gap-6">
              {showTimer && (
                <CircularTimer
                  formatted={timer.formatted}
                  alertLevel={timer.alertLevel}
                  elapsedMs={timer.elapsedMs}
                  totalDurationMs={timer.totalDurationMs}
                  size={168}
                />
              )}
              <ParticipateNowCard
                title="Vote pelo Celular"
                subtitle="Escolha o tema da Mesa-Redonda diretamente pelo navegador."
                size="default"
              />
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* 5. TELA DA EXPOSIÇÃO INDIVIDUAL (15 min) — QUANDO HOUVER PAUTA ATIVA    */}
        {/* ----------------------------------------------------------------------- */}
        {(currentMode === "SPEAKER_EXPOSITION" || currentMode === "TOPIC_OVERVIEW") && activeTopic && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full max-w-7xl mx-auto">
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="space-y-2.5">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="text-[11px] uppercase tracking-[0.26em] text-emerald-400 font-bold">
                    Pauta 0{activeTopic.number} / 05
                  </span>
                  <SoundWaveBadge />
                </div>
                <h1 className="font-display text-3xl sm:text-5xl lg:text-[54px] text-[#F7DECA] font-extrabold leading-[1.08] tracking-tight">
                  {activeTopic.title}
                </h1>
              </div>

              {/* Assinatura Editorial do Palestrante — Sem Caixa */}
              <div className="border-l-2 border-emerald-400/80 pl-5 sm:pl-6 flex items-center gap-5 pt-1">
                {activeSpeakerPhoto ? (
                  <img
                    src={activeSpeakerPhoto}
                    alt={activeTopic.mainSpeaker.name}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover object-top ring-2 ring-emerald-400/60 shadow-[0_0_30px_rgba(16,185,129,0.25)] shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#030A06] ring-2 ring-emerald-400/60 flex items-center justify-center font-bold text-2xl text-emerald-400 shrink-0">
                    {activeTopic.mainSpeaker.name.charAt(0)}
                  </div>
                )}
                <div className="space-y-1 min-w-0">
                  <span className="text-[10px] uppercase tracking-[0.24em] text-emerald-400 font-bold block">
                    Especialista Convidado
                  </span>
                  <div className="font-display text-2xl sm:text-4xl text-[#F7DECA] font-bold truncate tracking-tight">
                    {activeTopic.mainSpeaker.name}
                  </div>
                  <div className="text-xs text-[#D5C5AA]/70">
                    Exposição principal · Perguntas abertas pelo QR Code
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna Direita: Cronômetro Puro Estilizado (Sem Caixa, Sem "Tempo de Exposição") */}
            <div className="lg:col-span-5 flex flex-col items-center gap-6">
              {showTimer && (
                <CircularTimer
                  formatted={timer.formatted}
                  alertLevel={timer.alertLevel}
                  elapsedMs={timer.elapsedMs}
                  totalDurationMs={timer.totalDurationMs}
                  size={184}
                />
              )}

              <ParticipateNowCard
                title="Envie sua Pergunta"
                subtitle={`Participe ao vivo enviando sua pergunta para ${activeTopic.mainSpeaker.name}.`}
                size="default"
              />
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* 6. TELA DE PERGUNTA E RESPOSTA (5 min · SELECTED_QUESTION)              */}
        {/* ----------------------------------------------------------------------- */}
        {currentMode === "SELECTED_QUESTION" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full max-w-7xl mx-auto">
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="flex items-center gap-4">
                <span className="text-[11px] uppercase tracking-[0.26em] text-emerald-400 font-bold">
                  Voz do Auditório · Pauta 0{selectedQuestion?.topicNumber || activeTopic?.number}
                </span>
                <SoundWaveBadge label="Respondendo" />
              </div>

              {/* Citação Editorial — Barra Vertical Luminosa, Sem Caixa Fechada */}
              <div className="border-l-2 border-emerald-400 pl-6 sm:pl-8 py-2 relative">
                <p className="font-display text-2xl sm:text-4xl lg:text-[42px] text-[#F7DECA] font-bold leading-[1.2] tracking-tight">
                  &ldquo;
                  {selectedQuestion?.text ||
                    "Pergunta da plateia em resposta pelo especialista com mediação de Paula."}
                  &rdquo;
                </p>
              </div>

              <div className="flex items-center gap-4 pt-1">
                {activeSpeakerPhoto && (
                  <img
                    src={activeSpeakerPhoto}
                    alt={activeSpeakerName || ""}
                    className="w-11 h-11 rounded-full object-cover object-top ring-1 ring-emerald-400/60 shrink-0"
                  />
                )}
                <div>
                  <span className="text-[10px] uppercase tracking-[0.22em] text-emerald-400 font-bold block">
                    {selectedQuestion?.isMediationReserve ? "Questão da Mediação" : "Pergunta da Plateia"}
                  </span>
                  <strong className="text-[#F7DECA] text-base font-display">
                    Com a palavra: {activeSpeakerName}
                  </strong>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col items-center gap-6">
              {showTimer && (
                <CircularTimer
                  formatted={timer.formatted}
                  alertLevel={timer.alertLevel}
                  elapsedMs={timer.elapsedMs}
                  totalDurationMs={timer.totalDurationMs}
                  size={184}
                />
              )}

              <ParticipateNowCard
                title="Participe pelo Celular"
                subtitle="Acompanhe pelo celular e vote na questão da Mesa-Redonda."
                size="default"
              />
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* 7. TELA DE MESA-REDONDA (ROUNDTABLE · 6 DEBATEDORES)                    */}
        {/* ----------------------------------------------------------------------- */}
        {(currentMode === "ROUNDTABLE" || currentMode === "COLLECTIVE_BUILDING") && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full max-w-7xl mx-auto">
            <div className="lg:col-span-8 space-y-6 text-left">
              <div className="flex items-center gap-3">
                <span className="text-[11px] uppercase tracking-[0.26em] text-emerald-400 font-bold">
                  Mesa-Redonda Oficial
                </span>
                <span className="text-[#D5C5AA]/30">·</span>
                <span className="text-[11px] uppercase tracking-[0.22em] text-amber-400 font-bold">
                  Questão Eleita pelo Público
                </span>
              </div>

              {/* Questão Central em Tipografia Monumental — Sem Caixa */}
              <div className="border-l-2 border-amber-400 pl-6 sm:pl-8 py-1">
                <h1 className="font-display text-2xl sm:text-4xl lg:text-[42px] text-[#F7DECA] font-bold leading-[1.18] tracking-tight">
                  &ldquo;
                  {activePoll?.winningQuestionText ||
                    activePoll?.options?.find((o) => o.isWinner)?.label ||
                    activePoll?.options?.[0]?.label ||
                    "Como transformar a economia da solidão em uma economia da conexão?"}
                  &rdquo;
                </h1>
              </div>

              {/* Os Seis Debatedores em Linha Editorial Limpa */}
              <div className="pt-3 border-t border-white/[0.08]">
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 pt-3">
                  {SIX_SPECIALISTS.map((sp) => (
                    <div key={sp.name} className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={sp.photoUrl}
                        alt={sp.name}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover object-top ring-1 ring-emerald-400/40 shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-400 block truncate">
                          {sp.role}
                        </span>
                        <span className="font-bold text-xs text-[#F7DECA] leading-tight block truncate">
                          {sp.name.split(" ")[0]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col items-center justify-center gap-4">
              {showTimer && (
                <CircularTimer
                  formatted={timer.formatted}
                  alertLevel={timer.alertLevel}
                  elapsedMs={timer.elapsedMs}
                  totalDurationMs={timer.totalDurationMs}
                  size={200}
                />
              )}
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* 8. TELA DE ENCERRAMENTO (CLOSING)                                       */}
        {/* ----------------------------------------------------------------------- */}
        {currentMode === "CLOSING" && (
          slidesActive && slideDeck === "closing" ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full max-w-7xl mx-auto animate-stage-enter">
              <div className="lg:col-span-5 space-y-5 text-left">
                <span className="text-[11px] uppercase font-bold tracking-[0.28em] text-emerald-400 block">
                  Encerramento · Síntese Final
                </span>
                <h1 className="font-display text-4xl sm:text-5xl text-[#F7DECA] font-extrabold leading-[1.06] tracking-tight">
                  O Trabalho Hoje
                </h1>
                <div className="border-l-2 border-emerald-400/70 pl-5 flex items-center gap-4">
                  <img
                    src="/img/Paula.jpeg"
                    alt="Paula Melo"
                    className="w-14 h-14 rounded-full object-cover object-top ring-2 ring-emerald-400/50 shrink-0 shadow-lg"
                  />
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-bold tracking-[0.22em] text-emerald-400 block">
                      Apresentadora &amp; Mediadora
                    </span>
                    <div className="font-display font-bold text-xl text-[#F7DECA]">Paula Melo</div>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-7">
                <SlideMiniScreen deck="closing" index={slideIndex} />
              </div>
            </div>
          ) : (
          <div className="space-y-5 max-w-3xl mx-auto text-center animate-stage-enter">
            <span className="text-[11px] uppercase font-bold tracking-[0.28em] text-emerald-400 block">
              Sessão Encerrada · A Nova Moeda
            </span>
            <h1 className="font-display text-4xl sm:text-6xl text-[#F7DECA] font-extrabold leading-tight tracking-tight">
              Agradecemos a Sua Participação
            </h1>
            <p className="text-sm sm:text-lg text-[#D5C5AA]/85 max-w-xl mx-auto leading-relaxed">
              O encontro <strong>A Nova Moeda</strong> foi construído coletivamente com a presença, os votos e as perguntas de todos os participantes.
            </p>
            <div className="pt-4 border-t border-white/[0.08] text-[11px] uppercase tracking-[0.24em] text-[#D5C5AA]/60">
              Universidade Estadual de Feira de Santana · UEFS
            </div>
          </div>
          )
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* 9. TELA DE CONTINGÊNCIA / AVISO OPERACIONAL                             */}
        {/* ----------------------------------------------------------------------- */}
        {(currentMode === "CONTINGENCY" || currentMode === "OPERATIONAL_NOTICE") && (
          <div className="space-y-6 max-w-3xl mx-auto text-center animate-stage-enter">
            {ls?.emergencyActive || currentMode === "CONTINGENCY" ? (
              <div className="space-y-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-red-500/15 text-red-400 flex items-center justify-center animate-pulse">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h1 className="font-display text-3xl sm:text-5xl text-[#F7DECA] font-bold tracking-tight">
                  A Nova Moeda
                </h1>
                <p className="text-lg sm:text-xl text-[#D5C5AA]/90 leading-relaxed">
                  {ls?.emergencyMessage ||
                    "Breve ajuste técnico em andamento. A programação retornará em instantes."}
                </p>
              </div>
            ) : screenMessage ? (
              <div className="space-y-4">
                <span className="text-[11px] font-bold uppercase tracking-[0.26em] text-amber-400 block">
                  Comunicado da Organização
                </span>
                <h1 className="font-display text-3xl sm:text-5xl text-[#F7DECA] font-bold tracking-tight">
                  {screenMessage.title}
                </h1>
                <p className="text-lg sm:text-2xl text-[#D5C5AA]/90 leading-relaxed">
                  {screenMessage.body}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* 4. Rodapé de Telemetria Editorial */}
      <footer className="relative z-20 shrink-0 border-t border-white/[0.08] pt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#D5C5AA]/70">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-400">
            A Seguir
          </span>
          <span className="text-[#D5C5AA]/30">—</span>
          <strong className="text-[#F7DECA] text-xs font-medium tracking-tight">
            {currentMode === "WAITING"
              ? nextStep
                ? `${nextStep.title} · ${nextStep.responsibleName}`
                : "Abertura — Apresentação do evento e orientações ao público"
              : nextStep
                ? `${nextStep.title} · ${nextStep.responsibleName}`
                : "Encerramento Oficial"}
          </strong>
        </div>

        <div className="flex items-center gap-5">
          {ls?.questionsOpen && activeTopic && (
            <span className="text-emerald-400 font-semibold flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Captação Aberta · Pauta 0{activeTopic.number}</span>
            </span>
          )}
          {activePoll?.status === "OPEN" && currentMode !== "POLL_OPEN" && (
            <span className="text-amber-300 font-semibold flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span>Votação Aberta</span>
            </span>
          )}
          <span className="text-[#D5C5AA]/45 text-[10px] uppercase tracking-[0.22em]">
            UEFS · A Nova Moeda
          </span>
        </div>
      </footer>
    </main>
  );
}
