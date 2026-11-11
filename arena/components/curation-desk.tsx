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
  upsertAndActivateMediationReserveQuestionAction,
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
  ShieldCheck,
  Save,
} from "lucide-react";

interface CurationQuestion {
  id: string;
  topicId: string;
  text: string;
  status: QuestionStatusKey;
  isPrimary: boolean;
  isReserve: boolean;
  isMediationReserve: boolean;
  editCount: number;
  createdAt: string;
  displayedAt: string | null;
  answeredAt: string | null;
  topic: { id: string; number: number; title: string };
  session: { anonymousCode: string; credentialCode?: string | null } | null;
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
  const [editingReserveTopicId, setEditingReserveTopicId] = useState<
    string | null
  >(null);

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
    (q) =>
      q.topicId === focusedTopicId &&
      (q.isReserve || q.isMediationReserve)
  );

  const filteredQuestions = questions
    .filter((q) => {
      if (selectedTopicFilter !== "ALL" && q.topicId !== selectedTopicFilter) {
        return false;
      }
      if (statusFilter !== "ALL" && q.status !== statusFilter) {
        return false;
      }
      const codeStr =
        q.session?.credentialCode || q.session?.anonymousCode || "Mediação";
      if (
        searchQuery.trim() &&
        !q.text.toLowerCase().includes(searchQuery.trim().toLowerCase()) &&
        !codeStr.toLowerCase().includes(searchQuery.trim().toLowerCase())
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
    (q) => !q.isMediationReserve && q.status === "RECEIVED"
  ).length;

  return (
    <div className="space-y-6">
      {/* Barra de Status de Captação e Indicador para o Moderador */}
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
              ? "Envio de Perguntas ABERTO (Exposição 15 min)"
              : "Envio de Perguntas ENCERRADO"}
          </span>

          <span className="px-3 py-1 rounded-full bg-sky-900/50 text-sky-200 border border-sky-500/30 font-bold">
            Não analisadas: {unanalyzedCount}
          </span>

          <span className="text-[#D5C5AA]/80">
            Regra oficial:{" "}
            <strong className="text-[#F7DECA]">
              1 pergunta selecionada por pauta (5 min P&amp;R)
            </strong>
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

      {/* Painel de Seleção para o Mediador: Pergunta Selecionada (Plateia) & Pergunta de Reserva da Mediação */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pergunta Selecionada para os 5 Minutos de Pergunta e Resposta */}
        <div className="border-2 border-[#14532D] bg-[#0A150D]/90 p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#14532D] uppercase tracking-wider flex items-center gap-1.5">
              <Star className="w-4 h-4" />
              Pergunta Selecionada (5 min P&amp;R) ·{" "}
              {focusedTopic
                ? `Pauta ${focusedTopic.number} (${focusedTopic.mainSpeaker.name})`
                : "Pauta Atual"}
            </span>
            {primaryQuestion ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/30 text-emerald-300 font-bold text-[11px] flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {primaryQuestion.isMediationReserve
                  ? "Pergunta da Mediação"
                  : "Pergunta da Plateia"}
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
                <div className="space-x-3 text-[#D5C5AA]/75">
                  <span>
                    Status:{" "}
                    <strong>
                      {QUESTION_STATUS_LABELS[primaryQuestion.status]}
                    </strong>
                  </span>
                  {primaryQuestion.moderatedBy && (
                    <span>
                      Selecionada por:{" "}
                      <strong className="text-[#F7DECA]">
                        {primaryQuestion.moderatedBy.fullName}
                      </strong>
                    </span>
                  )}
                </div>
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
                    <span>Exibir na ARENA</span>
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      runCurationAction(() =>
                        moderateQuestionStatusAction(
                          primaryQuestion.id,
                          "ANSWERED",
                          "Respondida no momento de Pergunta e Resposta"
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
              Aprove uma pergunta da plateia abaixo e clique em{" "}
              <strong>&ldquo;Selecionar para Resposta&rdquo;</strong>, ou acione
              a <strong>Pergunta de Reserva da Mediação</strong> ao lado.
            </p>
          )}
        </div>

        {/* Pergunta de Reserva da Mediação (§7 — Tratamento quando nenhuma pergunta da plateia for aprovada) */}
        <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#F7DECA] uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#14532D]" />
              Pergunta de Reserva da Mediação ·{" "}
              {focusedTopic ? `Pauta ${focusedTopic.number}` : "Pauta Atual"}
            </span>
            <button
              type="button"
              onClick={() =>
                setEditingReserveTopicId(
                  editingReserveTopicId === focusedTopicId
                    ? null
                    : focusedTopicId
                )
              }
              className="text-[11px] font-semibold text-[#D5C5AA] underline cursor-pointer"
            >
              {editingReserveTopicId === focusedTopicId
                ? "Fechar Edição"
                : "Editar / Cadastrar Reserva"}
            </button>
          </div>

          {editingReserveTopicId === focusedTopicId && focusedTopicId ? (
            <form
              action={(fd) =>
                runCurationAction(async () => {
                  await upsertAndActivateMediationReserveQuestionAction(fd);
                  setEditingReserveTopicId(null);
                })
              }
              className="space-y-2.5 text-xs bg-[#030A06] p-3.5 rounded-xl border border-[#D5C5AA]/25"
            >
              <input type="hidden" name="topicId" value={focusedTopicId} />
              <label className="block font-semibold text-[#D5C5AA]">
                Texto da Pergunta da Mediação (Nunca atribuída falsamente à
                plateia):
              </label>
              <textarea
                name="text"
                rows={2}
                required
                defaultValue={reserveQuestion?.text || ""}
                className="w-full px-3 py-2 border border-[#D5C5AA]/30 bg-[#0A150D] text-[#F7DECA] rounded-lg"
              />
              <div className="flex items-center justify-between gap-2">
                <label className="inline-flex items-center gap-1.5 text-[#D5C5AA] cursor-pointer">
                  <input
                    type="checkbox"
                    name="activateNow"
                    value="true"
                    defaultChecked
                  />
                  <span>Acionar imediatamente como Pergunta Selecionada</span>
                </label>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-3.5 py-1.5 bg-[#D5C5AA] text-[#030A06] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Reserva</span>
                </button>
              </div>
            </form>
          ) : reserveQuestion ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-[#F7DECA] bg-[#030A06] p-3.5 rounded-xl border border-[#D5C5AA]/20">
                &ldquo;{reserveQuestion.text}&rdquo;
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[#D5C5AA]/75">
                  Identificação na ARENA:{" "}
                  <strong className="text-amber-300">
                    {reserveQuestion.isMediationReserve
                      ? "Pergunta da Mediação"
                      : "Reserva da Plateia"}
                  </strong>
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
                    Acionar para Resposta (5m)
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
              Caso nenhuma pergunta da plateia seja aprovada até o fim da
              exposição, acione a Pergunta de Reserva da Mediação para manter os
              5 minutos de Pergunta e Resposta.
            </p>
          )}
        </div>
      </div>

      {/* Filtros por Pauta (1 a 5), Busca e Ordenação */}
      <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-center text-xs">
        <div className="sm:col-span-4 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por texto ou credencial..."
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
            <option value="ALL">Todas as Pautas (1 a 5)</option>
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
            <option value="ALL">Todos os Estados</option>
            {(
              Object.entries(QUESTION_STATUS_LABELS) as [
                QuestionStatusKey,
                string,
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

      {/* Fila de Perguntas em Tempo Real */}
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
                    {q.isMediationReserve ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-900/60 text-amber-200 border border-amber-400/40 font-bold">
                        ◆ Pergunta da Mediação
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-[#D5C5AA] font-medium">
                        Pergunta da Plateia
                      </span>
                    )}
                    {q.editCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-sky-950/60 text-sky-300 text-[10px] font-semibold">
                        Editada ({q.editCount}x)
                      </span>
                    )}
                    {q.isPrimary && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white font-bold">
                        ★ Selecionada para Resposta (5m)
                      </span>
                    )}
                    {isOnScreen && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-700 text-white font-bold">
                        ● NO TELÃO AGORA
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-[#D5C5AA]/75 font-mono">
                    {q.moderatedBy && (
                      <span className="text-emerald-300">
                        Mod.: {q.moderatedBy.fullName}
                      </span>
                    )}
                    <span>
                      {q.isMediationReserve
                        ? "Origem: Mediação"
                        : q.session?.credentialCode
                          ? `Credencial ${q.session.credentialCode}`
                          : `Sessão #${q.session?.anonymousCode || "Anônima"}`}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(q.createdAt).toLocaleTimeString("pt-BR")}
                    </span>
                  </div>
                </div>

                <p className="text-sm sm:text-base font-medium text-[#F7DECA] leading-relaxed">
                  {q.text}
                </p>

                {/* Botões de Moderação e Seleção */}
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
                      <span>Recusar</span>
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

                  {/* Seleção Principal (1 por pauta) / Reserva / Exibição no Telão */}
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
                              ? "Desmarcar Selecionada"
                              : "Selecionar para Resposta (5m)"}
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

                        {[
                          "APPROVED",
                          "SELECTED",
                          "DISPLAYED",
                          "ANSWERED",
                        ].includes(q.status) && (
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
                              {isOnScreen
                                ? "Retirar do Telão"
                                : "Enviar para ARENA"}
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
