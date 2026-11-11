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
            className={`border p-6 sm:p-8 rounded-2xl space-y-6 ${
              isOpen
                ? "border-2 border-[#14532D] bg-emerald-950/20"
                : "border-[#D5C5AA]/25 bg-[#0A150D]/90"
            }`}
          >
            {/* Cabeçalho da Votação Oficial da Mesa-Redonda */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-[#14532D] text-white font-bold flex items-center gap-1.5">
                  <Vote className="w-3.5 h-3.5" />
                  Votação Oficial da Mesa-Redonda (Aberta durante a Pauta 5)
                </span>
                <span
                  className={`px-3 py-1 rounded-full font-bold ${
                    isOpen
                      ? "bg-emerald-600 text-white"
                      : isPublished
                        ? "bg-amber-600 text-white"
                        : "bg-slate-800 text-[#D5C5AA]"
                  }`}
                >
                  {poll.status === "OPEN"
                    ? "● VOTAÇÃO ABERTA AO PÚBLICO"
                    : poll.status === "TIE_BREAK"
                      ? "⚡ RODADA DE DESEMPATE (2 MIN)"
                      : isPublished
                        ? "✓ RESULTADO PUBLICADO & BLOQUEADO"
                        : "PREPARADA (AGUARDANDO PAUTA 5)"}
                </span>
              </div>

              <div className="flex items-center gap-3 font-mono">
                <span className="text-[#F7DECA] font-bold text-sm">
                  {poll.totalVotes} votos válidos
                </span>
                <span className="text-[#D5C5AA]/75">
                  · Registros em VoteHistory: {voteHistoryCount}
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
                className="space-y-4 text-xs bg-[#030A06] p-5 rounded-xl border border-[#D5C5AA]/25"
              >
                <input type="hidden" name="pollId" value={poll.id} />
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-3">
                    <label className="block font-semibold text-[#D5C5AA]/80 mb-1">
                      Título da Votação da Mesa-Redonda
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
                      Duração de Referência (seg)
                    </label>
                    <input
                      type="number"
                      name="durationSec"
                      defaultValue={poll.durationSec}
                      required
                      className="w-full px-3 py-2 border border-[#D5C5AA]/30 bg-[#0A150D] text-[#F7DECA]"
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
                      className="p-3 border border-[#D5C5AA]/20 rounded-xl space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#14532D]">
                          Questão {opt.optionOrder}:
                        </span>
                        <input
                          type="text"
                          name={`theme_${opt.id}`}
                          defaultValue={
                            opt.themeLabel || `Questão ${opt.optionOrder}`
                          }
                          placeholder="Eixo temático"
                          className="w-72 px-2.5 py-1 border border-[#D5C5AA]/30 bg-[#0A150D] text-[#F7DECA]"
                        />
                      </div>
                      <textarea
                        rows={2}
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
                    className="px-3 py-1.5 border border-[#D5C5AA]/30 text-[#D5C5AA] font-semibold rounded-xl cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-4 py-1.5 bg-[#D5C5AA] text-[#030A06] font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Salvar Questões da Votação</span>
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h2 className="font-display text-xl sm:text-2xl text-[#F7DECA]">
                  {poll.question}
                </h2>

                {/* Apuração em Tempo Real das 3 Questões Candidatas */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
                  {poll.options.map((opt) => {
                    const pct =
                      poll.totalVotes > 0
                        ? Math.round(
                            (opt.votesCount / poll.totalVotes) * 1000
                          ) / 10
                        : 0;
                    const isOfficialWinner = poll.winningOptionId === opt.id;
                    const isLeading =
                      maxVotes > 0 && opt.votesCount === maxVotes;

                    return (
                      <div
                        key={opt.id}
                        className={`border p-4 rounded-2xl flex flex-col justify-between gap-4 ${
                          isOfficialWinner
                            ? "border-2 border-amber-400 bg-amber-950/20"
                            : isLeading
                              ? "border-2 border-[#14532D] bg-[#030A06]"
                              : "border-[#D5C5AA]/20 bg-[#030A06]"
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold uppercase tracking-wider text-[#14532D]">
                              {opt.themeLabel || `Questão ${opt.optionOrder}`}
                            </span>
                            {isOfficialWinner && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center gap-1">
                                <Trophy className="w-3 h-3" />
                                VENCEDORA
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-[#F7DECA] leading-relaxed font-medium">
                            &ldquo;{opt.label}&rdquo;
                          </p>
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-[#D5C5AA]/15">
                          <div className="flex items-center justify-between font-mono">
                            <span className="text-[#D5C5AA]">
                              {opt.votesCount} votos
                            </span>
                            <strong className="text-base text-[#F7DECA]">
                              {pct}%
                            </strong>
                          </div>
                          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                isOfficialWinner
                                  ? "bg-amber-400"
                                  : "bg-[#14532D]"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Alerta de Empate e Regra de Desempate (§7) */}
                {hasTie && (
                  <div className="border-2 border-amber-500/60 bg-amber-950/30 p-5 rounded-2xl space-y-3 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                        <AlertTriangle className="w-5 h-5" />
                        <span>
                          Empate Detectado no 1º Lugar ({maxVotes} votos cada)!
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          runPollAction(() =>
                            startPollTieBreakRoundAction(poll.id)
                          )
                        }
                        className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                      >
                        <Zap className="w-4 h-4" />
                        <span>
                          Iniciar Rodada de Desempate (2 Minutos)
                        </span>
                      </button>
                    </div>
                    <p className="text-[#D5C5AA]">
                      Regra Oficial (§7): Em caso de empate, você pode abrir uma{" "}
                      <strong>rodada rápida de 2 minutos</strong> apenas entre
                      as opções empatadas ou registrar abaixo a{" "}
                      <strong>
                        combinação das duas questões / decisão justificada pelo
                        mediador
                      </strong>{" "}
                      (com registro obrigatório no log de auditoria).
                    </p>
                  </div>
                )}

                {/* Consolidação da Questão Vencedora e Envio para a Mesa-Redonda */}
                <form
                  action={(fd) =>
                    runPollAction(() =>
                      setPollWinnerAndSendToRoundtableAction(fd)
                    )
                  }
                  className="border border-[#D5C5AA]/25 bg-[#030A06] p-5 rounded-2xl space-y-4 text-xs"
                >
                  <input type="hidden" name="pollId" value={poll.id} />
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-base text-[#F7DECA] flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      Definição Oficial da Questão da Mesa-Redonda (20 min)
                    </h3>
                    {poll.winningQuestionText && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/50 text-emerald-300 border border-emerald-500/30 font-semibold">
                        Questão Oficial Consolidada
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                    <div className="lg:col-span-4">
                      <label className="block font-semibold text-[#D5C5AA]/80 mb-1">
                        Opção Vencedora
                      </label>
                      <select
                        name="winningOptionId"
                        defaultValue={
                          poll.winningOptionId || autoLeadingOption?.id || ""
                        }
                        className="w-full px-3 py-2 border border-[#D5C5AA]/30 bg-[#0A150D] text-[#F7DECA] rounded-lg"
                      >
                        {poll.options.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.themeLabel || `Questão ${opt.optionOrder}`} (
                            {opt.votesCount} votos)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="lg:col-span-8">
                      <label className="block font-semibold text-[#D5C5AA]/80 mb-1">
                        Texto Exibido na Mesa-Redonda (ou Síntese Combinada em
                        caso de empate)
                      </label>
                      <input
                        type="text"
                        name="winningQuestionText"
                        defaultValue={
                          poll.winningQuestionText ||
                          autoLeadingOption?.label ||
                          ""
                        }
                        placeholder="Deixe em branco para usar automaticamente o texto da opção selecionada"
                        className="w-full px-3 py-2 border border-[#D5C5AA]/30 bg-[#0A150D] text-[#F7DECA] rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
                    <div className="lg:col-span-7">
                      <label className="block font-semibold text-[#D5C5AA]/80 mb-1">
                        Justificativa de Desempate / Observação da Mediação
                        (Registrada em AuditLog)
                      </label>
                      <input
                        type="text"
                        name="tieBreakJustification"
                        defaultValue={poll.tieBreakJustification || ""}
                        placeholder="Obrigatório se houver fusão de questões empatadas ou decisão pela mediação"
                        className="w-full px-3 py-2 border border-[#D5C5AA]/30 bg-[#0A150D] text-[#F7DECA] rounded-lg"
                      />
                    </div>

                    <div className="lg:col-span-5 flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="submit"
                        name="sendToRoundtableNow"
                        value="false"
                        disabled={isPending}
                        className="px-3.5 py-2 border border-[#D5C5AA]/30 bg-[#0A150D] text-[#F7DECA] font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer"
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-[#14532D]" />
                        <span>Publicar Resultado na ARENA</span>
                      </button>

                      <button
                        type="submit"
                        name="sendToRoundtableNow"
                        value="true"
                        disabled={isPending}
                        className="px-4 py-2 bg-[#14532D] text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Enviar Questão para Mesa-Redonda</span>
                      </button>
                    </div>
                  </div>
                </form>
              </>
            )}

            {/* Controles Operacionais da Votação */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#D5C5AA]/15 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                {!isOpen ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      runPollAction(() => openPollByIdAction(poll.id))
                    }
                    className="px-4 py-2 bg-[#D5C5AA] text-[#030A06] font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Abrir Votação (Durante a Pauta 5)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      runPollAction(() => closePollByIdAction(poll.id, true))
                    }
                    className="px-4 py-2 bg-amber-600 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Encerrar Votação & Bloquear Votos</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditingPollId(isEditing ? null : poll.id)}
                  className="px-3 py-1.5 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar 3 Questões</span>
                </button>
                {poll.totalVotes > 0 && !isOpen && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Deseja zerar os ${poll.totalVotes} votos desta votação (Modo Ensaio)?`
                        )
                      ) {
                        runPollAction(() => resetPollVotesAction(poll.id));
                      }
                    }}
                    className="px-3 py-1.5 border border-red-500/30 bg-red-950/30 text-red-300 rounded-xl flex items-center gap-1 cursor-pointer"
                    title="Zerar votos (Modo Ensaio)"
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
