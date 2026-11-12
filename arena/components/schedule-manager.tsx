"use client";

import { PageHeader, Tabs, SearchBox, Toast, EmptyState } from "@/components/admin-ui";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  CalendarClock,
  Clock,
  Layers,
  Lock,
  Unlock,
  Edit3,
  CheckCircle2,
  AlertCircle,
  X,
  Search,
  Filter,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Sliders,
  ChevronRight,
  UserCheck,
} from "lucide-react";
import { formatSecondsMMSS, ARENA_MODE_LABELS } from "@/lib/events";
import { getSpeakerPhoto } from "@/lib/speakers";
import { ArenaMode } from "@prisma/client";

interface StepItem {
  id: string;
  code: string;
  title: string;
  sequenceOrder: number;
  macroOrder?: number | null;
  isMacroBlock: boolean;
  durationSec: number;
  responsibleName: string | null;
  arenaMode: ArenaMode;
  status: string;
  topicId?: string | null;
  speakerId?: string | null;
}

interface SpeakerItem {
  id: string;
  name: string;
  roleTitle: string | null;
  photoUrl: string | null;
}

interface TopicItem {
  id: string;
  number: number;
  title: string;
  mainSpeaker?: { name: string } | null;
}

interface ScheduleManagerProps {
  event: {
    id: string;
    name: string;
    status: string;
    scheduleLocked: boolean;
    certifiedHours: number;
    programmedDurationMin: number;
  };
  macroSteps: StepItem[];
  operationalSteps: StepItem[];
  speakers: SpeakerItem[];
  topics: TopicItem[];
  onUpdateStep: (formData: FormData) => Promise<void>;
  onToggleLock: (locked: boolean, justification?: string) => Promise<void>;
}

