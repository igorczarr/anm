"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useArenaSync } from "@/hooks/use-arena-sync";
import { PUBLIC_STATUS_LABELS } from "@/lib/question-status";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
import {
  InstagramVoteReceiptCard,
  InstagramStoryModal,
} from "@/components/instagram-vote-receipt";
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
  Vote,
  WifiOff,
} from "lucide-react";

type TabKey = "inicio" | "pergunta" | "votacao" | "minhas";

const SIX_SPECIALISTS = [
  { id: "1", name: "Daniel", fullName: "Daniel Pereira", role: "Pauta 1", photoUrl: "/img/Daniel.png?v=3" },
  { id: "2", name: "Janaína", fullName: "Janaína Silva", role: "Pauta 2", photoUrl: "/img/Janaina.jpeg" },
  { id: "3", name: "Denilson", fullName: "Denilson Carneiro", role: "Pauta 3", photoUrl: "/img/Denilson.png" },
  { id: "4", name: "Sérgio", fullName: "Sérgio Passos", role: "Pauta 4", photoUrl: "/img/Sergio.png?v=3" },
  { id: "5", name: "Dulcila", fullName: "Dulcila", role: "Pauta 5", photoUrl: "/img/Dulcila.jpeg" },
  { id: "6", name: "Paula", fullName: "Paula Melo", role: "Mediação", photoUrl: "/img/Paula.jpeg" },
];

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
  id?: string;
  pollId: string;
  pollNumber: number;
  pollQuestion: string;
  pollStatus: string;
  votedAt?: string;
}

interface MePayload {
  authenticated: boolean;
  code?: string;
  name?: string | null;
  email?: string | null;
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
  const [selectedEntryOptionId, setSelectedEntryOptionId] = useState<string | null>(null);
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

  // Estado da votação da Mesa-Redonda e Comprovante Instagramável
  const [submittingVote, setSubmittingVote] = useState(false);
  const [changingSecretVote, setChangingSecretVote] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
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

