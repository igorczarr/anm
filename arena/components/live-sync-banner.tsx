"use client";

import { usePathname } from "next/navigation";
import { useArenaSync } from "@/hooks/use-arena-sync";
import { ARENA_MODE_LABELS, EVENT_STATUS_LABELS } from "@/lib/events";
import {
  Activity,
  Clock,
  MonitorCheck,
  Radio,
  Wifi,
  WifiOff,
} from "lucide-react";

export function LiveSyncBanner() {
  const pathname = usePathname();
  const { snapshot, timer, connected } = useArenaSync({ isAdmin: true });

  if (pathname?.startsWith("/admin/login")) {
    return null;
  }

  const statusLabel = snapshot?.liveState
    ? EVENT_STATUS_LABELS[snapshot.liveState.status]
    : "Sincronizando...";
  const modeLabel = snapshot?.liveState
    ? ARENA_MODE_LABELS[snapshot.liveState.arenaMode]
    : "—";

  return (
    <div className="border-b border-slate-200 bg-slate-50/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold ${
              connected
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {connected ? (
              <Wifi className="w-3.5 h-3.5" />
            ) : (
              <WifiOff className="w-3.5 h-3.5" />
            )}
            {connected ? "Servidor Sincronizado (SSE + Poll 2s)" : "Reconectando..."}
          </span>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 font-medium">
            <Radio className="w-3.5 h-3.5 text-[#14532D]" />
            Estado: <strong>{statusLabel}</strong>
          </span>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 font-medium">
            <MonitorCheck className="w-3.5 h-3.5 text-[#14532D]" />
            Modo ARENA: <strong>{modeLabel}</strong>
          </span>

          {snapshot?.activeTopic && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-semibold">
              Pauta {snapshot.activeTopic.number}:{" "}
              {snapshot.activeTopic.mainSpeaker.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white font-mono font-bold text-xs">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            {timer.formatted}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-mono">
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            seq #{snapshot?.seq ?? 0}
          </span>
        </div>
      </div>
    </div>
  );
}
