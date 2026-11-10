"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useArenaSync } from "@/hooks/use-arena-sync";
import {
  QUESTION_STATUS_LABELS,
  QUESTION_STATUS_STYLES,
  QuestionStatusKey,
} from "@/lib/question-status";
import {
  displayQuestionOnArenaAction,
  moderateQuestionStatusAction,
  removeQuestionFromArenaAction,
  selectTopicQuestionSlotAction,
} from "@/app/actions/curation-and-polls";
import { toggleQuestionsOpenAction } from "@/app/actions/live-operation";
import {
  BookmarkCheck,
  Check,
  CheckCircle2,
  Clock,
  CopyX,
  Eye,
  Filter,
  MonitorPlay,
  MonitorX,
  Search,
  Sparkles,
  Star,
  XCircle,
} from "lucide-react";

interface CurationQuestion {
  id: string;
  topicId: string;
  text: string;
  status: QuestionStatusKey;
  isPrimary: boolean;
  isReserve: boolean;
  createdAt: string;
  displayedAt: string | null;
  answeredAt: string | null;
  topic: { id: string; number: number; title: string };
  session: { anonymousCode: string };
  moderatedBy: { fullName: string } | null;
  history: Array<{
    id: string;
    fromStatus: string | null;
    toStatus: string;
    note: string | null;
    createdAt: string;
  }>;
}

interface CurationTopic {
  id: string;
  number: number;
  title: string;
  primaryQuestionId: string | null;
  reserveQuestionId: string | null;
  mainSpeaker: { name: string };
  provokerLabel: string;
}