  const activePoll = snapshot?.activePoll;

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
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        setEnterError(
          data.error || "Não foi possível entrar na Arena. Verifique os dados informados."
        );
        return;
      }

      // Se o usuário selecionou uma opção na tela de entrada, computa o voto imediatamente e abre o Comprovante Instagramável
      let votedOnEntry = false;
      if (selectedEntryOptionId && activePoll) {
        try {
          const voteRes = await fetch("/api/participant/vote", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pollId: activePoll.id,
              optionId: selectedEntryOptionId,
              clientRequestId: makeClientRequestId(),
            }),
          });
          if (voteRes.ok) {
            votedOnEntry = true;
          }
        } catch {
          // ignora falha de voto silenciosa, o usuário poderá votar na tela principal
        }
      }

      await fetchMe();
      if (votedOnEntry) {
        setShowStoryModal(true);
      }
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

      setChangingSecretVote(false);
      setVoteFeedback(null);
      await fetchMe();
      setShowStoryModal(true);
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

  // Contagem regressiva em Horas e Minutos até o início oficial do evento
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const eventCountdown = useMemo(() => {
    const target = snapshot?.event?.scheduledStartAt
      ? new Date(snapshot.event.scheduledStartAt).getTime()
      : new Date("2026-11-17T21:30:00.000Z").getTime();
    const diff = target - nowMs;
    if (diff > 0) {
      const totalSec = Math.floor(diff / 1000);
      const hours = Math.floor(totalSec / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;
      return {
        hours: String(hours).padStart(2, "0"),
        minutes: String(minutes).padStart(2, "0"),
        seconds: String(seconds).padStart(2, "0"),
        formattedHM: `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}min`,
      };
    }
    const parts = (timer.formatted || "05:00").split(":");
    return {
      hours: "00",
      minutes: parts[0] || "05",
      seconds: parts[1] || "00",
      formattedHM: `00h ${parts[0] || "05"}min`,
    };
  }, [snapshot?.event?.scheduledStartAt, nowMs, timer.formatted]);

  // Tela Inicial de Entrada (antes de iniciar sessão)
  if (!loadingSession && me && !me.authenticated) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6 sm:py-8 space-y-4">
        <div className="flex justify-end">
          <ThemeToggle compact />
        </div>
        <div className="border border-[#D5C5AA]/30 bg-[#0A150D]/95 p-6 sm:p-7 rounded-2xl space-y-5 text-center shadow-xl backdrop-blur-md">
          {/* Logo Inteligente (Clara no tema escuro, escura no tema claro) */}
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#0A150D] border border-emerald-500/40 p-2 flex items-center justify-center shadow-xl">
            <BrandLogo className="w-full h-full object-contain filter drop-shadow" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block">
              {snapshot?.event.institution || "Universidade Estadual de Feira de Santana"} · Auditório 2
            </span>
            <h1 className="font-display text-2xl sm:text-3xl text-[#F7DECA] font-bold">
              {snapshot?.event.name || "A Nova Moeda"}: Economia da Solidão
            </h1>
          </div>

          {/* Box de Contagem Regressiva (Horas e Minutos) + Fotos dos 6 Especialistas que participarão */}
          <div className="border border-white/10 bg-[#030A06] p-4 rounded-2xl space-y-4 shadow-md">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 block">
                Contagem Regressiva até o Início do Evento
              </span>
              <div className="flex items-center justify-center gap-2 sm:gap-3 pt-1">
                <div className="px-3.5 py-2 rounded-xl bg-[#0A150D] border border-emerald-500/30 min-w-[74px]">
                  <div className="font-mono font-extrabold text-2xl sm:text-3xl text-[#F7DECA] leading-none">
                    {eventCountdown.hours}h
                  </div>
                  <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold block mt-1">
                    Horas
                  </span>
                </div>
                <span className="font-mono text-xl font-bold text-emerald-400">:</span>
                <div className="px-3.5 py-2 rounded-xl bg-[#0A150D] border border-emerald-500/30 min-w-[74px]">
                  <div className="font-mono font-extrabold text-2xl sm:text-3xl text-[#F7DECA] leading-none">
                    {eventCountdown.minutes}m
                  </div>
                  <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold block mt-1">
                    Minutos
                  </span>
                </div>
                <span className="font-mono text-xl font-bold text-[#D5C5AA]/50">:</span>
                <div className="px-3 py-2 rounded-xl bg-[#0A150D] border border-white/10 min-w-[64px]">
                  <div className="font-mono font-bold text-xl sm:text-2xl text-[#D5C5AA] leading-none">
                    {eventCountdown.seconds}s
                  </div>
                  <span className="text-[9px] uppercase tracking-wider text-[#D5C5AA]/60 font-semibold block mt-1">
                    Segundos
                  </span>
                </div>
              </div>
            </div>

            {/* Fotos dos 6 Especialistas dentro do box mostrando que participarão */}
            <div className="pt-3 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold uppercase tracking-wider text-emerald-400">
                  6 Especialistas que participarão:
                </span>
                <span className="text-[#D5C5AA]/70">Debate &amp; Mesa-Redonda</span>
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {SIX_SPECIALISTS.map((sp) => (
                  <div key={sp.id} className="flex flex-col items-center text-center gap-1">
                    <img
                      src={sp.photoUrl}
                      alt={sp.fullName}
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover object-top border-2 border-emerald-500/50 shadow-sm"
                    />
                    <span className="text-[9px] text-[#F7DECA] font-bold truncate w-full leading-tight">
                      {sp.name}
                    </span>
                    <span className="text-[8px] text-emerald-400 font-semibold truncate w-full leading-none">
                      {sp.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* VOTAÇÃO EM EVIDÊNCIA PARA ESTIMULAR A PARTICIPAÇÃO ANTECIPADA */}
          {activePoll && (
            <div className="border-2 border-emerald-400 bg-emerald-950/25 p-4 sm:p-5 rounded-2xl text-left space-y-3 shadow-[0_0_25px_rgba(16,185,129,0.15)]">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#14532D] text-white text-[10px] font-bold uppercase tracking-wider">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  <span>Votação em Evidência · Participe Agora</span>
                </div>
                <span className="text-[10px] text-emerald-300 font-semibold">
                  {selectedEntryOptionId ? "1 opção escolhida" : "Toque para escolher"}
                </span>
              </div>

              <div className="space-y-1">
                <h2 className="font-display text-base sm:text-lg font-extrabold text-[#F7DECA] leading-snug">
                  {activePoll.question || "Qual questão deve orientar a Mesa-Redonda?"}
                </h2>
                <p className="text-xs text-[#D5C5AA]/90 leading-relaxed">
                  Enquanto o evento não começa, você já decide o rumo do debate! Escolha abaixo o tema que os 6 especialistas devem debater e gere seu comprovante para os Stories:
                </p>
              </div>

              <div className="space-y-2 pt-1">
                {activePoll.options.map((opt) => {
                  const isSelected = selectedEntryOptionId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        setSelectedEntryOptionId(isSelected ? null : opt.id)
                      }
                      className={`w-full p-3.5 rounded-xl border text-left transition cursor-pointer flex items-start gap-2.5 ${
                        isSelected
                          ? "border-emerald-400 bg-emerald-950/60 text-emerald-200 shadow-md ring-1 ring-emerald-400"
                          : "border-white/15 bg-[#030A06] text-[#D5C5AA]/90 hover:border-emerald-400/50"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border mt-0.5 shrink-0 flex items-center justify-center ${
                          isSelected
                            ? "border-emerald-300 bg-emerald-400"
                            : "border-[#D5C5AA]/40"
                        }`}
                      >
                        {isSelected && (
                          <div className="w-1.5 h-1.5 rounded-full bg-black" />
                        )}
                      </div>
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block truncate">
                            {opt.themeLabel || `Questão ${opt.optionOrder}`}
                          </span>
                          <span className="text-[9px] font-semibold text-emerald-300/80 shrink-0">
                            {isSelected ? "Selecionada ✓" : "Escolher"}
                          </span>
                        </div>
                        <p className="text-xs text-[#F7DECA] font-medium leading-relaxed">
                          {opt.label}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Formulário de Identificação e Validação do Voto */}
          <form onSubmit={handleEnterArena} className="space-y-3.5 text-left pt-1">
            <div className="text-xs text-[#D5C5AA]/80 font-medium">
              Informe seu nome e e-mail para validar seu acesso e confirmar seu voto:
            </div>

            <div className="space-y-1">
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

            <div className="space-y-1">
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
              <span>
                {entering
                  ? "Registrando e Conectando..."
                  : selectedEntryOptionId
                    ? "Confirmar Voto e Entrar na Sala de Espera"
                    : "Entrar para Votar na Mesa-Redonda"}
              </span>
            </button>
          </form>

          <p className="text-[11px] text-[#D5C5AA]/70 leading-relaxed text-center">
            Sua credencial de participação será gerada automaticamente para validar seus votos e perguntas com total segurança.
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

      {/* Cabeçalho Editorial do Participante */}
      <div
        style={{ borderRadius: "20px" }}
        className="border border-[#D5C5AA]/20 bg-[#0A150D]/95 px-4 py-3.5 shadow-lg backdrop-blur-md space-y-3"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 flex items-center justify-center shrink-0">
              <BrandLogo className="w-full h-full object-contain drop-shadow-sm" />
            </div>
            <div className="min-w-0">
              <div className="font-display font-extrabold text-sm sm:text-base text-[#F7DECA] leading-tight truncate">
                A Nova Moeda
              </div>
              <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5 mt-0.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="truncate">
                  {snapshot?.activeTopic
                    ? `Pauta ${snapshot.activeTopic.number} de 5`
                    : "Economia da Solidão · UEFS"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle compact />
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
          {/* MODO SALA DE ESPERA: CONTAGEM REGRESSIVA (HORAS E MINUTOS) + FOTOS DOS 6 ESPECIALISTAS NO BOX */}
          {!snapshot?.activeTopic && (
            <div className="border border-emerald-500/40 bg-[#0A150D]/95 p-5 sm:p-6 rounded-2xl space-y-4 text-center shadow-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>SALA DE ESPERA · AUDITÓRIO 2 (UEFS)</span>
              </div>

              <div className="space-y-1">
                <h2 className="font-display text-xl sm:text-2xl text-[#F7DECA] font-bold">
                  A Nova Moeda: Economia da Solidão
                </h2>
                <p className="text-xs text-[#D5C5AA]/85 max-w-md mx-auto leading-relaxed">
                  Enquanto o evento não começa, acompanhe a contagem regressiva oficial e participe da <strong>Votação da Mesa-Redonda em evidência</strong> logo abaixo!
                </p>
              </div>

              {/* Contagem Regressiva de Horas e Minutos até o Evento */}
              <div className="border border-white/10 bg-[#030A06] p-4 rounded-2xl space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 block">
                  Contagem Regressiva até o Início Oficial
                </span>
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  <div className="px-3.5 py-2.5 rounded-xl bg-[#0A150D] border border-emerald-500/40 min-w-[78px] shadow-sm">
                    <div className="font-mono font-extrabold text-2xl sm:text-3xl text-[#F7DECA] leading-none">
                      {eventCountdown.hours}h
                    </div>
                    <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold block mt-1">
                      Horas
                    </span>
                  </div>
                  <span className="font-mono text-2xl font-bold text-emerald-400">:</span>
                  <div className="px-3.5 py-2.5 rounded-xl bg-[#0A150D] border border-emerald-500/40 min-w-[78px] shadow-sm">
                    <div className="font-mono font-extrabold text-2xl sm:text-3xl text-[#F7DECA] leading-none">
                      {eventCountdown.minutes}m
                    </div>
                    <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold block mt-1">
                      Minutos
                    </span>
                  </div>
                  <span className="font-mono text-xl font-bold text-[#D5C5AA]/50">:</span>
                  <div className="px-3 py-2.5 rounded-xl bg-[#0A150D] border border-white/10 min-w-[66px]">
                    <div className="font-mono font-bold text-xl sm:text-2xl text-[#D5C5AA] leading-none">
                      {eventCountdown.seconds}s
                    </div>
                    <span className="text-[9px] uppercase tracking-wider text-[#D5C5AA]/60 font-semibold block mt-1">
                      Segundos
                    </span>
                  </div>
                </div>

                {/* Fotos dos 6 Especialistas dentro do box mostrando que participarão */}
                <div className="pt-3 border-t border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold uppercase tracking-wider text-emerald-400">
                      Especialistas confirmados que participarão:
                    </span>
                    <span className="text-[#D5C5AA]/70">5 Pautas + Mesa-Redonda</span>
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {SIX_SPECIALISTS.map((sp) => (
                      <div key={sp.id} className="flex flex-col items-center text-center gap-1">
                        <img
                          src={sp.photoUrl}
                          alt={sp.fullName}
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover object-top border-2 border-emerald-500/50 shadow-sm"
                        />
                        <span className="text-[9px] text-[#F7DECA] font-bold truncate w-full leading-tight">
                          {sp.name}
                        </span>
                        <span className="text-[8px] text-emerald-400 font-semibold truncate w-full leading-none">
                          {sp.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VOTAÇÃO OFICIAL DA MESA-REDONDA EM EVIDÊNCIA OU COMPROVANTE INSTAGRAMÁVEL */}
          {(!snapshot?.activeTopic || isAfterTopic5) && activePoll && (
            myVoteForActivePoll && !changingSecretVote ? (
              <InstagramVoteReceiptCard
                participantName={me?.name}
                credentialCode={me?.credentialCode}
                anonymousCode={me?.code}
                voteId={myVoteForActivePoll.id}
                votedAt={myVoteForActivePoll.votedAt}
                isPollOpen={isPollOpen}
                onChangeVoteRequest={() => setChangingSecretVote(true)}
                onOpenStoryModal={() => setShowStoryModal(true)}
              />
            ) : (
              <div className="border-2 border-emerald-400 bg-[#0A150D] p-5 rounded-2xl space-y-4 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="px-3 py-1 rounded-full bg-[#14532D] text-white font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                    </span>
                    <Vote className="w-3.5 h-3.5" />
                    <span>
                      {activePoll.status === "TIE_BREAK"
                        ? "Desempate Rápido · Mesa-Redonda"
                        : "Votação em Evidência · Mesa-Redonda"}
                    </span>
                  </span>
                  {changingSecretVote && (
                    <button
                      type="button"
                      onClick={() => setChangingSecretVote(false)}
                      className="text-[11px] font-semibold text-emerald-300 underline cursor-pointer"
                    >
                      Voltar ao Comprovante
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  <h2 className="font-display text-lg sm:text-xl font-extrabold text-[#F7DECA] leading-snug">
                    {activePoll.question}
                  </h2>
                  <p className="text-xs text-[#D5C5AA]/85 leading-relaxed">
                    Enquanto o evento não começa, escolha em sigilo qual questão deve guiar o debate entre os 6 especialistas na Mesa-Redonda. Ao votar, seu comprovante para os Stories será exibido!
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
                    .map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={
                          submittingVote ||
                          activePoll.status === "CLOSED" ||
                          activePoll.status === "RESULTS_PUBLISHED"
                        }
                        onClick={() => handleCastVote(opt.id)}
                        className="w-full p-4 rounded-xl border border-emerald-500/35 bg-[#030A06] text-[#F7DECA] hover:border-emerald-400 hover:bg-emerald-950/30 text-left text-xs transition flex flex-col gap-1.5 cursor-pointer shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                            {opt.themeLabel || `Questão ${opt.optionOrder}`}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-bold text-emerald-300">
                            Votar nesta questão →
                          </span>
                        </div>
                        <p className="leading-relaxed font-medium">{opt.label}</p>
                      </button>
                    ))}
                </div>
              </div>
            )
          )}

          {/* AVISO AMIGÁVEL SOBRE PERGUNTAS INDIVIDUAIS ENQUANTO NA SALA DE ESPERA */}
          {!snapshot?.activeTopic && (
            <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-4 rounded-xl text-center space-y-1">
              <span className="text-[11px] font-bold text-emerald-400 block">
                Envio de Perguntas aos Palestrantes
              </span>
              <p className="text-xs text-[#D5C5AA]/70 leading-relaxed">
                A captação de perguntas individuais será ativada automaticamente assim que a primeira pauta for iniciada no palco. Fique atento(a)!
              </p>
            </div>
          )}

          {/* QUANDO UMA PAUTA ESTIVER AO VIVO: FORMULAR E ENVIAR PERGUNTA PARA O PALESTRANTE DA PAUTA */}
          {snapshot?.activeTopic && (
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
                      : `Pergunta para a Pauta ${snapshot.activeTopic.number} (${snapshot.activeTopic.mainSpeaker.name})`}
                  </span>
                </span>
                <span className="font-mono text-[11px] text-[#D5C5AA]/75">
                  {activeTopicQuestion
                    ? activeTopicQuestion.canEdit
                      ? "Editável (15m)"
                      : PUBLIC_STATUS_LABELS[activeTopicQuestion.status] || "Em curadoria"
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
                      {PUBLIC_STATUS_LABELS[activeTopicQuestion.status] || "Recebida"}
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
          )}

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

      {/* ABA 3: VOTAÇÃO DA MESA-REDONDA OU COMPROVANTE INSTAGRAMÁVEL */}
      {activeTab === "votacao" && (
        <div className="space-y-4">
          {!activePoll || activePoll.status === "DRAFT" ? (
            <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/90 p-5 rounded-2xl text-center py-8 space-y-2">
              <Vote className="w-8 h-8 text-emerald-400 mx-auto" />
              <h2 className="font-display text-lg text-[#F7DECA]">
                Votação da Mesa-Redonda
              </h2>
              <p className="text-xs text-[#D5C5AA]/75">
                Votação aberta para todo o público escolher qual questão central será debatida pelos 6 especialistas
                (Daniel Pereira, Janaína Silva, Denilson Carneiro, Sérgio Passos, Dulcila e Paula Melo) na
                Mesa-Redonda.
              </p>
            </div>
          ) : myVoteForActivePoll && !changingSecretVote ? (
            <InstagramVoteReceiptCard
              participantName={me?.name}
              credentialCode={me?.credentialCode}
              anonymousCode={me?.code}
              voteId={myVoteForActivePoll.id}
              votedAt={myVoteForActivePoll.votedAt}
              isPollOpen={isPollOpen}
              onChangeVoteRequest={() => setChangingSecretVote(true)}
              onOpenStoryModal={() => setShowStoryModal(true)}
            />
          ) : (
            <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/90 p-5 rounded-2xl space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="px-2.5 py-1 rounded-full bg-[#14532D] text-white font-bold">
                  {activePoll.status === "TIE_BREAK"
                    ? "Rodada de Desempate (2 min)"
                    : "Votação da Mesa-Redonda (Aberta)"}
                </span>
                {changingSecretVote ? (
                  <button
                    type="button"
                    onClick={() => setChangingSecretVote(false)}
                    className="text-[11px] font-semibold text-emerald-300 underline cursor-pointer"
                  >
                    Voltar ao Comprovante
                  </button>
                ) : (
                  <span className="font-mono text-[#D5C5AA]/80">
                    {isPollOpen ? `Aberta · ${timer.formatted}` : "Encerrada"}
                  </span>
                )}
              </div>

              <div className="p-3 rounded-xl bg-[#030A06] border border-[#D5C5AA]/20 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#D5C5AA]/80 block">
                  Os 6 Especialistas da Mesa-Redonda
                </span>
                <div className="grid grid-cols-6 gap-1.5">
                  {SIX_SPECIALISTS.map((sp) => (
                    <div key={sp.id} className="flex flex-col items-center text-center gap-1">
                      <img
                        src={sp.photoUrl}
                        alt={sp.name}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl object-cover object-top border border-[#D5C5AA]/30"
                      />
                      <span className="text-[10px] text-[#F7DECA] font-medium truncate w-full">
                        {sp.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <h2 className="font-bold text-base text-[#F7DECA] leading-snug">
                  {activePoll.question}
                </h2>
                <p className="text-xs text-[#D5C5AA]/75">
                  Vote em sigilo na questão que deve conduzir o debate. Após votar, seu comprovante oficial para Stories será exibido.
                </p>
              </div>

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
                  Votação encerrada. Confira a questão vencedora no telão da Arena.
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
                  .map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={submittingVote || !isPollOpen}
                      onClick={() => handleCastVote(opt.id)}
                      className="w-full p-4 rounded-xl border border-[#D5C5AA]/25 bg-[#030A06] text-[#F7DECA] hover:border-emerald-400/60 text-left text-xs transition flex flex-col gap-2 cursor-pointer disabled:cursor-default"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                          {opt.themeLabel || `Questão ${opt.optionOrder}`}
                        </span>
                        <span className="text-[10px] font-semibold text-[#D5C5AA]/70">
                          Toque para votar
                        </span>
                      </div>

                      <p className="leading-relaxed">{opt.label}</p>
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA 4: MINHAS PARTICIPAÇÕES & COMPROVANTE DE VOTAÇÃO */}
      {activeTab === "minhas" && (
        <div className="space-y-4">
          {/* Informações da Credencial Ativa */}
          <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/90 p-4 sm:p-5 rounded-2xl space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#F7DECA] flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                Credencial de Acesso
              </span>
              <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-500/30 text-xs">
                #{me?.credentialCode || me?.code}
              </span>
            </div>
            <p className="text-[11px] text-[#D5C5AA]/70 leading-relaxed">
              Credencial gerada e vinculada automaticamente a este dispositivo para validação de votos e perguntas na Arena.
            </p>
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

          {!me?.votes.length ? (
            <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/90 p-5 rounded-2xl space-y-2">
              <h2 className="font-display text-base text-[#F7DECA]">
                Comprovante de Votação da Mesa-Redonda
              </h2>
              <p className="text-xs text-[#D5C5AA]/75">
                Nenhum voto registrado até o momento. Acesse a aba Votação para escolher o tema e gerar seu comprovante para os Stories.
              </p>
            </div>
          ) : (
            <InstagramVoteReceiptCard
              participantName={me?.name}
              credentialCode={me?.credentialCode}
              anonymousCode={me?.code}
              voteId={me.votes[0]?.id}
              votedAt={me.votes[0]?.votedAt}
              isPollOpen={isPollOpen}
              onChangeVoteRequest={() => {
                setChangingSecretVote(true);
                setActiveTab("votacao");
              }}
              onOpenStoryModal={() => setShowStoryModal(true)}
            />
          )}
        </div>
      )}

      {/* MODAL VERTICAL 9:16 PARA STORIES DO INSTAGRAM (EXIBIDO APÓS VOTAR) */}
      <InstagramStoryModal
        open={showStoryModal}
        onClose={() => setShowStoryModal(false)}
        participantName={me?.name}
        credentialCode={me?.credentialCode}
        anonymousCode={me?.code}
        voteId={myVoteForActivePoll?.id || me?.votes?.[0]?.id}
        votedAt={myVoteForActivePoll?.votedAt || me?.votes?.[0]?.votedAt}
      />
    </div>
  );
}
