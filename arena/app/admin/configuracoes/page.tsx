import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { getPrimaryEvent } from "@/lib/live-state";
import {
  updateEventSettingsAction,
  updateSpeakerAction,
  updateTopicAction,
} from "@/app/actions/foundation";
import { BookOpen, Save, Settings, UserCheck } from "lucide-react";

async function AdminConfiguracoesContent() {
  await getCurrentAdminUser();
  const event = await getPrimaryEvent();

  if (!event) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-sm text-[#D5C5AA]">
        Evento não encontrado.
      </div>
    );
  }

  const [topics, speakers] = await Promise.all([
    prisma.topic.findMany({
      where: { eventId: event.id },
      include: { mainSpeaker: true, provoker: true },
      orderBy: { number: "asc" },
    }),
    prisma.speaker.findMany({
      where: { eventId: event.id },
      orderBy: { displayOrder: "asc" },
    }),
  ]);

  const scheduledStartIso = event.scheduledStartAt
    ? new Date(event.scheduledStartAt).toISOString().slice(0, 16)
    : "";

  const isLocked = event.status === "LIVE" || event.scheduleLocked;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Cabeçalho */}
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8 rounded-2xl">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#14532D]">
          Módulo 8 · Configurações Estruturais da Arena
        </span>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl text-[#F7DECA]">
          Identificação do Evento, Carga Horária Certificada, 5 Pautas e Especialistas
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#D5C5AA]/80">
          O evento possui programação de 145 minutos (2h25) e carga horária
          certificada configurável independentemente pela organização (padrão:
          4 horas).
        </p>
      </div>

      {/* 1. Identificação do Evento e Parâmetros Operacionais */}
      <section className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-6 sm:p-8 rounded-2xl space-y-6">
        <div className="flex items-center gap-2 text-[#F7DECA]">
          <Settings className="w-5 h-5 text-[#14532D]" />
          <h2 className="font-display text-xl">
            1. Identificação do Evento, Certificação &amp; Regras de Interação
          </h2>
        </div>

        <form action={updateEventSettingsAction} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#D5C5AA]/80 mb-1.5">
                Nome do Evento
              </label>
              <input
                type="text"
                name="name"
                defaultValue={event.name}
                required
                className="w-full px-3.5 py-2.5 text-xs border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#D5C5AA]/80 mb-1.5">
                Tema Oficial
              </label>
              <input
                type="text"
                name="theme"
                defaultValue={event.theme}
                required
                className="w-full px-3.5 py-2.5 text-xs border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#D5C5AA]/80 mb-1.5">
                Instituição
              </label>
              <input
                type="text"
                name="institution"
                defaultValue={event.institution}
                required
                className="w-full px-3.5 py-2.5 text-xs border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#D5C5AA]/80 mb-1.5">
                Público Estimado
              </label>
              <input
                type="number"
                name="estimatedAudience"
                defaultValue={event.estimatedAudience}
                required
                className="w-full px-3.5 py-2.5 text-xs border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#D5C5AA]/80 mb-1.5">
                Duração Programada (min)
              </label>
              <input
                type="number"
                name="programmedDurationMin"
                defaultValue={event.programmedDurationMin}
                required
                className="w-full px-3.5 py-2.5 text-xs border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#D5C5AA]/80 mb-1.5">
                Carga Horária Certificada (h)
              </label>
              <input
                type="number"
                name="certifiedHours"
                defaultValue={event.certifiedHours}
                required
                className="w-full px-3.5 py-2.5 text-xs border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#D5C5AA]/80 mb-1.5">
                Limite Caracteres Pergunta
              </label>
              <input
                type="number"
                name="questionCharLimit"
                defaultValue={event.questionCharLimit}
                required
                className="w-full px-3.5 py-2.5 text-xs border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#D5C5AA]/80 mb-1.5">
                Perguntas Ativas / Pauta
              </label>
              <input
                type="number"
                name="maxQuestionsPerTopic"
                defaultValue={event.maxQuestionsPerTopic}
                required
                className="w-full px-3.5 py-2.5 text-xs border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#D5C5AA]/80 mb-1.5">
                Formato da Dinâmica
              </label>
              <input
                type="text"
                name="formatDescription"
                defaultValue={event.formatDescription}
                required
                className="w-full px-3.5 py-2.5 text-xs border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#D5C5AA]/80 mb-1.5">
                Intervalo Mínimo entre Envios (seg)
              </label>
              <input
                type="number"
                name="minQuestionIntervalSec"
                defaultValue={event.minQuestionIntervalSec}
                required
                className="w-full px-3.5 py-2.5 text-xs border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[#D5C5AA]/80 mb-1.5">
                Horário de Início Programado (Opcional)
              </label>
              <input
                type="datetime-local"
                name="scheduledStartAt"
                defaultValue={scheduledStartIso}
                className="w-full px-3.5 py-2.5 text-xs border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA]"
              />
            </div>

            <div className="flex flex-col justify-end gap-2">
              <label className="inline-flex items-center gap-2 text-xs text-[#F7DECA] cursor-pointer">
                <input
                  type="checkbox"
                  name="showTimerOnArena"
                  defaultChecked={event.showTimerOnArena}
                />
                <span>Exibir cronômetro no telão público ARENA</span>
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-[#F7DECA] cursor-pointer">
                <input
                  type="checkbox"
                  name="soundAlertsEnabled"
                  defaultChecked={event.soundAlertsEnabled}
                />
                <span>Habilitar alertas sonoros discretos (2m / 30s / 0s)</span>
              </label>
              <label className="inline-flex items-center gap-2 text-xs text-[#F7DECA] cursor-pointer">
                <input
                  type="checkbox"
                  name="requireCredential"
                  defaultChecked={event.requireCredential}
                />
                <span>
                  Exigir código de Credencial Individual (ANM-001..250) para
                  votar/perguntar
                </span>
              </label>
            </div>

            <div className="flex items-end justify-end">
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Configurações do Evento</span>
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* 2. Cadastro e Edição das 5 Pautas Oficiais */}
      <section className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-6 sm:p-8 rounded-2xl space-y-6">
        <div className="flex items-center gap-2 text-[#F7DECA]">
          <BookOpen className="w-5 h-5 text-[#14532D]" />
          <h2 className="font-display text-xl">
            2. Cadastro das 5 Pautas Oficiais (15 min Exposição + 5 min P&amp;R)
          </h2>
        </div>

        <div className="space-y-4">
          {topics.map((t) => (
            <form
              key={t.id}
              action={updateTopicAction}
              className="border border-[#D5C5AA]/20 bg-[#030A06] p-5 rounded-2xl space-y-4"
            >
              <input type="hidden" name="topicId" value={t.id} />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="px-3 py-1 rounded-full bg-[#14532D] text-white text-xs font-bold">
                  Pauta {t.number}
                </span>
                <span className="text-xs text-[#D5C5AA]/70">
                  Duração atual: {Math.round(t.durationSec / 60)} minutos (15m
                  Exposição + 5m P&amp;R)
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
                <div className="lg:col-span-6">
                  <label className="block text-xs font-semibold text-[#D5C5AA]/80 mb-1">
                    Título da Pauta {t.number}
                  </label>
                  <input
                    type="text"
                    name="title"
                    defaultValue={t.title}
                    required
                    className="w-full px-3 py-2 text-xs border border-[#D5C5AA]/30 bg-[#0A150D] text-[#F7DECA]"
                  />
                </div>

                <div className="lg:col-span-3">
                  <label className="block text-xs font-semibold text-[#D5C5AA]/80 mb-1">
                    Especialista Responsável
                  </label>
                  <select
                    name="mainSpeakerId"
                    defaultValue={t.mainSpeakerId}
                    className="w-full px-3 py-2 text-xs border border-[#D5C5AA]/30 bg-[#0A150D] text-[#F7DECA]"
                  >
                    {speakers.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold text-[#D5C5AA]/80 mb-1">
                    Fase Final (5 min)
                  </label>
                  <input
                    type="text"
                    name="provokerLabel"
                    defaultValue={t.provokerLabel}
                    required
                    className="w-full px-3 py-2 text-xs border border-[#D5C5AA]/30 bg-[#0A150D] text-[#F7DECA]"
                  />
                </div>

                <div className="lg:col-span-1">
                  <label className="block text-xs font-semibold text-[#D5C5AA]/80 mb-1">
                    Minutos
                  </label>
                  <input
                    type="number"
                    name="durationMin"
                    defaultValue={Math.round(t.durationSec / 60)}
                    required
                    className="w-full px-3 py-2 text-xs border border-[#D5C5AA]/30 bg-[#0A150D] text-[#F7DECA]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                {isLocked && (
                  <input
                    type="text"
                    name="justification"
                    required
                    placeholder="Justificativa obrigatória (evento em andamento)..."
                    className="w-80 px-3 py-1.5 text-xs border border-amber-500/40 bg-[#0A150D] text-[#F7DECA]"
                  />
                )}
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Pauta {t.number}</span>
                </button>
              </div>
            </form>
          ))}
        </div>
      </section>

      {/* 3. Cadastro dos 5 Especialistas (Paula, Daniel, Janaína, Denilson, Sérgio) */}
      <section className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-6 sm:p-8 rounded-2xl space-y-6">
        <div className="flex items-center gap-2 text-[#F7DECA]">
          <UserCheck className="w-5 h-5 text-[#14532D]" />
          <h2 className="font-display text-xl">
            3. Os 5 Especialistas do Encontro (Paula, Daniel, Janaína, Denilson e Sérgio)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {speakers.map((sp) => (
            <form
              key={sp.id}
              action={updateSpeakerAction}
              className="border border-[#D5C5AA]/20 bg-[#030A06] p-5 rounded-2xl space-y-3"
            >
              <input type="hidden" name="speakerId" value={sp.id} />
              <div className="flex items-center gap-3">
                <img
                  src={sp.photoUrl || "/icon.svg"}
                  alt={sp.name}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200"
                />
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#D5C5AA]/75">
                      Nome do Especialista
                    </label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={sp.name}
                      required
                      className="w-full px-3 py-1.5 text-xs border border-[#D5C5AA]/30 bg-[#0A150D] text-[#F7DECA]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#D5C5AA]/75">
                      Atuação no Evento
                    </label>
                    <input
                      type="text"
                      name="roleTitle"
                      defaultValue={sp.roleTitle || ""}
                      className="w-full px-3 py-1.5 text-xs border border-[#D5C5AA]/30 bg-[#0A150D] text-[#F7DECA]"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-[#D5C5AA]/75">
                    Mini Bio / Contexto
                  </label>
                  <input
                    type="text"
                    name="bio"
                    defaultValue={sp.bio || ""}
                    className="w-full px-3 py-1.5 text-xs border border-[#D5C5AA]/30 bg-[#0A150D] text-[#F7DECA]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#D5C5AA]/75">
                    Foto URL
                  </label>
                  <input
                    type="text"
                    name="photoUrl"
                    defaultValue={sp.photoUrl || ""}
                    className="w-full px-3 py-1.5 text-xs border border-[#D5C5AA]/30 bg-[#0A150D] text-[#F7DECA]"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Atualizar {sp.name}</span>
                </button>
              </div>
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function AdminConfiguracoesPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-xs text-[#D5C5AA]/70">
          Carregando configurações do evento e pautas...
        </div>
      }
    >
      <AdminConfiguracoesContent />
    </Suspense>
  );
}
