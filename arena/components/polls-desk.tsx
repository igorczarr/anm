"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useArenaSync } from "@/hooks/use-arena-sync";
import {
  closePollByIdAction,
  openPollByIdAction,
  resetPollVotesAction,
  setPollWinnerAndSendToRoundtableAction,
  startPollTieBreakRoundAction,
  updatePollQuestionAndOptionsAction,
} from "@/app/actions/curation-and-polls";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Edit3,
  Play,
  RotateCcw,
  Save,
  Square,
  Trophy,
  Vote,
  Zap,
} from "lucide-react";

interface PollAdminItem {
  id: string;
  number: number;
  question: string;
  status: "DRAFT" | "OPEN" | "TIE_BREAK" | "CLOSED" | "RESULTS_PUBLISHED";
  durationSec: number;
  totalVotes: number;
  winningOptionId: string | null;
  winningQuestionText: string | null;
  isTieBreak: boolean;
  tieBreakOptionIds: string[];
  tieBreakJustification: string | null;
  topic: {
    id: string;
    number: number;
    title: string;
    mainSpeaker: { name: string };
  } | null;
  options: Array<{
    id: string;
    optionOrder: number;
    themeLabel: string | null;
    label: string;
    votesCount: number;
  }>;
}

export function PollsDesk() {
  const { snapshot } = useArenaSync({ isAdmin: true });
  const [isPending, startTransition] = useTransition();
  const [polls, setPolls] = useState<PollAdminItem[]>([]);
  const [voteHistoryCount, setVoteHistoryCount] = useState<number>(0);
  const [editingPollId, setEditingPollId] = useState<string | null>(null);

  const fetchPolls = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/curation", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setPolls(data.polls || []);
      setVoteHistoryCount(data.voteHistoryCount || 0);
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
    <div className="space-y-6">
      {polls.map((poll) => {
        const isOpen = poll.status === "OPEN" || poll.status === "TIE_BREAK";
        const isPublished = poll.status === "RESULTS_PUBLISHED";
        const isEditing = editingPollId === poll.id;

        const maxVotes = Math.max(...poll.options.map((o) => o.votesCount), 0);
        const topOptions = poll.options.filter(
          (o) => o.votesCount === maxVotes && maxVotes > 0
        );
        const hasTie = topOptions.length > 1;
        const autoLeadingOption = topOptions[0] || poll.options[0];

        return (
          <div
            key={poll.id}
            className={`bg-[#0A120D]/90 border rounded-2xl p-6 sm:p-7 space-y-6 shadow-xl backdrop-blur-sm transition ${
              isOpen
                ? "border-emerald-500/40 ring-1 ring-emerald-500/30"
                : "border-white/[0.08]"
            }`}
          >
            {/* 1. Cabeçalho de Status & Votos */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-white/[0.06] pb-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-300 font-semibold text-xs ring-1 ring-emerald-500/30 flex items-center gap-1.5">
                  <Vote className="w-3.5 h-3.5 text-emerald-400" />
                  Votação Oficial da Mesa-Redonda (Ativa em background)
                </span>

                <span
                  className={`px-3 py-1 rounded-xl text-xs font-semibold ${
                    poll.status === "OPEN"
                      ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/50"
                      : poll.status === "TIE_BREAK"
                        ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/50 animate-pulse"
                        : isPublished
                          ? "bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/40"
                          : "bg-white/[0.06] text-[#D5C5AA]/70"
                  }`}
                >
                  {poll.status === "OPEN"
                    ? "● VOTAÇÃO ABERTA AO PÚBLICO"
                    : poll.status === "TIE_BREAK"
                      ? "⚡ RODADA DE DESEMPATE (2 MIN)"
                      : isPublished
                        ? "✓ RESULTADO CONSOLIDADO"
                        : "PREPARADA"}
                </span>
              </div>

              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="text-[#F7DECA] font-bold text-sm tabular-nums">
                  {poll.totalVotes} votos válidos
                </span>
                <span className="text-[#D5C5AA]/50">
                  · Registros de Auditoria: {voteHistoryCount}
                </span>
              </div>
            </div>

            {/* 2. Conteúdo da Votação / Modo Edição */}
            {isEditing ? (
              <form
                action={(fd) =>
                  runPollAction(async () => {
                    await updatePollQuestionAndOptionsAction(fd);
                    setEditingPollId(null);
                  })
                }
                className="space-y-4 text-xs bg-[#050C07] p-5 rounded-xl border border-white/[0.08]"
              >
                <input type="hidden" name="pollId" value={poll.id} />
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-3">
                    <label className="block font-medium text-[#D5C5AA]/80 mb-1">
                      Título Geral da Votação
                    </label>
                    <input
                      type="text"
                      name="question"
                      defaultValue={poll.question}
                      required
                      className="w-full px-3.5 py-2 rounded-xl bg-[#0A120D] border border-white/[0.1] text-[#F7DECA] text-xs focus:outline-none focus:border-emerald-500/60"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[#D5C5AA]/80 mb-1">
                      Duração Estimada (seg)
                    </label>
                    <input
                      type="number"
                      name="durationSec"
                      defaultValue={poll.durationSec}
                      required
                      className="w-full px-3.5 py-2 rounded-xl bg-[#0A120D] border border-white/[0.1] text-[#F7DECA] font-mono text-xs focus:outline-none focus:border-emerald-500/60"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="font-semibold text-[#D5C5AA]/80 block">
                    As 3 Questões Candidatas para a Mesa-Redonda:
                  </span>
                  {poll.options.map((opt) => (
                    <div
                      key={opt.id}
                      className="p-3.5 rounded-xl bg-[#0A120D] border border-white/[0.06] space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-emerald-400 text-xs">
                          Questão {opt.optionOrder}:
                        </span>
                        <input
                          type="text"
                          name={`theme_${opt.id}`}
                          defaultValue={opt.themeLabel || `Questão ${opt.optionOrder}`}
                          placeholder="Eixo temático"
                          className="w-72 px-2.5 py-1 rounded-lg bg-[#050C07] border border-white/[0.08] text-[#F7DECA] text-xs focus:outline-none focus:border-emerald-500/60"
                        />
                      </div>
                      <textarea
                        rows={2}
                        name={`option_${opt.id}`}
                        defaultValue={opt.label}
                        required
                        className="w-full px-3 py-1.5 rounded-lg bg-[#050C07] border border-white/[0.08] text-[#F7DECA] text-xs focus:outline-none focus:border-emerald-500/60"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingPollId(null)}
                    className="px-3.5 py-1.5 rounded-xl border border-white/[0.1] text-[#D5C5AA] text-xs hover:bg-white/[0.05] cursor-pointer transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-1.5 bg-[#D5C5AA] hover:bg-[#F7DECA] text-[#030A06] font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Questões</span>
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h2 className="font-display text-xl sm:text-2xl text-[#F7DECA]">
                  {poll.question}
                </h2>

                {/* Grid das 3 Opções de Questão */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
                  {poll.options.map((opt) => {
                    const pct =
                      poll.totalVotes > 0
                        ? Math.round((opt.votesCount / poll.totalVotes) * 1000) / 10
                        : 0;
                    const isOfficialWinner = poll.winningOptionId === opt.id;
                    const isLeading = maxVotes > 0 && opt.votesCount === maxVotes;

                    return (
                      <div
                        key={opt.id}
                        className={`p-5 rounded-2xl flex flex-col justify-between gap-4 transition shadow-md ${
                          isOfficialWinner
                            ? "bg-amber-950/20 border-2 border-amber-500/60"
                            : isLeading
                              ? "bg-emerald-950/20 border-2 border-emerald-500/40"
                              : "bg-[#050C07] border border-white/[0.08]"
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold uppercase tracking-wider text-emerald-400 text-[11px]">
                              {opt.themeLabel || `Questão ${opt.optionOrder}`}
                            </span>
                            {isOfficialWinner ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-[#030A06] font-bold text-[10px] flex items-center gap-1 shadow-sm">
                                <Trophy className="w-3 h-3" />
                                VENCEDORA
                              </span>
                            ) : isLeading ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold text-[10px] ring-1 ring-emerald-500/40">
                                Na frente
                              </span>
                            ) : null}
                          </div>
                          <p className="text-sm text-[#F7DECA] leading-relaxed font-medium">
                            &ldquo;{opt.label}&rdquo;
                          </p>
                        </div>

                        <div className="space-y-1.5 pt-3 border-t border-white/[0.06]">
                          <div className="flex items-center justify-between font-mono">
                            <span className="text-[#D5C5AA]/70 text-xs">
                              {opt.votesCount} {opt.votesCount === 1 ? "voto" : "votos"}
                            </span>
                            <strong className="text-base text-[#F7DECA] tabular-nums font-bold">
                              {pct}%
                            </strong>
                          </div>
                          <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 rounded-full ${
                                isOfficialWinner
                                  ? "bg-amber-400"
                                  : isLeading
                                    ? "bg-emerald-500"
                                    : "bg-emerald-800"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Banner de Empate e Desempate */}
                {hasTie && (
                  <div className="border border-amber-500/50 bg-amber-950/25 p-5 rounded-2xl space-y-3 text-xs shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-amber-300 font-semibold text-sm">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <span>
                          Empate Detectado no 1º Lugar ({maxVotes} votos cada)!
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => runPollAction(() => startPollTieBreakRoundAction(poll.id))}
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-[#030A06] font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition"
                      >
                        <Zap className="w-4 h-4" />
                        <span>Iniciar Rodada de Desempate (2 Minutos)</span>
                      </button>
                    </div>
                    <p className="text-[#D5C5AA]/80 text-xs">
                      Regra Oficial: Em caso de empate, você pode abrir uma <strong>rodada de 2 minutos</strong> apenas entre as questões empatadas ou registrar abaixo a decisão sintetizada pelo mediador.
                    </p>
                  </div>
                )}

                {/* 3. Consolidação da Questão Vencedora e Envio para a Mesa-Redonda */}
                <form
                  action={(fd) =>
                    runPollAction(() => setPollWinnerAndSendToRoundtableAction(fd))
                  }
                  className="bg-[#050C07] border border-white/[0.08] p-5 rounded-2xl space-y-4 text-xs shadow-inner"
                >
                  <input type="hidden" name="pollId" value={poll.id} />
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-base text-[#F7DECA] flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      Definição Oficial da Questão da Mesa-Redonda (20 min)
                    </h3>
                    {poll.winningQuestionText && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40 text-[11px] font-semibold">
                        Questão Oficial Consolidada
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                    <div className="lg:col-span-4">
                      <label className="block font-medium text-[#D5C5AA]/80 mb-1">
                        Opção Vencedora
                      </label>
                      <select
                        name="winningOptionId"
                        defaultValue={poll.winningOptionId || autoLeadingOption?.id || ""}
                        className="w-full px-3 py-2 rounded-xl bg-[#0A120D] border border-white/[0.1] text-[#F7DECA] text-xs focus:outline-none focus:border-emerald-500/60"
                      >
                        {poll.options.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.themeLabel || `Questão ${opt.optionOrder}`} ({opt.votesCount} votos)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="lg:col-span-8">
                      <label className="block font-medium text-[#D5C5AA]/80 mb-1">
                        Texto da Questão para o Telão da Mesa-Redonda
                      </label>
                      <input
                        type="text"
                        name="winningQuestionText"
                        defaultValue={poll.winningQuestionText || autoLeadingOption?.label || ""}
                        placeholder="Deixe em branco para usar automaticamente o texto da opção vencedora"
                        className="w-full px-3 py-2 rounded-xl bg-[#0A120D] border border-white/[0.1] text-[#F7DECA] text-xs focus:outline-none focus:border-emerald-500/60"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
                    <div className="lg:col-span-7">
                      <label className="block font-medium text-[#D5C5AA]/80 mb-1">
                        Justificativa de Desempate / Observação da Mediação
                      </label>
                      <input
                        type="text"
                        name="tieBreakJustification"
                        defaultValue={poll.tieBreakJustification || ""}
                        placeholder="Obrigatório em caso de fusão de questões empatadas ou desempate manual"
                        className="w-full px-3 py-2 rounded-xl bg-[#0A120D] border border-white/[0.1] text-[#F7DECA] text-xs focus:outline-none focus:border-emerald-500/60"
                      />
                    </div>

                    <div className="lg:col-span-5 flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="submit"
                        name="sendToRoundtableNow"
                        value="false"
                        disabled={isPending}
                        className="px-3.5 py-2 rounded-xl bg-[#0A120D] hover:bg-white/[0.05] border border-white/[0.1] text-[#F7DECA] font-medium text-xs flex items-center gap-1.5 cursor-pointer transition"
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Publicar na ARENA</span>
                      </button>

                      <button
                        type="submit"
                        name="sendToRoundtableNow"
                        value="true"
                        disabled={isPending}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Enviar para Mesa-Redonda</span>
                      </button>
                    </div>
                  </div>
                </form>
              </>
            )}

            {/* 4. Barra de Ações Operacionais */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/[0.06] text-xs">
              <div className="flex flex-wrap items-center gap-2">
                {!isOpen ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => runPollAction(() => openPollByIdAction(poll.id))}
                    className="px-4 py-2 bg-[#D5C5AA] hover:bg-[#F7DECA] text-[#030A06] font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Abrir Votação</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => runPollAction(() => closePollByIdAction(poll.id, true))}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-md transition"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Encerrar &amp; Bloquear Votos</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPollId(isEditing ? null : poll.id)}
                  className="px-3 py-1.5 rounded-xl bg-[#050C07] hover:bg-white/[0.05] border border-white/[0.08] text-[#F7DECA] text-xs flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Edit3 className="w-3.5 h-3.5 text-[#D5C5AA]/70" />
                  <span>Editar 3 Questões</span>
                </button>

                {poll.totalVotes > 0 && !isOpen && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Deseja zerar os ${poll.totalVotes} votos desta votação para reiniciar ensaio?`
                        )
                      ) {
                        runPollAction(() => resetPollVotesAction(poll.id));
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-red-950/20 hover:bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-1 cursor-pointer transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Zerar Ensaio</span>
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
