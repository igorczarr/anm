"use client";

import { useArenaSync } from "@/hooks/use-arena-sync";
import { ARENA_MODE_LABELS } from "@/lib/events";
import { Clock, QrCode, Radio, Wifi, WifiOff } from "lucide-react";

export default function ArenaScreenPage() {
  const { snapshot, timer, connected } = useArenaSync({ isArenaScreen: true });

  return (
    <div className="min-h-[85vh] max-w-7xl mx-auto px-6 py-10 flex flex-col justify-between gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D5C5AA]/20 pb-4">
        <div className="flex items-center gap-3">
          <img src="/icon.svg" alt="A Nova Moeda" className="w-10 h-10 rounded-xl" />
          <div>
            <div className="font-display text-lg text-[#F7DECA]">
              {snapshot?.event.name || "A Nova Moeda"} ·{" "}
              {snapshot?.event.theme || "Economia da Solidão"}
            </div>
            <div className="text-xs text-[#D5C5AA]/75">
              {snapshot?.event.institution ||
                "Universidade Estadual de Feira de Santana (UEFS)"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="px-3 py-1 rounded-full bg-emerald-950/30 text-emerald-300 font-semibold flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5" />
            {snapshot?.liveState
              ? ARENA_MODE_LABELS[snapshot.liveState.arenaMode]
              : "Sincronizando..."}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-mono">
            {connected ? (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <Wifi className="w-3.5 h-3.5" /> seq #{snapshot?.seq ?? 1}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-700">
                <WifiOff className="w-3.5 h-3.5" /> Reconectando...
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-auto">
        <div className="lg:col-span-8 space-y-4">
          <span className="inline-block px-3 py-1 rounded-full bg-[#14532D] text-white text-xs font-bold uppercase tracking-wider">
            {snapshot?.activeStep?.title || "Tela de Espera · Abertura em breve"}
          </span>
          <h1 className="font-display text-4xl sm:text-6xl text-[#F7DECA] leading-tight">
            {snapshot?.activeTopic
              ? `Pauta ${snapshot.activeTopic.number}: ${snapshot.activeTopic.title}`
              : `${snapshot?.event.name || "A Nova Moeda"} — ${
                  snapshot?.event.theme || "Economia da Solidão"
                }`}
          </h1>
          <p className="text-base sm:text-lg text-[#D5C5AA]/85">
            {snapshot?.activeTopic
              ? `Palestrante: ${snapshot.activeTopic.mainSpeaker.name} · Provocação: ${snapshot.activeTopic.provokerLabel}`
              : "Acesse pelo celular e participe da Arena enviando perguntas e votando em tempo real."}
          </p>
        </div>

        <div className="lg:col-span-4 border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 rounded-2xl text-center space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#14532D]">
            <Clock className="w-4 h-4" />
            <span>Cronômetro Sincronizado</span>
          </div>
          <div className="font-mono font-bold text-5xl text-[#F7DECA]">
            {timer.formatted}
          </div>
          <div className="pt-3 border-t border-[#D5C5AA]/15 flex items-center justify-center gap-2 text-xs text-[#D5C5AA]/80">
            <QrCode className="w-4 h-4 text-[#14532D]" />
            <span>Acesse /participar pelo celular</span>
          </div>
        </div>
      </div>
    </div>
  );
}
