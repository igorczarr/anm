import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { getPrimaryEvent } from "@/lib/live-state";
import {
  toggleScheduleLockAction,
  updateScheduleStepAction,
} from "@/app/actions/foundation";
import { ARENA_MODE_LABELS, formatSecondsMMSS } from "@/lib/events";
import {
  CalendarClock,
  Clock,
  Layers,
  Lock,
  Save,
  Unlock,
  Award,
} from "lucide-react";

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
  const totalOpSec = operationalSteps.reduce(
    (acc, s) => acc + s.durationSec,
    0
  );
  const isLocked = event.status === "LIVE" || event.scheduleLocked;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Cabeçalho */}
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#14532D]">
            Programação Oficial do Evento · 145 Minutos (2h25)
          </span>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl text-[#F7DECA]">
            Cronograma de 10 Etapas &amp; Fases Operacionais (15m Exposição + 5m P&amp;R)
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#D5C5AA]/80">
            A programação só pode ser livremente editada antes do início do
            evento. Com o evento em andamento, qualquer alteração exige
            justificativa administrativa registrada em auditoria.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="border border-[#D5C5AA]/20 bg-[#030A06] px-4 py-2.5 rounded-xl text-xs">
            <span className="text-[#D5C5AA]/70 block">
              Duração Programada (10 Etapas)
            </span>
            <strong className="font-mono text-base text-[#F7DECA]">
              {Math.floor(totalMacroSec / 60)} min (2h25)
            </strong>
          </div>
          <div className="border border-[#D5C5AA]/20 bg-[#030A06] px-4 py-2.5 rounded-xl text-xs">
            <span className="text-[#D5C5AA]/70 block flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-[#14532D]" />
              Carga Horária Certificada
            </span>
            <strong className="font-mono text-base text-[#14532D]">
              {event.certifiedHours} horas (Configurável)
            </strong>
          </div>
        </div>
      </div>

      {/* Status de Bloqueio da Programação (§2 e §7) */}
      <div
        className={`border p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs ${
          isLocked
            ? "border-amber-500/50 bg-amber-950/20 text-amber-200"
            : "border-emerald-500/30 bg-emerald-950/20 text-emerald-200"
        }`}
      >
        <div className="flex items-center gap-2.5">
          {isLocked ? (
            <Lock className="w-5 h-5 text-amber-400 shrink-0" />
          ) : (
            <Unlock className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <div>
            <strong className="block text-sm text-[#F7DECA]">
              {isLocked
                ? "Programação Bloqueada para Edição Comum (Evento em Andamento / Bloqueado)"
                : "Programação Aberta para Configuração Pré-Evento"}
            </strong>
            <span className="text-[#D5C5AA]/80">
              {isLocked
                ? "Qualquer alteração abaixo exige preenchimento do campo de justificativa obrigatória."
                : "Você pode ajustar durações e títulos livremente antes do início do evento."}
            </span>
          </div>
        </div>

        <form
          action={async () => {
            "use server";
            await toggleScheduleLockAction(!event.scheduleLocked);
          }}
        >
          <button
            type="submit"
            className="px-4 py-2 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] font-semibold rounded-xl cursor-pointer shrink-0"
          >
            {event.scheduleLocked
              ? "Desbloquear Programação (Admin)"
              : "Bloquear Programação Manualmente"}
          </button>
        </form>
      </div>

      {/* 1. As 10 Etapas Macro Oficiais (145 minutos) */}
      <section className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-6 sm:p-8 rounded-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#F7DECA]">
            <CalendarClock className="w-5 h-5 text-[#14532D]" />
            <h2 className="font-display text-xl">
              1. Programação Oficial (10 Etapas · Total {Math.round(totalMacroSec / 60)} min)
            </h2>
          </div>
          <span className="text-xs text-[#D5C5AA]/70">
            Referência oficial: 145 minutos (2h25)
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
                Etapa #{ms.macroOrder}
              </div>

              <div className="lg:col-span-4">
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

              <div className="lg:col-span-2 flex items-center gap-1.5 justify-end">
                {isLocked && (
                  <input
                    type="text"
                    name="justification"
                    required
                    placeholder="Justificativa..."
                    className="w-full px-2 py-1.5 border border-amber-500/40 bg-[#0A150D] text-[#F7DECA]"
                  />
                )}
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#D5C5AA] text-[#030A06] font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar</span>
                </button>
              </div>
            </form>
          ))}
        </div>
      </section>

      {/* 2. Fases Operacionais Detalhadas (15 etapas operacionais = 145 min) */}
      <section className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-6 sm:p-8 rounded-2xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[#F7DECA]">
            <Layers className="w-5 h-5 text-[#14532D]" />
            <h2 className="font-display text-xl">
              2. Fases Operacionais Controladas pelo Produtor ({operationalSteps.length} Fases · {Math.round(totalOpSec / 60)} min)
            </h2>
          </div>
          <span className="text-xs text-[#D5C5AA]/70">
            Pautas 1–5 divididas em Exposição (15:00) + Pergunta e Resposta (05:00)
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

              <div className="lg:col-span-1 font-mono font-bold text-[#14532D]">
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

              <div className="lg:col-span-1 flex items-center gap-1">
                <input
                  type="number"
                  name="durationSec"
                  defaultValue={st.durationSec}
                  required
                  className="w-20 px-2 py-1.5 border border-[#D5C5AA]/30 bg-[#0A150D] text-[#F7DECA] font-mono"
                />
              </div>

              <div className="lg:col-span-2 flex items-center justify-end gap-1.5">
                {isLocked && (
                  <input
                    type="text"
                    name="justification"
                    required
                    placeholder="Justificativa..."
                    className="w-full px-2 py-1.5 border border-amber-500/40 bg-[#0A150D] text-[#F7DECA]"
                  />
                )}
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#D5C5AA] text-[#030A06] font-semibold flex items-center gap-1 cursor-pointer shrink-0"
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
          Carregando programação oficial...
        </div>
      }
    >
      <AdminCronogramaContent />
    </Suspense>
  );
}
