"use client";

import { useState, useEffect, useCallback } from "react";
import { useArenaSync } from "@/hooks/use-arena-sync";
import { PUBLIC_STATUS_LABELS } from "@/lib/question-status";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Edit3,
  Home,
  Info,
  KeyRound,
  ListChecks,
  Lock,
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
  topicId: string;
  text: string;
  topicNumber: number;
  topicTitle: string;
  status: string;
  rawStatus?: string;
  editCount?: number;
  canEdit?: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface MyVoteItem {
  pollId: string;
  pollNumber: number;
  pollQuestion: string;
  pollStatus: string;
  optionId: string;
  optionLabel: string;
  optionThemeLabel?: string | null;
  optionOrder: number;
}

interface MePayload {
  authenticated: boolean;
  code?: string;
  credentialCode?: string | null;
  requireCredential?: boolean;
  questions: MyQuestionItem[];
  activeTopicQuestion?: MyQuestionItem | null;
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
  const [enterError, setEnterError] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [credentialInput, setCredentialInput] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("inicio");

  // Estado do formulário de pergunta (envio ou edição da pergunta ativa da pauta)
  const [questionText, setQuestionText] = useState("");
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [pendingRequestId, setPendingRequestId] = useState<string>(() =>
    makeClientRequestId()
  );
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [questionFeedback, setQuestionFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Estado da votação da Mesa-Redonda
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
          quota: { topicId: null, used: 0, max: 1, charLimit: 400 },
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

  // Se o participante já enviou uma pergunta para a pauta ativa e ela é editável,
  // sincroniza o texto quando não está editando ativamente
  const activeTopicQuestion = me?.activeTopicQuestion ?? null;
  useEffect(() => {
    if (activeTopicQuestion && !isEditingExisting && !questionText.trim()) {
      setQuestionText(activeTopicQuestion.text);
    }
  }, [activeTopicQuestion, isEditingExisting, questionText]);

  async function handleEnterArena(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!nameInput.trim() || !emailInput.trim()) {
      setEnterError("Por favor, preencha seu nome e e-mail para acessar a Arena.");
      return;
    }
    setEntering(true);
    setEnterError(null);
    try {
      const res = await fetch("/api/participant/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameInput.trim(),
          email: emailInput.trim(),
          credentialCode: credentialInput.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        setEnterError(
          data.error || "Não foi possível entrar na Arena. Verifique os dados informados."
        );
        return;
      }
      setCredentialInput("");
      await fetchMe();
    } finally {
      setEntering(false);
    }
  }

