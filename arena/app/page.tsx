import Link from "next/link";
import { Suspense } from "react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPrimaryEvent } from "@/lib/live-state";
import { LiveAudienceCounter } from "@/components/live-audience-counter";
import {
  ArrowRight,
  Clock,
  MonitorPlay,
  Radio,
  ShieldCheck,
  Smartphone,
  Vote,
} from "lucide-react";

export const dynamic = "force-dynamic";

type TopicWithSpeakers = Prisma.TopicGetPayload<{
  include: { mainSpeaker: true; provoker: true };
}>;
type SpeakerItem = Prisma.SpeakerGetPayload<{}>;
type StepItem = Prisma.ScheduleStepGetPayload<{}>;

async function HomeContent() {
  let event = null;
  let topics: TopicWithSpeakers[] = [];
  let speakers: SpeakerItem[] = [];
  let macroSteps: StepItem[] = [];
  let pollsCount = 0;

  try {
    event = await getPrimaryEvent();
    if (event) {
      [topics, speakers, macroSteps, pollsCount] = await Promise.all([
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
        prisma.poll.count({ where: { eventId: event.id } }),
      ]);
    }
  } catch (err) {
    console.warn("HomeContent: Banco ainda não configurado ou indisponível na compilação:", err);
  }

  const totalSec = macroSteps.reduce((acc, s) => acc + s.durationSec, 0);
  const totalMin = Math.round(totalSec / 60);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Hero Institucional */}
      <section className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-8 sm:p-10 rounded-2xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/30 text-emerald-300 text-xs font-semibold border border-emerald-500/20">
            <Radio className="w-3.5 h-3.5" />
            {event?.institution || "Universidade Estadual de Feira de Santana (UEFS)"}
          </span>
          <span className="text-xs font-medium text-[#D5C5AA]/75 flex items-center gap-3">
            <LiveAudienceCounter />
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Duração programada: {totalMin || 145} minutos (2h25 · {event?.certifiedHours ?? 4}h cert.)
            </span>
          </span>
        </div>

        <div className="space-y-3 max-w-3xl">
          <h1 className="font-display text-3xl sm:text-5xl text-[#F7DECA] tracking-tight">
            {event?.name || "A Nova Moeda"}
          </h1>
          <p className="text-sm sm:text-base text-[#D5C5AA]/85 leading-relaxed">
            Centro de comando operacional e interação em tempo real da Arena de
            Debate. Três interfaces integradas à mesma fonte de dados para
            coordenação de cronômetros, pautas, curadoria de perguntas e
            votações ao vivo.
          </p>
        </div>

        {/* As 3 Interfaces do Produto (§1.2) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
          <Link
            href="/admin"
            className="group border border-[#D5C5AA]/25 bg-[#030A06] p-6 rounded-2xl flex flex-col justify-between gap-4 hover:border-[#14532D] transition"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider bg-emerald-950/30 text-emerald-300 rounded-full">
                  Interface 01 · Restrita
                </span>
                <ShieldCheck className="w-5 h-5 text-[#14532D]" />
              </div>
              <h2 className="font-display text-xl text-[#F7DECA]">
                Central ADMIN
              </h2>
              <p className="text-xs text-[#D5C5AA]/75 leading-relaxed">
                Painel de comando da organização para configurar, controlar
                cronômetros, moderar perguntas e conduzir votações.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#14532D]">
              <span>Acessar Central de Comando</span>
              <ArrowRight className="w-3.5 h-3.5 lucide-arrow-right" />
            </div>
          </Link>

          <Link
            href="/arena"
            className="group border border-[#D5C5AA]/25 bg-[#030A06] p-6 rounded-2xl flex flex-col justify-between gap-4 hover:border-[#14532D] transition"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider bg-amber-950/30 text-amber-300 rounded-full">
                  Interface 02 · Telão 16:9
                </span>
                <MonitorPlay className="w-5 h-5 text-[#14532D]" />
              </div>
              <h2 className="font-display text-xl text-[#F7DECA]">
                Tela Pública ARENA
              </h2>
              <p className="text-xs text-[#D5C5AA]/75 leading-relaxed">
                Projeção pública 1920×1080 sincronizada com o estado ao vivo,
                cronômetro, palestrante, perguntas aprovadas e gráficos.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#14532D]">
              <span>Abrir Projeção do Telão</span>
              <ArrowRight className="w-3.5 h-3.5 lucide-arrow-right" />
            </div>
          </Link>

          <Link
            href="/participar"
            className="group border border-[#D5C5AA]/25 bg-[#030A06] p-6 rounded-2xl flex flex-col justify-between gap-4 hover:border-[#14532D] transition"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider bg-emerald-950/30 text-emerald-300 rounded-full">
                  Interface 03 · Mobile QR
                </span>
                <Smartphone className="w-5 h-5 text-[#14532D]" />
              </div>
              <h2 className="font-display text-xl text-[#F7DECA]">
                Interação do Participante
              </h2>
              <p className="text-xs text-[#D5C5AA]/75 leading-relaxed">
                Acesso mobile-first via QR Code sem instalação nem cadastro
                pessoal para envio de perguntas e participação nas {pollsCount}{" "}
                votações.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#14532D]">
              <span>Entrar na Arena (Mobile)</span>
              <ArrowRight className="w-3.5 h-3.5 lucide-arrow-right" />
            </div>
          </Link>
        </div>
      </section>

      {/* As 5 Pautas Cadastradas & Fluxo Oficial v2.0 */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Formato Oficial v2.0 · 10 Etapas Macro
            </span>
            <h2 className="font-display text-2xl text-[#F7DECA]">
              As 5 Exposições Individuais (15 min + 5 min P&amp;R) + Mesa-Redonda
            </h2>
          </div>
          <span className="text-xs text-[#D5C5AA]/70">
            5 especialistas (Daniel, Janaína, Denilson, Sérgio, Dulcila) + Mediação: Paula · Votação da Mesa-Redonda Aberta
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topics.map((t) => (
            <div
              key={t.id}
              className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5 rounded-2xl flex flex-col justify-between gap-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#14532D] text-white font-semibold">
                    Pauta {t.number}
                  </span>
                  <span className="text-[#D5C5AA]/70 font-mono">
                    {Math.round(t.durationSec / 60)}m Exposição +{" "}
                    {Math.round((t.qaDurationSec ?? 300) / 60)}m P&amp;R
                  </span>
                </div>
                <h3 className="font-semibold text-sm text-[#F7DECA] leading-snug">
                  {t.title}
                </h3>
              </div>

              <div className="pt-3 border-t border-[#D5C5AA]/15 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[#D5C5AA]/65">Especialista:</span>
                  <span className="flex items-center gap-1.5 font-semibold text-[#F7DECA]">
                    {t.mainSpeaker?.photoUrl && (
                      <img
                        src={t.mainSpeaker.photoUrl}
                        alt=""
                        className="w-4 h-4 rounded-full object-cover border border-[#D5C5AA]/30"
                      />
                    )}
                    <strong>{t.mainSpeaker?.name ?? "A definir"}</strong>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#D5C5AA]/65">Dinâmica:</span>
                  <span className="font-medium text-[#D5C5AA]">
                    {t.provokerLabel || "15m Exposição + 5m Pergunta e Resposta"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Palestrantes Cadastrados */}
      <section className="space-y-4">
        <h2 className="font-display text-xl text-[#F7DECA]">
          Palestrantes Recorrentes
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {speakers.map((sp) => (
            <div
              key={sp.id}
              className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-4 rounded-2xl flex items-center gap-3.5"
            >
              <img
                src={sp.photoUrl || "/icon.svg"}
                alt={sp.name}
                className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
              />
              <div className="min-w-0">
                <div className="font-bold text-sm text-[#F7DECA] truncate">
                  {sp.name}
                </div>
                <div className="text-[11px] text-[#D5C5AA]/75 truncate">
                  {sp.roleTitle}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-xs text-[#D5C5AA]/70">
          Carregando plataforma Arena A Nova Moeda...
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
