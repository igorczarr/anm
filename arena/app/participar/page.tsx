"use client";

import { useState, useEffect, useCallback } from "react";
import { useArenaSync } from "@/hooks/use-arena-sync";
import { PUBLIC_STATUS_LABELS } from "@/lib/question-status";
import {
  AlertCircle,
  CheckCircle2,
  Home,
  Info,
  ListChecks,
  MessageSquarePlus,
  Radio,
  Send,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Vote,
  WifiOff,
} from "lucide-react";

type TabKey = "inicio" | "pergunta" | "votacao" | "minhas" | "info";

interface MyQuestionItem {
  id: string;
  text: string;
  topicNumber: number;
  topicTitle: string;
  status: string;
  createdAt: string;
}

interface MyVoteItem {
  pollId: string;
  pollNumber: number;
  pollQuestion: string;
  pollStatus: string;
  optionId: string;
  optionLabel: string;
  optionOrder: number;
}

interface MePayload {
  authenticated: boolean;
  code?: string;
  questions: MyQuestionItem[];
  votes: MyVoteItem[];
  quota: {
    topicId: string | null;
    used: number;
    max: number;
    charLimit: number;
  };
}

function makeClientRequestId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export default function ParticiparPage() {
  const { snapshot, timer, connected } = useArenaSync();
  const [me, setMe] = useState<MePayload | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [entering, setEntering] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("inicio");

  // Estado do formulário de pergunta (§8.3)
  const [questionText, setQuestionText] = useState("");
  const [pendingRequestId, setPendingRequestId] = useState<string>(() =>
    makeClientRequestId()
  );
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [questionFeedback, setQuestionFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Estado da votação (§8.4)
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [submittingVote, setSubmittingVote] = useState(false);
  const [voteFeedback, setVoteFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch("/api/participant/me", { cache: "no-store" });
      if (res.status === 401) {
        setMe({
          authenticated: false,
          questions: [],
          votes: [],
          quota: { topicId: null, used: 0, max: 2, charLimit: 400 },
        });
        return;
      }
      if (res.ok) {
        const data: MePayload = await res.json();
        setMe(data);
      }
    } catch {
      // ignore transient error
    } finally {
      setLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe, snapshot?.seq]);

  // Sincroniza alternativa já votada quando há votação ativa
  const activePoll = snapshot?.activePoll;
  useEffect(() => {
    if (!activePoll || !me?.votes) return;
    const existingVote = me.votes.find((v) => v.pollId === activePoll.id);
    if (existingVote) {
      setSelectedOptionId(existingVote.optionId);
    } else {
      setSelectedOptionId(null);
    }
  }, [activePoll, me?.votes]);

  async function handleEnterArena() {
    setEntering(true);
    try {
      const res = await fetch("/api/participant/session", { method: "POST" });
      if (res.ok) {
        await fetchMe();
      }
    } finally {
      setEntering(false);
    }
  }

  async function handleSendQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!connected) {
      setQuestionFeedback({
        type: "error",
        message:
          "Envio temporariamente indisponível devido à perda de conexão. Tente novamente em instantes.",
      });
      return;
    }

    const trimmed = questionText.trim();
    if (!trimmed) {
      setQuestionFeedback({
        type: "error",
        message: "Digite sua pergunta antes de enviar.",
      });
      return;
    }

    setSubmittingQuestion(true);
    setQuestionFeedback(null);

    try {
      const res = await fetch("/api/participant/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          clientRequestId: pendingRequestId,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setQuestionFeedback({
          type: "error",
          message:
            data.error ||
            "A operação não foi registrada pelo servidor. Você pode tentar novamente.",
        });
        return;
      }

      // Somente após o servidor registrar geramos um novo clientRequestId e confirmamos (§11.4 & §14.3)
      setQuestionText("");
      setPendingRequestId(makeClientRequestId());
      setQuestionFeedback({
        type: "success",
        message:
          "Pergunta recebida! Nossa equipe fará a curadoria das contribuições para o debate.",
      });
      await fetchMe();
    } catch {
      setQuestionFeedback({
        type: "error",
        message:
          "Falha de comunicação com o servidor. Sua pergunta ainda não foi confirmada; tente enviar novamente.",
      });
    } finally {
      setSubmittingQuestion(false);
    }
  }

  async function handleCastVote(optionId: string) {
    if (!activePoll) return;
    if (!connected) {
      setVoteFeedback({
        type: "error",
        message:
          "Conexão indisponível no momento. Seu voto não foi registrado.",
      });
      return;
    }

    setSubmittingVote(true);
    setVoteFeedback(null);

    try {
      const res = await fetch("/api/participant/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pollId: activePoll.id,
          optionId,
          clientRequestId: makeClientRequestId(),
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setVoteFeedback({
          type: "error",
          message:
            data.error ||
            "Não foi possível registrar seu voto. Tente novamente.",
        });
        return;
      }

      setSelectedOptionId(optionId);
      setVoteFeedback({
        type: "success",
        message: "Voto registrado! Obrigado por participar.",
      });
      await fetchMe();
    } catch {
      setVoteFeedback({
        type: "error",
        message:
          "Erro de comunicação. Seu voto não foi confirmado; tente novamente.",
      });
    } finally {
      setSubmittingVote(false);
    }
  }

  const charLimit =
    me?.quota.charLimit ?? snapshot?.event.questionCharLimit ?? 400;
  const quotaUsed = me?.quota.used ?? 0;
  const quotaMax =
    me?.quota.max ?? snapshot?.event.maxQuestionsPerTopic ?? 2;
  const questionsOpen = snapshot?.liveState.questionsOpen ?? true;
  const isPollOpen = activePoll?.status === "OPEN";
  const myVoteForActivePoll = me?.votes.find(
    (v) => v.pollId === activePoll?.id
  );

  // 8.1 Tela Inicial de Entrada (antes de iniciar sessão anônima)
  if (!loadingSession && me && !me.authenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="border border-[#D5C5AA]/30 bg-[#0A150D]/95 p-7 rounded-2xl space-y-6 text-center shadow-lg">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#14532D] text-white flex items-center justify-center shadow-md">
            <Smartphone className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#14532D]">
              {snapshot?.event.institution || "UEFS"} · Participação em Tempo Real
            </span>
            <h1 className="font-display text-2xl sm:text-3xl text-[#F7DECA]">
              {snapshot?.event.name || "A Nova Moeda"} —{" "}
              {snapshot?.event.theme || "Economia da Solidão"}
            </h1>
            <p className="text-xs sm:text-sm text-[#D5C5AA]/85 leading-relaxed">
              &ldquo;Você faz parte da Arena. Envie perguntas, participe das
              votações e ajude a construir essa discussão.&rdquo;
            </p>
          </div>

          <button
            type="button"
            disabled={entering}
            onClick={handleEnterArena}
            className="w-full py-4 px-6 bg-[#D5C5AA] text-[#030A06] font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{entering ? "Conectando à Arena..." : "Entrar na Arena"}</span>
          </button>

          <p className="text-[11px] text-[#D5C5AA]/70 leading-relaxed">
            Acesso imediato por sessão anônima protegida (LGPD). Não solicitamos
            nome, CPF, telefone ou e-mail.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
      {/* Alerta de Indisponibilidade Temporária de Rede (§11.4 e §14.3) */}
      {!connected && (
        <div className="border border-red-500/40 bg-red-950/30 p-3.5 rounded-xl flex items-center gap-2.5 text-xs text-red-200">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>
            Conexão instável. O envio de perguntas e votos está temporariamente
            indisponível até a reconexão automática.
          </span>
        </div>
      )}

      {/* Cabeçalho Compacto do Participante */}
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-4 rounded-2xl space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#14532D]">
            <Radio className="w-3.5 h-3.5" />
            {snapshot?.activeTopic
              ? `Pauta ${snapshot.activeTopic.number}`
              : "Arena Ao Vivo"}
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-[11px]">
            Sessão #{me?.code || "..."}
          </span>
        </div>

        <h1 className="font-display text-base sm:text-lg text-[#F7DECA] leading-snug">
          {snapshot?.activeTopic
            ? snapshot.activeTopic.title
            : `${snapshot?.event.name || "A Nova Moeda"} — ${
                snapshot?.event.theme || "Economia da Solidão"
              }`}
        </h1>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#D5C5AA]/80 pt-1 border-t border-[#D5C5AA]/15">
          <span>
            Palestrante:{" "}
            <strong className="text-[#F7DECA]">
              {snapshot?.activeTopic?.mainSpeaker.name ||
                snapshot?.activeStep?.responsibleName ||
                "Organização"}
            </strong>
          </span>
          <span>
            Etapa:{" "}
            <strong className="text-[#F7DECA]">
              {snapshot?.activeStep?.title || "Aguardando início"}
            </strong>
          </span>
        </div>
      </div>

      {/* Banner de Votação Aberta Automática (§8.4) */}
      {isPollOpen && activeTab !== "votacao" && (
        <button
          type="button"
          onClick={() => setActiveTab("votacao")}
          className="w-full border-2 border-[#14532D] bg-emerald-950/30 p-4 rounded-2xl flex items-center justify-between gap-3 text-left cursor-pointer"
        >
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
              <Vote className="w-3.5 h-3.5" />
              Votação Aberta Agora! ({timer.formatted})
            </span>
            <p className="text-xs font-semibold text-[#F7DECA] line-clamp-2">
              {activePoll?.question}
            </p>
          </div>
          <span className="px-3 py-2 bg-[#14532D] text-white text-xs font-bold rounded-xl shrink-0">
            Votar →
          </span>
        </button>
      )}

      {/* Menu Simples de 5 itens (§3.3) */}
      <nav className="grid grid-cols-5 gap-1.5 bg-white border border-slate-200 p-1.5 rounded-2xl text-[11px]">
        {[
          { key: "inicio", label: "Início", icon: Home },
          { key: "pergunta", label: "Pergunta", icon: MessageSquarePlus },
          {
            key: "votacao",
            label: isPollOpen ? "Votar ●" : "Votação",
            icon: Vote,
          },
          {
            key: "minhas",
            label: `Minhas (${(me?.questions.length ?? 0) + (me?.votes.length ?? 0)})`,
            icon: ListChecks,
          },
          { key: "info", label: "Evento", icon: Info },
        ].map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.key as TabKey)}
              className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 font-semibold cursor-pointer ${
                active
                  ? "bg-[#14532D] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate max-w-full">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ABA 1: INÍCIO (§8.2 Tela Principal — Acesso rápido sem precisar navegar por várias páginas) */}
      {activeTab === "inicio" && (
        <div className="space-y-4">
          {/* Status da Participação & CTAs Diretos (§8.2) */}
          <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/85 p-5 rounded-2xl space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#F7DECA]">
                Status da sua participação
              </span>
              <span className="text-[#D5C5AA]/75">
                {me?.questions.length ?? 0} pergunta(s) · {me?.votes.length ?? 0}{" "}
                voto(s)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("pergunta")}
                className="py-3.5 px-4 bg-[#D5C5AA] text-[#030A06] font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageSquarePlus className="w-4 h-4" />
                <span>Enviar Pergunta</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("votacao")}
                className={`py-3.5 px-4 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer border ${
                  isPollOpen
                    ? "bg-[#14532D] text-white border-[#14532D]"
                    : "border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA]"
                }`}
              >
                <Vote className="w-4 h-4" />
                <span>
                  {isPollOpen
                    ? "Participar da Votação Aberta"
                    : "Ver Votação da Pauta"}
                </span>
              </button>
            </div>
          </div>

          {/* Envio Rápido de Pergunta Inline (Acesso imediato §3.3) */}
          <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/85 p-5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#F7DECA] flex items-center gap-1.5">
                <MessageSquarePlus className="w-4 h-4 text-[#14532D]" />
                Envie sua pergunta para o debate
              </span>
              <span className="font-mono text-[11px] text-[#D5C5AA]/75">
                Cota na pauta: {quotaUsed}/{quotaMax}
              </span>
            </div>

            {questionFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
                  questionFeedback.type === "success"
                    ? "bg-emerald-950/30 text-emerald-200 border-emerald-500/30"
                    : "bg-red-950/30 text-red-200 border-red-500/30"
                }`}
              >
                {questionFeedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <span>{questionFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleSendQuestion} className="space-y-3">
              <textarea
                rows={3}
                maxLength={charLimit}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                disabled={!questionsOpen || quotaUsed >= quotaMax}
                placeholder={
                  !questionsOpen
                    ? "O recebimento de perguntas desta rodada já foi encerrado."
                    : quotaUsed >= quotaMax
                    ? `Você já enviou suas ${quotaMax} perguntas desta pauta.`
                    : "Escreva aqui sua pergunta para o palestrante..."
                }
                className="w-full p-3 text-xs border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] outline-none"
              />
              <div className="flex items-center justify-between text-xs">
                <span
                  className={`font-mono ${
                    questionText.length > charLimit * 0.9
                      ? "text-amber-600 font-bold"
                      : "text-[#D5C5AA]/70"
                  }`}
                >
                  {questionText.length} / {charLimit} caracteres
                </span>
                <button
                  type="submit"
                  disabled={
                    submittingQuestion ||
                    !questionsOpen ||
                    quotaUsed >= quotaMax ||
                    !questionText.trim()
                  }
                  className="px-4 py-2.5 bg-[#D5C5AA] text-[#030A06] font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>
                    {submittingQuestion ? "Enviando..." : "Enviar Pergunta"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ABA 2: ENVIAR PERGUNTA (§8.3) */}
      {activeTab === "pergunta" && (
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/90 p-5 rounded-2xl space-y-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#14532D]">
              Contribuição para o Debate (§8.3)
            </span>
            <h2 className="font-display text-lg text-[#F7DECA]">
              Enviar Pergunta para a{" "}
              {snapshot?.activeTopic
                ? `Pauta ${snapshot.activeTopic.number}`
                : "Arena"}
            </h2>
            <p className="text-xs text-[#D5C5AA]/80">
              Até {quotaMax} perguntas por pauta (máximo de {charLimit}{" "}
              caracteres). Todas as perguntas passam pela curadoria da
              organização antes de irem ao telão.
            </p>
          </div>

          {questionFeedback && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2 border ${
                questionFeedback.type === "success"
                  ? "bg-emerald-950/30 text-emerald-200 border-emerald-500/30"
                  : "bg-red-950/30 text-red-200 border-red-500/30"
              }`}
            >
              {questionFeedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{questionFeedback.message}</span>
            </div>
          )}

          <form onSubmit={handleSendQuestion} className="space-y-3">
            <textarea
              rows={4}
              maxLength={charLimit}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              disabled={!questionsOpen || quotaUsed >= quotaMax}
              placeholder="Formule sua pergunta com clareza..."
              className="w-full p-3.5 text-sm border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] outline-none"
            />

            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-[#D5C5AA]/75">
                {questionText.length} / {charLimit} caracteres · Enviadas nesta
                pauta: {quotaUsed}/{quotaMax}
              </span>
              <button
                type="submit"
                disabled={
                  submittingQuestion ||
                  !questionsOpen ||
                  quotaUsed >= quotaMax ||
                  !questionText.trim()
                }
                className="px-5 py-3 bg-[#D5C5AA] text-[#030A06] font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{submittingQuestion ? "Registrando..." : "Enviar"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ABA 3: VOTAÇÃO ATIVA (§8.4) */}
      {activeTab === "votacao" && (
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/90 p-5 rounded-2xl space-y-4">
          {!activePoll ? (
            <div className="text-center py-8 space-y-2">
              <Vote className="w-8 h-8 text-[#14532D] mx-auto" />
              <h2 className="font-display text-lg text-[#F7DECA]">
                Aguardando Abertura da Votação
              </h2>
              <p className="text-xs text-[#D5C5AA]/75">
                Assim que o mediador iniciar a etapa de votação da pauta, a
                pergunta e as alternativas aparecerão automaticamente aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="px-2.5 py-1 rounded-full bg-[#14532D] text-white font-bold">
                  Votação da Pauta {activePoll.number}
                </span>
                <span className="font-mono text-[#D5C5AA]/80">
                  {activePoll.status === "OPEN"
                    ? `Aberta · ${timer.formatted}`
                    : "Encerrada"}
                </span>
              </div>

              <h2 className="font-bold text-base text-[#F7DECA] leading-snug">
                {activePoll.question}
              </h2>

              {voteFeedback && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-start gap-2 border ${
                    voteFeedback.type === "success"
                      ? "bg-emerald-950/30 text-emerald-200 border-emerald-500/30"
                      : "bg-red-950/30 text-red-200 border-red-500/30"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{voteFeedback.message}</span>
                </div>
              )}

              {activePoll.status !== "OPEN" && (
                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-950/30 text-xs text-amber-200 font-semibold">
                  Votação encerrada. Confira o resultado no telão.
                </div>
              )}

              <div className="space-y-2.5">
                {activePoll.options.map((opt) => {
                  const isSelected = selectedOptionId === opt.id;
                  const showPercent =
                    (activePoll.status === "CLOSED" ||
                      activePoll.status === "RESULTS_PUBLISHED") &&
                    typeof opt.percentage === "number";

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={
                        submittingVote || activePoll.status !== "OPEN"
                      }
                      onClick={() => handleCastVote(opt.id)}
                      className={`w-full p-4 rounded-xl border text-left text-xs transition flex flex-col gap-2 cursor-pointer disabled:cursor-default ${
                        isSelected
                          ? "border-[#14532D] bg-emerald-950/30 text-[#F7DECA] font-bold"
                          : "border-[#D5C5AA]/25 bg-[#030A06] text-[#F7DECA]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>
                          <strong>{opt.optionOrder}.</strong> {opt.label}
                        </span>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full bg-[#14532D] text-white text-[10px] font-bold shrink-0">
                            Seu voto
                          </span>
                        )}
                      </div>

                      {showPercent && (
                        <div className="space-y-1 w-full">
                          <div className="flex justify-between text-[11px] font-mono text-[#D5C5AA]/80">
                            <span>{opt.votesCount ?? 0} votos</span>
                            <strong>{opt.percentage}%</strong>
                          </div>
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#14532D]"
                              style={{ width: `${opt.percentage}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {activePoll.status === "OPEN" && myVoteForActivePoll && (
                <p className="text-[11px] text-[#D5C5AA]/75 text-center">
                  Você já votou nesta pauta. Enquanto a votação estiver aberta,
                  basta tocar em outra alternativa se desejar alterar seu voto.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ABA 4: MINHAS PARTICIPAÇÕES (§8.3 Estados visíveis e Votos) */}
      {activeTab === "minhas" && (
        <div className="space-y-4">
          <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/90 p-5 rounded-2xl space-y-3">
            <h2 className="font-display text-base text-[#F7DECA]">
              Minhas Perguntas Enviadas ({me?.questions.length ?? 0})
            </h2>

            {!me?.questions.length ? (
              <p className="text-xs text-[#D5C5AA]/75">
                Você ainda não enviou perguntas nesta sessão.
              </p>
            ) : (
              <div className="space-y-2.5">
                {me.questions.map((q) => (
                  <div
                    key={q.id}
                    className="border border-[#D5C5AA]/15 bg-[#030A06] p-3.5 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#14532D]">
                        Pauta {q.topicNumber}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          q.status === "SELECTED" || q.status === "ANSWERED"
                            ? "bg-emerald-950/30 text-emerald-300"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {PUBLIC_STATUS_LABELS[q.status] || "Recebida"}
                      </span>
                    </div>
                    <p className="text-[#F7DECA] leading-relaxed">{q.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/90 p-5 rounded-2xl space-y-3">
            <h2 className="font-display text-base text-[#F7DECA]">
              Meus Votos Registrados ({me?.votes.length ?? 0})
            </h2>

            {!me?.votes.length ? (
              <p className="text-xs text-[#D5C5AA]/75">
                Nenhum voto registrado até o momento.
              </p>
            ) : (
              <div className="space-y-2.5">
                {me.votes.map((v) => (
                  <div
                    key={v.pollId}
                    className="border border-[#D5C5AA]/15 bg-[#030A06] p-3.5 rounded-xl space-y-1 text-xs"
                  >
                    <div className="font-semibold text-[#14532D]">
                      Votação da Pauta {v.pollNumber}
                    </div>
                    <div className="text-[#D5C5AA]/80">{v.pollQuestion}</div>
                    <div className="font-bold text-[#F7DECA] pt-1">
                      Sua resposta: {v.optionOrder}. {v.optionLabel}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 5: INFORMAÇÕES DO EVENTO & PRIVACIDADE LGPD (§3.3 e §12.4) */}
      {activeTab === "info" && (
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/90 p-5 rounded-2xl space-y-4 text-xs">
          <div className="space-y-1">
            <span className="font-semibold uppercase tracking-wider text-[#14532D]">
              Sobre a Arena
            </span>
            <h2 className="font-display text-lg text-[#F7DECA]">
              {snapshot?.event.name || "A Nova Moeda"} —{" "}
              {snapshot?.event.theme || "Economia da Solidão"}
            </h2>
            <p className="text-[#D5C5AA]/80">
              Instituição: {snapshot?.event.institution || "UEFS"} · Duração
              programada: {snapshot?.event.programmedDurationMin ?? 131} minutos
              · 6 Pautas.
            </p>
          </div>

          <div className="pt-3 border-t border-[#D5C5AA]/15 space-y-2">
            <div className="font-bold text-[#F7DECA] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#14532D]" />
              Aviso de Privacidade e Proteção de Dados (LGPD — §12.4)
            </div>
            <p className="text-[#D5C5AA]/80 leading-relaxed">
              Esta plataforma segue os princípios de minimização, finalidade e
              transparência da LGPD. Não coletamos nome, CPF, e-mail ou
              telefone dos participantes. Sua sessão utiliza apenas um código
              técnico anônimo (`#{me?.code || "ANM"}`) para impedir duplicidade
              de votos e permitir que você acompanhe o status das suas perguntas
              no próprio celular.
            </p>
            <p className="text-[#D5C5AA]/80 leading-relaxed">
              No telão público da Arena são exibidos apenas o texto aprovado das
              perguntas selecionadas e os resultados estatísticos agregados das
              votações, sem qualquer identificação individual.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
