"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useArenaSync } from "@/hooks/use-arena-sync";
import { PUBLIC_STATUS_LABELS } from "@/lib/question-status";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Edit3,
  Home,
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

type TabKey = "inicio" | "pergunta" | "votacao" | "minhas";

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
  }, [fetchMe]);

  useEffect(() => {
    if (me?.authenticated && snapshot?.seq) {
      fetchMe();
    }
  }, [fetchMe, me?.authenticated, snapshot?.seq]);

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

  const isAfterTopic5 = useMemo(() => {
    const currentStepOrder = snapshot?.activeStep?.sequenceOrder ?? 0;
    const currentMacroOrder = snapshot?.activeStep?.macroOrder ?? 0;
    const currentMode = snapshot?.liveState?.arenaMode;
    const stepType = snapshot?.activeStep?.stepType;

    // Votação se torna prioridade no início apenas após a conclusão da Pauta 5
    return Boolean(
      currentMode === "POLL_OPEN" ||
      currentMode === "POLL_RESULTS" ||
      currentMode === "ROUNDTABLE" ||
      currentMode === "CLOSING" ||
      stepType === "TRANSITION" ||
      stepType === "ROUNDTABLE" ||
      stepType === "CLOSING" ||
      currentMacroOrder >= 8 ||
      currentStepOrder >= 13
    );
  }, [snapshot?.activeStep, snapshot?.liveState?.arenaMode]);

  const requireCredential =
    me?.requireCredential ?? snapshot?.event.requireCredential ?? false;

  const canSendOrEditQuestion =
    questionsOpen &&
    (!activeTopicQuestion || Boolean(activeTopicQuestion.canEdit));

  // Tela Inicial de Entrada (antes de iniciar sessão)
  if (!loadingSession && me && !me.authenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-8 space-y-3">
        <div className="flex justify-end">
          <ThemeToggle compact />
        </div>
        <div className="border border-[#D5C5AA]/30 bg-[#0A150D]/95 p-7 rounded-2xl space-y-6 text-center shadow-lg">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#0A150D] border border-emerald-500/40 p-2 flex items-center justify-center shadow-xl">
            <img
              src="/img/logo.png"
              alt="A Nova Moeda"
              className="w-full h-full object-contain filter drop-shadow"
            />
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
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-4 rounded-2xl space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0A150D] border border-emerald-500/40 p-1 flex items-center justify-center shadow-sm shrink-0">
              <img
                src="/img/logo.png"
                alt="A Nova Moeda"
                className="w-full h-full object-contain filter drop-shadow"
              />
            </div>
            <div>
              <div className="font-display font-bold text-sm sm:text-base text-[#F7DECA] leading-tight">
                A Nova Moeda
              </div>
              <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5 mt-0.5">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>
                  {snapshot?.activeTopic
                    ? `Pauta ${snapshot.activeTopic.number} de 5`
                    : "Arena Interativa"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            {me?.credentialCode ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 font-mono text-[11px] font-bold">
                #{me.credentialCode}
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-[#030A06] border border-[#D5C5AA]/25 text-[#D5C5AA] font-mono text-[11px]">
                #{me?.code || "..."}
              </span>
            )}
          </div>
        </div>

        {snapshot?.activeTopic ? (
          <div className="pt-2 border-t border-[#D5C5AA]/15 space-y-1">
            <h1 className="font-display text-sm sm:text-base text-[#F7DECA] font-bold leading-snug">
              {snapshot.activeTopic.title}
            </h1>
            {snapshot.activeTopic.mainSpeaker && (
              <div className="flex items-center gap-2 text-xs text-[#D5C5AA]/80">
                {snapshot.activeTopic.mainSpeaker.photoUrl && (
                  <img
                    src={snapshot.activeTopic.mainSpeaker.photoUrl}
                    alt=""
                    className="w-4 h-4 rounded-full object-cover border border-[#D5C5AA]/40"
                  />
                )}
                <span>
                  Palestrante:{" "}
                  <strong className="text-[#F7DECA]">
                    {snapshot.activeTopic.mainSpeaker.name}
                  </strong>
                </span>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Menu Simples de 4 itens */}
      <nav className="grid grid-cols-4 gap-2 bg-[#0A150D] border border-[#D5C5AA]/25 p-1.5 rounded-2xl text-[11px]">
        {[
          { key: "inicio", label: "Início", icon: Home },
          { key: "pergunta", label: "Pergunta", icon: MessageSquarePlus },
          {
            key: "votacao",
            label: isPollOpen ? "Votação ●" : "Votação",
            icon: Vote,
          },
          {
            key: "minhas",
            label: `Minhas (${(me?.questions.length ?? 0) + (me?.votes.length ?? 0)})`,
            icon: ListChecks,
          },
        ].map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.key as TabKey)}
              className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 font-semibold cursor-pointer transition ${
                active
                  ? "bg-[#14532D] text-white shadow-xs"
                  : "text-[#D5C5AA] hover:bg-slate-100 dark:hover:bg-[#030A06]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate max-w-full">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ABA 1: INÍCIO */}
      {activeTab === "inicio" && (
        <div className="space-y-4">
          {/* SE NÃO HOUVER PAUTA ATIVA OU SE FOR APÓS A PAUTA 5: VOTAÇÃO DA MESA-REDONDA GANHA DESTAQUE PRINCIPAL */}
          {(!snapshot?.activeTopic || isAfterTopic5) && activePoll && (
            <div className="border-2 border-emerald-500/60 bg-[#0A150D] p-5 rounded-2xl space-y-4 shadow-lg">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-full bg-[#14532D] text-white font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Vote className="w-3.5 h-3.5" />
                  {activePoll.status === "TIE_BREAK"
                    ? "Desempate Rápido · Mesa-Redonda"
                    : activePoll.status === "CLOSED" || activePoll.status === "RESULTS_PUBLISHED"
                      ? "Resultado da Votação · Mesa-Redonda"
                      : "Votação Oficial da Mesa-Redonda"}
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
                  {activePoll.status === "CLOSED" || activePoll.status === "RESULTS_PUBLISHED"
                    ? "A votação foi encerrada. Veja a questão que guiará a Mesa-Redonda."
                    : "Escolha qual questão deve guiar o debate entre os 5 especialistas na Mesa-Redonda."}
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
                        disabled={
                          submittingVote ||
                          activePoll.status === "CLOSED" ||
                          activePoll.status === "RESULTS_PUBLISHED"
                        }
                        onClick={() => handleCastVote(opt.id)}
                        className={`w-full p-3.5 rounded-xl border text-left text-xs transition flex flex-col gap-1.5 cursor-pointer ${
                          isSelected
                            ? "border-emerald-400 bg-emerald-950/40 text-[#F7DECA] font-bold shadow-sm"
                            : "border-[#D5C5AA]/25 bg-[#030A06] text-[#F7DECA] hover:border-[#D5C5AA]/50"
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
                          {opt.isWinner && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-extrabold shrink-0">
                              Eleita
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

          {/* 2. CARD PRINCIPAL NO INÍCIO: FORMULAR E ENVIAR PERGUNTA PARA O PALESTRANTE DA PAUTA */}
          <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/90 p-5 rounded-2xl space-y-3.5">
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="font-bold text-[#F7DECA] flex items-center gap-2">
                {snapshot?.activeTopic?.mainSpeaker?.photoUrl && (
                  <img
                    src={snapshot.activeTopic.mainSpeaker.photoUrl}
                    alt=""
                    className="w-5 h-5 rounded-full object-cover border border-[#D5C5AA]/40 shrink-0 inline-block"
                  />
                )}
                <MessageSquarePlus className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  {activeTopicQuestion
                    ? `Sua pergunta na Pauta ${activeTopicQuestion.topicNumber}`
                    : snapshot?.activeTopic
                      ? `Pergunta para a Pauta ${snapshot.activeTopic.number} (${snapshot.activeTopic.mainSpeaker.name})`
                      : "Pergunta para a Pauta Atual"}
                </span>
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

          {/* 3. DURANTE AS PAUTAS 1 A 5: BANNER DISCRETO DE ACESSO À VOTAÇÃO (SEM POLUIR O INÍCIO) */}
          {!isAfterTopic5 && isPollOpen && activePoll && (
            <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-[#D5C5AA]/85 min-w-0">
                <Vote className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">
                  Votação da Mesa-Redonda disponível na aba <strong>Votação</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("votacao")}
                className="px-3 py-1.5 rounded-lg bg-[#14532D] text-white text-[11px] font-semibold hover:bg-emerald-700 transition shrink-0 cursor-pointer"
              >
                Abrir Votação
              </button>
            </div>
          )}

          {/* 4. RESULTADO DA VOTAÇÃO SE JÁ APURADO */}
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

          {snapshot?.activeTopic && (
            <div className="flex items-center gap-3.5 p-3 rounded-xl bg-[#030A06] border border-[#D5C5AA]/20">
              {snapshot.activeTopic.mainSpeaker?.photoUrl && (
                <img
                  src={snapshot.activeTopic.mainSpeaker.photoUrl}
                  alt={snapshot.activeTopic.mainSpeaker.name}
                  className="w-12 h-12 rounded-xl object-cover border border-[#D5C5AA]/30 shrink-0"
                />
              )}
              <div className="space-y-0.5 min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Pauta {snapshot.activeTopic.number} · {snapshot.activeTopic.mainSpeaker.name}
                </div>
                <div className="text-xs font-semibold text-[#F7DECA] truncate">
                  {snapshot.activeTopic.title}
                </div>
              </div>
            </div>
          )}

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
                Votação aberta para todo o público escolher qual das 3
                questões centrais será debatida pelos 5 especialistas
                (Daniel, Janaína, Denilson Carneiro, Sérgio Passos e Dulcila) na
                Mesa-Redonda sob mediação de Paula.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="px-2.5 py-1 rounded-full bg-[#14532D] text-white font-bold">
                  {activePoll.status === "TIE_BREAK"
                    ? "Rodada de Desempate (2 min)"
                    : "Votação da Mesa-Redonda (Aberta)"}
                </span>
                <span className="font-mono text-[#D5C5AA]/80">
                  {isPollOpen ? `Aberta · ${timer.formatted}` : "Encerrada"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#030A06] border border-[#D5C5AA]/20 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#D5C5AA]/80 block">
                  Debatedores da Mesa-Redonda (Mediação: Paula)
                </span>
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { id: "1", name: "Daniel", photoUrl: "/img/Daniel.jpeg" },
                    { id: "2", name: "Janaína", photoUrl: "/img/Janaina.jpeg" },
                    { id: "3", name: "Denilson", photoUrl: "/img/Denilson.png" },
                    { id: "4", name: "Sérgio", photoUrl: "/img/Sergio.jpeg" },
                    { id: "5", name: "Dulcila", photoUrl: "/img/Dulcila.jpeg" },
                  ].map((sp) => (
                    <div key={sp.id} className="flex flex-col items-center text-center gap-1">
                      {sp.photoUrl ? (
                        <img
                          src={sp.photoUrl}
                          alt={sp.name}
                          className="w-10 h-10 rounded-xl object-cover border border-[#D5C5AA]/30"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-[#14532D] text-white flex items-center justify-center font-bold text-xs">
                          {sp.name.charAt(0)}
                        </div>
                      )}
                      <span className="text-[10px] text-[#F7DECA] font-medium truncate w-full">
                        {sp.name}
                      </span>
                    </div>
                  ))}
                </div>
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
    </div>
  );
}
