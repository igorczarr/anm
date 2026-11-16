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
  Gift,
  Home,
  KeyRound,
  ListChecks,
  Lock,
  LogOut,
  MessageSquarePlus,
  Send,
  Sparkles,
  Trophy,
  Vote,
  WifiOff,
} from "lucide-react";

type TabKey = "inicio" | "pergunta" | "votacao" | "sorteio" | "minhas";

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
  id?: string;
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
 * Cronômetro Autoral de Alta Precisão (100% No-Scroll, Livre de Retângulos e Molduras):
 * Design autêntico, robusto e inovador integrado diretamente ao fundo, com tipografia pura e avatares empilhados
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
      className="relative overflow-hidden shrink-0 flex flex-col justify-center gap-1.5 py-1.5 px-2 select-none"
    >
      {/* Brilho radial etéreo e autoral, sem retângulos ou molduras */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.06)_0%,transparent_70%)] pointer-events-none" />

      {/* Linha Superior: Rótulo com Live Pulse + Avatares dos Especialistas Sem Texto */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-400 truncate">
            Inicio do ANM em:
          </span>
        </div>

        {/* Fotos dos Especialistas Empilhadas na Horizontal (Avatar Stack puro, sem texto) */}
        <div className="flex -space-x-2.5 overflow-hidden items-center py-0.5 shrink-0">
          {SIX_SPECIALISTS.map((sp) => (
            <img
              key={sp.id}
              src={sp.photoUrl}
              alt={sp.fullName}
              title={`${sp.name} · ${sp.fullName}`}
              style={{ borderRadius: "9999px" }}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover object-top border-2 border-[#0A150D] ring-1 ring-emerald-400/40 shadow-xs transition-transform hover:scale-110 hover:z-20"
            />
          ))}
        </div>
      </div>

      {/* Linha Central: Cronômetro Monumental, Autoral e Inovador (100% livre de retângulos) */}
      <div className="relative z-10 flex items-center justify-center gap-4 sm:gap-6 py-0.5">
        {/* Horas */}
        <div className="flex flex-col items-center">
          <span className="font-mono font-black text-3xl sm:text-4xl text-[#F7DECA] tracking-tighter leading-none drop-shadow-[0_2px_14px_rgba(247,222,202,0.22)]">
            {hours}
          </span>
          <span className="text-[8px] font-black tracking-[0.25em] text-[#D5C5AA]/60 uppercase mt-0.5">
            HORAS
          </span>
        </div>

        {/* Separador com pontos de pulso luminoso */}
        <div className="flex flex-col items-center justify-center gap-1.5 pb-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981]" />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981]" />
        </div>

        {/* Minutos */}
        <div className="flex flex-col items-center">
          <span className="font-mono font-black text-3xl sm:text-4xl text-[#F7DECA] tracking-tighter leading-none drop-shadow-[0_2px_14px_rgba(247,222,202,0.22)]">
            {minutes}
          </span>
          <span className="text-[8px] font-black tracking-[0.25em] text-[#D5C5AA]/60 uppercase mt-0.5">
            MINUTOS
          </span>
        </div>

        {/* Separador com pontos de pulso luminoso */}
        <div className="flex flex-col items-center justify-center gap-1.5 pb-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 shadow-[0_0_8px_#10B981]" />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/80 shadow-[0_0_8px_#10B981]" />
        </div>

        {/* Segundos em Destaque Vivo */}
        <div className="flex flex-col items-center">
          <span className="font-mono font-black text-3xl sm:text-4xl text-emerald-400 tracking-tighter leading-none drop-shadow-[0_0_16px_rgba(16,185,129,0.5)]">
            {seconds}
          </span>
          <span className="text-[8px] font-black tracking-[0.25em] text-emerald-400/80 uppercase mt-0.5">
            SEGUNDOS
          </span>
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
  const [selectedPollOptionId, setSelectedPollOptionId] = useState<string | null>(null);
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
    setSelectedPollOptionId(null);
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
      setSelectedPollOptionId(null);
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

  const selectedPollOption = useMemo(
    () =>
      activePoll?.options.find((opt) => opt.id === selectedPollOptionId) ?? null,
    [activePoll?.options, selectedPollOptionId]
  );

  function renderPollVotingBox() {
    if (!activePoll) return null;

    return (
      <div
        style={{ borderRadius: "20px" }}
        className={`border bg-[#0A150D] p-3 sm:p-3.5 flex flex-col justify-between gap-2 shadow-md overflow-hidden transition-colors ${
          selectedPollOption
            ? "border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
            : "border-[#D5C5AA]/25"
        }`}
      >
        <div className="flex items-center justify-between gap-2 text-[10px] shrink-0">
          <span
            className={`px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5 transition ${
              selectedPollOption
                ? "bg-[#14532D] text-white shadow-xs"
                : "bg-[#030A06] border border-white/10 text-[#D5C5AA]"
            }`}
          >
            <Vote className="w-3 h-3 text-emerald-400" />
            <span>
              {activePoll.status === "TIE_BREAK"
                ? "Desempate · Mesa-Redonda"
                : "Votação da Mesa-Redonda"}
            </span>
          </span>
          {changingSecretVote && (
            <button
              type="button"
              onClick={() => {
                setChangingSecretVote(false);
                setSelectedPollOptionId(null);
              }}
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
          <p className="text-[11px] text-[#D5C5AA]/75 leading-tight">
            {selectedPollOption
              ? "Opção selecionada! Confirme sua escolha abaixo:"
              : "Toque em uma das questões para selecionar o tema da Mesa-Redonda:"}
          </p>
        </div>

        {voteFeedback && (
          <div className="p-2 rounded-xl text-[11px] flex items-center gap-1.5 border bg-red-950/40 text-red-200 border-red-500/40 shrink-0">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{voteFeedback.message}</span>
          </div>
        )}

        {/* Opções de Voto: Sem cor no estado neutro, com cor no estado selecionado */}
        <div className="space-y-1.5 overflow-hidden">
          {activePoll.options
            .filter(
              (opt) =>
                activePoll.status !== "TIE_BREAK" ||
                !activePoll.tieBreakOptionIds?.length ||
                activePoll.tieBreakOptionIds.includes(opt.id)
            )
            .map((opt) => {
              const isSelected = selectedPollOptionId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={
                    submittingVote ||
                    activePoll.status === "CLOSED" ||
                    activePoll.status === "RESULTS_PUBLISHED"
                  }
                  onClick={() => {
                    setSelectedPollOptionId(isSelected ? null : opt.id);
                    setVoteFeedback(null);
                  }}
                  className={`w-full p-2.5 sm:p-3 rounded-xl text-left transition flex flex-col gap-1 cursor-pointer ${
                    isSelected
                      ? "border-2 border-emerald-400 bg-emerald-950/60 ring-1 ring-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.22)]"
                      : "border border-white/10 bg-[#030A06] hover:border-white/25 hover:bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider truncate ${
                        isSelected ? "text-emerald-400 font-extrabold" : "text-[#D5C5AA]/65"
                      }`}
                    >
                      {opt.themeLabel || `Questão ${opt.optionOrder}`}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 transition ${
                        isSelected
                          ? "bg-emerald-400 text-[#030A06] flex items-center gap-1 shadow-xs"
                          : "border border-white/10 bg-white/5 text-[#D5C5AA]/60 font-medium"
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle2 className="w-2.5 h-2.5 stroke-[3]" />
                          <span>Selecionada</span>
                        </>
                      ) : (
                        "Toque p/ escolher"
                      )}
                    </span>
                  </div>
                  <p
                    className={`text-[11px] sm:text-xs leading-snug ${
                      isSelected ? "font-semibold text-[#F7DECA]" : "font-normal text-[#D5C5AA]/85"
                    }`}
                  >
                    {opt.label}
                  </p>
                </button>
              );
            })}
        </div>

        {/* Mensagem e Confirmação de Voto */}
        {selectedPollOption ? (
          <div className="p-2.5 rounded-xl border-2 border-emerald-400 bg-emerald-950/90 space-y-2 shadow-lg shrink-0 animate-in fade-in duration-150">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                  <span className="truncate">
                    {selectedPollOption.themeLabel || `Questão ${selectedPollOption.optionOrder}`}
                  </span>
                </span>
                <p className="text-xs font-bold text-[#F7DECA] leading-snug">
                  Você realmente quer essa opção para a Mesa-Redonda?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPollOptionId(null)}
                className="text-[10px] text-[#D5C5AA]/70 hover:text-white underline cursor-pointer shrink-0"
              >
                Trocar
              </button>
            </div>

            <button
              type="button"
              disabled={submittingVote || !isPollOpen}
              onClick={() => handleCastVote(selectedPollOption.id)}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-[#030A06] font-extrabold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition active:scale-[0.99] disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>
                {submittingVote
                  ? "Confirmando seu voto..."
                  : "Sim, confirmar meu voto nesta opção"}
              </span>
            </button>
          </div>
        ) : (
          <div className="py-2 px-3 rounded-xl border border-white/5 bg-[#030A06]/60 text-center shrink-0">
            <p className="text-[10.5px] text-[#D5C5AA]/60">
              Toque em uma das questões acima para selecionar.
            </p>
          </div>
        )}
      </div>
    );
  }

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
      {/* Cabeçalho Limpo sem retângulo que envolve */}
      <header className="px-1 py-0.5 shrink-0 flex items-center justify-between gap-2">
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
                    onChangeVoteRequest={() => {
                      setChangingSecretVote(true);
                      setSelectedPollOptionId(null);
                    }}
                    onOpenStoryModal={() => setShowStoryModal(true)}
                  />
                ) : (
                  renderPollVotingBox()
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
                  onChangeVoteRequest={() => {
                    setChangingSecretVote(true);
                    setSelectedPollOptionId(null);
                  }}
                  onOpenStoryModal={() => setShowStoryModal(true)}
                />
              ) : (
                renderPollVotingBox()
              )}
            </div>
          </div>
        )}

        {/* ABA 4: SORTEIOS DO EVENTO (HABILITAÇÃO AUTOMÁTICA POR VOTO) */}
        {activeTab === "sorteio" && (
          <div className="flex-1 min-h-0 flex flex-col justify-start gap-2 overflow-hidden">
            {/* Card de Status de Elegibilidade do Participante */}
            <div
              style={{ borderRadius: "18px" }}
              className={`border p-3 space-y-1.5 shadow-md shrink-0 transition ${
                Boolean(me?.votes && me.votes.length > 0)
                  ? "border-emerald-500/50 bg-emerald-950/50"
                  : "border-amber-500/40 bg-amber-950/25"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                    Boolean(me?.votes && me.votes.length > 0)
                      ? "bg-emerald-500 text-[#030A06]"
                      : "bg-amber-400 text-[#030A06]"
                  }`}
                >
                  {Boolean(me?.votes && me.votes.length > 0) ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                      <span>Habilitado(a) para o Sorteio</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3 stroke-[2.5]" />
                      <span>Habilitação Pendente</span>
                    </>
                  )}
                </span>
                <span className="font-mono text-[9.5px] text-[#D5C5AA]/70">
                  Credencial #{me?.credentialCode || me?.code}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] text-[#F7DECA] leading-snug">
                  {Boolean(me?.votes && me.votes.length > 0) ? (
                    <>
                      Seu voto na Mesa-Redonda foi validado! Você está concorrendo automaticamente a todos os brindes oficiais.
                    </>
                  ) : (
                    <>
                      Para se habilitar e concorrer aos brindes, registre seu voto na Mesa-Redonda.
                    </>
                  )}
                </p>

                {!Boolean(me?.votes && me.votes.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("votacao")}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-[#030A06] text-[10px] font-extrabold shrink-0 shadow-sm flex items-center gap-1 cursor-pointer"
                  >
                    <span>Votar Agora</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Lista dos Brindes Disponíveis para Sorteio */}
            <div className="flex-1 min-h-0 flex flex-col justify-start gap-1.5 overflow-hidden">
              <div className="flex items-center justify-between px-1 shrink-0">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span>Brindes Oficiais do Evento</span>
                </span>
                <span className="text-[10px] text-[#D5C5AA]/70">
                  {snapshot?.giveaways?.prizes?.filter((p) => p.status === "DRAWN").length ?? 0} de {snapshot?.giveaways?.prizes?.length ?? 3} sorteados
                </span>
              </div>

              <div className="flex-1 min-h-0 space-y-2 overflow-y-auto pr-0.5">
                {(snapshot?.giveaways?.prizes && snapshot.giveaways.prizes.length > 0
                  ? snapshot.giveaways.prizes
                  : [
                      {
                        id: "p1",
                        title: 'Livro "A Nova Moeda: Economia da Solidão"',
                        description: "Exemplar impresso oficial autografado pelos autores e especialistas.",
                        sponsor: "Coordenação Geral ANM",
                        status: "PENDING",
                        winner: null,
                      },
                      {
                        id: "p2",
                        title: "Kit Oficial Exclusivo A Nova Moeda",
                        description: "Ecobag institucional, caderno comemorativo de anotações e credencial de honra.",
                        sponsor: "UEFS & Vértice",
                        status: "PENDING",
                        winner: null,
                      },
                      {
                        id: "p3",
                        title: "Acesso VIP à Mentoria com Especialistas",
                        description: "Sessão online exclusiva pós-evento com a mesa de especialistas.",
                        sponsor: "Mesa de Especialistas",
                        status: "PENDING",
                        winner: null,
                      },
                    ]
                ).map((prize, idx) => {
                  const isWinnerThisUser = Boolean(
                    prize.winner &&
                      ((prize.winner.participantId && prize.winner.participantId === me?.id) ||
                        (prize.winner.credentialCode &&
                          (prize.winner.credentialCode === me?.credentialCode ||
                            prize.winner.credentialCode === me?.code)) ||
                        (me?.name && prize.winner.name && prize.winner.name.trim().toLowerCase() === me.name.trim().toLowerCase()))
                  );

                  return (
                    <div
                      key={prize.id}
                      style={{ borderRadius: "16px" }}
                      className={`border p-3 space-y-1.5 transition ${
                        isWinnerThisUser
                          ? "border-2 border-amber-400 bg-gradient-to-b from-amber-950/70 via-emerald-950/50 to-[#0A150D] shadow-[0_0_20px_rgba(251,191,36,0.25)] ring-1 ring-amber-400/50"
                          : prize.status === "DRAWN"
                            ? "border-emerald-500/40 bg-emerald-950/30"
                            : "border-white/10 bg-[#0A150D]/90"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-400">
                              Brinde #{idx + 1}
                            </span>
                            {prize.sponsor && (
                              <span className="text-[9px] text-[#D5C5AA]/60 truncate">
                                · {prize.sponsor}
                              </span>
                            )}
                          </div>
                          <h3 className="font-display font-extrabold text-xs sm:text-sm text-[#F7DECA] leading-snug">
                            {prize.title}
                          </h3>
                          {prize.description && (
                            <p className="text-[10.5px] text-[#D5C5AA]/75 leading-tight">
                              {prize.description}
                            </p>
                          )}
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                            prize.status === "DRAWN"
                              ? "bg-emerald-500 text-[#030A06]"
                              : "border border-white/10 bg-white/5 text-[#D5C5AA]/70"
                          }`}
                        >
                          {prize.status === "DRAWN" ? "Sorteado ✓" : "Ao vivo no palco"}
                        </span>
                      </div>

                      {/* Notificação Festiva caso este usuário tenha vencido */}
                      {isWinnerThisUser && (
                        <div className="p-2.5 rounded-xl border border-amber-400/80 bg-amber-950/80 text-center space-y-1 animate-pulse">
                          <div className="text-[11px] font-black text-amber-300 uppercase tracking-wider flex items-center justify-center gap-1.5">
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                            <span>PARABÉNS! VOCÊ É O(A) GANHADOR(A)!</span>
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                          </div>
                          <p className="text-[10px] text-[#F7DECA] leading-tight">
                            Apresente sua credencial (#{me?.credentialCode || me?.code}) à organização no final do evento para retirar seu brinde!
                          </p>
                        </div>
                      )}

                      {/* Se foi sorteado para outro participante */}
                      {prize.status === "DRAWN" && prize.winner && !isWinnerThisUser && (
                        <div className="p-2 rounded-xl border border-emerald-500/30 bg-[#030A06] flex items-center justify-between gap-2 text-[10px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="text-[#D5C5AA]/75 truncate">Ganhador(a):</span>
                            <strong className="text-emerald-300 font-bold truncate">
                              {prize.winner.name}
                            </strong>
                          </div>
                          <span className="font-mono text-[9.5px] text-[#D5C5AA]/70 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                            #{prize.winner.credentialCode}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ABA 5: MINHAS PARTICIPAÇÕES & COMPROVANTE */}
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
                    setSelectedPollOptionId(null);
                    setActiveTab("votacao");
                  }}
                  onOpenStoryModal={() => setShowStoryModal(true)}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* BARRA DE NAVEGAÇÃO INFERIOR: BOTTOM PILLOW FLUTUANTE */}
      <div className="shrink-0 pt-0.5 pb-0.5">
        <nav
          style={{ borderRadius: "9999px" }}
          className="grid grid-cols-5 gap-1 bg-[#0A150D]/95 backdrop-blur-xl border border-emerald-500/35 p-1 rounded-full shadow-[0_10px_25px_rgba(0,0,0,0.6)] ring-1 ring-white/10 text-[9px] sm:text-[10px]"
        >
          {[
            { key: "inicio", label: "Início", icon: Home },
            { key: "pergunta", label: "Pergunta", icon: MessageSquarePlus },
            {
              key: "votacao",
              label: isPollOpen ? "Votação ●" : "Votação",
              icon: Vote,
            },
            {
              key: "sorteio",
              label: me?.votes && me.votes.length > 0 ? "Sorteio ✓" : "Sorteio",
              icon: Gift,
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
                style={{ borderRadius: "9999px" }}
                className={`py-1.5 px-1 rounded-full flex items-center justify-center gap-1 font-bold cursor-pointer transition ${
                  active
                    ? "bg-[#14532D] text-white shadow-xs"
                    : "text-[#D5C5AA] hover:bg-white/5"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
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
