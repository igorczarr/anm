"use client";

import { PageHeader, Tabs, Chips, SearchBox, Toast, EmptyState } from "@/components/admin-ui";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  Settings,
  BookOpen,
  UserCheck,
  ShieldAlert,
  Save,
  CheckCircle2,
  AlertCircle,
  X,
  RotateCcw,
  Clock,
  Award,
  Sparkles,
  Users,
  MessageSquare,
  HelpCircle,
  Flame,
  Volume2,
  Eye,
  Lock,
} from "lucide-react";
import { getSpeakerPhoto } from "@/lib/speakers";

interface EventSettingsProps {
  event: {
    id: string;
    name: string;
    theme: string;
    institution: string;
    estimatedAudience: number;
    programmedDurationMin: number;
    certifiedHours: number;
    formatDescription: string;
    questionCharLimit: number;
    maxQuestionsPerTopic: number;
    minQuestionIntervalSec: number;
    soundAlertsEnabled: boolean;
    showTimerOnArena: boolean;
    requireAccessCode: boolean;
    requireCredential: boolean;
    accessCode: string | null;
    scheduledStartAt: string | null;
    status: string;
    scheduleLocked: boolean;
  };
  topics: Array<{
    id: string;
    number: number;
    title: string;
    durationSec: number;
    mainSpeakerId: string;
    provokerLabel: string;
    provokerId: string | null;
    mainSpeaker: { id: string; name: string } | null;
  }>;
  speakers: Array<{
    id: string;
    name: string;
    roleTitle: string | null;
    bio: string | null;
    photoUrl: string | null;
    displayOrder: number;
  }>;
  onUpdateEventSettings: (formData: FormData) => Promise<void>;
  onUpdateTopic: (formData: FormData) => Promise<void>;
  onUpdateSpeaker: (formData: FormData) => Promise<void>;
  onResetEntireEvent: (options?: {
    clearAudienceQuestions?: boolean;
    clearAudienceVotes?: boolean;
  }) => Promise<any>;
}