export function ScheduleManager({
  event,
  macroSteps: initialMacroSteps,
  operationalSteps: initialOpSteps,
  speakers,
  topics,
  onUpdateStep,
  onToggleLock,
}: ScheduleManagerProps) {
  const [activeTab, setActiveTab] = useState<"macro" | "operational">("macro");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingStep, setEditingStep] = useState<StepItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modal de bloqueio/desbloqueio
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [lockJustification, setLockJustification] = useState("");

  const isLocked = event.status === "LIVE" || event.scheduleLocked;

  const totalMacroSec = useMemo(
    () => initialMacroSteps.reduce((acc, s) => acc + s.durationSec, 0),
    [initialMacroSteps]
  );
  const totalOpSec = useMemo(
    () => initialOpSteps.reduce((acc, s) => acc + s.durationSec, 0),
    [initialOpSteps]
  );

  const filteredMacro = useMemo(() => {
    if (!searchTerm.trim()) return initialMacroSteps;
    const term = searchTerm.toLowerCase();
    return initialMacroSteps.filter(
      (s) =>
        s.title.toLowerCase().includes(term) ||
        (s.responsibleName && s.responsibleName.toLowerCase().includes(term))
    );
  }, [initialMacroSteps, searchTerm]);

  const filteredOp = useMemo(() => {
    if (!searchTerm.trim()) return initialOpSteps;
    const term = searchTerm.toLowerCase();
    return initialOpSteps.filter(
      (s) =>
        s.title.toLowerCase().includes(term) ||
        (s.responsibleName && s.responsibleName.toLowerCase().includes(term))
    );
  }, [initialOpSteps, searchTerm]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const handleSaveStep = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingStep) return;

    const formData = new FormData(e.currentTarget);
    formData.set("stepId", editingStep.id);

    startTransition(async () => {
      try {
        await onUpdateStep(formData);
        showToast("Etapa atualizada com sucesso no cronograma!", "success");
        setEditingStep(null);
      } catch (err: any) {
        showToast(err?.message || "Erro ao atualizar etapa", "error");
      }
    });
  };

  const handleToggleLockSubmit = () => {
    const nextLocked = !event.scheduleLocked;
    startTransition(async () => {
      try {
        await onToggleLock(nextLocked, lockJustification);
        showToast(
          nextLocked
            ? "Programação bloqueada contra edições acidentais."
            : "Programação desbloqueada para ajustes.",
          "success"
        );
        setIsLockModalOpen(false);
        setLockJustification("");
      } catch (err: any) {
        showToast(err?.message || "Erro ao alterar bloqueio", "error");
      }
    });
  };

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <PageHeader
        title="Cronograma"
        stats={[
          { label: "Duração", value: `${Math.round(totalMacroSec / 60)} min` },
          { label: "Carga certificada", value: `${event.certifiedHours} h` },
        ]}
        actions={
          <button
            onClick={() => setIsLockModalOpen(true)}
            className={`px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer ring-1 transition ${
              isLocked
                ? "text-amber-300 ring-amber-500/40 hover:bg-amber-950/30"
                : "text-emerald-300 ring-emerald-500/40 hover:bg-emerald-950/30"
            }`}
          >
            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            {isLocked ? "Bloqueado" : "Editável"}
          </button>
        }
      />

      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        items={[
          { key: "macro", label: "Programação", count: initialMacroSteps.length },
          { key: "operational", label: "Fases de palco", count: initialOpSteps.length },
        ]}
        right={<SearchBox value={searchTerm} onChange={setSearchTerm} placeholder="Etapa ou palestrante…" />}
      />

      {(() => {
        const rows = activeTab === "macro" ? filteredMacro : filteredOp;
        if (rows.length === 0) return <EmptyState text="Nada encontrado." />;
        return (
          <div className="divide-y divide-[#D5C5AA]/10">
            {rows.map((step) => {
              const n = step.isMacroBlock ? step.macroOrder : step.sequenceOrder;
              const live = step.status === "RUNNING";
              return (
                <button
                  key={step.id}
                  onClick={() => setEditingStep(step)}
                  className="w-full text-left flex items-center gap-4 px-2 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer group"
                >
                  <span className="w-7 text-right font-mono text-xs text-[#D5C5AA]/40 tabular-nums">
                    {String(n ?? "").padStart(2, "0")}
                  </span>
                  <img
                    src={getSpeakerPhoto(step.responsibleName)}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover ring-1 ring-[#D5C5AA]/20 shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = "/img/auditorio.png"; }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-[#F7DECA] truncate">{step.title}</span>
                    <span className="block text-xs text-[#D5C5AA]/50 truncate">
                      {step.responsibleName || "Organização"}
                      {!step.isMacroBlock && ` · ${ARENA_MODE_LABELS[step.arenaMode] || step.arenaMode}`}
                    </span>
                  </span>
                  {live && <span className="text-[10px] font-semibold text-emerald-400 animate-pulse">AO VIVO</span>}
                  {step.status === "COMPLETED" && <CheckCircle2 className="w-4 h-4 text-emerald-600/70" />}
                  <span className="font-mono text-sm text-[#D5C5AA]/80 tabular-nums w-14 text-right">
                    {formatSecondsMMSS(step.durationSec)}
                  </span>
                  <Edit3 className="w-3.5 h-3.5 text-[#D5C5AA]/30 group-hover:text-emerald-400 transition-colors" />
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* Modal Centrado de Edição de Etapa */}
      {editingStep && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div className="w-full max-w-xl bg-[#0A120D] border border-white/[0.1] rounded-2xl p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <img
                  src={getSpeakerPhoto(editingStep.responsibleName)}
                  alt="Palestrante"
                  className="w-12 h-12 rounded-xl object-cover ring-1 ring-white/[0.1] bg-[#050C07]"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/img/auditorio.png";
                  }}
                />
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-emerald-400">
                    {editingStep.isMacroBlock
                      ? `Etapa Macro #${editingStep.macroOrder}`
                      : `Fase Operacional #${editingStep.sequenceOrder}`}
                  </span>
                  <h2 className="font-display text-lg text-[#F7DECA]">
                    Editar Programação da Etapa
                  </h2>
                </div>
              </div>
              <button
                onClick={() => setEditingStep(null)}
                className="text-[#D5C5AA]/60 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStep} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#D5C5AA]/80 font-medium mb-1.5">
                  Título da Etapa
                </label>
                <input
                  type="text"
                  name="title"
                  defaultValue={editingStep.title}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.1] bg-[#050C07] text-[#F7DECA] focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#D5C5AA]/80 font-medium mb-1.5">
                    Responsável / Palestrante
                  </label>
                  <input
                    type="text"
                    name="responsibleName"
                    defaultValue={editingStep.responsibleName || ""}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.1] bg-[#050C07] text-[#F7DECA] focus:outline-none focus:border-emerald-500/60"
                  />
                  {/* Atalhos rápidos de palestrantes */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {speakers.map((sp) => (
                      <button
                        key={sp.id}
                        type="button"
                        onClick={(e) => {
                          const input = (e.currentTarget.form?.elements.namedItem("responsibleName") as HTMLInputElement);
                          if (input) input.value = sp.name;
                        }}
                        className="px-2 py-0.5 rounded-md bg-[#050C07] border border-white/[0.08] text-[10px] text-[#D5C5AA]/70 hover:text-white hover:border-white/[0.2] transition"
                      >
                        {sp.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[#D5C5AA]/80 font-medium mb-1.5">
                    Duração em Segundos
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      name="durationSec"
                      defaultValue={editingStep.durationSec}
                      required
                      min={10}
                      max={7200}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.1] bg-[#050C07] text-[#F7DECA] font-mono focus:outline-none focus:border-emerald-500/60"
                    />
                    <div className="shrink-0 flex gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          const input = (e.currentTarget.form?.elements.namedItem("durationSec") as HTMLInputElement);
                          if (input) input.value = "300"; // 5 min
                        }}
                        className="px-2.5 py-2 rounded-lg bg-[#050C07] border border-white/[0.08] text-[11px] font-mono text-[#D5C5AA]/80 hover:text-white transition"
                      >
                        5m
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          const input = (e.currentTarget.form?.elements.namedItem("durationSec") as HTMLInputElement);
                          if (input) input.value = "900"; // 15 min
                        }}
                        className="px-2.5 py-2 rounded-lg bg-[#050C07] border border-white/[0.08] text-[11px] font-mono text-[#D5C5AA]/80 hover:text-white transition"
                      >
                        15m
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          const input = (e.currentTarget.form?.elements.namedItem("durationSec") as HTMLInputElement);
                          if (input) input.value = "1200"; // 20 min
                        }}
                        className="px-2.5 py-2 rounded-lg bg-[#050C07] border border-white/[0.08] text-[11px] font-mono text-[#D5C5AA]/80 hover:text-white transition"
                      >
                        20m
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {!editingStep.isMacroBlock && (
                <div>
                  <label className="block text-[#D5C5AA]/80 font-medium mb-1.5">
                    Modo do Telão ARENA
                  </label>
                  <select
                    name="arenaMode"
                    defaultValue={editingStep.arenaMode}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.1] bg-[#050C07] text-[#F7DECA] focus:outline-none focus:border-emerald-500/60"
                  >
                    {Object.entries(ARENA_MODE_LABELS).map(([mode, label]) => (
                      <option key={mode} value={mode}>
                        {label} ({mode})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {isLocked && (
                <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-950/20 space-y-1.5">
                  <label className="block text-amber-300 font-semibold text-[11px] flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span>Justificativa Administrativa Obrigatória (Evento ao Vivo)</span>
                  </label>
                  <input
                    type="text"
                    name="justification"
                    required
                    placeholder="Ex: Ajuste solicitado pela coordenação de palco"
                    className="w-full px-3 py-2 rounded-lg border border-amber-500/50 bg-[#050C07] text-[#F7DECA] focus:outline-none focus:border-amber-400"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setEditingStep(null)}
                  className="px-4 py-2 rounded-xl border border-white/[0.1] bg-[#050C07] text-[#D5C5AA] hover:text-white hover:bg-white/[0.05] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 transition"
                >
                  {isPending ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Centrado de Bloqueio/Desbloqueio de Programação */}
      {isLockModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-[#0A120D] border border-white/[0.1] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  event.scheduleLocked
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                }`}
              >
                {event.scheduleLocked ? (
                  <Unlock className="w-5 h-5" />
                ) : (
                  <Lock className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="font-display text-base text-[#F7DECA]">
                  {event.scheduleLocked
                    ? "Desbloquear Programação"
                    : "Bloquear Programação Oficial"}
                </h3>
                <p className="text-xs text-[#D5C5AA]/70">
                  {event.scheduleLocked
                    ? "Permitirá ajustes livres nas durações e títulos de todas as etapas."
                    : "Bloqueará as etapas para prevenir modificações acidentais durante a transmissão."}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block text-[#D5C5AA]/80 font-medium">
                Justificativa para o Registro de Auditoria (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Ajuste fino antes do início do painel..."
                value={lockJustification}
                onChange={(e) => setLockJustification(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-white/[0.1] bg-[#050C07] text-[#F7DECA] focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => setIsLockModalOpen(false)}
                className="px-3.5 py-2 rounded-xl border border-white/[0.1] bg-[#050C07] text-xs text-[#D5C5AA] hover:text-white hover:bg-white/[0.05] transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleToggleLockSubmit}
                disabled={isPending}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition cursor-pointer shadow-lg disabled:opacity-50"
              >
                {isPending
                  ? "Processando..."
                  : event.scheduleLocked
                  ? "Confirmar Desbloqueio"
                  : "Confirmar Bloqueio"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
