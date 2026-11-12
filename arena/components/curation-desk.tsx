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
import { getSpeakerPhoto } from "@/lib/speakers";
import { Tabs, SearchBox, EmptyState } from "@/components/admin-ui";
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
  Radio,
  Save,
  ShieldCheck,
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
  const [statusTab, setStatusTab] = useState<string>("ALL");
  const [sortOrder, setSortOrder] = useState<"DESC" | "ASC">("DESC");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [editingReserveTopicId, setEditingReserveTopicId] = useState<string | null>(null);

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

  const focusedTopicId =
    selectedTopicFilter !== "ALL"
      ? selectedTopicFilter
      : snapshot?.activeTopic?.id || topics[0]?.id;

  const focusedTopic = topics.find((t) => t.id === focusedTopicId) || topics[0];

  const primaryQuestion = questions.find(
    (q) => q.topicId === focusedTopicId && q.isPrimary
  );
  const reserveQuestion = questions.find(
    (q) => q.topicId === focusedTopicId && q.isReserve
  );

  const questionsOpen = snapshot?.liveState?.questionsOpen ?? false;
  const displayedQuestionId = snapshot?.selectedQuestion?.id;

  const filteredQuestions = questions.filter((q) => {
    if (selectedTopicFilter !== "ALL" && q.topicId !== selectedTopicFilter) {
      return false;
    }
    if (statusTab === "UNANALYZED" && q.status !== "RECEIVED") {
      return false;
    }
    if (statusTab === "APPROVED" && !["APPROVED", "SELECTED", "DISPLAYED", "ANSWERED"].includes(q.status)) {
      return false;
    }
    if (statusTab === "SELECTED" && !q.isPrimary && !q.isReserve) {
      return false;
    }
    if (statusTab === "REJECTED" && !["REJECTED", "DUPLICATE"].includes(q.status)) {
      return false;
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchText = q.text.toLowerCase().includes(query);
      const matchCred = q.session?.credentialCode?.toLowerCase().includes(query);
      const matchAnon = q.session?.anonymousCode?.toLowerCase().includes(query);
      return matchText || matchCred || matchAnon;
    }
    return true;
  }).sort((a, b) => {
    const da = new Date(a.createdAt).getTime();
    const db = new Date(b.createdAt).getTime();
    return sortOrder === "DESC" ? db - da : da - db;
  });

  const unanalyzedCount = questions.filter(
    (q) => !q.isMediationReserve && q.status === "RECEIVED"
  ).length;

  const approvedCount = questions.filter((q) =>
    ["APPROVED", "SELECTED", "DISPLAYED", "ANSWERED"].includes(q.status)
  ).length;

  return (
    <div className="space-y-6">
      {/* 1. Barra de Status de Captação e Controles do Telão */}
      <div className="bg-[#0A120D]/90 border border-white/[0.08] p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-sm shadow-xl">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 text-xs transition ${
              questionsOpen
                ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/40"
                : "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40"
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${questionsOpen ? "animate-pulse text-emerald-400" : "text-amber-400"}`} />
            {questionsOpen ? "Captação da Plateia ABERTA" : "Captação FECHADA"}
          </span>

          {unanalyzedCount > 0 && (
            <span className="px-3 py-1.5 rounded-xl bg-sky-500/15 text-sky-200 ring-1 ring-sky-500/40 font-semibold font-mono text-xs">
              {unanalyzedCount} {unanalyzedCount === 1 ? "pendente" : "pendentes"}
            </span>
          )}

          <span className="text-[#D5C5AA]/70 text-xs">
            Regra: <strong className="text-[#F7DECA]">1 pergunta selecionada por pauta</strong> (5 min P&amp;R)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {displayedQuestionId && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => runCurationAction(() => removeQuestionFromArenaAction())}
              className="px-3.5 py-1.5 bg-red-600/90 hover:bg-red-600 text-white font-medium text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition"
            >
              <MonitorX className="w-3.5 h-3.5" />
              <span>Retirar do Telão</span>
            </button>
          )}

          <button
            type="button"
            disabled={isPending}
            onClick={() => runCurationAction(() => toggleQuestionsOpenAction(!questionsOpen))}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition ${
              questionsOpen
                ? "bg-white/[0.08] hover:bg-white/[0.12] text-[#F7DECA] ring-1 ring-white/[0.12]"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
            }`}
          >
            {questionsOpen ? "Fechar Recebimento" : "Abrir Recebimento"}
          </button>
        </div>
      </div>

      {/* 2. Painel Duplo em Destaque: Pergunta Oficial da Pauta e Pergunta de Reserva da Mediação */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pergunta Selecionada para os 5 min de P&R */}
        <div className="bg-[#0A120D]/90 border border-emerald-500/30 p-5 rounded-2xl space-y-3 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
              <Star className="w-3.5 h-3.5 fill-emerald-400/20" />
              Pergunta Selecionada (P&amp;R) · {focusedTopic ? `Pauta ${focusedTopic.number} (${focusedTopic.mainSpeaker.name})` : "Pauta Atual"}
            </span>
            {primaryQuestion ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] ring-1 ring-emerald-500/40 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {primaryQuestion.isMediationReserve ? "Mediação" : "Plateia"}
              </span>
            ) : (
              <span className="text-[#D5C5AA]/50 text-[11px]">Nenhuma selecionada</span>
            )}
          </div>

          {primaryQuestion ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-[#F7DECA] bg-[#050C07] p-3.5 rounded-xl border border-white/[0.06] leading-relaxed">
                &ldquo;{primaryQuestion.text}&rdquo;
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-3 text-[#D5C5AA]/70 text-[11px]">
                  <span>Status: <strong className="text-emerald-300">{QUESTION_STATUS_LABELS[primaryQuestion.status]}</strong></span>
                  {primaryQuestion.moderatedBy && (
                    <span>Mod.: <strong className="text-[#F7DECA]">{primaryQuestion.moderatedBy.fullName}</strong></span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => runCurationAction(() => displayQuestionOnArenaAction(primaryQuestion.id))}
                    className="px-3 py-1.5 bg-[#D5C5AA] hover:bg-[#F7DECA] text-[#030A06] font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition"
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
                    className="px-3 py-1.5 bg-[#050C07] hover:bg-white/[0.05] border border-white/[0.1] text-[#F7DECA] text-xs font-medium rounded-xl cursor-pointer transition"
                  >
                    Marcar Respondida
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#D5C5AA]/60 py-2">
              Selecione uma pergunta da plateia na fila abaixo ou acione a pergunta de reserva da mediação para garantir os 5 minutos de resposta do especialista.
            </p>
          )}
        </div>

        {/* Pergunta de Reserva da Mediação */}
        <div className="bg-[#0A120D]/90 border border-white/[0.08] p-5 rounded-2xl space-y-3 shadow-lg">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#F7DECA] uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              Pergunta de Reserva da Mediação · {focusedTopic ? `Pauta ${focusedTopic.number}` : "Pauta Atual"}
            </span>
            <button
              type="button"
              onClick={() =>
                setEditingReserveTopicId(
                  editingReserveTopicId === focusedTopicId ? null : focusedTopicId
                )
              }
              className="text-[11px] font-medium text-emerald-400 hover:text-emerald-300 cursor-pointer transition"
            >
              {editingReserveTopicId === focusedTopicId ? "Fechar" : "Editar / Cadastrar"}
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
              className="space-y-3 text-xs bg-[#050C07] p-3.5 rounded-xl border border-white/[0.08]"
            >
              <input type="hidden" name="topicId" value={focusedTopicId} />
              <label className="block text-xs font-medium text-[#D5C5AA]/80">
                Texto da Pergunta da Mediação:
              </label>
              <textarea
                name="text"
                rows={2}
                required
                defaultValue={reserveQuestion?.text || ""}
                placeholder="Insira a pergunta formulada previamente pela equipe de mediação..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-[#0A120D] border border-white/[0.1] text-[#F7DECA] focus:outline-none focus:border-emerald-500/60"
              />
              <div className="flex items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 text-xs text-[#D5C5AA]/80 cursor-pointer">
                  <input
                    type="checkbox"
                    name="activateNow"
                    value="true"
                    defaultChecked
                    className="accent-emerald-500 rounded"
                  />
                  <span>Acionar imediatamente como selecionada</span>
                </label>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-3.5 py-1.5 bg-[#D5C5AA] hover:bg-[#F7DECA] text-[#030A06] font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Reserva</span>
                </button>
              </div>
            </form>
          ) : reserveQuestion ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-[#F7DECA] bg-[#050C07] p-3.5 rounded-xl border border-white/[0.06] leading-relaxed">
                &ldquo;{reserveQuestion.text}&rdquo;
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[11px] text-[#D5C5AA]/70">
                  Origem: <strong className="text-amber-300">Equipe de Mediação</strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => runCurationAction(() => selectTopicQuestionSlotAction(reserveQuestion.id, "PRIMARY"))}
                    className="px-3 py-1.5 bg-[#050C07] hover:bg-white/[0.05] border border-white/[0.1] text-[#F7DECA] text-xs font-medium rounded-xl cursor-pointer transition"
                  >
                    Acionar para Resposta
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => runCurationAction(() => displayQuestionOnArenaAction(reserveQuestion.id))}
                    className="px-3 py-1.5 bg-[#D5C5AA] hover:bg-[#F7DECA] text-[#030A06] font-semibold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition"
                  >
                    <MonitorPlay className="w-3.5 h-3.5" />
                    <span>Exibir no Telão</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#D5C5AA]/60 py-2">
              Se nenhuma pergunta da plateia for aprovada até o fim da exposição de 15 min, acione a pergunta de reserva da mediação para conduzir o debate.
            </p>
          )}
        </div>
      </div>

      {/* 3. Filtros & Busca */}
      <div className="space-y-3">
        <Tabs
          value={statusTab}
          onChange={setStatusTab}
          items={[
            { key: "ALL", label: "Todas", count: questions.length },
            { key: "UNANALYZED", label: "Não analisadas", count: unanalyzedCount },
            { key: "APPROVED", label: "Aprovadas", count: approvedCount },
            { key: "SELECTED", label: "Selecionadas" },
            { key: "REJECTED", label: "Recusadas / Duplicadas" },
          ]}
          right={
            <div className="flex items-center gap-2">
              <select
                value={selectedTopicFilter}
                onChange={(e) => setSelectedTopicFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-[#050C07] border border-white/[0.08] text-xs text-[#F7DECA] focus:outline-none focus:border-emerald-500/60"
              >
                <option value="ALL">Todas as pautas (1 a 5)</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    Pauta {t.number}: {t.mainSpeaker.name}
                  </option>
                ))}
              </select>

              <SearchBox
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Buscar pergunta ou credencial..."
              />
            </div>
          }
        />
      </div>

      {/* 4. Lista de Perguntas */}
      <div className="space-y-3">
        {filteredQuestions.length === 0 ? (
          <EmptyState text="Nenhuma pergunta encontrada para os filtros selecionados." />
        ) : (
          filteredQuestions.map((q) => {
            const isUnanalyzed = q.status === "RECEIVED";
            const isOnScreen = displayedQuestionId === q.id;
            const canSelectOrDisplay = !["REJECTED", "DUPLICATE"].includes(q.status);
            const speakerPhoto = getSpeakerPhoto(q.topic.title);

            return (
              <div
                key={q.id}
                className={`bg-[#0A120D]/90 border rounded-2xl p-4 sm:p-5 space-y-3 transition shadow-md ${
                  isOnScreen
                    ? "border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/50"
                    : q.isPrimary
                      ? "border-amber-500/40 bg-amber-950/10"
                      : isUnanalyzed
                        ? "border-sky-500/40 bg-[#0A120D]"
                        : "border-white/[0.08]"
                }`}
              >
                {/* Metadados Superiores */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 font-semibold text-[11px] ring-1 ring-emerald-500/30">
                      Pauta {q.topic.number}
                    </span>

                    <span
                      className={`px-2.5 py-0.5 rounded-lg border font-semibold text-[11px] ${
                        QUESTION_STATUS_STYLES[q.status] || "border-white/10 text-[#D5C5AA]"
                      }`}
                    >
                      {QUESTION_STATUS_LABELS[q.status] || q.status}
                    </span>

                    {q.isMediationReserve ? (
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30 text-[11px] font-semibold">
                        Mediação
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-lg bg-white/[0.06] text-[#D5C5AA]/70 text-[11px]">
                        Plateia
                      </span>
                    )}

                    {q.editCount > 0 && (
                      <span className="px-2 py-0.5 rounded-lg bg-sky-500/15 text-sky-300 text-[10px] font-mono">
                        Editada ({q.editCount}x)
                      </span>
                    )}

                    {q.isPrimary && (
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/25 text-amber-300 ring-1 ring-amber-500/40 font-semibold text-[11px] flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400" />
                        Selecionada para Resposta (5m)
                      </span>
                    )}

                    {isOnScreen && (
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500 text-[#030A06] font-bold text-[11px] flex items-center gap-1">
                        <Radio className="w-3 h-3 animate-pulse" />
                        NO TELÃO AGORA
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-[#D5C5AA]/60 font-mono">
                    {q.moderatedBy && (
                      <span className="text-emerald-400">
                        Mod.: {q.moderatedBy.fullName}
                      </span>
                    )}
                    <span>
                      {q.isMediationReserve
                        ? "Origem: Mediação"
                        : q.session?.credentialCode
                          ? `Credencial: ${q.session.credentialCode}`
                          : `Sessão: #${q.session?.anonymousCode || "Anônima"}`}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(q.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>

                {/* Pergunta */}
                <p className="text-sm font-medium text-[#F7DECA] leading-relaxed">
                  {q.text}
                </p>

                {/* Botões de Ação */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/[0.06] text-xs">
                  {/* Moderação de Status */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => runCurationAction(() => moderateQuestionStatusAction(q.id, "ANALYZING"))}
                      className="px-2.5 py-1 rounded-lg bg-[#050C07] hover:bg-white/[0.05] border border-white/[0.08] text-[#D5C5AA] text-[11px] font-medium flex items-center gap-1 cursor-pointer transition"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Em Análise</span>
                    </button>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => runCurationAction(() => moderateQuestionStatusAction(q.id, "APPROVED"))}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 ring-1 ring-emerald-500/40 text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition"
                    >
                      <Check className="w-3 h-3" />
                      <span>Aprovar</span>
                    </button>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => runCurationAction(() => moderateQuestionStatusAction(q.id, "REJECTED"))}
                      className="px-2.5 py-1 rounded-lg bg-red-950/30 hover:bg-red-950/50 text-red-300 ring-1 ring-red-500/30 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition"
                    >
                      <XCircle className="w-3 h-3" />
                      <span>Recusar</span>
                    </button>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => runCurationAction(() => moderateQuestionStatusAction(q.id, "DUPLICATE"))}
                      className="px-2.5 py-1 rounded-lg bg-[#050C07] hover:bg-white/[0.05] border border-white/[0.08] text-[#D5C5AA]/70 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition"
                    >
                      <CopyX className="w-3 h-3" />
                      <span>Duplicada</span>
                    </button>
                  </div>

                  {/* Seleção e Telão */}
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
                          className={`px-3 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition ${
                            q.isPrimary
                              ? "bg-amber-500 text-[#030A06] font-bold shadow-sm"
                              : "bg-[#050C07] hover:bg-white/[0.05] border border-white/[0.1] text-[#F7DECA]"
                          }`}
                        >
                          <Star className="w-3 h-3" />
                          <span>{q.isPrimary ? "Desmarcar Selecionada" : "Selecionar para Resposta (5m)"}</span>
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
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 cursor-pointer transition ${
                            q.isReserve
                              ? "bg-purple-600 text-white font-semibold"
                              : "bg-[#050C07] hover:bg-white/[0.05] border border-white/[0.08] text-[#D5C5AA]"
                          }`}
                        >
                          <BookmarkCheck className="w-3 h-3" />
                          <span>{q.isReserve ? "Desmarcar Reserva" : "Definir Reserva"}</span>
                        </button>

                        {["APPROVED", "SELECTED", "DISPLAYED", "ANSWERED"].includes(q.status) && (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              runCurationAction(() =>
                                isOnScreen ? removeQuestionFromArenaAction() : displayQuestionOnArenaAction(q.id)
                              )
                            }
                            className={`px-3 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition ${
                              isOnScreen
                                ? "bg-red-600 text-white hover:bg-red-500 shadow-sm"
                                : "bg-[#D5C5AA] hover:bg-[#F7DECA] text-[#030A06] shadow-sm"
                            }`}
                          >
                            <MonitorPlay className="w-3 h-3" />
                            <span>{isOnScreen ? "Retirar do Telão" : "Enviar para ARENA"}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => runCurationAction(() => moderateQuestionStatusAction(q.id, "ANSWERED"))}
                          className="px-2.5 py-1 rounded-lg bg-[#050C07] hover:bg-white/[0.05] border border-white/[0.08] text-[#D5C5AA] text-[11px] font-medium flex items-center gap-1 cursor-pointer transition"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
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
