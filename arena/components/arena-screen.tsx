"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useArenaSync } from "@/hooks/use-arena-sync";
import { ARENA_MODE_LABELS } from "@/lib/events";
import {
  AlertTriangle,
  BarChart2,
  Clock,
  Maximize2,
  MessageSquare,
  Mic,
  Radio,
  Sparkles,
  Trophy,
  Users,
  Vote,
  WifiOff,
  ArrowRight,
} from "lucide-react";

export function ArenaScreen() {
  const searchParams = useSearchParams();
  const isStageMonitor = searchParams.get("modo") === "palco";

  const { snapshot, timer, connected } = useArenaSync({ isArenaScreen: true });
  const [, setIsFullscreen] = useState(false);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const ls = snapshot?.liveState;
  const activeTopic = snapshot?.activeTopic;
  const activeStep = snapshot?.activeStep;
  const nextStep = snapshot?.nextStep;
  const activePoll = snapshot?.activePoll;
  const selectedQuestion = snapshot?.selectedQuestion;
  const screenMessage = snapshot?.screenMessage;
  const speakers = snapshot?.speakers || [];

  const currentMode = useMemo(() => {
    if (ls?.emergencyActive) return "CONTINGENCY";
    return ls?.arenaMode || "WAITING";
  }, [ls?.emergencyActive, ls?.arenaMode]);

  const showTimer = isStageMonitor || (ls?.showTimerOnArena ?? true);

  const timerStyle = useMemo(() => {
    if (timer.alertLevel === "EXPIRED") {
      return "text-red-500 border-red-500/40 bg-red-950/30 animate-pulse";
    }
    if (timer.alertLevel === "CRITICAL_30S") {
      return "text-amber-400 border-amber-400/40 bg-amber-950/20";
    }
    if (timer.alertLevel === "WARNING_2MIN") {
      return "text-amber-200 border-amber-300/30 bg-amber-950/10";
    }
    return "text-[#F7DECA] border-[#D5C5AA]/20 bg-[#0A150D]/60";
  }, [timer.alertLevel]);

  // MODO MONITOR DE APOIO DE PALCO
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
            <span className="text-xs uppercase tracking-[0.25em] text-[#14532D] font-bold">
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
              <span className="text-xs text-[#D5C5AA]/70 block">Fase Atual</span>
              <span className="text-sm font-bold text-emerald-400">
                {activeStep?.phaseLabel || ARENA_MODE_LABELS[currentMode]}
              </span>
            </div>
            <button
              onClick={toggleFullscreen}
              className="p-3 rounded-xl border border-[#D5C5AA]/30 bg-[#0A150D] text-[#D5C5AA] hover:text-white transition"
              title="Tela Cheia"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="my-auto text-center space-y-8">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-sm font-semibold uppercase tracking-wider">
              <Mic className="w-4 h-4" />
              Com a palavra: {activeStep?.responsibleName || "Especialista"}
            </span>
            <h2 className="font-display text-4xl sm:text-5xl text-[#F7DECA]">
              {activeStep?.title || "Exposição"}
            </h2>
          </div>

          <div
            className={`inline-block border-2 px-10 py-6 sm:px-16 sm:py-8 rounded-3xl ${timerStyle}`}
          >
            <div className="font-mono font-bold text-7xl sm:text-9xl tracking-tight">
              {timer.formatted}
            </div>
            {timer.alertLevel === "EXPIRED" && (
              <div className="mt-4 text-xl sm:text-2xl font-bold text-red-400 uppercase tracking-wider">
                TEMPO DA FASE ENCERRADO (00:00)
              </div>
            )}
          </div>
        </div>

        <footer className="border-t border-[#D5C5AA]/20 pt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-[#D5C5AA]/80">
          <div>
            PRÓXIMA ETAPA:{" "}
            <strong className="text-[#F7DECA]">
              {nextStep
                ? `${nextStep.title} (${nextStep.responsibleName})`
                : "Encerramento"}
            </strong>
          </div>
          <div className="flex items-center gap-6">
            <span>
              Perguntas aprovadas:{" "}
              <strong className="text-emerald-400">
                {snapshot?.metrics.questionsApproved ?? 0}
              </strong>
            </span>
            <span>
              Votos na Mesa-Redonda:{" "}
              <strong className="text-emerald-400">
                {snapshot?.metrics.activePollVotes ?? 0}
              </strong>
            </span>
          </div>
        </footer>
      </main>
    );
  }

  // TELÃO PÚBLICO DA ARENA (16:9 — PROJEÇÃO PRINCIPAL v2.0)
  return (
    <main className="relative min-h-screen w-full bg-[#030A06] text-[#F7DECA] flex flex-col justify-between p-6 sm:p-12 overflow-hidden select-none">
      <button
        onClick={toggleFullscreen}
        className="absolute bottom-4 right-4 z-40 p-2.5 rounded-xl border border-[#D5C5AA]/20 bg-[#030A06]/80 text-[#D5C5AA]/60 hover:text-white hover:border-[#D5C5AA]/60 transition opacity-30 hover:opacity-100"
        title="Alternar Tela Cheia (F11)"
      >
        <Maximize2 className="w-4 h-4" />
      </button>

      {!connected && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-2 rounded-full bg-red-950/90 border border-red-500/60 text-red-200 text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-2xl backdrop-blur-md animate-pulse">
          <WifiOff className="w-4 h-4" />
          <span>
            Tentando reconectar... (exibindo última sincronização válida)
          </span>
        </div>
      )}

      {/* Cabeçalho da ARENA */}
      <header className="flex items-center justify-between border-b border-[#D5C5AA]/20 pb-5">
        <div className="flex items-center gap-4">
          <img
            src="/icon.svg"
            alt="A Nova Moeda"
            className="w-12 h-12 rounded-2xl shadow-lg border border-[#D5C5AA]/20"
          />
          <div>
            <div className="font-display text-xl sm:text-2xl text-[#F7DECA] tracking-tight">
              A Nova Moeda
            </div>
            <div className="text-xs sm:text-sm text-[#D5C5AA]/70 flex items-center gap-2">
              <span>{snapshot?.event.institution || "UEFS"}</span>
              <span>·</span>
              <span>
                {activeStep?.phaseLabel || ARENA_MODE_LABELS[currentMode]}
              </span>
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
                  className={`px-4 py-1.5 rounded-2xl border font-mono font-bold text-lg sm:text-xl flex items-center gap-2 ${timerStyle}`}
                >
                  <Clock className="w-4 h-4 text-[#14532D]" />
                  <span>{timer.formatted}</span>
                </div>
              )}

            <button
              onClick={toggleFullscreen}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-[#D5C5AA]/30 bg-[#0A150D] text-[#D5C5AA] hover:text-[#F7DECA] hover:border-[#D5C5AA]/60 transition flex items-center gap-1.5 text-xs font-semibold"
              title="Alternar Modo Apresentação (Tela Cheia)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Modo Apresentação</span>
            </button>

            <div className="px-3 py-1 rounded-full bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5" />
              <span>AO VIVO</span>
            </div>
          </div>
      </header>

      {/* CONTEÚDO PRINCIPAL (MODOS LIMPOS DO FORMATO OFICIAL v2.0) */}
      <div className="my-auto py-8">
        {/* 1. TELA DE ESPERA */}
        {currentMode === "WAITING" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-8 space-y-6">
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-semibold uppercase tracking-wider">
                <Radio className="w-4 h-4 animate-pulse" />
                Abertura em Breve
              </span>
              <h1 className="font-display text-5xl sm:text-7xl text-[#F7DECA] leading-tight">
                A Nova Moeda
              </h1>
              <p className="text-lg sm:text-2xl text-[#D5C5AA]/85 max-w-2xl leading-relaxed">
                Introdução contextual, cinco exposições individuais, perguntas
                da plateia e uma mesa-redonda definida pelo seu voto.
              </p>
            </div>

            <div className="lg:col-span-4 border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-8 rounded-3xl text-center space-y-4 shadow-2xl">
              <div className="text-xs uppercase tracking-widest text-[#14532D] font-bold">
                Participe pelo Celular
              </div>
              <div className="w-64 h-64 mx-auto p-4 bg-white rounded-2xl shadow-inner border border-slate-200 flex items-center justify-center">
                <img
                  src="/api/qr"
                  alt="QR Code de Participação"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="space-y-1">
                <div className="font-bold text-sm sm:text-base text-[#F7DECA]">
                  Escaneie o QR Code de Participação
                </div>
                <div className="text-xs text-[#D5C5AA]/70">
                  Envie sua pergunta em cada pauta e escolha a questão da
                  Mesa-Redonda.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. TELA DE ABERTURA (5 min · Organização) */}
        {currentMode === "OPENING" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-8 space-y-6">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#14532D] text-white text-xs sm:text-sm font-bold uppercase tracking-wider">
                Etapa 1 · Abertura Oficial (5 min)
              </span>
              <h1 className="font-display text-4xl sm:text-6xl text-[#F7DECA] leading-tight">
                Apresentação do evento e orientações ao público
              </h1>
              <p className="text-lg sm:text-xl text-[#D5C5AA]/85 max-w-2xl leading-relaxed">
                Bem-vindos ao encontro <strong>A Nova Moeda</strong>. Acompanhe
                a introdução de Paula, as 5 exposições temáticas (15 min de
                exposição + 5 min de pergunta e resposta) e vote na questão que
                será debatida na Mesa-Redonda.
              </p>
            </div>

            <div className="lg:col-span-4 border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-8 rounded-3xl text-center space-y-4 shadow-2xl">
              <div className="w-56 h-56 mx-auto p-3 bg-white rounded-2xl shadow-inner border border-slate-200">
                <img
                  src="/api/qr"
                  alt="QR Code de Participação"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-xs sm:text-sm text-[#F7DECA] font-semibold">
                Conecte-se pelo QR Code para enviar perguntas e votar
              </div>
            </div>
          </div>
        )}

        {/* 3. TELA DE INTRODUÇÃO E CONTEXTO — PAULA (10 min) */}
        {currentMode === "INTRODUCTION" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-8 space-y-6">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#14532D] text-white text-xs sm:text-sm font-bold uppercase tracking-wider">
                <Mic className="w-4 h-4" />
                Etapa 2 · Introdução e Contexto (10 min)
              </span>
              <h1 className="font-display text-4xl sm:text-6xl text-[#F7DECA] leading-snug">
                A economia da solidão e o problema central do encontro
              </h1>

              <div className="flex items-center gap-5 border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 rounded-3xl">
                {activeStep?.speaker?.photoUrl && (
                  <img
                    src={activeStep.speaker.photoUrl}
                    alt={activeStep.speaker.name}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-[#D5C5AA]/40 shadow-xl"
                  />
                )}
                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
                    Especialista Responsável
                  </span>
                  <div className="font-display text-3xl sm:text-4xl text-[#F7DECA]">
                    {activeStep?.speaker?.name ||
                      activeStep?.responsibleName ||
                      "Paula"}
                  </div>
                  <div className="text-sm text-[#D5C5AA]/85">
                    Contextualização temática · Abertura conceitual das 5 pautas
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-8 rounded-3xl text-center space-y-6 shadow-2xl">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-widest text-[#14532D] font-bold">
                  Tempo da Introdução
                </div>
                <div
                  className={`font-mono font-bold text-6xl sm:text-7xl tracking-tight p-4 rounded-2xl border ${timerStyle}`}
                >
                  {timer.formatted}
                </div>
              </div>

              <div className="pt-4 border-t border-[#D5C5AA]/15 flex items-center justify-center gap-3">
                <div className="w-20 h-20 p-1.5 bg-white rounded-xl shadow-xs shrink-0">
                  <img
                    src="/api/qr"
                    alt="QR"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="text-left text-xs text-[#D5C5AA]/80">
                  Em seguida: Pauta 1 com Daniel (15 min Exposição + 5 min
                  Pergunta e Resposta).
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. TELA DA PAUTA EM ANDAMENTO — EXPOSIÇÃO INDIVIDUAL (15 min) */}
        {(currentMode === "SPEAKER_EXPOSITION" ||
          currentMode === "TOPIC_OVERVIEW") &&
          activeTopic && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-8 space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#14532D] text-white text-xs sm:text-sm font-bold uppercase tracking-wider">
                    <Mic className="w-4 h-4" />
                    Pauta {activeTopic.number} de 5 · Exposição (15 min)
                  </span>
                  {activeTopic.number === 5 &&
                    activePoll?.status === "OPEN" && (
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-500 text-slate-950 text-xs font-bold uppercase">
                        <Vote className="w-3.5 h-3.5" />
                        Votação da Mesa-Redonda Aberta!
                      </span>
                    )}
                </div>

                <h1 className="font-display text-4xl sm:text-6xl text-[#F7DECA] leading-snug">
                  {activeTopic.title}
                </h1>

                <div className="flex items-center gap-5 border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 rounded-3xl">
                  {activeTopic.mainSpeaker.photoUrl && (
                    <img
                      src={activeTopic.mainSpeaker.photoUrl}
                      alt={activeTopic.mainSpeaker.name}
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-[#D5C5AA]/40 shadow-xl"
                    />
                  )}
                  <div className="space-y-1">
                    <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
                      Especialista em Exposição
                    </span>
                    <div className="font-display text-3xl sm:text-4xl text-[#F7DECA]">
                      {activeTopic.mainSpeaker.name}
                    </div>
                    <div className="text-sm text-[#D5C5AA]/85">
                      15 minutos de exposição individual · Seguido por 5 minutos
                      de Pergunta e Resposta
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-8 rounded-3xl text-center space-y-6 shadow-2xl">
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-widest text-[#14532D] font-bold">
                    Tempo Restante da Exposição
                  </div>
                  <div
                    className={`font-mono font-bold text-6xl sm:text-7xl tracking-tight p-4 rounded-2xl border ${timerStyle}`}
                  >
                    {timer.formatted}
                  </div>
                </div>

                <div className="pt-4 border-t border-[#D5C5AA]/15 flex items-center justify-center gap-3">
                  <div className="w-24 h-24 p-1.5 bg-white rounded-xl shadow-xs shrink-0">
                    <img
                      src="/api/qr"
                      alt="QR"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-left text-xs text-[#D5C5AA]/85 space-y-1">
                    <strong className="block text-[#F7DECA]">
                      {activeTopic.number === 5 &&
                      activePoll?.status === "OPEN"
                        ? "Envie sua pergunta e vote na questão da Mesa-Redonda!"
                        : "Envie sua pergunta para esta pauta pelo QR Code"}
                    </strong>
                    <span>
                      1 pergunta será selecionada pela mediação para os 5
                      minutos finais.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* 5. TELA DE PERGUNTA E RESPOSTA (5 min · Plateia ou Mediação) */}
        {currentMode === "SELECTED_QUESTION" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-8 space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-bold uppercase tracking-wider">
                  <MessageSquare className="w-4 h-4" />
                  {selectedQuestion?.originLabel || "Pergunta Selecionada"} · 5
                  Minutos
                </span>
                <span className="text-sm text-[#D5C5AA]/80">
                  Pauta {selectedQuestion?.topicNumber || activeTopic?.number}:{" "}
                  <strong className="text-[#F7DECA]">
                    {activeTopic?.mainSpeaker.name ||
                      activeStep?.responsibleName}
                  </strong>
                </span>
              </div>

              <div className="border-2 border-[#14532D] bg-[#0A150D]/95 p-8 sm:p-10 rounded-3xl shadow-2xl relative">
                <span className="text-6xl sm:text-7xl text-[#14532D]/40 font-serif absolute top-3 left-5 pointer-events-none">
                  “
                </span>
                <p className="font-display text-2xl sm:text-4xl text-[#F7DECA] leading-relaxed relative z-10">
                  {selectedQuestion?.text ||
                    "Pergunta em apresentação pelo mediador para resposta do especialista."}
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs sm:text-sm text-[#D5C5AA]/80">
                <span className="px-3 py-1 rounded-full bg-[#0A150D] border border-[#D5C5AA]/25 text-[#F7DECA] font-semibold">
                  Origem:{" "}
                  {selectedQuestion?.isMediationReserve
                    ? "Pergunta da Mediação"
                    : "Pergunta enviada pela Plateia"}
                </span>
                <span>
                  Respondendo:{" "}
                  <strong className="text-[#F7DECA]">
                    {activeTopic?.mainSpeaker.name ||
                      activeStep?.responsibleName}
                  </strong>
                </span>
              </div>
            </div>

            <div className="lg:col-span-4 border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-8 rounded-3xl text-center space-y-4 shadow-2xl">
              <div className="text-xs uppercase tracking-widest text-[#14532D] font-bold">
                Tempo de Pergunta e Resposta
              </div>
              <div
                className={`font-mono font-bold text-6xl sm:text-7xl tracking-tight p-4 rounded-2xl border ${timerStyle}`}
              >
                {timer.formatted}
              </div>
              <div className="text-xs text-[#D5C5AA]/75">
                Fase de 5 minutos dedicada à resposta do especialista.
              </div>
            </div>
          </div>
        )}

        {/* 6. TELA DE VOTAÇÃO ABERTA PARA A MESA-REDONDA */}
        {currentMode === "POLL_OPEN" && activePoll && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-8 space-y-6">
              <div className="flex items-center gap-3">
                <span className="px-4 py-1.5 rounded-full bg-[#14532D] text-white text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Vote className="w-4 h-4" />
                  {activePoll.isTieBreak
                    ? "Rodada Rápida de Desempate (2 Minutos)"
                    : "Votação Oficial do Público · Escolha a Questão da Mesa-Redonda"}
                </span>
              </div>

              <h1 className="font-display text-3xl sm:text-5xl text-[#F7DECA] leading-snug">
                {activePoll.question}
              </h1>

              <div className="space-y-3.5 pt-2">
                {activePoll.options
                  .filter(
                    (opt) =>
                      !activePoll.isTieBreak ||
                      !activePoll.tieBreakOptionIds?.length ||
                      activePoll.tieBreakOptionIds.includes(opt.id)
                  )
                  .map((opt) => (
                    <div
                      key={opt.id}
                      className="border border-[#D5C5AA]/25 bg-[#0A150D]/85 p-5 rounded-2xl space-y-1.5"
                    >
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        {opt.themeLabel || `Questão ${opt.optionOrder}`}
                      </div>
                      <div className="text-base sm:text-lg font-medium text-[#F7DECA] leading-relaxed">
                        &ldquo;{opt.label}&rdquo;
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="lg:col-span-4 border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-8 rounded-3xl text-center space-y-6 shadow-2xl">
              <div className="w-56 h-56 mx-auto p-3 bg-white rounded-2xl shadow-inner border border-slate-200">
                <img
                  src="/api/qr"
                  alt="QR Code de Votação"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="space-y-1">
                <div className="text-sm sm:text-base text-[#F7DECA] font-bold">
                  Vote agora pelo seu celular
                </div>
                <div className="text-xs text-[#D5C5AA]/75">
                  A questão mais votada será debatida pelos 5 especialistas na
                  Mesa-Redonda.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7. TELA DE TRANSIÇÃO / RESULTADO OFICIAL DA VOTAÇÃO */}
        {(currentMode === "POLL_RESULTS" || currentMode === "TRANSITION") &&
          activePoll && (
            <div className="space-y-7 max-w-5xl mx-auto">
              <div className="text-center space-y-2">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-bold uppercase tracking-wider">
                  <BarChart2 className="w-4 h-4" />
                  Resultado Oficial da Votação · Questão Escolhida para a
                  Mesa-Redonda
                </span>
                <h1 className="font-display text-3xl sm:text-4xl text-[#F7DECA]">
                  {activePoll.question}
                </h1>
                <div className="text-xs sm:text-sm text-[#D5C5AA]/80">
                  Total de votos computados:{" "}
                  <strong className="text-emerald-400 font-mono text-base">
                    {activePoll.totalVotes ?? 0}
                  </strong>
                </div>
              </div>

              <div className="space-y-3.5">
                {activePoll.options.map((opt) => {
                  const pct = opt.percentage ?? 0;
                  const isWinner = opt.isWinner;
                  return (
                    <div
                      key={opt.id}
                      className={`border p-5 rounded-2xl space-y-2 shadow-lg ${
                        isWinner
                          ? "border-2 border-amber-400 bg-amber-950/20"
                          : "border-[#D5C5AA]/25 bg-[#0A150D]/90"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                            {opt.themeLabel || `Questão ${opt.optionOrder}`}
                          </span>
                          {isWinner && (
                            <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1">
                              <Trophy className="w-3.5 h-3.5" />
                              QUESTÃO VENCEDORA
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-bold text-xl text-[#F7DECA] shrink-0">
                          {pct}%{" "}
                          <span className="text-xs text-[#D5C5AA]/70 font-normal">
                            ({opt.votesCount ?? 0} votos)
                          </span>
                        </span>
                      </div>

                      <p className="text-sm sm:text-base font-medium text-[#F7DECA]">
                        &ldquo;{opt.label}&rdquo;
                      </p>

                      <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden border border-[#D5C5AA]/15">
                        <div
                          className={`h-full transition-all duration-1000 ease-out ${
                            isWinner
                              ? "bg-amber-400"
                              : "bg-gradient-to-r from-[#14532D] to-emerald-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        {/* 8. TELA DE MESA-REDONDA (20 min · Questão Vencedora em Destaque + 5 Especialistas) */}
        {(currentMode === "ROUNDTABLE" ||
          currentMode === "COLLECTIVE_BUILDING") && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-8 space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#14532D] text-white text-xs sm:text-sm font-bold uppercase tracking-wider">
                  <Users className="w-4 h-4" />
                  Mesa-Redonda Oficial (20 Minutos)
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold">
                  <Trophy className="w-3.5 h-3.5" />
                  Questão Escolhida pelo Público
                </span>
              </div>

              <div className="border-2 border-[#14532D] bg-[#0A150D]/95 p-7 sm:p-9 rounded-3xl shadow-2xl space-y-3">
                <div className="text-xs uppercase tracking-widest text-emerald-400 font-bold">
                  Questão Central em Debate
                </div>
                <h1 className="font-display text-2xl sm:text-4xl text-[#F7DECA] leading-relaxed">
                  &ldquo;
                  {activePoll?.winningQuestionText ||
                    activePoll?.options.find((o) => o.isWinner)?.label ||
                    activePoll?.options[0]?.label ||
                    "Como transformar a economia da solidão em uma economia da conexão?"}
                  &rdquo;
                </h1>
              </div>

              {/* Os 5 Especialistas na Mesa-Redonda */}
              <div className="space-y-2">
                <span className="text-xs uppercase tracking-wider text-[#D5C5AA]/75 font-semibold block">
                  Especialistas na Mesa-Redonda (Sob condução da Mediação):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {(speakers.length > 0
                    ? speakers
                    : [
                        { id: "1", name: "Paula", photoUrl: "/img/Dulcila.jpeg" },
                        { id: "2", name: "Daniel", photoUrl: "/img/Daniel.jpeg" },
                        { id: "3", name: "Janaína", photoUrl: "/img/Janaina.jpeg" },
                        {
                          id: "4",
                          name: "Denilson Carneiro",
                          photoUrl: "/img/Denilson.png",
                        },
                        {
                          id: "5",
                          name: "Sérgio Passos",
                          photoUrl: "/img/Sergio.jpeg",
                        },
                      ]
                  ).map((sp) => (
                    <div
                      key={sp.id}
                      className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-3 rounded-2xl flex items-center gap-2.5"
                    >
                      {sp.photoUrl && (
                        <img
                          src={sp.photoUrl}
                          alt={sp.name}
                          className="w-10 h-10 rounded-xl object-cover border border-[#D5C5AA]/30 shrink-0"
                        />
                      )}
                      <span className="font-bold text-xs text-[#F7DECA] leading-tight">
                        {sp.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-8 rounded-3xl text-center space-y-6 shadow-2xl">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-widest text-[#14532D] font-bold">
                  Tempo da Mesa-Redonda
                </div>
                <div
                  className={`font-mono font-bold text-6xl sm:text-7xl tracking-tight p-4 rounded-2xl border ${timerStyle}`}
                >
                  {timer.formatted}
                </div>
              </div>
              <p className="text-xs text-[#D5C5AA]/80">
                Debate coletivo entre Paula, Daniel, Janaína, Denilson Carneiro
                e Sérgio Passos sob condução do mediador.
              </p>
            </div>
          </div>
        )}

        {/* 9. TELA DE ENCERRAMENTO */}
        {currentMode === "CLOSING" && (
          <div className="space-y-8 max-w-4xl mx-auto text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#14532D] text-white text-xs sm:text-sm font-bold uppercase tracking-wider">
              Etapa 10 · Encerramento Oficial
            </span>
            <h1 className="font-display text-5xl sm:text-7xl text-[#F7DECA]">
              Agradecemos a Sua Participação!
            </h1>
            <p className="text-lg sm:text-2xl text-[#D5C5AA]/85 max-w-2xl mx-auto leading-relaxed">
              O encontro <strong>A Nova Moeda</strong> foi
              construído coletivamente com as perguntas e a escolha da plateia.
            </p>
            <div className="pt-6 border-t border-[#D5C5AA]/20 text-sm sm:text-base text-[#D5C5AA]/70">
              Universidade Estadual de Feira de Santana (UEFS) · A Nova Moeda
            </div>
          </div>
        )}

        {/* 10. TELA DE CONTINGÊNCIA TÉCNICA / AVISO OPERACIONAL */}
        {(currentMode === "CONTINGENCY" ||
          currentMode === "OPERATIONAL_NOTICE") && (
          <div className="space-y-8 max-w-4xl mx-auto text-center">
            {ls?.emergencyActive || currentMode === "CONTINGENCY" ? (
              <div className="border-2 border-[#D5C5AA]/40 bg-[#0A150D]/95 p-10 sm:p-14 rounded-3xl space-y-6 shadow-2xl">
                <div className="w-16 h-16 mx-auto rounded-full bg-[#14532D] text-[#F7DECA] flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h1 className="font-display text-4xl sm:text-5xl text-[#F7DECA]">
                  A Nova Moeda
                </h1>
                <p className="text-xl sm:text-2xl text-[#D5C5AA] leading-relaxed font-medium">
                  {ls?.emergencyMessage ||
                    "Estamos realizando um breve ajuste técnico. A programação continuará em instantes."}
                </p>
              </div>
            ) : screenMessage ? (
              <div className="border-2 border-amber-500 bg-[#0A150D]/95 p-8 sm:p-14 rounded-3xl space-y-6 shadow-2xl">
                <span className="inline-block px-4 py-1.5 rounded-full bg-amber-500 text-slate-950 text-xs sm:text-sm font-bold uppercase tracking-wider">
                  Comunicado da Organização
                </span>
                <h1 className="font-display text-4xl sm:text-6xl text-[#F7DECA]">
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

      {/* Rodapé da ARENA: Indicador permanente de PRÓXIMA ETAPA (§3) */}
      <footer className="border-t border-[#D5C5AA]/20 pt-4 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-[#D5C5AA]/75">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-md bg-[#14532D]/40 border border-[#14532D] text-[#F7DECA] font-bold uppercase tracking-wider text-xs flex items-center gap-1">
            <span>Próxima Etapa</span>
            <ArrowRight className="w-3 h-3" />
          </span>
          <strong className="text-[#F7DECA]">
            {nextStep
              ? `${nextStep.title} · ${nextStep.responsibleName}`
              : "Encerramento Oficial"}
          </strong>
        </div>

        <div className="flex items-center gap-4">
          {ls?.questionsOpen && activeTopic && (
            <span className="text-emerald-400 font-semibold">
              ● Envio de perguntas aberto para a Pauta {activeTopic.number}
            </span>
          )}
          {activePoll?.status === "OPEN" && (
            <span className="text-amber-300 font-semibold">
              ● Votação da Mesa-Redonda aberta no QR Code
            </span>
          )}
          <span>UEFS · A Nova Moeda</span>
        </div>
      </footer>
    </main>
  );
}
