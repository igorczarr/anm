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
  Clock,
  Edit3,
  Home,
  KeyRound,
  ListChecks,
  Lock,
  LogOut,
  MessageSquarePlus,
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

/**
 * Bloco Compacto (No-Scroll): Contagem Regressiva Reduzida + 6 Especialistas Confirmados
 */
function CompactWaitingStrip({
  hours,
  minutes,
  seconds,
}: {
  hours: string;
  minutes: string;
  seconds: string;
}) {
  return (
    <div
      style={{ borderRadius: "18px" }}
      className="border border-emerald-500/35 bg-[#0A150D]/95 px-3 py-2.5 space-y-2 shadow-md shrink-0"
    >
      {/* Linha 1: Selo de Contagem Regressiva + Relógio Compacto (Horas / Minutos / Segundos) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 truncate">
            Início do Evento em:
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <div className="px-2 py-0.5 rounded-lg bg-[#030A06] border border-emerald-500/40 flex items-baseline gap-0.5">
            <span className="font-mono font-extrabold text-xs sm:text-sm text-[#F7DECA] leading-none">
              {hours}
            </span>
            <span className="text-[9px] font-bold text-emerald-400 uppercase">h</span>
          </div>
          <span className="font-mono text-xs font-bold text-emerald-400">:</span>
          <div className="px-2 py-0.5 rounded-lg bg-[#030A06] border border-emerald-500/40 flex items-baseline gap-0.5">
            <span className="font-mono font-extrabold text-xs sm:text-sm text-[#F7DECA] leading-none">
              {minutes}
            </span>
            <span className="text-[9px] font-bold text-emerald-400 uppercase">m</span>
          </div>
          <span className="font-mono text-xs font-bold text-[#D5C5AA]/50">:</span>
          <div className="px-1.5 py-0.5 rounded-lg bg-[#030A06] border border-white/10 flex items-baseline gap-0.5">
            <span className="font-mono font-bold text-[11px] sm:text-xs text-[#D5C5AA] leading-none">
              {seconds}
            </span>
            <span className="text-[8px] font-semibold text-[#D5C5AA]/60 uppercase">s</span>
          </div>
        </div>
      </div>

      {/* Linha 2: Fotos Compactas dos 6 Especialistas que participarão */}
      <div className="pt-1.5 border-t border-white/10 flex items-center justify-between gap-2">
        <div className="grid grid-cols-6 gap-1 w-full">
          {SIX_SPECIALISTS.map((sp) => (
            <div key={sp.id} className="flex flex-col items-center text-center gap-0.5 min-w-0">
              <img
                src={sp.photoUrl}
                alt={sp.fullName}
                style={{ borderRadius: "9999px" }}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover object-top border border-emerald-500/60 shadow-xs"
              />
              <span className="text-[8.5px] text-[#F7DECA] font-bold truncate w-full leading-tight">
                {sp.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ParticiparPage() {
  const { snapshot, timer, connected } = useArenaSync();
  const [me, setMe] = useState<MePayload | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [entering, setEntering] = useState(false);
  const [enterError, setEnterError] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("inicio");

  // Estado do formulário de pergunta
  const [questionText, setQuestionText] = useState("");
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [pendingRequestId, setPendingRequestId] = useState<string>("");
  useEffect(() => {
    setPendingRequestId(makeClientRequestId());
  }, []);
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
  const activeTopicQuestion = me?.activeTopicQuestion ?? null;

  useEffect(() => {
    if (activeTopicQuestion && !isEditingExisting && !questionText.trim()) {
      setQuestionText(activeTopicQuestion.text);
    }
  }, [activeTopicQuestion, isEditingExisting, questionText]);

  async function handleEnterArena(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!nameInput.trim() || !emailInput.trim()) {
      setEnterError("Por favor, preencha seu nome e e-mail para continuar.");
      return;
    }
    setEntering(true);
    setEnterError(null);
    try {
      let res: Response | null = null;
      let data: any = {};

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          res = await fetch("/api/participant/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: nameInput.trim(),
              email: emailInput.trim(),
            }),
          });
          data = await res.json().catch(() => ({}));
          if (res.ok && data.ok !== false) {
            break;
          }
          if (res.status < 500) {
            break;
          }
        } catch {
          // tenta novamente em falha transitória
        }
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, attempt * 600));
        }
      }

      if (!res || !res.ok || data.ok === false) {
        setEnterError(
          data.error ||
            "Não foi possível validar seu acesso. Verifique os dados informados."
        );
        return;
      }

      await fetchMe();
      setActiveTab("inicio");
    } finally {
      setEntering(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/participant/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setMe({
      authenticated: false,
      questions: [],
      votes: [],
      quota: { topicId: null, used: 0, max: 1, charLimit: 400 },
    });
    setChangingSecretVote(false);
  }

  async function handleSendOrEditQuestion(e: React.FormEvent) {
    e.preventDefault();
    if (!connected) {
      setQuestionFeedback({
        type: "error",
        message: "Envio temporariamente indisponível devido à perda de conexão.",
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
            data.error || "A operação não foi registrada. Tente novamente.",
        });
        return;
      }

      setPendingRequestId(makeClientRequestId());
      setIsEditingExisting(false);
      setQuestionFeedback({
        type: "success",
        message: data.edited
          ? "Sua pergunta foi atualizada com sucesso!"
          : "Pergunta recebida! Editável enquanto a exposição estiver aberta.",
      });
      await fetchMe();
    } catch {
      setQuestionFeedback({
        type: "error",
        message: "Falha de comunicação com o servidor. Tente novamente.",
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
        message: "Conexão indisponível no momento. Seu voto não foi registrado.",
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
            data.error || "Não foi possível registrar seu voto. Tente novamente.",
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
        message: "Erro de comunicação. Tente novamente.",
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

  const canSendOrEditQuestion =
    questionsOpen &&
    (!activeTopicQuestion || Boolean(activeTopicQuestion.canEdit));

  // Contagem regressiva determinística no SSR e hidratada no cliente (evita React error #418)
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    setNowMs(Date.now());
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const eventCountdown = useMemo(() => {
    if (nowMs === null) {
      return {
        hours: "48",
        minutes: "00",
        seconds: "00",
      };
    }
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
      };
    }
    const parts = (timer.formatted || "05:00").split(":");
    return {
      hours: "00",
      minutes: parts[0] || "05",
      seconds: parts[1] || "00",
    };
  }, [snapshot?.event?.scheduledStartAt, nowMs, timer.formatted]);

  // ============================================================================
  // PASSO 1: TELA DE LOGIN EXCLUSIVA (EXIGE PRIMEIRO O LOGIN, SEM VOTAÇÃO JUNTO)
  // 100% NO-SCROLL (h-dvh max-h-dvh overflow-hidden)
  // ============================================================================
  if (loadingSession || !me?.authenticated) {
    return (
      <div className="h-dvh max-h-dvh w-full max-w-lg mx-auto px-3.5 py-3 flex flex-col justify-between overflow-hidden select-none">
        {/* Topo Editorial Compacto */}
        <header
          style={{ borderRadius: "18px" }}
          className="border border-[#D5C5AA]/25 bg-[#0A150D]/95 px-3.5 py-2.5 flex items-center justify-between gap-3 shadow-md shrink-0"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              <BrandLogo className="w-full h-full object-contain drop-shadow-xs" />
            </div>
            <div className="min-w-0">
              <div className="font-display font-extrabold text-sm sm:text-base text-[#F7DECA] leading-tight truncate">
                A Nova Moeda
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 truncate">
                Economia da Solidão · UEFS
              </div>
            </div>
          </div>
          <ThemeToggle compact />
        </header>

        {/* Área Central Verticalmente Equilibrada (Contagem Regressiva Compacta + Especialistas + Login) */}
        <div className="flex-1 min-h-0 flex flex-col justify-center gap-3 overflow-hidden py-1">
          {/* Contagem Regressiva Reduzida + Fotos dos 6 Especialistas */}
          <CompactWaitingStrip
            hours={eventCountdown.hours}
            minutes={eventCountdown.minutes}
            seconds={eventCountdown.seconds}
          />

          {/* Card Exclusivo de Login (Passo 1) */}
          <div
            style={{ borderRadius: "22px" }}
            className="border border-[#D5C5AA]/30 bg-[#0A150D]/95 p-4 sm:p-5 space-y-3.5 shadow-xl backdrop-blur-md"
          >
            <div className="space-y-1 text-center">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-[9.5px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Passo 1 de 2 · Identificação do Participante</span>
              </span>
              <h1 className="font-display text-lg sm:text-xl text-[#F7DECA] font-extrabold leading-snug pt-0.5">
                Identifique-se para Votar na Pauta
              </h1>
              <p className="text-[11px] sm:text-xs text-[#D5C5AA]/80 leading-relaxed">
                Faça seu login rápido para liberar a votação da Mesa-Redonda e gerar seu comprovante para os Stories.
              </p>
            </div>

            <form onSubmit={handleEnterArena} className="space-y-3 text-left">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#D5C5AA]">
                  Seu Nome Completo *
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Ex.: Maria Souza"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] text-xs sm:text-sm outline-none focus:border-emerald-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#D5C5AA]">
                  Seu E-mail *
                </label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Ex.: maria@exemplo.com"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] text-xs sm:text-sm outline-none focus:border-emerald-400"
                />
              </div>

              {enterError && (
                <div className="p-2.5 rounded-xl border border-red-500/40 bg-red-950/30 text-[11px] text-red-200 flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{enterError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={entering || loadingSession}
                className="w-full py-3.5 px-5 bg-[#D5C5AA] text-[#030A06] font-extrabold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer hover:opacity-95 transition disabled:opacity-60"
              >
                <span>
                  {loadingSession
                    ? "Verificando sessão..."
                    : entering
                      ? "Autenticando..."
                      : "Entrar e Acessar Votação"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Rodapé Discreto */}
        <footer className="text-center text-[10px] text-[#D5C5AA]/60 shrink-0 pb-0.5">
          Credencial digital gerada automaticamente · Voto 100% sigiloso
        </footer>
      </div>
    );
  }

  // ============================================================================
  // PASSO 2: APÓS O LOGIN — VOTAÇÃO EM EVIDÊNCIA E COMPROVANTE EM 100% NO-SCROLL
  // ============================================================================
  return (
    <div className="h-dvh max-h-dvh w-full max-w-lg mx-auto px-3.5 py-2.5 flex flex-col justify-start gap-2 overflow-hidden">
      {/* Cabeçalho Enxuto do Participante Autenticado */}
      <header
        style={{ borderRadius: "16px" }}
        className="border border-[#D5C5AA]/20 bg-[#0A150D]/95 px-3 py-2 shadow-md backdrop-blur-md shrink-0 flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 flex items-center justify-center shrink-0">
            <BrandLogo className="w-full h-full object-contain drop-shadow-xs" />
          </div>
          <div className="min-w-0">
            <div className="font-display font-extrabold text-xs sm:text-sm text-[#F7DECA] leading-tight truncate">
              A Nova Moeda
            </div>
            <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="truncate">
                {snapshot?.activeTopic
                  ? `Pauta ${snapshot.activeTopic.number} · ${snapshot.activeTopic.mainSpeaker?.name || ""}`
                  : `Olá, ${me.name?.split(" ")[0] || "Participante"}`}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!connected && (
            <span
              title="Reconectando..."
              className="p-1.5 rounded-lg bg-red-950/50 border border-red-500/40 text-red-300"
            >
              <WifiOff className="w-3.5 h-3.5" />
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            title="Sair / Trocar participante"
            className="px-2 py-1 rounded-lg border border-white/10 bg-[#030A06] text-[10px] font-semibold text-[#D5C5AA]/80 hover:text-[#F7DECA] hover:border-emerald-400/40 flex items-center gap-1 cursor-pointer transition"
          >
            <LogOut className="w-3 h-3" />
            <span>Sair</span>
          </button>
          <ThemeToggle compact />
        </div>
      </header>

      {/* Menu Compacto Horizontal de 4 Abas */}
      <nav className="grid grid-cols-4 gap-1.5 bg-[#0A150D] border border-[#D5C5AA]/25 p-1 rounded-xl text-[10px] shrink-0">
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
              className={`py-1.5 px-1.5 rounded-lg flex items-center justify-center gap-1 font-bold cursor-pointer transition ${
                active
                  ? "bg-[#14532D] text-white shadow-xs"
                  : "text-[#D5C5AA] hover:bg-slate-100 dark:hover:bg-[#030A06]"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ÁREA DE CONTEÚDO PRINCIPAL (100% NO-SCROLL) */}
      <div className="flex-1 min-h-0 flex flex-col justify-start gap-2.5 overflow-hidden">
        {/* ABA 1: INÍCIO */}
        {activeTab === "inicio" && (
          <div className="flex-1 min-h-0 flex flex-col justify-start gap-2.5 overflow-hidden">
            {/* Faixa Compacta: Contagem Regressiva Reduzida + 6 Especialistas */}
            {!snapshot?.activeTopic && (
              <CompactWaitingStrip
                hours={eventCountdown.hours}
                minutes={eventCountdown.minutes}
                seconds={eventCountdown.seconds}
              />
            )}

            {/* VOTAÇÃO EM EVIDÊNCIA (APÓS LOGIN) OU COMPROVANTE INSTAGRAMÁVEL */}
            {(!snapshot?.activeTopic || isAfterTopic5) && activePoll && (
              <div className="flex-1 min-h-0 flex flex-col justify-start overflow-hidden">
                {myVoteForActivePoll && !changingSecretVote ? (
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
                  <div
                    style={{ borderRadius: "20px" }}
                    className="border-2 border-emerald-400 bg-[#0A150D] p-3.5 sm:p-4 flex flex-col justify-between gap-2.5 shadow-[0_0_25px_rgba(16,185,129,0.18)] overflow-hidden"
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] shrink-0">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#14532D] text-white font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                        </span>
                        <Vote className="w-3 h-3" />
                        <span>
                          {activePoll.status === "TIE_BREAK"
                            ? "Desempate · Mesa-Redonda"
                            : "Votação da Mesa-Redonda"}
                        </span>
                      </span>
                      {changingSecretVote && (
                        <button
                          type="button"
                          onClick={() => setChangingSecretVote(false)}
                          className="text-[10px] font-semibold text-emerald-300 underline cursor-pointer"
                        >
                          Voltar ao Comprovante
                        </button>
                      )}
                    </div>

                    <div className="space-y-0.5 shrink-0">
                      <h2 className="font-display text-sm sm:text-base font-extrabold text-[#F7DECA] leading-snug">
                        {activePoll.question}
                      </h2>
                      <p className="text-[11px] text-[#D5C5AA]/80 leading-snug">
                        Toque na questão que deve guiar a Mesa-Redonda e gere seu comprovante para os Stories:
                      </p>
                    </div>

                    {voteFeedback && (
                      <div className="p-2 rounded-xl text-[11px] flex items-center gap-1.5 border bg-red-950/40 text-red-200 border-red-500/40 shrink-0">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{voteFeedback.message}</span>
                      </div>
                    )}

                    <div className="space-y-2 overflow-hidden">
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
                            className="w-full p-2.5 sm:p-3 rounded-xl border border-emerald-500/35 bg-[#030A06] text-[#F7DECA] hover:border-emerald-400 hover:bg-emerald-950/30 text-left transition flex flex-col gap-1 cursor-pointer shadow-xs"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 truncate">
                                {opt.themeLabel || `Questão ${opt.optionOrder}`}
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[9px] font-bold text-emerald-300 shrink-0">
                                Votar →
                              </span>
                            </div>
                            <p className="text-[11px] sm:text-xs leading-snug font-medium">
                              {opt.label}
                            </p>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* QUANDO UMA PAUTA ESTIVER AO VIVO */}
            {snapshot?.activeTopic && (
              <div className="flex-1 min-h-0 flex flex-col justify-center gap-2.5 overflow-hidden">
                <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/90 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="font-bold text-[#F7DECA] flex items-center gap-2 truncate">
                      <MessageSquarePlus className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="truncate">
                        {activeTopicQuestion
                          ? `Sua pergunta na Pauta ${activeTopicQuestion.topicNumber}`
                          : `Pergunta · Pauta ${snapshot.activeTopic.number}`}
                      </span>
                    </span>
                    <span className="font-mono text-[10px] text-[#D5C5AA]/75 shrink-0">
                      {questionsOpen ? "Captação aberta" : "Captação fechada"}
                    </span>
                  </div>

                  {questionFeedback && (
                    <div
                      className={`p-2.5 rounded-xl text-[11px] flex items-center gap-2 border ${
                        questionFeedback.type === "success"
                          ? "bg-emerald-950/30 text-emerald-200 border-emerald-500/30"
                          : "bg-red-950/30 text-red-200 border-red-500/30"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{questionFeedback.message}</span>
                    </div>
                  )}

                  {activeTopicQuestion && !activeTopicQuestion.canEdit ? (
                    <div className="border border-[#D5C5AA]/20 bg-[#030A06] p-3.5 rounded-xl space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-[#D5C5AA]/75 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Edição encerrada
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-950/50 text-emerald-300 font-semibold">
                          {PUBLIC_STATUS_LABELS[activeTopicQuestion.status] || "Recebida"}
                        </span>
                      </div>
                      <p className="text-[#F7DECA] leading-relaxed line-clamp-4">
                        {activeTopicQuestion.text}
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSendOrEditQuestion} className="space-y-2.5">
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
                            ? "O envio de perguntas abre durante a exposição de cada pauta."
                            : "Escreva aqui sua pergunta para o especialista..."
                        }
                        className="w-full p-3 text-xs border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] rounded-xl outline-none"
                      />
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-mono text-[10px] text-[#D5C5AA]/70">
                          {questionText.length}/{charLimit}
                        </span>
                        <button
                          type="submit"
                          disabled={
                            submittingQuestion ||
                            !canSendOrEditQuestion ||
                            !questionText.trim()
                          }
                          className="px-4 py-2 bg-[#D5C5AA] text-[#030A06] font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>
                            {submittingQuestion
                              ? "Enviando..."
                              : activeTopicQuestion
                                ? "Salvar Edição"
                                : "Enviar Pergunta"}
                          </span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {!isAfterTopic5 && isPollOpen && activePoll && (
                  <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-3 rounded-xl flex items-center justify-between gap-2 text-xs shrink-0">
                    <span className="text-[#D5C5AA]/85 truncate">
                      Votação da Mesa-Redonda aberta
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveTab("votacao")}
                      className="px-3 py-1.5 rounded-lg bg-[#14532D] text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                    >
                      Votar Agora
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ABA 2: ENVIAR / EDITAR PERGUNTA */}
        {activeTab === "pergunta" && (
          <div className="flex-1 min-h-0 flex flex-col justify-center overflow-hidden">
            <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/90 p-4 rounded-2xl space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                  1 Pergunta Ativa por Pauta · Editável na Exposição (15 min)
                </span>
                <h2 className="font-display text-base sm:text-lg text-[#F7DECA] font-bold">
                  {activeTopicQuestion
                    ? `Editar Pergunta da Pauta ${activeTopicQuestion.topicNumber}`
                    : snapshot?.activeTopic
                      ? `Enviar Pergunta · Pauta ${snapshot.activeTopic.number}`
                      : "Pergunta aos Palestrantes"}
                </h2>
                <p className="text-[11px] text-[#D5C5AA]/80 leading-relaxed">
                  {snapshot?.activeTopic
                    ? `Envie até 1 pergunta (${charLimit} caracteres) durante os 15 min de exposição.`
                    : "A captação de perguntas individuais abre automaticamente assim que a Pauta 1 iniciar no palco."}
                </p>
              </div>

              {questionFeedback && (
                <div
                  className={`p-2.5 rounded-xl text-[11px] flex items-center gap-2 border ${
                    questionFeedback.type === "success"
                      ? "bg-emerald-950/30 text-emerald-200 border-emerald-500/30"
                      : "bg-red-950/30 text-red-200 border-red-500/30"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{questionFeedback.message}</span>
                </div>
              )}

              <form onSubmit={handleSendOrEditQuestion} className="space-y-2.5">
                <textarea
                  rows={4}
                  maxLength={charLimit}
                  value={questionText}
                  onChange={(e) => {
                    setQuestionText(e.target.value);
                    if (activeTopicQuestion) setIsEditingExisting(true);
                  }}
                  disabled={!canSendOrEditQuestion}
                  placeholder={
                    canSendOrEditQuestion
                      ? "Formule sua pergunta com clareza..."
                      : "Aguardando abertura da captação de perguntas no palco..."
                  }
                  className="w-full p-3 text-xs sm:text-sm border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] rounded-xl outline-none"
                />

                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] text-[#D5C5AA]/75">
                    {questionText.length} / {charLimit} caracteres
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
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {submittingQuestion
                        ? "Salvando..."
                        : activeTopicQuestion
                          ? "Salvar Edição"
                          : "Enviar Pergunta"}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ABA 3: VOTAÇÃO DA MESA-REDONDA OU COMPROVANTE */}
        {activeTab === "votacao" && (
          <div className="flex-1 min-h-0 flex flex-col justify-start gap-2.5 overflow-hidden">
            <CompactWaitingStrip
              hours={eventCountdown.hours}
              minutes={eventCountdown.minutes}
              seconds={eventCountdown.seconds}
            />

            <div className="flex-1 min-h-0 flex flex-col justify-start overflow-hidden">
              {!activePoll || activePoll.status === "DRAFT" ? (
                <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/90 p-5 rounded-2xl text-center space-y-2">
                  <Vote className="w-7 h-7 text-emerald-400 mx-auto" />
                  <h2 className="font-display text-base text-[#F7DECA] font-bold">
                    Votação da Mesa-Redonda
                  </h2>
                  <p className="text-xs text-[#D5C5AA]/75">
                    Escolha a questão central que será debatida pelos 6 especialistas na Mesa-Redonda.
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
                <div
                  style={{ borderRadius: "20px" }}
                  className="border-2 border-emerald-400 bg-[#0A150D] p-3.5 sm:p-4 flex flex-col justify-between gap-2.5 shadow-lg overflow-hidden"
                >
                  <div className="flex items-center justify-between text-[10px] shrink-0">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#14532D] text-white font-bold uppercase tracking-wider">
                      {activePoll.status === "TIE_BREAK"
                        ? "Rodada de Desempate"
                        : "Votação Aberta · Mesa-Redonda"}
                    </span>
                    {changingSecretVote && (
                      <button
                        type="button"
                        onClick={() => setChangingSecretVote(false)}
                        className="text-[10px] font-semibold text-emerald-300 underline cursor-pointer"
                      >
                        Voltar ao Comprovante
                      </button>
                    )}
                  </div>

                  <div className="space-y-0.5 shrink-0">
                    <h2 className="font-display font-extrabold text-sm sm:text-base text-[#F7DECA] leading-snug">
                      {activePoll.question}
                    </h2>
                    <p className="text-[11px] text-[#D5C5AA]/75 leading-snug">
                      Vote em sigilo na questão que deve conduzir o debate:
                    </p>
                  </div>

                  <div className="space-y-2 overflow-hidden">
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
                          className="w-full p-2.5 sm:p-3 rounded-xl border border-[#D5C5AA]/25 bg-[#030A06] text-[#F7DECA] hover:border-emerald-400 text-left transition flex flex-col gap-1 cursor-pointer disabled:cursor-default"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 truncate">
                              {opt.themeLabel || `Questão ${opt.optionOrder}`}
                            </span>
                            <span className="text-[9px] font-bold text-emerald-300 shrink-0">
                              Toque para votar →
                            </span>
                          </div>
                          <p className="text-[11px] sm:text-xs leading-snug font-medium">
                            {opt.label}
                          </p>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA 4: MINHAS PARTICIPAÇÕES & COMPROVANTE */}
        {activeTab === "minhas" && (
          <div className="flex-1 min-h-0 flex flex-col justify-start gap-2.5 overflow-hidden">
            <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/90 px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs shrink-0">
              <span className="font-bold text-[#F7DECA] flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                <span>Credencial de Acesso</span>
              </span>
              <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-500/30 text-[11px]">
                #{me?.credentialCode || me?.code}
              </span>
            </div>

            <div className="flex-1 min-h-0 flex flex-col justify-start overflow-hidden">
              {!me?.votes.length ? (
                <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/90 p-5 rounded-2xl text-center space-y-2">
                  <h2 className="font-display text-base text-[#F7DECA] font-bold">
                    Comprovante da Mesa-Redonda
                  </h2>
                  <p className="text-xs text-[#D5C5AA]/75">
                    Você ainda não registrou seu voto. Acesse a aba Início ou Votação para escolher o tema e gerar seu comprovante para os Stories.
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
          </div>
        )}
      </div>

      {/* MODAL VERTICAL 9:16 PARA STORIES DO INSTAGRAM */}
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