export function CurationDesk() {
  const { snapshot } = useArenaSync({ isAdmin: true });
  const [isPending, startTransition] = useTransition();
  const [topics, setTopics] = useState<CurationTopic[]>([]);
  const [questions, setQuestions] = useState<CurationQuestion[]>([]);
  const [selectedTopicFilter, setSelectedTopicFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortOrder, setSortOrder] = useState<"DESC" | "ASC">("DESC");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchCurationData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/curation", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setTopics(data.topics || []);
      setQuestions(data.questions || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchCurationData();
  }, [fetchCurationData, snapshot?.seq]);

  const runCurationAction = (fn: () => Promise<void>) => {
    startTransition(async () => {
      await fn();
      await fetchCurationData();
    });
  };

  const activeTopicId = snapshot?.liveState.activeTopicId ?? null;
  const displayedQuestionId = snapshot?.liveState.selectedQuestionId ?? null;
  const questionsOpen = snapshot?.liveState.questionsOpen ?? false;

  const focusedTopicId =
    selectedTopicFilter === "ALL"
      ? activeTopicId || topics[0]?.id || null
      : selectedTopicFilter;

  const focusedTopic = topics.find((t) => t.id === focusedTopicId) || null;
  const primaryQuestion = questions.find(
    (q) => q.topicId === focusedTopicId && q.isPrimary
  );
  const reserveQuestion = questions.find(
    (q) => q.topicId === focusedTopicId && q.isReserve
  );

  const filteredQuestions = questions
    .filter((q) => {
      if (selectedTopicFilter !== "ALL" && q.topicId !== selectedTopicFilter) {
        return false;
      }
      if (statusFilter !== "ALL" && q.status !== statusFilter) {
        return false;
      }
      if (
        searchQuery.trim() &&
        !q.text.toLowerCase().includes(searchQuery.trim().toLowerCase()) &&
        !q.session.anonymousCode
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const tA = new Date(a.createdAt).getTime();
      const tB = new Date(b.createdAt).getTime();
      return sortOrder === "DESC" ? tB - tA : tA - tB;
    });

  const unanalyzedCount = questions.filter(
    (q) => q.status === "RECEIVED"
  ).length;

  return (
    <div className="space-y-6">
      {/* Barra de Status de Captação e Indicador para o Mediador (§5.4 e §5.5) */}
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-5 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span
            className={`px-3 py-1 rounded-full font-bold ${
              questionsOpen
                ? "bg-emerald-950/30 text-emerald-300 border border-emerald-500/30"
                : "bg-amber-950/30 text-amber-300 border border-amber-500/30"
            }`}
          >
            {questionsOpen
              ? "Captação de Perguntas ABERTA"
              : "Captação de Perguntas ENCERRADA"}
          </span>

          <span className="px-3 py-1 rounded-full bg-sky-100 text-sky-800 font-bold">
            Não analisadas: {unanalyzedCount}
          </span>

          <span className="text-[#D5C5AA]/80">
            Total na fila: <strong>{questions.length}</strong> perguntas
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {displayedQuestionId && (
            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                runCurationAction(() => removeQuestionFromArenaAction())
              }
              className="px-3.5 py-2 bg-red-600 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <MonitorX className="w-4 h-4" />
              <span>Retirar Pergunta do Telão</span>
            </button>
          )}

          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              runCurationAction(() => toggleQuestionsOpenAction(!questionsOpen))
            }
            className="px-4 py-2 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs rounded-xl cursor-pointer"
          >
            {questionsOpen
              ? "Fechar Recebimento Manualmente"
              : "Reabrir Recebimento de Perguntas"}
          </button>
        </div>
      </div>

      {/* Painel de Seleção para o Mediador: Pergunta Principal & Reserva da Pauta (§5.4 e §5.5) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pergunta Principal */}
        <div className="border-2 border-[#14532D] bg-[#0A150D]/90 p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#14532D] uppercase tracking-wider flex items-center gap-1.5">
              <Star className="w-4 h-4" />
              Pergunta Principal ·{" "}
              {focusedTopic ? `Pauta ${focusedTopic.number}` : "Pauta Atual"}
            </span>
            {primaryQuestion ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/30 text-emerald-300 font-bold text-[11px] flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Pronta para o Mediador
              </span>
            ) : (
              <span className="text-[#D5C5AA]/70">Nenhuma selecionada</span>
            )}
          </div>

          {primaryQuestion ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-[#F7DECA] bg-[#030A06] p-3.5 rounded-xl border border-[#D5C5AA]/20">
                &ldquo;{primaryQuestion.text}&rdquo;
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[#D5C5AA]/75">
                  Status:{" "}
                  <strong>{QUESTION_STATUS_LABELS[primaryQuestion.status]}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      runCurationAction(() =>
                        displayQuestionOnArenaAction(primaryQuestion.id)
                      )
                    }
                    className="px-3.5 py-1.5 bg-[#D5C5AA] text-[#030A06] font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <MonitorPlay className="w-3.5 h-3.5" />
                    <span>Exibir no Telão ARENA</span>
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      runCurationAction(() =>
                        moderateQuestionStatusAction(
                          primaryQuestion.id,
                          "ANSWERED",
                          "Respondida no debate"
                        )
                      )
                    }
                    className="px-3 py-1.5 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] font-semibold rounded-xl cursor-pointer"
                  >
                    Marcar Respondida
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#D5C5AA]/75">
              Aprove uma pergunta da fila abaixo e clique em{" "}
              <strong>&ldquo;Definir Principal&rdquo;</strong> para encaminhá-la
              ao mediador.
            </p>
          )}
        </div>

        {/* Pergunta Reserva */}
        <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#F7DECA] uppercase tracking-wider flex items-center gap-1.5">
              <BookmarkCheck className="w-4 h-4 text-[#14532D]" />
              Pergunta Reserva ·{" "}
              {focusedTopic ? `Pauta ${focusedTopic.number}` : "Pauta Atual"}
            </span>
            {reserveQuestion ? (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-950/30 text-amber-300 font-bold text-[11px]">
                Reserva Disponível
              </span>
            ) : (
              <span className="text-[#D5C5AA]/70">Nenhuma selecionada</span>
            )}
          </div>

          {reserveQuestion ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-[#F7DECA] bg-[#030A06] p-3.5 rounded-xl border border-[#D5C5AA]/20">
                &ldquo;{reserveQuestion.text}&rdquo;
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[#D5C5AA]/75">
                  Status:{" "}
                  <strong>{QUESTION_STATUS_LABELS[reserveQuestion.status]}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      runCurationAction(() =>
                        selectTopicQuestionSlotAction(
                          reserveQuestion.id,
                          "PRIMARY"
                        )
                      )
                    }
                    className="px-3 py-1.5 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] font-semibold rounded-xl cursor-pointer"
                  >
                    Promover a Principal
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      runCurationAction(() =>
                        displayQuestionOnArenaAction(reserveQuestion.id)
                      )
                    }
                    className="px-3.5 py-1.5 bg-[#D5C5AA] text-[#030A06] font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                  >
                    <MonitorPlay className="w-3.5 h-3.5" />
                    <span>Exibir no Telão</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#D5C5AA]/75">
              Selecione uma segunda pergunta aprovada como{" "}
              <strong>&ldquo;Definir Reserva&rdquo;</strong> para contingência de
              tempo ou adequação.
            </p>
          )}
        </div>
      </div>

      {/* Filtros, Busca e Ordenação da Fila (§5.3) */}
      <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs">
        <div className="sm:col-span-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por palavras na pergunta..."
            className="w-full pl-9 pr-3 py-2 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA]"
          />
        </div>

        <div className="sm:col-span-3 flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-[#14532D] shrink-0" />
          <select
            value={selectedTopicFilter}
            onChange={(e) => setSelectedTopicFilter(e.target.value)}
            className="w-full px-2.5 py-2 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA]"
          >
            <option value="ALL">Todas as Pautas (1 a 6)</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                Pauta {t.number} — {t.mainSpeaker.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-2.5 py-2 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA]"
          >
            <option value="ALL">Todos os 8 Estados</option>
            {(
              Object.entries(QUESTION_STATUS_LABELS) as [
                QuestionStatusKey,
                string
              ][]
            ).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as "DESC" | "ASC")}
            className="w-full px-2.5 py-2 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA]"
          >
            <option value="DESC">Mais recentes</option>
            <option value="ASC">Mais antigas</option>
          </select>
        </div>
      </div>

      {/* Fila de Perguntas em Tempo Real (§5.2 e §5.3) */}
      <div className="space-y-3">
        {filteredQuestions.length === 0 ? (
          <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-8 rounded-2xl text-center text-xs text-[#D5C5AA]/75">
            Nenhuma pergunta encontrada para os filtros selecionados.
          </div>
        ) : (
          filteredQuestions.map((q) => {
            const isUnanalyzed = q.status === "RECEIVED";
            const isOnScreen = displayedQuestionId === q.id;
            const canSelectOrDisplay = !["REJECTED", "DUPLICATE"].includes(
              q.status
            );

            return (
              <div
                key={q.id}
                className={`border p-5 rounded-2xl space-y-3.5 transition ${
                  isOnScreen
                    ? "border-2 border-[#14532D] bg-emerald-950/30"
                    : isUnanalyzed
                    ? "border-sky-400 bg-[#0A150D]"
                    : "border-[#D5C5AA]/20 bg-[#0A150D]/85"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#14532D] text-white font-bold">
                      Pauta {q.topic.number}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full border font-semibold ${
                        QUESTION_STATUS_STYLES[q.status]
                      }`}
                    >
                      {QUESTION_STATUS_LABELS[q.status]}
                    </span>
                    {isUnanalyzed && (
                      <span className="px-2 py-0.5 rounded-full bg-sky-600 text-white text-[10px] font-bold uppercase">
                        Nova · Aguardando Análise
                      </span>
                    )}
                    {q.isPrimary && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-bold">
                        ★ Pergunta Principal
                      </span>
                    )}
                    {q.isReserve && (
                      <span className="px-2.5 py-0.5 rounded-full bg-violet-600 text-white font-bold">
                        ◆ Pergunta Reserva
                      </span>
                    )}
                    {isOnScreen && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-700 text-white font-bold">
                        ● NO TELÃO AGORA
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-[#D5C5AA]/75 font-mono">
                    <span>Sessão anônima #{q.session.anonymousCode}</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(q.createdAt).toLocaleTimeString("pt-BR")}
                    </span>
                  </div>
                </div>

                <p className="text-sm sm:text-base font-medium text-[#F7DECA] leading-relaxed">
                  {q.text}
                </p>

                {/* Botões de Moderação e Seleção (§5.3) */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#D5C5AA]/15 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        runCurationAction(() =>
                          moderateQuestionStatusAction(q.id, "ANALYZING")
                        )
                      }
                      className="px-2.5 py-1.5 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Em Análise</span>
                    </button>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        runCurationAction(() =>
                          moderateQuestionStatusAction(q.id, "APPROVED")
                        )
                      }
                      className="px-3 py-1.5 bg-[#D5C5AA] text-[#030A06] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Aprovar</span>
                    </button>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        runCurationAction(() =>
                          moderateQuestionStatusAction(q.id, "REJECTED")
                        )
                      }
                      className="px-2.5 py-1.5 border border-red-500/30 bg-red-950/30 text-red-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Rejeitar</span>
                    </button>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        runCurationAction(() =>
                          moderateQuestionStatusAction(q.id, "DUPLICATE")
                        )
                      }
                      className="px-2.5 py-1.5 border border-[#D5C5AA]/30 bg-[#030A06] text-[#D5C5AA] font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <CopyX className="w-3.5 h-3.5" />
                      <span>Duplicada</span>
                    </button>
                  </div>

                  {/* Seleção Principal / Reserva / Exibição no Telão */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {canSelectOrDisplay && (
                      <>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            runCurationAction(() =>
                              selectTopicQuestionSlotAction(
                                q.id,
                                q.isPrimary ? "CLEAR" : "PRIMARY"
                              )
                            )
                          }
                          className={`px-3 py-1.5 border font-semibold flex items-center gap-1 cursor-pointer ${
                            q.isPrimary
                              ? "bg-amber-600 text-white border-amber-600"
                              : "border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA]"
                          }`}
                        >
                          <Star className="w-3.5 h-3.5" />
                          <span>
                            {q.isPrimary
                              ? "Desmarcar Principal"
                              : "Definir Principal"}
                          </span>
                        </button>

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            runCurationAction(() =>
                              selectTopicQuestionSlotAction(
                                q.id,
                                q.isReserve ? "CLEAR" : "RESERVE"
                              )
                            )
                          }
                          className={`px-3 py-1.5 border font-semibold flex items-center gap-1 cursor-pointer ${
                            q.isReserve
                              ? "bg-violet-600 text-white border-violet-600"
                              : "border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA]"
                          }`}
                        >
                          <BookmarkCheck className="w-3.5 h-3.5" />
                          <span>
                            {q.isReserve
                              ? "Desmarcar Reserva"
                              : "Definir Reserva"}
                          </span>
                        </button>

                        {["APPROVED", "SELECTED", "DISPLAYED", "ANSWERED"].includes(
                          q.status
                        ) && (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              runCurationAction(() =>
                                isOnScreen
                                  ? removeQuestionFromArenaAction()
                                  : displayQuestionOnArenaAction(q.id)
                              )
                            }
                            className={`px-3 py-1.5 font-bold flex items-center gap-1 cursor-pointer ${
                              isOnScreen
                                ? "bg-red-600 text-white"
                                : "bg-[#D5C5AA] text-[#030A06]"
                            }`}
                          >
                            <MonitorPlay className="w-3.5 h-3.5" />
                            <span>
                              {isOnScreen ? "Retirar do Telão" : "Exibir no Telão"}
                            </span>
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() =>
                            runCurationAction(() =>
                              moderateQuestionStatusAction(q.id, "ANSWERED")
                            )
                          }
                          className="px-2.5 py-1.5 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#14532D]" />
                          <span>Respondida</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
