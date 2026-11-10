import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { getPrimaryEvent } from "@/lib/live-state";
import {
  ARENA_MODE_LABELS,
  EVENT_STATUS_LABELS,
  formatSecondsMMSS,
} from "@/lib/events";
import { LiveControlDesk } from "@/components/live-control-desk";
import {
  ArrowRight,
  CalendarClock,
  Clock,
  KeyRound,
  MessageSquareMore,
  MonitorPlay,
  PlayCircle,
  Radio,
  Settings,
  Vote,
} from "lucide-react";

async function AdminDashboardContent() {
  const admin = await getCurrentAdminUser();
  const event = await getPrimaryEvent();

  if (!event) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-sm text-[#D5C5AA]">
        Evento não inicializado. Execute o seed do banco.
      </div>
    );
  }

  const [
    topics,
    speakers,
    macroSteps,
    operationalSteps,
    polls,
    questionsCount,
    questionsPending,
    questionsApproved,
    participantsCount,
  ] = await Promise.all([
    prisma.topic.findMany({
      where: { eventId: event.id },
      include: { mainSpeaker: true, provoker: true },
      orderBy: { number: "asc" },
    }),
    prisma.speaker.findMany({
      where: { eventId: event.id },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.scheduleStep.findMany({
      where: { eventId: event.id, isMacroBlock: true },
      orderBy: { macroOrder: "asc" },
    }),
    prisma.scheduleStep.findMany({
      where: { eventId: event.id, isMacroBlock: false },
      orderBy: { sequenceOrder: "asc" },
      include: { topic: true },
    }),
    prisma.poll.findMany({
      where: { eventId: event.id },
      include: { options: true },
      orderBy: { number: "asc" },
    }),
    prisma.question.count({ where: { eventId: event.id } }),
    prisma.question.count({
      where: { eventId: event.id, status: { in: ["RECEIVED", "ANALYZING"] } },
    }),
    prisma.question.count({
      where: {
        eventId: event.id,
        status: { in: ["APPROVED", "SELECTED", "DISPLAYED", "ANSWERED"] },
      },
    }),
    prisma.participantSession.count({ where: { eventId: event.id } }),
  ]);

  const liveState = event.liveState;
  const activeStep =
    operationalSteps.find((s) => s.id === liveState?.activeStepId) ||
    operationalSteps[0];
  const nextStep = activeStep
    ? operationalSteps.find((s) => s.sequenceOrder > activeStep.sequenceOrder)
    : operationalSteps[1];

  const totalMacroSec = macroSteps.reduce((acc, s) => acc + s.durationSec, 0);
  const totalVotes = polls.reduce((acc, p) => acc + p.totalVotes, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Cabeçalho da Central de Comando */}
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/30 text-emerald-300 font-semibold">
              Central de Comando · Operador: {admin.fullName} ({admin.roleCode})
            </span>
            <span className="text-[#D5C5AA]/70">
              · {event.institution} · Público estimado: {event.estimatedAudience}
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl text-[#F7DECA]">
            {event.name} — {event.theme}
          </h1>
          <p className="text-xs sm:text-sm text-[#D5C5AA]/80">
            Panorama operacional em tempo real, roteiro de{" "}
            {Math.round(totalMacroSec / 60)} minutos ({macroSteps.length} blocos
            macro / {operationalSteps.length} etapas de fluxo), 6 pautas e 6
            votações.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            href="/admin/operacao"
            className="px-4 py-2.5 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs flex items-center gap-2"
          >
            <PlayCircle className="w-4 h-4" />
            <span>Mesa Completa de Operação (40 Etapas)</span>
          </Link>
          <Link
            href="/admin/configuracoes"
            className="px-4 py-2.5 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] font-semibold text-xs flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            <span>Configurar Pautas & Evento</span>
          </Link>
        </div>
      </div>

      {/* KPIs Operacionais (§4.1 Informações Principais) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-[#D5C5AA]/70">
            <span>Status & Modo do Telão</span>
            <Radio className="w-4 h-4 text-[#14532D]" />
          </div>
          <div className="font-display text-xl text-[#F7DECA]">
            {liveState ? EVENT_STATUS_LABELS[liveState.status] : "Aguardando"}
          </div>
          <div className="text-xs text-[#D5C5AA]/80">
            ARENA:{" "}
            <strong>
              {liveState
                ? ARENA_MODE_LABELS[liveState.arenaMode]
                : "Tela de Espera"}
            </strong>
          </div>
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-[#D5C5AA]/70">
            <span>Etapa Atual & Próxima</span>
            <Clock className="w-4 h-4 text-[#14532D]" />
          </div>
          <div className="font-bold text-sm text-[#F7DECA] truncate">
            {activeStep ? activeStep.title : "Abertura"}
          </div>
          <div className="text-xs text-[#D5C5AA]/80 truncate">
            Previsto:{" "}
            <strong>{formatSecondsMMSS(activeStep?.durationSec ?? 480)}</strong>{" "}
            · Próx: {nextStep?.title ?? "—"}
          </div>
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-[#D5C5AA]/70">
            <span>Curadoria de Perguntas</span>
            <MessageSquareMore className="w-4 h-4 text-[#14532D]" />
          </div>
          <div className="font-display text-xl text-[#F7DECA]">
            {questionsCount} recebidas
          </div>
          <div className="text-xs text-[#D5C5AA]/80">
            Pendentes: <strong>{questionsPending}</strong> · Aprovadas:{" "}
            <strong className="text-emerald-300">{questionsApproved}</strong>
          </div>
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-[#D5C5AA]/70">
            <span>Votações & Participantes</span>
            <Vote className="w-4 h-4 text-[#14532D]" />
          </div>
          <div className="font-display text-xl text-[#F7DECA]">
            {totalVotes} votos · {polls.length} enquetes
          </div>
          <div className="text-xs text-[#D5C5AA]/80">
            Sessões registradas: <strong>{participantsCount}</strong> · Seq #
            {liveState?.seq ?? 1}
          </div>
        </div>
      </div>

      {/* Controles Diretos de Operação no Dashboard (§4.1 Controles de Operação) */}
      <LiveControlDesk compact />

      {/* Resumo das 6 Pautas e Cronograma-Base (§2.2 e §2.3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg text-[#F7DECA]">
                As 6 Pautas Cadastradas (Seção 2.2)
              </h2>
              <p className="text-xs text-[#D5C5AA]/70">
                Numeradas de 1 a 6, com palestrante principal e provocador
                definidos.
              </p>
            </div>
            <Link
              href="/admin/configuracoes"
              className="text-xs font-semibold text-[#14532D] hover:underline flex items-center gap-1"
            >
              <span>Editar Pautas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#D5C5AA]/20 bg-[#030A06] text-[10px] uppercase tracking-wider text-[#D5C5AA]/80">
                  <th className="p-3">Nº</th>
                  <th className="p-3">Pauta</th>
                  <th className="p-3">Palestrante</th>
                  <th className="p-3">Provocador(a)</th>
                  <th className="p-3 text-right">Previsto / Realizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D5C5AA]/15">
                {topics.map((t) => (
                  <tr key={t.id}>
                    <td className="p-3 font-bold text-[#F7DECA]">{t.number}</td>
                    <td className="p-3 font-medium text-[#F7DECA]">{t.title}</td>
                    <td className="p-3 text-[#D5C5AA]">{t.mainSpeaker.name}</td>
                    <td className="p-3 text-[#D5C5AA]/80">{t.provokerLabel}</td>
                    <td className="p-3 text-right font-mono text-[#F7DECA]">
                      {formatSecondsMMSS(t.durationSec)}
                      {typeof t.actualDurationSec === "number" && (
                        <span className="text-emerald-300 ml-1">
                          ({formatSecondsMMSS(t.actualDurationSec)})
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cronograma-Base 131 minutos (§2.3) */}
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg text-[#F7DECA]">
                Cronograma-Base (131:00)
              </h2>
              <p className="text-xs text-[#D5C5AA]/70">
                9 blocos macro · {operationalSteps.length} sub-etapas
              </p>
            </div>
            <Link
              href="/admin/cronograma"
              className="text-xs font-semibold text-[#14532D] hover:underline flex items-center gap-1"
            >
              <span>Gerenciar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {macroSteps.map((ms) => (
              <div
                key={ms.id}
                className="border border-[#D5C5AA]/15 bg-[#030A06] px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <span className="font-bold text-[#14532D] mr-1.5">
                    #{ms.macroOrder}
                  </span>
                  <span className="font-medium text-[#F7DECA] truncate">
                    {ms.title}
                  </span>
                </div>
                <span className="font-mono font-semibold text-[#F7DECA] shrink-0">
                  {formatSecondsMMSS(ms.durationSec)}
                </span>
              </div>
            ))}

            <div className="pt-2 border-t border-[#D5C5AA]/20 flex items-center justify-between text-xs font-bold text-[#F7DECA] px-1">
              <span>TOTAL PROGRAMADO</span>
              <span className="font-mono text-sm text-[#14532D]">
                {Math.floor(totalMacroSec / 60)}:00 min
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Atalhos Rápidos da Arquitetura ADMIN (§3.1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/admin/cronograma"
          className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5 rounded-2xl flex items-start gap-3.5 hover:border-[#14532D] transition"
        >
          <CalendarClock className="w-5 h-5 text-[#14532D] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-sm text-[#F7DECA]">
              Cronograma & Etapas
            </div>
            <p className="text-xs text-[#D5C5AA]/75">
              Ajuste durações dos 9 blocos e das 40 etapas operacionais.
            </p>
          </div>
        </Link>

        <Link
          href="/admin/configuracoes"
          className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5 rounded-2xl flex items-start gap-3.5 hover:border-[#14532D] transition"
        >
          <Settings className="w-5 h-5 text-[#14532D] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-sm text-[#F7DECA]">
              Pautas, Palestrantes & Regras
            </div>
            <p className="text-xs text-[#D5C5AA]/75">
              Configure os {speakers.length} palestrantes, 6 pautas e limites.
            </p>
          </div>
        </Link>

        <Link
          href="/admin/acessos"
          className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5 rounded-2xl flex items-start gap-3.5 hover:border-[#14532D] transition"
        >
          <KeyRound className="w-5 h-5 text-[#14532D] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-sm text-[#F7DECA]">
              Acessos RBAC & Auditoria
            </div>
            <p className="text-xs text-[#D5C5AA]/75">
              Gerencie operadores, curadores, mediadores e histórico de logs.
            </p>
          </div>
        </Link>

        <Link
          href="/arena"
          target="_blank"
          className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5 rounded-2xl flex items-start gap-3.5 hover:border-[#14532D] transition"
        >
          <MonitorPlay className="w-5 h-5 text-[#14532D] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-sm text-[#F7DECA]">
              Testar Sincronia no Telão
            </div>
            <p className="text-xs text-[#D5C5AA]/75">
              Abra a tela ARENA em outra aba e valide a sincronização em tempo
              real.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-xs text-[#D5C5AA]/70">
          Carregando Central de Comando ADMIN...
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
