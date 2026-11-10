"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useArenaSync } from "@/hooks/use-arena-sync";
import {
  ARENA_MODE_LABELS,
  formatSecondsMMSS,
} from "@/lib/events";
import {
  AlertTriangle,
  BarChart2,
  CheckCircle2,
  Clock,
  HelpCircle,
  Maximize2,
  MessageSquare,
  Mic,
  QrCode,
  Radio,
  Sparkles,
  Users,
  Vote,
  WifiOff,
} from "lucide-react";

export function ArenaScreen() {
  const searchParams = useSearchParams();
  const isStageMonitor = searchParams.get("modo") === "palco";

  const { snapshot, timer, connected } = useArenaSync({ isArenaScreen: true });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Ativa/desativa tela cheia no navegador (F11 ou botão discreto)
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
  const activePoll = snapshot?.activePoll;
  const selectedQuestion = snapshot?.selectedQuestion;
  const screenMessage = snapshot?.screenMessage;

  const currentMode = useMemo(() => {
    if (ls?.emergencyActive) return "OPERATIONAL_NOTICE";
    return ls?.arenaMode || "WAITING";
  }, [ls?.emergencyActive, ls?.arenaMode]);

  const showTimer = isStageMonitor || (ls?.showTimerOnArena ?? true);

  // Alerta de cores do cronômetro
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

  // Se for o MODO MONITOR DE PALCO (§7.4)
  if (isStageMonitor) {
    return (
      <main className="relative min-h-screen w-full bg-[#030A06] text-[#F7DECA] flex flex-col justify-between p-8 sm:p-14 select-none">
        {/* Banner de Reconexão se houver oscilação de rede (§14.1) */}
        {!connected && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-2 rounded-full bg-red-950/90 border border-red-500/60 text-red-200 text-sm font-semibold flex items-center gap-2 shadow-xl backdrop-blur-md">
            <WifiOff className="w-4 h-4 animate-spin" />
            <span>Tentando reconectar... (horário preservado no servidor)</span>
          </div>
        )}

        {/* Topo do Palco */}
        <header className="flex items-center justify-between border-b border-[#D5C5AA]/20 pb-6">
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-[0.25em] text-[#14532D] font-bold">
              Monitor de Apoio de Palco · Arena UEFS
            </span>
            <h1 className="font-display text-2xl sm:text-3xl text-[#F7DECA]">
              {activeTopic
                ? `Pauta ${activeTopic.number} — ${activeTopic.title}`
                : "A Nova Moeda · Economia da Solidão"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-xs text-[#D5C5AA]/70 block">Modo Atual</span>
              <span className="text-sm font-bold text-emerald-400">
                {ARENA_MODE_LABELS[currentMode]}
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

        {/* Centro do Palco: Cronômetro Gigante & Responsável */}
        <div className="my-auto text-center space-y-8">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-sm font-semibold uppercase tracking-wider">
              <Mic className="w-4 h-4" />
              Com a palavra: {activeStep?.responsibleName || "Palestrante"}
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
                TEMPO REGULAMENTAR ENCERRADO
              </div>
            )}
          </div>
        </div>

        {/* Rodapé do Palco */}
        <footer className="border-t border-[#D5C5AA]/20 pt-6 flex flex-wrap items-center justify-between gap-4 text-sm text-[#D5C5AA]/80">
          <div>
            Próxima etapa:{" "}
            <strong className="text-[#F7DECA]">
              {snapshot?.nextStep?.title || "Encerramento"}
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
              Votos registrados:{" "}
              <strong className="text-emerald-400">
                {snapshot?.metrics.activePollVotes ?? 0}
              </strong>
            </span>
          </div>
        </footer>
      </main>
    );
  }

  // TELÃO PÚBLICO DA ARENA (16:9 — PROJEÇÃO PRINCIPAL)
  return (
    <main className="relative min-h-screen w-full bg-[#030A06] text-[#F7DECA] flex flex-col justify-between p-6 sm:p-12 overflow-hidden select-none">
      {/* Botão sutil de Tela Cheia no canto inferior direito */}
      <button
        onClick={toggleFullscreen}
        className="absolute bottom-4 right-4 z-40 p-2.5 rounded-xl border border-[#D5C5AA]/20 bg-[#030A06]/80 text-[#D5C5AA]/60 hover:text-white hover:border-[#D5C5AA]/60 transition opacity-30 hover:opacity-100"
        title="Alternar Tela Cheia (F11)"
      >
        <Maximize2 className="w-4 h-4" />
      </button>

      {/* Alerta Discreto de Perda de Conexão com Recuperação Automática (§14.1) */}
      {!connected && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-2 rounded-full bg-red-950/90 border border-red-500/60 text-red-200 text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-2xl backdrop-blur-md animate-pulse">
          <WifiOff className="w-4 h-4" />
          <span>Tentando reconectar... (exibindo última sincronização válida)</span>
        </div>
      )}

      {/* Cabeçalho da ARENA: Identidade Visual & Instituição */}
      <header className="flex items-center justify-between border-b border-[#D5C5AA]/20 pb-5">
        <div className="flex items-center gap-4">
          <img
            src="/icon.svg"
            alt="A Nova Moeda"
            className="w-12 h-12 rounded-2xl shadow-lg border border-[#D5C5AA]/20"
          />
          <div>
            <div className="font-display text-xl sm:text-2xl text-[#F7DECA] tracking-tight">
              A Nova Moeda —{" "}
              <span className="font-editorial italic font-normal text-[#D5C5AA]">
                Economia da Solidão
              </span>
            </div>
            <div className="text-xs sm:text-sm text-[#D5C5AA]/70 flex items-center gap-2">
              <span>{snapshot?.event.institution || "UEFS"}</span>
              <span>·</span>
              <span>Arena de Debate</span>
            </div>
          </div>
        </div>

        {/* Indicador de Status / Cronômetro Compacto no Cabeçalho se o modo não tiver cronômetro central */}
        <div className="flex items-center gap-4">
          {showTimer && currentMode !== "SPEAKER_EXPOSITION" && currentMode !== "PROVOCATION" && currentMode !== "REBUTTAL" && currentMode !== "COLLECTIVE_BUILDING" && (
            <div className={`px-4 py-1.5 rounded-2xl border font-mono font-bold text-lg sm:text-xl flex items-center gap-2 ${timerStyle}`}>
              <Clock className="w-4 h-4 text-[#14532D]" />
              <span>{timer.formatted}</span>
            </div>
          )}

          <div className="px-3 py-1 rounded-full bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 text-xs font-semibold flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5" />
            <span>AO VIVO</span>
          </div>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL (ALTERNÂNCIA DINÂMICA ENTRE OS 13 MODOS) */}
      <div className="my-auto py-8">
        {/* 1. TELA DE ESPERA (§7.2) */}
        {currentMode === "WAITING" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-8 space-y-6">
              <span className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-semibold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                Abertura em Breve
              </span>
              <h1 className="font-display text-5xl sm:text-7xl text-[#F7DECA] leading-tight">
                A Nova Moeda — <br />
                <span className="font-editorial italic font-normal">
                  Economia da Solidão
                </span>
              </h1>
              <p className="text-lg sm:text-2xl text-[#D5C5AA]/85 max-w-2xl leading-relaxed">
                Um debate conduzido por ideias, organizado por tecnologia e construído coletivamente.
              </p>
              {snapshot?.event.scheduledStartAt && (
                <div className="text-sm sm:text-base text-[#D5C5AA]/70 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#14532D]" />
                  <span>
                    Início previsto para{" "}
                    <strong>
                      {new Date(snapshot.event.scheduledStartAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </strong>
                  </span>
                </div>
              )}
            </div>

            <div className="lg:col-span-4 border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-8 rounded-3xl text-center space-y-4 shadow-2xl">
              <div className="text-xs uppercase tracking-widest text-[#14532D] font-bold">
                Participe da Arena
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
                  Aponte a câmera do celular
                </div>
                <div className="text-xs text-[#D5C5AA]/70">
                  Envie perguntas e vote em tempo real sem baixar nenhum aplicativo.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. TELA DE ABERTURA (§3.2 item 2) */}
        {currentMode === "OPENING" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-8 space-y-6">
              <span className="inline-block px-4 py-1.5 rounded-full bg-[#14532D] text-white text-xs sm:text-sm font-bold uppercase tracking-wider">
                Abertura Oficial
              </span>
              <h1 className="font-display text-4xl sm:text-6xl text-[#F7DECA] leading-tight">
                {activeStep?.title || "Abertura e explicação da dinâmica"}
              </h1>
              <p className="text-lg sm:text-xl text-[#D5C5AA]/85 max-w-2xl leading-relaxed">
                Bem-vindos à Arena A Nova Moeda. Durante os próximos 131 minutos, percorreremos 6 pautas temáticas com apresentações, provocações, réplicas, votações interativas e participação direta da plateia.
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
                Conecte-se pelo QR Code para interagir durante todo o evento
              </div>
            </div>
          </div>
        )}

        {/* 3. TELA DE PAUTA EM ANDAMENTO (§7.3) */}
        {currentMode === "TOPIC_OVERVIEW" && activeTopic && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-8 space-y-6">
              <div className="flex items-center gap-3">
                <span className="px-3.5 py-1 rounded-full bg-[#14532D] text-white text-sm font-bold">
                  Pauta {activeTopic.number}
                </span>
                <span className="text-sm font-semibold text-[#D5C5AA]/80">
                  Etapa: {activeStep?.title || "Transição"}
                </span>
              </div>
              <h1 className="font-display text-4xl sm:text-6xl text-[#F7DECA] leading-snug">
                {activeTopic.title}
              </h1>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#D5C5AA]/15 text-sm sm:text-base">
                <div className="flex items-center gap-3 border border-[#D5C5AA]/15 bg-[#0A150D]/60 p-4 rounded-2xl">
                  {activeTopic.mainSpeaker.photoUrl && (
                    <img
                      src={activeTopic.mainSpeaker.photoUrl}
                      alt={activeTopic.mainSpeaker.name}
                      className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                  )}
                  <div>
                    <span className="text-xs uppercase tracking-wider text-[#D5C5AA]/70 block">
                      Palestrante
                    </span>
                    <strong className="text-lg text-[#F7DECA]">
                      {activeTopic.mainSpeaker.name}
                    </strong>
                    <div className="text-xs text-[#D5C5AA]/75">
                      {activeTopic.mainSpeaker.roleTitle}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 border border-[#D5C5AA]/15 bg-[#0A150D]/60 p-4 rounded-2xl">
                  {activeTopic.provoker?.photoUrl ? (
                    <img
                      src={activeTopic.provoker.photoUrl}
                      alt={activeTopic.provoker.name}
                      className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0">
                      <Users className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <span className="text-xs uppercase tracking-wider text-[#D5C5AA]/70 block">
                      Provocador(a)
                    </span>
                    <strong className="text-lg text-[#F7DECA]">
                      {activeTopic.provokerLabel}
                    </strong>
                    <div className="text-xs text-[#D5C5AA]/75">
                      {activeTopic.provoker?.roleTitle || "Participação coletiva"}
                    </div>
                  </div>
                </div>
              </div>
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
                Envie perguntas e prepare-se para a votação desta pauta
              </div>
            </div>
          </div>
        )}

        {/* 4. TELA DE EXPOSIÇÃO DO PALESTRANTE (§3.2 item 4) */}
        {currentMode === "SPEAKER_EXPOSITION" && activeTopic && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-8 space-y-6">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#14532D] text-white text-xs sm:text-sm font-bold uppercase tracking-wider">
                <Mic className="w-4 h-4" />
                Exposição Principal · Pauta {activeTopic.number}
              </span>
              <h1 className="font-display text-4xl sm:text-6xl text-[#F7DECA] leading-snug">
                {activeTopic.title}
              </h1>

              <div className="flex items-center gap-5 border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-6 rounded-3xl">
                {activeTopic.mainSpeaker.photoUrl && (
                  <img
                    src={activeTopic.mainSpeaker.photoUrl}
                    alt={activeTopic.mainSpeaker.name}
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border-2 border-[#D5C5AA]/40 shadow-xl"
                  />
                )}
                <div className="space-y-1">
                  <span className="text-xs uppercase tracking-wider text-[#14532D] font-bold">
                    Palestrante
                  </span>
                  <div className="font-display text-3xl sm:text-4xl text-[#F7DECA]">
                    {activeTopic.mainSpeaker.name}
                  </div>
                  <div className="text-sm text-[#D5C5AA]/85">
                    {activeTopic.mainSpeaker.roleTitle}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-8 rounded-3xl text-center space-y-6 shadow-2xl">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-widest text-[#14532D] font-bold">
                  Tempo Restante
                </div>
                <div className={`font-mono font-bold text-6xl sm:text-7xl tracking-tight p-4 rounded-2xl border ${timerStyle}`}>
                  {timer.formatted}
                </div>
              </div>

              <div className="pt-4 border-t border-[#D5C5AA]/15 flex items-center justify-center gap-3">
                <div className="w-20 h-20 p-1.5 bg-white rounded-xl shadow-xs shrink-0">
                  <img src="/api/qr" alt="QR" className="w-full h-full object-contain" />
                </div>
                <div className="text-left text-xs text-[#D5C5AA]/80">
                  Envie sua pergunta pelo celular enquanto o palestrante expõe.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. TELA DE PROVOCAÇÃO (§7.5) */}
        {currentMode === "PROVOCATION" && activeTopic && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-8 space-y-6">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500 text-slate-950 text-xs sm:text-sm font-bold uppercase tracking-wider shadow-lg">
                <Sparkles className="w-4 h-4" />
                Momento de Provocação (02:00)
              </span>
              <h1 className="font-display text-3xl sm:text-5xl text-[#F7DECA] leading-snug">
                {activeTopic.title}
              </h1>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4">
                <div className="border-2 border-amber-500/60 bg-[#0A150D] p-6 rounded-3xl space-y-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                    Provocador(a) com a palavra
                  </span>
                  <div className="font-display text-2xl sm:text-3xl text-[#F7DECA]">
                    {activeTopic.provokerLabel}
                  </div>
                  <p className="text-xs text-[#D5C5AA]/80">
                    Apresenta a pergunta ou desafio crítico da pauta.
                  </p>
                </div>

                <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 rounded-3xl space-y-3 opacity-80">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#D5C5AA]/70">
                    Responderá em seguida na Réplica
                  </span>
                  <div className="font-display text-2xl sm:text-3xl text-[#F7DECA]">
                    {activeTopic.mainSpeaker.name}
                  </div>
                  <p className="text-xs text-[#D5C5AA]/80">
                    Palestrante principal da pauta.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-8 rounded-3xl text-center space-y-6 shadow-2xl">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-widest text-amber-400 font-bold">
                  Tempo da Provocação
                </div>
                <div className={`font-mono font-bold text-6xl sm:text-7xl tracking-tight p-4 rounded-2xl border ${timerStyle}`}>
                  {timer.formatted}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. TELA DE RÉPLICA (§7.5) */}
        {currentMode === "REBUTTAL" && activeTopic && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-8 space-y-6">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#14532D] text-white text-xs sm:text-sm font-bold uppercase tracking-wider">
                <Mic className="w-4 h-4" />
                Momento de Réplica (02:00)
              </span>
              <h1 className="font-display text-3xl sm:text-5xl text-[#F7DECA] leading-snug">
                {activeTopic.title}
              </h1>

              <div className="border-2 border-[#14532D] bg-[#0A150D] p-6 rounded-3xl space-y-3 max-w-xl">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                  Palestrante com a palavra
                </span>
                <div className="font-display text-3xl text-[#F7DECA]">
                  {activeTopic.mainSpeaker.name}
                </div>
                <p className="text-sm text-[#D5C5AA]/85">
                  Respondendo às colocações trazidas por <strong>{activeTopic.provokerLabel}</strong>.
                </p>
              </div>
            </div>

            <div className="lg:col-span-4 border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-8 rounded-3xl text-center space-y-6 shadow-2xl">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-widest text-[#14532D] font-bold">
                  Tempo da Réplica
                </div>
                <div className={`font-mono font-bold text-6xl sm:text-7xl tracking-tight p-4 rounded-2xl border ${timerStyle}`}>
                  {timer.formatted}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7. TELA DE VOTAÇÃO ABERTA (§7.6 — sem contagem parcial ao público §6.2) */}
        {currentMode === "POLL_OPEN" && activePoll && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-8 space-y-6">
              <div className="flex items-center gap-3">
                <span className="px-3.5 py-1 rounded-full bg-[#14532D] text-white text-xs sm:text-sm font-bold uppercase tracking-wider">
                  Votação Aberta · Pauta {activePoll.number}
                </span>
                <span className="text-sm text-[#D5C5AA]/80">
                  Participe agora pelo seu celular
                </span>
              </div>

              <h1 className="font-display text-3xl sm:text-5xl text-[#F7DECA] leading-snug">
                {activePoll.question}
              </h1>

              <div className="space-y-3 pt-2">
                {activePoll.options.map((opt) => (
                  <div
                    key={opt.id}
                    className="border border-[#D5C5AA]/25 bg-[#0A150D]/80 p-4 sm:p-5 rounded-2xl flex items-center gap-4 text-base sm:text-lg font-medium text-[#F7DECA]"
                  >
                    <span className="w-8 h-8 rounded-xl bg-[#14532D] text-white font-bold flex items-center justify-center shrink-0">
                      {opt.optionOrder}
                    </span>
                    <span>{opt.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-4 border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-8 rounded-3xl text-center space-y-6 shadow-2xl">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-widest text-[#14532D] font-bold">
                  Tempo Restante para Votar
                </div>
                <div className={`font-mono font-bold text-6xl sm:text-7xl tracking-tight p-4 rounded-2xl border ${timerStyle}`}>
                  {timer.formatted}
                </div>
              </div>

              <div className="w-56 h-56 mx-auto p-3 bg-white rounded-2xl shadow-inner border border-slate-200">
                <img
                  src="/api/qr"
                  alt="QR Code de Votação"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="text-xs sm:text-sm text-[#F7DECA] font-semibold">
                Vote agora apontando a câmera para o QR Code
              </div>
            </div>
          </div>
        )}

        {/* 8. TELA DE RESULTADO DA VOTAÇÃO (§7.7 — barras animadas com % e votos consolidados §6.3) */}
        {currentMode === "POLL_RESULTS" && activePoll && (
          <div className="space-y-8 max-w-5xl mx-auto">
            <div className="text-center space-y-3">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-bold uppercase tracking-wider">
                <BarChart2 className="w-4 h-4" />
                Resultado Oficial da Votação · Pauta {activePoll.number}
              </span>
              <h1 className="font-display text-3xl sm:text-5xl text-[#F7DECA] leading-snug">
                {activePoll.question}
              </h1>
              <div className="text-sm sm:text-base text-[#D5C5AA]/80">
                Total de votos válidos computados:{" "}
                <strong className="text-emerald-400 font-mono text-lg">
                  {activePoll.totalVotes ?? 0}
                </strong>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              {activePoll.options.map((opt) => {
                const pct = opt.percentage ?? 0;
                return (
                  <div
                    key={opt.id}
                    className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-5 rounded-2xl space-y-2 shadow-lg"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-base sm:text-lg">
                      <span className="font-semibold text-[#F7DECA]">
                        <strong>{opt.optionOrder}.</strong> {opt.label}
                      </span>
                      <span className="font-mono font-bold text-xl text-emerald-400 shrink-0">
                        {pct}%{" "}
                        <span className="text-xs text-[#D5C5AA]/70 font-normal">
                          ({opt.votesCount ?? 0} votos)
                        </span>
                      </span>
                    </div>

                    <div className="w-full h-4 bg-slate-900 rounded-full overflow-hidden border border-[#D5C5AA]/15">
                      <div
                        className="h-full bg-gradient-to-r from-[#14532D] to-emerald-500 transition-all duration-1000 ease-out"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 9. TELA DE PERGUNTA SELECIONADA / VOZ DA PLATEIA (§7.8 e §5.6) */}
        {currentMode === "SELECTED_QUESTION" && (
          <div className="space-y-8 max-w-4xl mx-auto text-center">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm font-bold uppercase tracking-wider">
                <MessageSquare className="w-4 h-4" />
                Voz da Plateia · Pergunta do Público
              </span>
              <div className="text-sm sm:text-base text-[#D5C5AA]/80">
                Pauta {selectedQuestion?.topicNumber || activeTopic?.number || ""}:{" "}
                {selectedQuestion?.topicTitle || activeTopic?.title || ""}
              </div>
            </div>

            <div className="border-2 border-[#14532D] bg-[#0A150D]/95 p-8 sm:p-12 rounded-3xl shadow-2xl relative">
              <span className="text-6xl sm:text-8xl text-[#14532D]/40 font-serif absolute top-4 left-6 pointer-events-none">
                “
              </span>
              <p className="font-display text-2xl sm:text-4xl text-[#F7DECA] leading-relaxed relative z-10">
                {selectedQuestion?.text ||
                  "Aguardando liberação da pergunta selecionada pela curadoria..."}
              </p>
              <span className="text-6xl sm:text-8xl text-[#14532D]/40 font-serif absolute bottom-2 right-6 pointer-events-none">
                ”
              </span>
            </div>

            <div className="flex items-center justify-center gap-6 text-sm text-[#D5C5AA]/75">
              <span>Contribuição anônima enviada pela plateia</span>
              {showTimer && (
                <span className="font-mono font-bold text-emerald-400">
                  Tempo de resposta: {timer.formatted}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 10. TELA DE INTERVALO (§7.9) */}
        {currentMode === "INTERVAL" && (
          <div className="space-y-8 max-w-4xl mx-auto text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-amber-500 text-slate-950 text-xs sm:text-sm font-bold uppercase tracking-wider">
              Intervalo Técnico (05:00)
            </span>
            <h1 className="font-display text-5xl sm:text-7xl text-[#F7DECA]">
              Intervalo da Arena
            </h1>
            <p className="text-lg sm:text-xl text-[#D5C5AA]/85">
              Faremos uma breve pausa de 5 minutos antes de darmos início às Pautas 4, 5 e 6.
            </p>

            <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-8 rounded-3xl max-w-md mx-auto space-y-3">
              <div className="text-xs uppercase tracking-widest text-[#14532D] font-bold">
                Retorno em
              </div>
              <div className={`font-mono font-bold text-6xl tracking-tight p-4 rounded-2xl border ${timerStyle}`}>
                {timer.formatted}
              </div>
            </div>
          </div>
        )}

        {/* 11. TELA DE CONSTRUÇÃO COLETIVA — PAUTA 6 (§3.2 item 11 e §9.2) */}
        {currentMode === "COLLECTIVE_BUILDING" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-8 space-y-6">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#14532D] text-white text-xs sm:text-sm font-bold uppercase tracking-wider">
                <Users className="w-4 h-4" />
                Construção Coletiva · Pauta 6
              </span>
              <h1 className="font-display text-3xl sm:text-5xl text-[#F7DECA] leading-snug">
                Como transformar a economia da solidão em uma economia da conexão?
              </h1>

              <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/90 p-6 rounded-3xl space-y-2">
                <span className="text-xs uppercase tracking-wider text-emerald-400 font-bold">
                  Contribuição Individual
                </span>
                <div className="font-display text-3xl text-[#F7DECA]">
                  {activeStep?.responsibleName || "Palestrante"}
                </div>
                <p className="text-sm text-[#D5C5AA]/80">
                  {activeStep?.title || "Participação dos debatedores"}
                </p>
              </div>
            </div>

            <div className="lg:col-span-4 border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-8 rounded-3xl text-center space-y-6 shadow-2xl">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-widest text-[#14532D] font-bold">
                  Tempo da Fala
                </div>
                <div className={`font-mono font-bold text-6xl sm:text-7xl tracking-tight p-4 rounded-2xl border ${timerStyle}`}>
                  {timer.formatted}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 12. TELA DE ENCERRAMENTO (§7.9) */}
        {currentMode === "CLOSING" && (
          <div className="space-y-8 max-w-4xl mx-auto text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-[#14532D] text-white text-xs sm:text-sm font-bold uppercase tracking-wider">
              Encerramento
            </span>
            <h1 className="font-display text-5xl sm:text-7xl text-[#F7DECA]">
              Agradecemos a Sua Participação!
            </h1>
            <p className="text-lg sm:text-2xl text-[#D5C5AA]/85 max-w-2xl mx-auto leading-relaxed">
              A Arena A Nova Moeda foi construída coletivamente através das suas perguntas, votos e reflexões.
            </p>
            <div className="pt-6 border-t border-[#D5C5AA]/20 text-sm sm:text-base text-[#D5C5AA]/70">
              Universidade Estadual de Feira de Santana (UEFS) · Economia da Solidão
            </div>
          </div>
        )}

        {/* 13. TELA DE AVISO OPERACIONAL / MODO DE EMERGÊNCIA (§3.2 item 13 e §14.4) */}
        {currentMode === "OPERATIONAL_NOTICE" && (
          <div className="space-y-8 max-w-4xl mx-auto text-center">
            {ls?.emergencyActive ? (
              <div className="border-2 border-red-500 bg-red-950/40 p-8 sm:p-14 rounded-3xl space-y-6 shadow-2xl">
                <div className="w-16 h-16 mx-auto rounded-full bg-red-600 text-white flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h1 className="font-display text-4xl sm:text-6xl text-white">
                  Aviso da Organização
                </h1>
                <p className="text-xl sm:text-3xl text-red-200 leading-relaxed font-semibold">
                  {ls.emergencyMessage ||
                    "Estamos realizando um ajuste técnico. A Arena continuará em instantes."}
                </p>
              </div>
            ) : screenMessage ? (
              <div className="border-2 border-amber-500 bg-[#0A150D]/95 p-8 sm:p-14 rounded-3xl space-y-6 shadow-2xl">
                <span className="inline-block px-4 py-1.5 rounded-full bg-amber-500 text-slate-950 text-xs sm:text-sm font-bold uppercase tracking-wider">
                  Comunicado Operacional
                </span>
                <h1 className="font-display text-4xl sm:text-6xl text-[#F7DECA]">
                  {screenMessage.title}
                </h1>
                <p className="text-xl sm:text-3xl text-[#D5C5AA]/95 leading-relaxed">
                  {screenMessage.body}
                </p>
              </div>
            ) : (
              <div className="text-center text-lg text-[#D5C5AA]/70">
                Aviso operacional concluído.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rodapé da ARENA: Pauta Atual e QR Code Permanente durante etapas de participação (§7.3) */}
      <footer className="border-t border-[#D5C5AA]/20 pt-4 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-[#D5C5AA]/70">
        <div>
          {activeTopic ? (
            <span>
              Pauta {activeTopic.number}: <strong>{activeTopic.title}</strong>
            </span>
          ) : (
            <span>A Nova Moeda · UEFS</span>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-[#14532D]" />
            <span>Acesse /participar pelo celular</span>
          </div>
          <div>
            Participantes conectados:{" "}
            <strong className="text-emerald-400">
              {snapshot?.metrics.connectedParticipants ?? 0}
            </strong>
          </div>
        </div>
      </footer>
    </main>
  );
}