export function SettingsManager({
  event,
  topics: initialTopics,
  speakers: initialSpeakers,
  onUpdateEventSettings,
  onUpdateTopic,
  onUpdateSpeaker,
  onResetEntireEvent,
}: EventSettingsProps) {
  const [activeSection, setActiveSection] = useState<
    "geral" | "pautas" | "especialistas" | "interacao"
  >("geral");
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Modal de reinício do evento
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [clearQuestionsCheck, setClearQuestionsCheck] = useState(true);
  const [clearVotesCheck, setClearVotesCheck] = useState(true);

  // Armazena fotos em edição para preview imediato
  const [previewPhotos, setPreviewPhotos] = useState<Record<string, string>>({});

  const isLocked = event.status === "LIVE" || event.scheduleLocked;

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const handleSettingsSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await onUpdateEventSettings(formData);
        showToast("Configurações do evento atualizadas com sucesso!", "success");
      } catch (err: any) {
        showToast(err?.message || "Erro ao salvar configurações", "error");
      }
    });
  };

  const handleTopicSubmit = (
    e: React.FormEvent<HTMLFormElement>,
    topicNumber: number
  ) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await onUpdateTopic(formData);
        showToast(
          `Pauta ${topicNumber} atualizada com sucesso no evento!`,
          "success"
        );
      } catch (err: any) {
        showToast(err?.message || "Erro ao salvar pauta", "error");
      }
    });
  };

  const handleSpeakerSubmit = (
    e: React.FormEvent<HTMLFormElement>,
    speakerName: string
  ) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await onUpdateSpeaker(formData);
        showToast(`Perfil de ${speakerName} salvo com sucesso!`, "success");
      } catch (err: any) {
        showToast(err?.message || "Erro ao salvar especialista", "error");
      }
    });
  };

  const handleResetEventSubmit = () => {
    startTransition(async () => {
      try {
        await onResetEntireEvent({
          clearAudienceQuestions: clearQuestionsCheck,
          clearAudienceVotes: clearVotesCheck,
        });
        showToast(
          "Evento reiniciado com sucesso! Pronto para nova execução.",
          "success"
        );
        setIsResetModalOpen(false);
      } catch (err: any) {
        showToast(err?.message || "Erro ao reiniciar evento", "error");
      }
    });
  };

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <PageHeader
        title="Configurações do Evento"
        actions={
          <button
            type="button"
            onClick={() => setIsResetModalOpen(true)}
            className="px-3.5 py-2 rounded-lg text-xs font-medium text-red-300 ring-1 ring-red-500/30 hover:bg-red-950/40 flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reiniciar evento
          </button>
        }
      />

      <Tabs
        value={activeSection}
        onChange={setActiveSection}
        items={[
          { key: "geral", label: "Evento" },
          { key: "pautas", label: "Pautas" },
          { key: "especialistas", label: "Especialistas" },
          { key: "interacao", label: "Regras e telão" },
        ]}
      />

      {/* SEÇÃO 1: Identidade do Evento e Certificação */}
      {activeSection === "geral" && (
        <section className="border border-white/[0.08] bg-[#0A120D]/90 p-6 sm:p-8 rounded-2xl space-y-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-2.5 text-[#F7DECA]">
            <Settings className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-display text-xl text-[#F7DECA]">
                1. Identidade Oficial &amp; Certificação do Evento
              </h2>
              <p className="text-xs text-[#D5C5AA]/70">
                Informações institucionais impressas nos certificados e visualizadas pelos participantes.
              </p>
            </div>
          </div>

          <form onSubmit={handleSettingsSubmit} className="space-y-5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-medium text-[#D5C5AA]/80 mb-1.5">
                  Nome Oficial do Evento
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={event.name}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.1] bg-[#050C07] text-[#F7DECA] focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              <div>
                <label className="block font-medium text-[#D5C5AA]/80 mb-1.5">
                  Tema Central do Encontro
                </label>
                <input
                  type="text"
                  name="theme"
                  defaultValue={event.theme}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.1] bg-[#050C07] text-[#F7DECA] focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              <div>
                <label className="block font-medium text-[#D5C5AA]/80 mb-1.5">
                  Instituição Promotora
                </label>
                <input
                  type="text"
                  name="institution"
                  defaultValue={event.institution}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.1] bg-[#050C07] text-[#F7DECA] focus:outline-none focus:border-emerald-500/60"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block font-medium text-[#D5C5AA]/80 mb-1.5 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Carga Horária Certificada (h)</span>
                </label>
                <input
                  type="number"
                  name="certifiedHours"
                  defaultValue={event.certifiedHours}
                  required
                  min={1}
                  max={40}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.1] bg-[#050C07] text-[#F7DECA] font-mono focus:outline-none focus:border-emerald-500/60"
                />
                <span className="text-[10px] text-[#D5C5AA]/50 block mt-1">
                  Emitida no certificado individual em PDF
                </span>
              </div>

              <div>
                <label className="block font-medium text-[#D5C5AA]/80 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Duração Estimada (minutos)</span>
                </label>
                <input
                  type="number"
                  name="programmedDurationMin"
                  defaultValue={event.programmedDurationMin}
                  required
                  min={10}
                  max={600}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.1] bg-[#050C07] text-[#F7DECA] font-mono focus:outline-none focus:border-emerald-500/60"
                />
                <span className="text-[10px] text-[#D5C5AA]/50 block mt-1">
                  Referência: 145 min (2h25)
                </span>
              </div>

              <div>
                <label className="block font-medium text-[#D5C5AA]/80 mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Público Estimado (Plateia)</span>
                </label>
                <input
                  type="number"
                  name="estimatedAudience"
                  defaultValue={event.estimatedAudience}
                  required
                  min={1}
                  max={10000}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.1] bg-[#050C07] text-[#F7DECA] font-mono focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              <div>
                <label className="block font-medium text-[#D5C5AA]/80 mb-1.5">
                  Horário Previsto de Início
                </label>
                <input
                  type="datetime-local"
                  name="scheduledStartAt"
                  defaultValue={
                    event.scheduledStartAt
                      ? new Date(event.scheduledStartAt).toISOString().slice(0, 16)
                      : ""
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.1] bg-[#050C07] text-[#F7DECA] focus:outline-none focus:border-emerald-500/60"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-[#D5C5AA]/80 mb-1.5">
                Descrição do Formato da Dinâmica
              </label>
              <textarea
                name="formatDescription"
                defaultValue={event.formatDescription}
                required
                rows={2}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.1] bg-[#050C07] text-[#F7DECA] focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            {/* Preservar campos de interação para não perder valores no submit */}
            <input
              type="hidden"
              name="questionCharLimit"
              value={event.questionCharLimit}
            />
            <input
              type="hidden"
              name="maxQuestionsPerTopic"
              value={event.maxQuestionsPerTopic}
            />
            <input
              type="hidden"
              name="minQuestionIntervalSec"
              value={event.minQuestionIntervalSec}
            />
            <input
              type="hidden"
              name="soundAlertsEnabled"
              value={event.soundAlertsEnabled ? "on" : "off"}
            />
            <input
              type="hidden"
              name="showTimerOnArena"
              value={event.showTimerOnArena ? "on" : "off"}
            />
            <input
              type="hidden"
              name="requireAccessCode"
              value={event.requireAccessCode ? "on" : "off"}
            />
            <input
              type="hidden"
              name="requireCredential"
              value={event.requireCredential ? "on" : "off"}
            />

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isPending ? "Salvando..." : "Salvar Parâmetros do Evento"}</span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* SEÇÃO 2: As 5 Pautas & Mesa-Redonda */}
      {activeSection === "pautas" && (
        <section className="border border-white/[0.08] bg-[#0A120D]/90 p-6 sm:p-8 rounded-2xl space-y-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2.5 text-[#F7DECA]">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              <div>
                <h2 className="font-display text-xl text-[#F7DECA]">
                  2. As 5 Pautas Oficiais &amp; Mesa-Redonda
                </h2>
                <p className="text-xs text-[#D5C5AA]/70">
                  Cada pauta é conduzida pelo seu especialista (15 min exposição + 5 min P&amp;R).
                  A Mesa-Redonda é independente e reúne todos os 5 debatedores com mediação de Paula.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {initialTopics.map((topic) => {
              const assignedSpeaker = initialSpeakers.find(
                (s) => s.id === topic.mainSpeakerId
              );
              const photo = assignedSpeaker
                ? getSpeakerPhoto(assignedSpeaker.name, assignedSpeaker.photoUrl)
                : "/img/auditorio.png";

              return (
                <form
                  key={topic.id}
                  onSubmit={(e) => handleTopicSubmit(e, topic.number)}
                  className="border border-white/[0.08] bg-[#050C07] p-4 sm:p-5 rounded-2xl space-y-3.5 text-xs shadow-md"
                >
                  <input type="hidden" name="topicId" value={topic.id} />

                  <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40 text-xs font-bold font-mono">
                        Pauta {topic.number}
                      </span>
                      <div className="flex items-center gap-2.5">
                        <img
                          src={photo}
                          alt={assignedSpeaker?.name || "Palestrante"}
                          className="w-8 h-8 rounded-xl object-cover ring-1 ring-white/[0.1] bg-[#0A120D]"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/img/auditorio.png";
                          }}
                        />
                        <span className="font-semibold text-[#F7DECA]">
                          {assignedSpeaker?.name || "Palestrante não definido"}
                        </span>
                      </div>
                    </div>

                    <span className="font-mono text-emerald-400 text-xs font-semibold">
                      {Math.round(topic.durationSec / 60)} min (15m Exposição + 5m P&amp;R)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
                    <div className="lg:col-span-6">
                      <label className="block text-[11px] font-medium text-[#D5C5AA]/80 mb-1">
                        Título Oficial da Pauta {topic.number}
                      </label>
                      <input
                        type="text"
                        name="title"
                        defaultValue={topic.title}
                        required
                        className="w-full px-3.5 py-2 rounded-xl border border-white/[0.1] bg-[#0A120D] text-[#F7DECA] focus:outline-none focus:border-emerald-500/60"
                      />
                    </div>

                    <div className="lg:col-span-3">
                      <label className="block text-[11px] font-medium text-[#D5C5AA]/80 mb-1">
                        Especialista Responsável
                      </label>
                      <select
                        name="mainSpeakerId"
                        defaultValue={topic.mainSpeakerId}
                        className="w-full px-3.5 py-2 rounded-xl border border-white/[0.1] bg-[#0A120D] text-[#F7DECA] focus:outline-none focus:border-emerald-500/60"
                      >
                        {initialSpeakers.map((sp) => (
                          <option key={sp.id} value={sp.id}>
                            {sp.name} ({sp.roleTitle || "Especialista"})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="lg:col-span-2">
                      <label className="block text-[11px] font-medium text-[#D5C5AA]/80 mb-1">
                        Etapa Final de P&amp;R
                      </label>
                      <input
                        type="text"
                        name="provokerLabel"
                        defaultValue={topic.provokerLabel}
                        required
                        className="w-full px-3.5 py-2 rounded-xl border border-white/[0.1] bg-[#0A120D] text-[#F7DECA] focus:outline-none focus:border-emerald-500/60"
                      />
                    </div>

                    <div className="lg:col-span-1">
                      <label className="block text-[11px] font-medium text-[#D5C5AA]/80 mb-1">
                        Minutos
                      </label>
                      <input
                        type="number"
                        name="durationMin"
                        defaultValue={Math.round(topic.durationSec / 60)}
                        required
                        min={5}
                        max={120}
                        className="w-full px-3.5 py-2 rounded-xl border border-white/[0.1] bg-[#0A120D] text-[#F7DECA] font-mono focus:outline-none focus:border-emerald-500/60"
                      />
                    </div>
                  </div>

                  {isLocked && (
                    <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-950/20">
                      <label className="block text-amber-300 font-semibold text-[10px] mb-1">
                        Justificativa Obrigatória (Evento ao Vivo)
                      </label>
                      <input
                        type="text"
                        name="justification"
                        required
                        placeholder="Justificativa da alteração..."
                        className="w-full px-3 py-1.5 rounded-lg border border-amber-500/50 bg-[#0A120D] text-[#F7DECA]"
                      />
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Salvar Pauta {topic.number}</span>
                    </button>
                  </div>
                </form>
              );
            })}

            {/* Card Explicativo da Mesa-Redonda Independente */}
            <div className="border border-emerald-500/30 bg-emerald-950/20 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs shadow-md">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/30 text-emerald-300 text-[10px] font-bold">
                    Mesa-Redonda Independente
                  </span>
                  <span className="font-semibold text-[#F7DECA]">
                    Debate Geral dos 5 Especialistas com Mediação de Paula
                  </span>
                </div>
                <p className="text-[#D5C5AA]/80 max-w-2xl text-xs">
                  A Mesa-Redonda não está amarrada à Pauta 5. Ela possui bloco próprio com votação prévia
                  aberta desde o início do evento (priorizada após a pauta 5) e duração oficial de 40 minutos.
                </p>
              </div>

              <Link
                href="/admin/cronograma"
                className="px-4 py-2 rounded-xl border border-white/[0.1] bg-[#050C07] hover:bg-white/[0.05] text-[#F7DECA] font-semibold text-xs shrink-0 inline-flex items-center gap-1.5 transition"
              >
                <span>Ver no Cronograma</span>
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* SEÇÃO 3: Especialistas & Mediação (6 Integrantes) */}
      {activeSection === "especialistas" && (
        <section className="border border-white/[0.08] bg-[#0A120D]/90 p-6 sm:p-8 rounded-2xl space-y-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2.5 text-[#F7DECA]">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              <div>
                <h2 className="font-display text-xl text-[#F7DECA]">
                  3. Especialistas Oficiais &amp; Mediação (6 Integrantes)
                </h2>
                <p className="text-xs text-[#D5C5AA]/70">
                  Paula (Apresentação &amp; Mediação) e os 5 Especialistas (Daniel, Janaína, Denilson, Sérgio, Dulcila).
                  As fotos são exibidas no Telão ARENA, Mesa de Palco e no Cronograma.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {initialSpeakers.map((sp) => {
              const currentPhotoUrl =
                previewPhotos[sp.id] !== undefined
                  ? previewPhotos[sp.id]
                  : sp.photoUrl || getSpeakerPhoto(sp.name);

              return (
                <form
                  key={sp.id}
                  onSubmit={(e) => handleSpeakerSubmit(e, sp.name)}
                  className="border border-white/[0.08] bg-[#050C07] p-5 rounded-2xl space-y-3.5 text-xs flex flex-col justify-between shadow-md"
                >
                  <input type="hidden" name="speakerId" value={sp.id} />

                  <div className="space-y-3">
                    <div className="flex items-center gap-3.5">
                      <div className="relative group shrink-0">
                        <img
                          src={currentPhotoUrl}
                          alt={sp.name}
                          className="w-16 h-16 rounded-2xl object-cover ring-2 ring-emerald-500/40 bg-[#0A120D]"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/img/auditorio.png";
                          }}
                        />
                        <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                          <Eye className="w-4 h-4 text-white" />
                        </div>
                      </div>

                      <div className="flex-1 space-y-2">
                        <div>
                          <label className="block text-[11px] font-medium text-[#D5C5AA]/80 mb-0.5">
                            Nome Completo
                          </label>
                          <input
                            type="text"
                            name="name"
                            defaultValue={sp.name}
                            required
                            className="w-full px-3 py-1.5 rounded-xl border border-white/[0.1] bg-[#0A120D] text-[#F7DECA] focus:outline-none focus:border-emerald-500/60 font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-[#D5C5AA]/80 mb-0.5">
                            Papel / Atuação no Encontro
                          </label>
                          <input
                            type="text"
                            name="roleTitle"
                            defaultValue={sp.roleTitle || ""}
                            className="w-full px-3 py-1.5 rounded-xl border border-white/[0.1] bg-[#0A120D] text-[#F7DECA] focus:outline-none focus:border-emerald-500/60"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-[#D5C5AA]/80 mb-0.5">
                        Mini Bio / Contexto Institucional
                      </label>
                      <textarea
                        name="bio"
                        defaultValue={sp.bio || ""}
                        rows={2}
                        className="w-full px-3 py-1.5 rounded-xl border border-white/[0.1] bg-[#0A120D] text-[#F7DECA] focus:outline-none focus:border-emerald-500/60"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-[#D5C5AA]/80 mb-0.5">
                        URL da Foto de Perfil
                      </label>
                      <input
                        type="text"
                        name="photoUrl"
                        defaultValue={sp.photoUrl || ""}
                        placeholder="/img/Nome.jpeg ou URL externa"
                        onChange={(e) =>
                          setPreviewPhotos((prev) => ({
                            ...prev,
                            [sp.id]: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-1.5 rounded-xl border border-white/[0.1] bg-[#0A120D] text-[#F7DECA] focus:outline-none focus:border-emerald-500/60 font-mono text-[11px]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                    <span className="text-[10px] text-[#D5C5AA]/50 font-mono">
                      Ordem: #{sp.displayOrder}
                    </span>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Salvar Perfil</span>
                    </button>
                  </div>
                </form>
              );
            })}
          </div>
        </section>
      )}

      {/* SEÇÃO 4: Regras de Interação, Telão & Múltiplas Execuções */}
      {activeSection === "interacao" && (
        <section className="border border-white/[0.08] bg-[#0A120D]/90 p-6 sm:p-8 rounded-2xl space-y-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-2.5 text-[#F7DECA]">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-display text-xl text-[#F7DECA]">
                4. Regras de Interação, Telão &amp; Múltiplas Execuções
              </h2>
              <p className="text-xs text-[#D5C5AA]/70">
                Parâmetros de moderação do aplicativo da plateia, controle audiovisual e mecanismo de repetição do evento.
              </p>
            </div>
          </div>

          <form onSubmit={handleSettingsSubmit} className="space-y-6 text-xs">
            {/* Preservar campos gerais */}
            <input type="hidden" name="name" value={event.name} />
            <input type="hidden" name="theme" value={event.theme} />
            <input type="hidden" name="institution" value={event.institution} />
            <input
              type="hidden"
              name="certifiedHours"
              value={event.certifiedHours}
            />
            <input
              type="hidden"
              name="programmedDurationMin"
              value={event.programmedDurationMin}
            />
            <input
              type="hidden"
              name="estimatedAudience"
              value={event.estimatedAudience}
            />
            <input
              type="hidden"
              name="formatDescription"
              value={event.formatDescription}
            />
            {event.scheduledStartAt && (
              <input
                type="hidden"
                name="scheduledStartAt"
                value={new Date(event.scheduledStartAt).toISOString().slice(0, 16)}
              />
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border border-white/[0.08] bg-[#050C07] p-4 rounded-xl space-y-2">
                <label className="block font-medium text-[#D5C5AA]/90">
                  Limite de Caracteres por Pergunta
                </label>
                <input
                  type="number"
                  name="questionCharLimit"
                  defaultValue={event.questionCharLimit}
                  required
                  min={50}
                  max={1000}
                  className="w-full px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0A120D] text-[#F7DECA] font-mono focus:outline-none focus:border-emerald-500/60"
                />
                <span className="text-[10px] text-[#D5C5AA]/50 block">
                  Recomendado: 280 caracteres (conciso para leitura no telão)
                </span>
              </div>

              <div className="border border-white/[0.08] bg-[#050C07] p-4 rounded-xl space-y-2">
                <label className="block font-medium text-[#D5C5AA]/90">
                  Intervalo Mínimo Anti-Spam (segundos)
                </label>
                <input
                  type="number"
                  name="minQuestionIntervalSec"
                  defaultValue={event.minQuestionIntervalSec}
                  required
                  min={0}
                  max={300}
                  className="w-full px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0A120D] text-[#F7DECA] font-mono focus:outline-none focus:border-emerald-500/60"
                />
                <span className="text-[10px] text-[#D5C5AA]/50 block">
                  Tempo de espera entre envios consecutivos do mesmo participante
                </span>
              </div>

              <div className="border border-white/[0.08] bg-[#050C07] p-4 rounded-xl space-y-2">
                <label className="block font-medium text-[#D5C5AA]/90">
                  Perguntas Ativas em Destaque / Pauta
                </label>
                <input
                  type="number"
                  name="maxQuestionsPerTopic"
                  defaultValue={event.maxQuestionsPerTopic}
                  required
                  min={1}
                  max={10}
                  className="w-full px-3 py-2 rounded-lg border border-white/[0.1] bg-[#0A120D] text-[#F7DECA] font-mono focus:outline-none focus:border-emerald-500/60"
                />
                <span className="text-[10px] text-[#D5C5AA]/50 block">
                  Número de perguntas exibidas simultaneamente no telão (Padrão: 1)
                </span>
              </div>
            </div>

            <div className="border border-white/[0.08] bg-[#050C07] p-5 rounded-2xl space-y-3">
              <span className="font-semibold text-sm text-[#F7DECA] block">
                Comportamento do Telão &amp; Controle de Acesso
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label className="flex items-start gap-2.5 p-3.5 rounded-xl border border-white/[0.06] bg-[#0A120D] cursor-pointer hover:border-white/[0.15] transition">
                  <input
                    type="checkbox"
                    name="showTimerOnArena"
                    defaultChecked={event.showTimerOnArena}
                    className="mt-0.5 accent-emerald-500 rounded"
                  />
                  <div>
                    <strong className="block text-[#F7DECA] text-xs">
                      Exibir Cronômetro no Telão ARENA
                    </strong>
                    <span className="text-[11px] text-[#D5C5AA]/70 block">
                      Mostra o anel de contagem regressiva circular dinâmico durante as exposições.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3.5 rounded-xl border border-white/[0.06] bg-[#0A120D] cursor-pointer hover:border-white/[0.15] transition">
                  <input
                    type="checkbox"
                    name="soundAlertsEnabled"
                    defaultChecked={event.soundAlertsEnabled}
                    className="mt-0.5 accent-emerald-500 rounded"
                  />
                  <div>
                    <strong className="block text-[#F7DECA] text-xs flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Alertas Sonoros Discretos</span>
                    </strong>
                    <span className="text-[11px] text-[#D5C5AA]/70 block">
                      Avisa sutilmente quando restarem 2m, 30s e ao expirar o tempo.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3.5 rounded-xl border border-white/[0.06] bg-[#0A120D] cursor-pointer hover:border-white/[0.15] transition">
                  <input
                    type="checkbox"
                    name="requireCredential"
                    defaultChecked={event.requireCredential}
                    className="mt-0.5 accent-emerald-500 rounded"
                  />
                  <div>
                    <strong className="block text-[#F7DECA] text-xs">
                      Exigir Credencial Individual (ANM-001..250)
                    </strong>
                    <span className="text-[11px] text-[#D5C5AA]/70 block">
                      Garante identificação individual de cada participante para votar e perguntar.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3.5 rounded-xl border border-white/[0.06] bg-[#0A120D] cursor-pointer hover:border-white/[0.15] transition">
                  <input
                    type="checkbox"
                    name="requireAccessCode"
                    defaultChecked={event.requireAccessCode}
                    className="mt-0.5 accent-emerald-500 rounded"
                  />
                  <div>
                    <strong className="block text-[#F7DECA] text-xs">
                      Exigir Código Geral de Acesso à Sala
                    </strong>
                    <span className="text-[11px] text-[#D5C5AA]/70 block">
                      Trava de segurança coletiva para participantes presenciais.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 transition"
              >
                <Save className="w-4 h-4" />
                <span>{isPending ? "Salvando..." : "Salvar Regras de Interação"}</span>
              </button>
            </div>
          </form>

          {/* Card de Múltiplas Execuções */}
          <div className="border border-red-500/30 bg-red-950/20 p-5 sm:p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-red-400" />
                <strong className="text-sm text-red-200">
                  Ciclo de Repetição &amp; Múltiplas Execuções do Evento
                </strong>
              </div>
              <p className="text-xs text-[#D5C5AA]/80 max-w-2xl">
                O evento pode ser executado e ensaiado quantas vezes forem necessárias.
                O reinício restaura o estado para <strong>Aguardando Início</strong>, zera os tempos e desbloqueia
                o cronograma para uma nova rodada perfeita.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsResetModalOpen(true)}
              className="px-4 py-2.5 rounded-xl border border-red-500/50 bg-red-900/40 hover:bg-red-800/60 text-red-100 text-xs font-semibold shrink-0 cursor-pointer transition shadow"
            >
              Reiniciar para Nova Execução
            </button>
          </div>
        </section>
      )}

      {/* Modal Centrado de Confirmação de Reinício do Evento */}
      {isResetModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-[#0A120D] border border-red-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-500/50 text-red-400 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-base text-[#F7DECA]">
                  Reiniciar Evento para Nova Execução
                </h3>
                <p className="text-xs text-[#D5C5AA]/70">
                  Prepara a plataforma para uma nova rodada completa do evento.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#050C07] border border-white/[0.08] space-y-2 text-xs text-[#D5C5AA]/90">
              <span className="block font-semibold text-emerald-400">
                O que acontece no reinício:
              </span>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-[#D5C5AA]/80">
                <li>O evento retorna para o status <strong>Aguardando Início (WAITING)</strong>;</li>
                <li>Todas as 15 etapas e pautas voltam para <strong>Pendente</strong>;</li>
                <li>O cronômetro e alertas sonoros são zerados;</li>
                <li>A programação oficial é desbloqueada para ajustes pré-evento;</li>
                <li>Os parâmetros gerais e cadastro dos palestrantes são <strong>preservados</strong>.</li>
              </ul>
            </div>

            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-[#F7DECA]">
                <input
                  type="checkbox"
                  checked={clearQuestionsCheck}
                  onChange={(e) => setClearQuestionsCheck(e.target.checked)}
                  className="accent-red-500 rounded"
                />
                <span>Limpar perguntas de teste da plateia (preserva reservas)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-[#F7DECA]">
                <input
                  type="checkbox"
                  checked={clearVotesCheck}
                  onChange={(e) => setClearVotesCheck(e.target.checked)}
                  className="accent-red-500 rounded"
                />
                <span>Limpar votos da votação da Mesa-Redonda</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-3.5 py-2 rounded-xl border border-white/[0.1] bg-[#050C07] text-xs text-[#D5C5AA] hover:text-white hover:bg-white/[0.05] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleResetEventSubmit}
                disabled={isPending}
                className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white font-semibold text-xs transition cursor-pointer shadow-lg disabled:opacity-50"
              >
                {isPending ? "Reiniciando..." : "Sim, Reiniciar Evento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