  async function handleSendOrEditQuestion(e: React.FormEvent) {
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
      const isEditing = Boolean(activeTopicQuestion && activeTopicQuestion.canEdit);
      const res = await fetch("/api/participant/question", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEditing
            ? {
                questionId: activeTopicQuestion!.id,
                text: trimmed,
              }
            : {
                text: trimmed,
                clientRequestId: pendingRequestId,
              }
        ),
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

      setPendingRequestId(makeClientRequestId());
      setIsEditingExisting(false);
      setQuestionFeedback({
        type: "success",
        message: data.edited
          ? "Sua pergunta foi atualizada com sucesso! A moderação já vê a versão revisada."
          : "Pergunta recebida! Você pode editá-la enquanto a exposição de 15 minutos estiver aberta e ela não tiver sido selecionada.",
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
        message: data.updated
          ? "Seu voto para a Mesa-Redonda foi alterado com sucesso!"
          : "Voto registrado para a Mesa-Redonda! Enquanto a votação estiver aberta, você pode alterar sua escolha.",
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
  const questionsOpen = snapshot?.liveState.questionsOpen ?? false;
  const isPollOpen =
    activePoll?.status === "OPEN" || activePoll?.status === "TIE_BREAK";
  const myVoteForActivePoll = me?.votes.find(
    (v) => v.pollId === activePoll?.id
  );
  const requireCredential =
    me?.requireCredential ?? snapshot?.event.requireCredential ?? false;

  const canSendOrEditQuestion =
    questionsOpen &&
    (!activeTopicQuestion || Boolean(activeTopicQuestion.canEdit));

  // Tela Inicial de Entrada (antes de iniciar sessão)
  if (!loadingSession && me && !me.authenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-10">
        <div className="border border-[#D5C5AA]/30 bg-[#0A150D]/95 p-7 rounded-2xl space-y-6 text-center shadow-lg">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#14532D] text-white flex items-center justify-center shadow-md">
            <Smartphone className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              {snapshot?.event.institution || "UEFS"} · Participação em Tempo Real
            </span>
            <h1 className="font-display text-2xl sm:text-3xl text-[#F7DECA]">
              {snapshot?.event.name || "A Nova Moeda"}
            </h1>
            <p className="text-xs sm:text-sm text-[#D5C5AA]/85 leading-relaxed">
              Identifique-se para enviar perguntas para as 5 exposições e votar na questão que será
              debatida pelos especialistas na Mesa-Redonda.
            </p>
          </div>

          <form onSubmit={handleEnterArena} className="space-y-3 text-left">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#D5C5AA]">
                Seu Nome Completo *
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Ex.: Maria Souza"
                required
                className="w-full px-3.5 py-3 rounded-xl border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] text-sm outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#D5C5AA]">
                Seu E-mail *
              </label>
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Ex.: maria@exemplo.com"
                required
                className="w-full px-3.5 py-3 rounded-xl border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] text-sm outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#D5C5AA] flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  Credencial de Check-in{" "}
                  {requireCredential ? "(Obrigatória)" : "(Opcional · ex: ANM-001)"}
                </span>
              </label>
              <input
                type="text"
                value={credentialInput}
                onChange={(e) => setCredentialInput(e.target.value.toUpperCase())}
                placeholder="Ex.: ANM-001"
                required={requireCredential}
                className="w-full px-3.5 py-3 rounded-xl border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] font-mono text-sm uppercase outline-none"
              />
            </div>

            {enterError && (
              <div className="p-3 rounded-xl border border-red-500/40 bg-red-950/30 text-xs text-red-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{enterError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={entering}
              className="w-full py-4 px-6 bg-[#D5C5AA] text-[#030A06] font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer hover:opacity-95 transition"
            >
              <ArrowRight className="w-4 h-4" />
              <span>{entering ? "Conectando à Arena..." : "Entrar na Arena"}</span>
            </button>
          </form>

          <p className="text-[11px] text-[#D5C5AA]/70 leading-relaxed">
            Seus dados são utilizados exclusivamente para identificação das perguntas e validação dos votos na Arena.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-5 space-y-5">
      {/* Alerta de Indisponibilidade Temporária de Rede */}
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
        <div className="flex items-center justify-between text-xs gap-2">
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-400">
            <Radio className="w-3.5 h-3.5" />
            {snapshot?.activeTopic
              ? `Pauta ${snapshot.activeTopic.number} de 5`
              : snapshot?.liveState.arenaMode === "ROUNDTABLE"
                ? "Mesa-Redonda (20 min)"
                : snapshot?.liveState.arenaMode === "INTRODUCTION"
                  ? "Introdução e Contexto"
                  : "Arena Ao Vivo"}
          </span>
          <div className="flex items-center gap-1.5">
            {me?.credentialCode ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 font-mono text-[11px] font-bold">
                Credencial {me.credentialCode}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-[#030A06] border border-[#D5C5AA]/25 text-[#D5C5AA] font-mono text-[11px]">
                Sessão #{me?.code || "..."}
              </span>
            )}
          </div>
        </div>

        <h1 className="font-display text-base sm:text-lg text-[#F7DECA] leading-snug">
          {snapshot?.activeTopic
            ? snapshot.activeTopic.title
            : snapshot?.activeStep?.title || (snapshot?.event.name || "A Nova Moeda")}
        </h1>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#D5C5AA]/80 pt-1 border-t border-[#D5C5AA]/15">
          <span>
            Responsável:{" "}
            <strong className="text-[#F7DECA]">
              {snapshot?.activeTopic?.mainSpeaker.name ||
                snapshot?.activeStep?.responsibleName ||
                "Organização"}
            </strong>
          </span>
          <span>
            Fase:{" "}
            <strong className="text-[#F7DECA]">
              {snapshot?.activeStep?.phaseLabel ||
                snapshot?.activeStep?.title ||
                "Aguardando início"}
            </strong>
          </span>
        </div>
      </div>

      {/* Menu Simples de 5 itens */}
      <nav className="grid grid-cols-5 gap-1.5 bg-[#0A150D] border border-[#D5C5AA]/25 p-1.5 rounded-2xl text-[11px]">
        {[
          { key: "inicio", label: "Início", icon: Home },
          { key: "pergunta", label: "Pergunta", icon: MessageSquarePlus },
          {
            key: "votacao",
            label: isPollOpen ? "Mesa ●" : "Votação",
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
                  : "text-[#D5C5AA] hover:bg-[#030A06]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate max-w-full">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ABA 1: INÍCIO — Exibe simultaneamente Votação da Mesa-Redonda (quando aberta na Pauta 5) e Pergunta da Pauta */}
      {activeTab === "inicio" && (
        <div className="space-y-4">
          {/* CARD DE VOTAÇÃO DA MESA-REDONDA — Exibido diretamente no Início quando aberto (especialmente durante a Pauta 5) */}
          {isPollOpen && activePoll && (
            <div className="border-2 border-emerald-500/60 bg-[#0A150D] p-5 rounded-2xl space-y-4 shadow-lg">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-full bg-[#14532D] text-white font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Vote className="w-3.5 h-3.5" />
                  {activePoll.status === "TIE_BREAK"
                    ? "Desempate Rápido (2 min) · Mesa-Redonda"
                    : "Votação da Mesa-Redonda Aberta"}
                </span>
                {myVoteForActivePoll && (
                  <span className="text-[11px] font-semibold text-emerald-300">
                    Voto registrado (editável)
                  </span>
                )}
              </div>

              <div className="space-y-1">
                <h2 className="font-display text-base sm:text-lg text-[#F7DECA] leading-snug">
                  {activePoll.question}
                </h2>
                <p className="text-xs text-[#D5C5AA]/80">
                  Escolha a questão que os 5 especialistas (Paula, Daniel,
                  Janaína, Denilson e Sérgio) debaterão na Mesa-Redonda. Você
                  pode alterar seu voto enquanto a votação estiver aberta.
                </p>
              </div>

              {voteFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
                    voteFeedback.type === "success"
                      ? "bg-emerald-950/40 text-emerald-200 border-emerald-500/40"
                      : "bg-red-950/40 text-red-200 border-red-500/40"
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{voteFeedback.message}</span>
                </div>
              )}

              <div className="space-y-2.5">
                {activePoll.options
                  .filter(
                    (opt) =>
                      activePoll.status !== "TIE_BREAK" ||
                      !activePoll.tieBreakOptionIds?.length ||
                      activePoll.tieBreakOptionIds.includes(opt.id)
                  )
                  .map((opt) => {
                    const isSelected = selectedOptionId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={submittingVote}
                        onClick={() => handleCastVote(opt.id)}
                        className={`w-full p-3.5 rounded-xl border text-left text-xs transition flex flex-col gap-1.5 cursor-pointer ${
                          isSelected
                            ? "border-emerald-400 bg-emerald-950/40 text-[#F7DECA] font-bold"
                            : "border-[#D5C5AA]/25 bg-[#030A06] text-[#F7DECA] hover:border-[#D5C5AA]/50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                            {opt.themeLabel || `Questão ${opt.optionOrder}`}
                          </span>
                          {isSelected && (
                            <span className="px-2 py-0.5 rounded-full bg-[#14532D] text-white text-[10px] font-bold shrink-0">
                              Seu voto atual
                            </span>
                          )}
                        </div>
                        <p className="leading-relaxed">{opt.label}</p>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* CARD DE ENVIO OU EDIÇÃO DE PERGUNTA DA PAUTA ATUAL */}
          <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/90 p-5 rounded-2xl space-y-3.5">
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="font-bold text-[#F7DECA] flex items-center gap-1.5">
                <MessageSquarePlus className="w-4 h-4 text-emerald-400" />
                {activeTopicQuestion
                  ? `Sua pergunta na Pauta ${activeTopicQuestion.topicNumber}`
                  : snapshot?.activeTopic
                    ? `Pergunta para a Pauta ${snapshot.activeTopic.number} (${snapshot.activeTopic.mainSpeaker.name})`
                    : "Pergunta para a Pauta Atual"}
              </span>
              <span className="font-mono text-[11px] text-[#D5C5AA]/75">
                {activeTopicQuestion
                  ? activeTopicQuestion.canEdit
                    ? "Editável (15m)"
                    : PUBLIC_STATUS_LABELS[activeTopicQuestion.status] ||
                      "Em curadoria"
                  : questionsOpen
                    ? "Captação aberta (15m)"
                    : "Captação fechada"}
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

            {activeTopicQuestion && !activeTopicQuestion.canEdit ? (
              <div className="border border-[#D5C5AA]/20 bg-[#030A06] p-4 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#D5C5AA]/75 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" />
                    Edição encerrada
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950/50 text-emerald-300 font-semibold">
                    {PUBLIC_STATUS_LABELS[activeTopicQuestion.status] ||
                      "Recebida"}
                  </span>
                </div>
                <p className="text-[#F7DECA] leading-relaxed">
                  {activeTopicQuestion.text}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendOrEditQuestion} className="space-y-3">
                <textarea
                  rows={3}
                  maxLength={charLimit}
                  value={questionText}
                  onChange={(e) => {
                    setQuestionText(e.target.value);
                    if (activeTopicQuestion) setIsEditingExisting(true);
                  }}
                  disabled={!canSendOrEditQuestion}
                  placeholder={
                    !questionsOpen
                      ? "O envio de perguntas abre durante os 15 minutos de Exposição de cada pauta."
                      : "Escreva aqui sua pergunta para o especialista da pauta..."
                  }
                  className="w-full p-3 text-xs border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] rounded-xl outline-none"
                />
                <div className="flex items-center justify-between text-xs gap-2">
                  <span className="font-mono text-[11px] text-[#D5C5AA]/70">
                    {questionText.length} / {charLimit} caracteres
                    {activeTopicQuestion?.editCount
                      ? ` · ${activeTopicQuestion.editCount} edição(ões)`
                      : ""}
                  </span>
                  <button
                    type="submit"
                    disabled={
                      submittingQuestion ||
                      !canSendOrEditQuestion ||
                      !questionText.trim()
                    }
                    className="px-4 py-2.5 bg-[#D5C5AA] text-[#030A06] font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {activeTopicQuestion ? (
                      <>
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>
                          {submittingQuestion
                            ? "Salvando..."
                            : "Salvar Edição da Pergunta"}
                        </span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>
                          {submittingQuestion
                            ? "Enviando..."
                            : "Enviar Pergunta"}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Se a votação da Mesa-Redonda já foi encerrada e há questão vencedora publicada, exibe ao participante */}
          {activePoll &&
            (activePoll.status === "CLOSED" ||
              activePoll.status === "RESULTS_PUBLISHED") &&
            activePoll.winningQuestionText && (
              <div className="border border-[#D5C5AA]/30 bg-[#0A150D]/95 p-4 rounded-2xl space-y-2 text-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Questão Eleita pelo Público para a Mesa-Redonda (20 min)
                </span>
                <p className="font-display text-sm sm:text-base text-[#F7DECA] leading-snug">
                  &ldquo;{activePoll.winningQuestionText}&rdquo;
                </p>
              </div>
            )}
        </div>
      )}

      {/* ABA 2: ENVIAR / EDITAR PERGUNTA */}
      {activeTab === "pergunta" && (
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/90 p-5 rounded-2xl space-y-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              1 Pergunta Ativa por Pauta · Editável durante a Exposição (15 min)
            </span>
            <h2 className="font-display text-lg text-[#F7DECA]">
              {activeTopicQuestion
                ? `Editar Pergunta da Pauta ${activeTopicQuestion.topicNumber}`
                : snapshot?.activeTopic
                  ? `Enviar Pergunta para a Pauta ${snapshot.activeTopic.number}`
                  : "Pergunta para a Pauta"}
            </h2>
            <p className="text-xs text-[#D5C5AA]/80">
              Você pode enviar 1 pergunta por pauta (máximo de {charLimit}{" "}
              caracteres) durante os 15 minutos de exposição e editá-la livremente
              até que a moderação selecione a pergunta para os 5 minutos de
              resposta.
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

          <form onSubmit={handleSendOrEditQuestion} className="space-y-3">
            <textarea
              rows={4}
              maxLength={charLimit}
              value={questionText}
              onChange={(e) => {
                setQuestionText(e.target.value);
                if (activeTopicQuestion) setIsEditingExisting(true);
              }}
              disabled={!canSendOrEditQuestion}
              placeholder="Formule sua pergunta com clareza..."
              className="w-full p-3.5 text-sm border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] rounded-xl outline-none"
            />

            <div className="flex items-center justify-between text-xs">
              <span className="font-mono text-[#D5C5AA]/75">
                {questionText.length} / {charLimit} caracteres
              </span>
              <button
                type="submit"
                disabled={
                  submittingQuestion ||
                  !canSendOrEditQuestion ||
                  !questionText.trim()
                }
                className="px-5 py-3 bg-[#D5C5AA] text-[#030A06] font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {activeTopicQuestion ? (
                  <>
                    <Edit3 className="w-4 h-4" />
                    <span>
                      {submittingQuestion ? "Salvando..." : "Salvar Edição"}
                    </span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{submittingQuestion ? "Registrando..." : "Enviar"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ABA 3: VOTAÇÃO DA MESA-REDONDA */}
      {activeTab === "votacao" && (
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/90 p-5 rounded-2xl space-y-4">
          {!activePoll || activePoll.status === "DRAFT" ? (
            <div className="text-center py-8 space-y-2">
              <Vote className="w-8 h-8 text-emerald-400 mx-auto" />
              <h2 className="font-display text-lg text-[#F7DECA]">
                Votação da Mesa-Redonda
              </h2>
              <p className="text-xs text-[#D5C5AA]/75">
                A votação pública ocorre durante a{" "}
                <strong>Pauta 5 (Janaína)</strong> para escolher qual das 3
                questões centrais será debatida pelos 5 especialistas na
                Mesa-Redonda.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="px-2.5 py-1 rounded-full bg-[#14532D] text-white font-bold">
                  {activePoll.status === "TIE_BREAK"
                    ? "Rodada de Desempate (2 min)"
                    : "Votação da Mesa-Redonda"}
                </span>
                <span className="font-mono text-[#D5C5AA]/80">
                  {isPollOpen ? `Aberta · ${timer.formatted}` : "Encerrada"}
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

              {!isPollOpen && (
                <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-950/30 text-xs text-amber-200 font-semibold">
                  Votação encerrada. Confira a questão vencedora no telão da
                  Arena.
                </div>
              )}

              <div className="space-y-2.5">
                {activePoll.options
                  .filter(
                    (opt) =>
                      activePoll.status !== "TIE_BREAK" ||
                      !activePoll.tieBreakOptionIds?.length ||
                      activePoll.tieBreakOptionIds.includes(opt.id)
                  )
                  .map((opt) => {
                    const isSelected = selectedOptionId === opt.id;
                    const showPercent =
                      (activePoll.status === "CLOSED" ||
                        activePoll.status === "RESULTS_PUBLISHED") &&
                      typeof opt.percentage === "number";

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={submittingVote || !isPollOpen}
                        onClick={() => handleCastVote(opt.id)}
                        className={`w-full p-4 rounded-xl border text-left text-xs transition flex flex-col gap-2 cursor-pointer disabled:cursor-default ${
                          isSelected
                            ? "border-emerald-400 bg-emerald-950/30 text-[#F7DECA] font-bold"
                            : "border-[#D5C5AA]/25 bg-[#030A06] text-[#F7DECA]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                            {opt.themeLabel || `Questão ${opt.optionOrder}`}
                          </span>
                          {isSelected && (
                            <span className="px-2 py-0.5 rounded-full bg-[#14532D] text-white text-[10px] font-bold shrink-0">
                              Seu voto
                            </span>
                          )}
                        </div>

                        <p className="leading-relaxed">{opt.label}</p>

                        {showPercent && (
                          <div className="space-y-1 w-full pt-1">
                            <div className="flex justify-between text-[11px] font-mono text-[#D5C5AA]/80">
                              <span>{opt.votesCount ?? 0} votos</span>
                              <strong>{opt.percentage}%</strong>
                            </div>
                            <div className="w-full h-2 bg-[#0A150D] rounded-full overflow-hidden">
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

              {isPollOpen && myVoteForActivePoll && (
                <p className="text-[11px] text-[#D5C5AA]/75 text-center">
                  Você já registrou seu voto. Enquanto a votação estiver aberta,
                  basta tocar em outra questão se desejar alterar sua escolha.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ABA 4: MINHAS PARTICIPAÇÕES & VINCULAÇÃO DE CREDENCIAL */}
      {activeTab === "minhas" && (
        <div className="space-y-4">
          {/* Vinculação opcional de Credencial de Check-in */}
          <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/90 p-5 rounded-2xl space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#F7DECA] flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                Credencial de Check-in
              </span>
              <span className="font-mono text-[#D5C5AA]/80">
                {me?.credentialCode
                  ? `Validada: ${me.credentialCode}`
                  : `Sessão: #${me?.code || "..."}`}
              </span>
            </div>
            {!me?.credentialCode && (
              <form
                onSubmit={handleEnterArena}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={credentialInput}
                  onChange={(e) =>
                    setCredentialInput(e.target.value.toUpperCase())
                  }
                  placeholder="Código do check-in (ex.: ANM-001)"
                  className="flex-1 px-3 py-2 rounded-xl border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] font-mono text-xs uppercase outline-none"
                />
                <button
                  type="submit"
                  disabled={entering || !credentialInput.trim()}
                  className="px-3.5 py-2 rounded-xl bg-[#14532D] text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  Validar
                </button>
              </form>
            )}
            {enterError && (
              <p className="text-red-300 text-[11px]">{enterError}</p>
            )}
          </div>

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
                      <span className="font-semibold text-emerald-400">
                        Pauta {q.topicNumber}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          q.status === "SELECTED" || q.status === "ANSWERED"
                            ? "bg-emerald-950/40 text-emerald-300"
                            : "bg-[#0A150D] text-[#D5C5AA]"
                        }`}
                      >
                        {PUBLIC_STATUS_LABELS[q.status] || "Recebida"}
                      </span>
                    </div>
                    <p className="text-[#F7DECA] leading-relaxed">{q.text}</p>
                    {q.canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          setQuestionText(q.text);
                          setIsEditingExisting(true);
                          setActiveTab("pergunta");
                        }}
                        className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        Editar esta pergunta
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/90 p-5 rounded-2xl space-y-3">
            <h2 className="font-display text-base text-[#F7DECA]">
              Meu Voto para a Mesa-Redonda ({me?.votes.length ?? 0})
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
                    <div className="font-semibold text-emerald-400">
                      {v.optionThemeLabel || `Questão ${v.optionOrder}`}
                    </div>
                    <div className="font-bold text-[#F7DECA] pt-1">
                      {v.optionLabel}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 5: INFORMAÇÕES DO EVENTO & PRIVACIDADE LGPD */}
      {activeTab === "info" && (
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/90 p-5 rounded-2xl space-y-4 text-xs">
          <div className="space-y-1">
            <span className="font-semibold uppercase tracking-wider text-emerald-400">
              Sobre o Evento · Formato Oficial v2.0
            </span>
            <h2 className="font-display text-lg text-[#F7DECA]">
              {snapshot?.event.name || "A Nova Moeda"}
            </h2>
            <p className="text-[#D5C5AA]/80">
              Instituição: {snapshot?.event.institution || "UEFS"} · Duração
              programada: {snapshot?.event.programmedDurationMin ?? 145} minutos
              (2h25) · Carga horária certificada:{" "}
              {snapshot?.event.certifiedHours ?? 4}h · 5 Pautas + Mesa-Redonda.
            </p>
          </div>

          <div className="pt-3 border-t border-[#D5C5AA]/15 space-y-2">
            <div className="font-bold text-[#F7DECA] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Aviso de Privacidade e Proteção de Dados (LGPD)
            </div>
            <p className="text-[#D5C5AA]/80 leading-relaxed">
              Esta plataforma segue os princípios de minimização, finalidade e
              transparência da LGPD. Não coletamos nome, CPF, e-mail ou
              telefone dos participantes na Arena. Sua sessão utiliza apenas um
              código técnico anônimo (`#{me?.code || "ANM"}`) ou credencial de
              check-in para garantir unicidade de voto e permitir que você edite
              sua pergunta no próprio celular.
            </p>
            <p className="text-[#D5C5AA]/80 leading-relaxed">
              No telão público da Arena são exibidos apenas o texto aprovado da
              pergunta selecionada (com identificação clara se veio da plateia
              ou da mediação) e a apuração oficial da questão vencedora da
              Mesa-Redonda.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
