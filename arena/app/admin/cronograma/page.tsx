import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { getPrimaryEvent } from "@/lib/live-state";
import { updateScheduleStepAction } from "@/app/actions/foundation";
import { ARENA_MODE_LABELS, formatSecondsMMSS } from "@/lib/events";
import { CalendarClock, Clock, Layers, Save } from "lucide-react";

async function AdminCronogramaContent() {
  await getCurrentAdminUser();
  const event = await getPrimaryEvent();

  if (!event) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-sm text-[#D5C5AA]">
        Evento não encontrado.
      </div>
    );
  }

  const [macroSteps, operationalSteps] = await Promise.all([
    prisma.scheduleStep.findMany({
      where: { eventId: event.id, isMacroBlock: true },
      orderBy: { macroOrder: "asc" },
    }),
    prisma.scheduleStep.findMany({
      where: { eventId: event.id, isMacroBlock: false },
      orderBy: { sequenceOrder: "asc" },
    }),
  ]);

  const totalMacroSec = macroSteps.reduce((acc, s) => acc + s.durationSec, 0);
  const totalOpSec = operationalSteps.reduce((acc, s) => acc + s.durationSec, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Cabeçalho */}
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#14532D]">
            Módulo 3 · Roteiro, Cronograma-Base (131 min) e Motor de Fluxo
          </span>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl text-[#F7DECA]">
            Configuração do Cronograma e Etapas Operacionais
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#D5C5AA]/80">
            Altere durações, títulos, responsáveis e modos de tela da ARENA. O
            modelo inicial mantém os 9 blocos (131:00) e as 40 sub-etapas (§2.3,
            §9.1 e §9.2).
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="border border-[#D5C5AA]/20 bg-[#030A06] px-4 py-2.5 rounded-xl text-xs">
            <span className="text-[#D5C5AA]/70 block">Total Blocos Macro</span>
            <strong className="font-mono text-base text-[#F7DECA]">
              {Math.floor(totalMacroSec / 60)} min ({formatSecondsMMSS(totalMacroSec)})
            </strong>
          </div>
          <div className="border border-[#D5C5AA]/20 bg-[#030A06] px-4 py-2.5 rounded-xl text-xs">
            <span className="text-[#D5C5AA]/70 block">Total Sub-etapas (40)</span>
            <strong className="font-mono text-base text-[#14532D]">
              {Math.floor(totalOpSec / 60)} min ({formatSecondsMMSS(totalOpSec)})
            </strong>
          </div>
        </div>
      </div>

      {/* 1. Cronograma-Base (§2.3 — 9 Atividades Macro) */}
      <section className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-6 sm:p-8 rounded-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#F7DECA]">
            <CalendarClock className="w-5 h-5 text-[#14532D]" />
            <h2 className="font-display text-xl">
              1. Cronograma-Base Macro (Seção 2.3 — 9 Blocos)
            </h2>
          </div>
          <span className="text-xs text-[#D5C5AA]/70">
            Modelo inicial: 131:00 minutos
          </span>
        </div>

        <div className="space-y-3">
          {macroSteps.map((ms) => (
            <form
              key={ms.id}
              action={updateScheduleStepAction}
              className="border border-[#D5C5AA]/20 bg-[#030A06] p-4 rounded-xl grid grid-cols-1 lg:grid-cols-12 gap-3 items-center text-xs"
            >
              <input type="hidden" name="stepId" value={ms.id} />

              <div className="lg:col-span-1 font-bold text-[#14532D]">
                Ordem #{ms.macroOrder}
              </div>

              <div className="lg:col-span-5">
                <input
                  type="text"
                  name="title"
                  defaultValue={ms.title}
                  required
                  className="w-full px-3 py-1.5 border border-[#D5C5AA]/30 bg-[#0A150D] text-[#F7DECA]"
                />
              </div>

              <div className="lg:col-span-3">
                <input
                  type="text"
                  name="responsibleName"
                  defaultValue={ms.responsibleName || "Organização"}
                  required
                  className="w-full px-3 py-1.5 border border-[#D5C5AA]/30 bg-[#0A150D] text-[#F7DECA]"
                />
              </div>

              <div className="lg:col-span-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#14532D] shrink-0" />
                <input
                  type="number"
                  name="durationSec"
                  defaultValue={ms.durationSec}
                  required
                  className="w-full px-2.5 py-1.5 border border-[#D5C5AA]/30 bg-[#0A150D] text-[#F7DECA] font-mono"
                />
                <span className="text-[11px] text-[#D5C5AA]/70 shrink-0">
                  s ({Math.round(ms.durationSec / 60)}m)
                </span>
              </div>

              <div className="lg:col-span-1 flex justify-end">
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#D5C5AA] text-[#030A06] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar</span>
                </button>
              </div>
            </form>
          ))}
        </div>
      </section>

      {/* 2. Sequência de Etapas Operacionais do Motor de Fluxo (§9.1 e §9.2) */}
      <section className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-6 sm:p-8 rounded-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#F7DECA]">
            <Layers className="w-5 h-5 text-[#14532D]" />
            <h2 className="font-display text-xl">
              2. Sequência Detalhada do Motor de Fluxo (Pautas 1–5 e Pauta 6)
            </h2>
          </div>
          <span className="text-xs text-[#D5C5AA]/70">
            Pautas 1–5: 6 etapas (10m/2m/2m/1m/3m/1m) · Pauta 6: 7 etapas (10m + 4×45s + 2m + 3m)
          </span>
        </div>

        <div className="space-y-2.5">
          {operationalSteps.map((st) => (
            <form
              key={st.id}
              action={updateScheduleStepAction}
              className="border border-[#D5C5AA]/15 bg-[#030A06] p-3.5 rounded-xl grid grid-cols-1 lg:grid-cols-12 gap-3 items-center text-xs"
            >
              <input type="hidden" name="stepId" value={st.id} />

              <div className="lg:col-span-1 font-mono font-bold text-slate-500">
                #{String(st.sequenceOrder).padStart(2, "0")}
              </div>

              <div className="lg:col-span-4">
                <input
                  type="text"
                  name="title"
                  defaultValue={st.title}
                  required
                  className="w-full px-3 py-1.5 border border-[#D5C5AA]/30 bg-[#0A150D] text-[#F7DECA]"
                />
              </div>

              <div className="lg:col-span-2">
                <input
                  type="text"
                  name="responsibleName"
                  defaultValue={st.responsibleName || ""}
                  required
                  className="w-full px-3 py-1.5 border border-[#D5C5AA]/30 bg-[#0A150D] text-[#F7DECA]"
                />
              </div>

              <div className="lg:col-span-2">
                <select
                  name="arenaMode"
                  defaultValue={st.arenaMode}
                  className="w-full px-2.5 py-1.5 border border-[#D5C5AA]/30 bg-[#0A150D] text-[#F7DECA]"
                >
                  {Object.entries(ARENA_MODE_LABELS).map(([mode, label]) => (
                    <option key={mode} value={mode}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lg:col-span-2 flex items-center gap-1.5">
                <input
                  type="number"
                  name="durationSec"
                  defaultValue={st.durationSec}
                  required
                  className="w-20 px-2.5 py-1.5 border border-[#D5C5AA]/30 bg-[#0A150D] text-[#F7DECA] font-mono"
                />
                <span className="font-mono text-[11px] text-[#D5C5AA]/75">
                  ({formatSecondsMMSS(st.durationSec)})
                </span>
              </div>

              <div className="lg:col-span-1 flex justify-end">
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#D5C5AA] text-[#030A06] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>OK</span>
                </button>
              </div>
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function AdminCronogramaPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-xs text-[#D5C5AA]/70">
          Carregando cronograma e etapas operacionais...
        </div>
      }
    >
      <AdminCronogramaContent />
    </Suspense>
  );
}
