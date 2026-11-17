"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useArenaSync } from "@/hooks/use-arena-sync";
import { ARENA_MODE_LABELS, EVENT_STATUS_LABELS } from "@/lib/events";
import {
  Activity,
  Clock,
  ExternalLink,
  MonitorPlay,
  Smartphone,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

export function AdminStatusStrip() {
  const pathname = usePathname();
  const { snapshot, timer, connected } = useArenaSync({ isAdmin: true });
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  if (pathname?.startsWith("/admin/login")) {
    return null;
  }

  const ls = snapshot?.liveState;
  const isLive = ls?.status === "LIVE";
  const isPaused = ls?.status === "PAUSED";

  const activeStep = snapshot?.activeStep;
  const activeTopic = snapshot?.activeTopic;

  const timerColor =
    timer.alertLevel === "EXPIRED"
      ? "text-red-400 border-red-500/40 bg-red-950/30 animate-pulse"
      : timer.alertLevel === "CRITICAL_30S"
        ? "text-amber-400 border-amber-500/30 bg-amber-950/20"
        : timer.alertLevel === "WARNING_2MIN"
          ? "text-amber-300 border-amber-300/20 bg-amber-950/10"
          : "text-[#F7DECA] border-white/[0.08] bg-[#050C07]";

  return (
    <>
      <header className="relative h-12 bg-[#030A06]/80 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between text-xs select-none z-30">
        {/* Esquerda: Status ao vivo + Etapa Atual — tipografia editorial, sem pílulas */}
        <div className="flex items-center gap-4 min-w-0">
          <span className="flex items-center gap-2 shrink-0">
            <span className="relative flex h-2 w-2">
              {isLive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isLive
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
                    : isPaused
                      ? "bg-amber-400"
                      : "bg-slate-500"
                }`}
              />
            </span>
            <span
              className={`text-[10px] uppercase tracking-[0.26em] font-bold ${
                isLive ? "text-[#F7DECA]" : isPaused ? "text-amber-300" : "text-[#D5C5AA]/60"
              }`}
            >
              {isLive ? "Ao Vivo" : isPaused ? "Pausado" : "Aguardando"}
            </span>
          </span>

          <div className="h-5 w-[1px] bg-gradient-to-b from-transparent via-white/20 to-transparent shrink-0" />

          {/* Etapa Ativa */}
          <div className="flex items-center gap-2 truncate text-[11px]">
            {activeTopic ? (
              <span className="text-[#F7DECA] font-medium truncate">
                <span className="text-emerald-400 font-mono font-bold tracking-wider mr-2">
                  P0{activeTopic.number}
                </span>
                <strong className="font-semibold">{activeTopic.mainSpeaker.name}</strong>{" "}
                <span className="hidden sm:inline text-[#D5C5AA]/55">— {activeTopic.title}</span>
              </span>
            ) : activeStep ? (
              <span className="text-[#F7DECA] font-medium truncate">
                {activeStep.title}{" "}
                {activeStep.responsibleName && (
                  <span className="text-[#D5C5AA]/55 font-normal">({activeStep.responsibleName})</span>
                )}
              </span>
            ) : (
              <span className="text-[#D5C5AA]/60 truncate">
                {snapshot?.event?.name || "A Nova Moeda"}
              </span>
            )}
          </div>
        </div>

        {/* Direita: Cronômetro tabular + Conexão */}
        <div className="flex items-center gap-5 shrink-0">
          <span
            className={`font-mono font-bold tabular-nums text-sm tracking-tight ${
              timer.alertLevel === "EXPIRED"
                ? "text-red-400 animate-pulse"
                : timer.alertLevel === "CRITICAL_30S"
                  ? "text-amber-400"
                  : timer.alertLevel === "WARNING_2MIN"
                    ? "text-amber-300"
                    : "text-[#F7DECA]"
            }`}
          >
            {timer.formatted}
          </span>

          <button
            type="button"
            onClick={() => setShowDiagnostic(true)}
            className={`flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] font-semibold transition cursor-pointer ${
              connected
                ? "text-[#D5C5AA]/60 hover:text-[#F7DECA]"
                : "text-red-300 animate-pulse"
            }`}
            title="Diagnóstico de Rede do Servidor"
          >
            {connected ? (
              <>
                <Wifi className="w-3 h-3 text-emerald-400" />
                <span className="hidden md:inline">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-red-400" />
                <span>Reconectando</span>
              </>
            )}
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-emerald-400/45 via-white/[0.1] to-emerald-400/20" />
      </header>

      {/* Popover / Modal de Diagnóstico Técnico */}
      {showDiagnostic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none">
          <div className="w-full max-w-sm border border-white/[0.12] bg-[#0A120D] p-5 rounded-2xl space-y-3.5 shadow-2xl text-xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="font-semibold text-sm text-[#F7DECA]">
                  Diagnóstico Técnico
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDiagnostic(false)}
                className="p-1 rounded-lg text-[#D5C5AA]/60 hover:text-[#F7DECA] hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-[11px]">
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#050C07] border border-white/[0.06]">
                <span className="text-[#D5C5AA]/70">Sincronização:</span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <Wifi className="w-3 h-3" />
                  {connected ? "SSE Ativo (Fallback 2s)" : "Reconectando..."}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#050C07] border border-white/[0.06]">
                <span className="text-[#D5C5AA]/70">Versão do Estado:</span>
                <span className="font-mono text-[#F7DECA]">
                  seq #{snapshot?.seq ?? 0}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#050C07] border border-white/[0.06]">
                <span className="text-[#D5C5AA]/70">Modo Telão:</span>
                <span className="font-medium text-[#F7DECA]">
                  {ls ? ARENA_MODE_LABELS[ls.arenaMode] : "—"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-[#050C07] border border-white/[0.06]">
                <span className="text-[#D5C5AA]/70">Participantes Ativos:</span>
                <span className="font-mono text-emerald-400 font-semibold">
                  {snapshot?.metrics?.connectedParticipants ?? 0}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.06] flex justify-end">
              <button
                type="button"
                onClick={() => setShowDiagnostic(false)}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
