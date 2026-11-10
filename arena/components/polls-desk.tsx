"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useArenaSync } from "@/hooks/use-arena-sync";
import {
  closePollByIdAction,
  openPollByIdAction,
  resetPollVotesAction,
  updatePollQuestionAndOptionsAction,
} from "@/app/actions/curation-and-polls";
import {
  BarChart3,
  CheckCircle2,
  Edit3,
  Play,
  RotateCcw,
  Save,
  Square,
  Vote,
} from "lucide-react";

interface PollAdminItem {
  id: string;
  number: number;
  question: string;
  status: "DRAFT" | "OPEN" | "CLOSED" | "RESULTS_PUBLISHED";
  durationSec: number;
  totalVotes: number;
  topic: {
    id: string;
    number: number;
    title: string;
    mainSpeaker: { name: string };
  };
  options: Array<{
    id: string;
    optionOrder: number;
    label: string;
    votesCount: number;
  }>;
}

export function PollsDesk() {
  const { snapshot } = useArenaSync({ isAdmin: true });
  const [isPending, startTransition] = useTransition();
  const [polls, setPolls] = useState<PollAdminItem[]>([]);
  const [editingPollId, setEditingPollId] = useState<string | null>(null);

  const fetchPolls = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/curation", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setPolls(data.polls || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchPolls();
  }, [fetchPolls, snapshot?.seq]);

  const runPollAction = (fn: () => Promise<void>) => {
    startTransition(async () => {
      await fn();
      await fetchPolls();
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {polls.map((poll) => {
        const isOpen = poll.status === "OPEN";
        const isPublished = poll.status === "RESULTS_PUBLISHED";
        const isEditing = editingPollId === poll.id;

        return (
          <div
            key={poll.id}
            className={`border p-6 rounded-2xl space-y-5 flex flex-col justify-between ${
              isOpen
                ? "border-2 border-[#14532D] bg-emerald-950/30"
                : "border-[#D5C5AA]/20 bg-[#0A150D]/85"
            }`}
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="px-3 py-1 rounded-full bg-[#14532D] text-white font-bold flex items-center gap-1.5">
                  <Vote className="w-3.5 h-3.5" />
                  Pauta {poll.number} · {poll.topic.mainSpeaker.name}
                </span>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                      isOpen
                        ? "bg-emerald-600 text-white"
                        : isPublished
                        ? "bg-amber-600 text-white"
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {isOpen
                      ? "● VOTAÇÃO ABERTA"
                      : isPublished
                      ? "RESULTADO PUBLICADO"
                      : poll.status}
                  </span>
                  <span className="font-mono font-bold text-[#F7DECA]">
                    {poll.totalVotes} votos
                  </span>
                </div>
              </div>

              {isEditing ? (
                <form
                  action={(fd) =>
                    runPollAction(async () => {
                      await updatePollQuestionAndOptionsAction(fd);
                      setEditingPollId(null);
                    })
                  }
                  className="space-y-3 text-xs bg-[#030A06] p-4 rounded-xl border border-[#D5C5AA]/25"
                >
                  <input type="hidden" name="pollId" value={poll.id} />
                  <div>
                    <label className="block font-semibold text-[#D5C5AA]/80 mb-1">
                      Pergunta da Votação {poll.number}
                    </label>
                    <input
                      type="text"
                      name="question"
                      defaultValue={poll.question}
                      required
                      className="w-full px-3 py-2 border border-[#D5C5AA]/30 bg-[#0A150D] text-[#F7DECA]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#D5C5AA]/80 mb-1">
                      Tempo de Votação (segundos)
                    </label>
                    <input
                      type="number"
                      name="durationSec"
                      defaultValue={poll.durationSec}
                      required
                      className="w-32 px-3 py-1.5 border border-[#D5C5AA]/30 bg-[#0A150D] text-[#F7DECA]"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="font-semibold text-[#D5C5AA]/80 block">
                      Alternativas:
                    </span>
                    {poll.options.map((opt) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <span className="font-bold text-[#14532D]">
                          {opt.optionOrder}.
                        </span>
                        <input
                          type="text"
                          name={`option_${opt.id}`}
                          defaultValue={opt.label}
                          required
                          className="w-full px-3 py-1.5 border border-[#D5C5AA]/30 bg-[#0A150D] text-[#F7DECA]"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingPollId(null)}
                      className="px-3 py-1.5 border border-slate-300 text-slate-700 font-semibold rounded-xl cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="px-3.5 py-1.5 bg-[#D5C5AA] text-[#030A06] font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Salvar Enquete</span>
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <h2 className="font-bold text-sm sm:text-base text-[#F7DECA] leading-snug">
                    {poll.question}
                  </h2>

                  {/* Gráfico de Barras ao Vivo no ADMIN (§6.2 item 7 e §6.3) */}
                  <div className="space-y-2.5 text-xs">
                    {poll.options.map((opt) => {
                      const pct =
                        poll.totalVotes > 0
                          ? Math.round(
                              (opt.votesCount / poll.totalVotes) * 1000
                            ) / 10
                          : 0;
                      return (
                        <div
                          key={opt.id}
                          className="border border-[#D5C5AA]/15 bg-[#030A06] p-3 rounded-xl space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[#F7DECA] font-medium">
                              <strong>{opt.optionOrder}.</strong> {opt.label}
                            </span>
                            <span className="font-mono font-bold text-[#F7DECA] shrink-0">
                              {opt.votesCount} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#14532D] transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Controles Operacionais da Votação (§6.2) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#D5C5AA]/15 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                {!isOpen ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      runPollAction(() => openPollByIdAction(poll.id))
                    }
                    className="px-3.5 py-2 bg-[#D5C5AA] text-[#030A06] font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Abrir Votação</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      runPollAction(() => closePollByIdAction(poll.id, false))
                    }
                    className="px-3.5 py-2 bg-amber-600 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Fechar Votação</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    runPollAction(() => closePollByIdAction(poll.id, true))
                  }
                  className="px-3.5 py-2 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-[#14532D]" />
                  <span>Exibir Resultado no Telão</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setEditingPollId(isEditing ? null : poll.id)
                  }
                  className="p-2 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] rounded-xl cursor-pointer"
                  title="Editar pergunta e alternativas"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                {poll.totalVotes > 0 && !isOpen && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Deseja zerar os ${poll.totalVotes} votos da Pauta ${poll.number}?`
                        )
                      ) {
                        runPollAction(() => resetPollVotesAction(poll.id));
                      }
                    }}
                    className="p-2 border border-red-500/30 bg-red-950/30 text-red-300 rounded-xl cursor-pointer"
                    title="Zerar votos (Modo Ensaio)"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
