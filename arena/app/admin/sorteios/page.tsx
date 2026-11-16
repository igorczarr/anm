"use client";

import { useState, useEffect, useCallback } from "react";
import { useArenaSync } from "@/hooks/use-arena-sync";
import {
  Gift,
  Trophy,
  Users,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  AlertCircle,
  HelpCircle,
  Vote,
  Clock,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

interface GiveawayWinner {
  participantId: string;
  name: string;
  credentialCode: string;
  emailMasked: string;
  drawnAt: string;
}

interface GiveawayPrize {
  id: string;
  title: string;
  description: string;
  sponsor?: string;
  quantity: number;
  order: number;
  status: "PENDING" | "DRAWING" | "DRAWN";
  drawnAt?: string | null;
  winner?: GiveawayWinner | null;
}

interface EligibleParticipant {
  id: string;
  name: string;
  email: string | null;
  credentialCode: string;
}

export default function AdminSorteiosPage() {
  const { snapshot } = useArenaSync({ isAdmin: true });
  const [prizes, setPrizes] = useState<GiveawayPrize[]>([]);
  const [eligibleParticipants, setEligibleParticipants] = useState<EligibleParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawingId, setDrawingId] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Form de novo prêmio
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newSponsor, setNewSponsor] = useState("");
  const [savingPrize, setSavingPrize] = useState(false);

  const fetchGiveawayData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/giveaways", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setPrizes(data.prizes || []);
        setEligibleParticipants(data.eligibleParticipants || []);
      }
    } catch {
      // ignore transient error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGiveawayData();
  }, [fetchGiveawayData]);

  // Atualiza automaticamente quando o snapshot mudar via SSE
  useEffect(() => {
    if (snapshot?.giveaways?.prizes) {
      setPrizes(snapshot.giveaways.prizes as GiveawayPrize[]);
    }
  }, [snapshot?.giveaways?.prizes]);

  async function handleDrawWinner(prizeId: string) {
    if (eligibleParticipants.length === 0) {
      setActionFeedback({
        type: "error",
        message:
          "Nenhum participante elegível encontrado! Os participantes precisam registrar voto na Mesa-Redonda para se habilitar ao sorteio.",
      });
      return;
    }

    setDrawingId(prizeId);
    setActionFeedback(null);

    // Efeito de roleta/suspense visual de 1.8s
    await new Promise((r) => setTimeout(r, 1800));

    try {
      const res = await fetch(`/api/admin/giveaways/${prizeId}/draw`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setActionFeedback({
          type: "error",
          message: data.error || "Não foi possível rodar o sorteio.",
        });
        return;
      }

      setActionFeedback({
        type: "success",
        message: `Sorteio concluído! Vencedor(a): ${data.winner.name} (${data.winner.credentialCode}). O resultado já foi transmitido ao aplicativo do participante.`,
      });
      await fetchGiveawayData();
    } catch {
      setActionFeedback({
        type: "error",
        message: "Erro de comunicação ao executar o sorteio.",
      });
    } finally {
      setDrawingId(null);
    }
  }

  async function handleResetPrize(prizeId: string) {
    if (!confirm("Deseja cancelar o sorteio deste brinde e permitir um novo sorteio?")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/giveaways/${prizeId}/reset`, {
        method: "POST",
      });
      if (res.ok) {
        setActionFeedback({
          type: "success",
          message: "Sorteio resetado com sucesso. O brinde está pronto para ser sorteado novamente.",
        });
        await fetchGiveawayData();
      }
    } catch {
      setActionFeedback({
        type: "error",
        message: "Erro ao resetar sorteio.",
      });
    }
  }

  async function handleDeletePrize(prizeId: string) {
    if (!confirm("Tem certeza de que deseja remover este brinde da lista?")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/giveaways/${prizeId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setActionFeedback({
          type: "success",
          message: "Brinde removido com sucesso.",
        });
        await fetchGiveawayData();
      }
    } catch {
      setActionFeedback({
        type: "error",
        message: "Erro ao remover brinde.",
      });
    }
  }

  async function handleCreatePrize(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSavingPrize(true);
    try {
      const res = await fetch("/api/admin/giveaways", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          sponsor: newSponsor.trim() || "A Nova Moeda",
        }),
      });

      if (res.ok) {
        setNewTitle("");
        setNewDescription("");
        setNewSponsor("");
        setShowAddModal(false);
        setActionFeedback({
          type: "success",
          message: "Novo brinde cadastrado e disponibilizado para o sorteio!",
        });
        await fetchGiveawayData();
      }
    } catch {
      setActionFeedback({
        type: "error",
        message: "Erro ao salvar brinde.",
      });
    } finally {
      setSavingPrize(false);
    }
  }

  const drawnCount = prizes.filter((p) => p.status === "DRAWN").length;
  const pendingCount = prizes.length - drawnCount;

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-500/40 text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
            <Gift className="w-3 h-3 text-emerald-400" />
            <span>Módulo de Premiações &amp; Engajamento</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl text-[#F7DECA] font-extrabold tracking-tight">
            Sorteios Oficiais · A Nova Moeda
          </h1>
          <p className="text-xs sm:text-sm text-[#D5C5AA]/80 mt-0.5">
            Gerencie os brindes cadastrados e execute o sorteio ao vivo. Apenas participantes que <strong>votaram</strong> tornam-se elegíveis.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchGiveawayData}
            title="Atualizar dados"
            className="p-2.5 rounded-xl border border-white/10 bg-[#050C07] text-[#D5C5AA] hover:text-[#F7DECA] hover:border-emerald-500/40 cursor-pointer transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-[#030A06] font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-md cursor-pointer transition"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Cadastrar Novo Brinde</span>
          </button>
        </div>
      </div>

      {actionFeedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs sm:text-sm flex items-center justify-between gap-3 animate-in fade-in ${
            actionFeedback.type === "success"
              ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-200"
              : "bg-red-950/60 border-red-500/40 text-red-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionFeedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{actionFeedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-[11px] underline opacity-80 hover:opacity-100"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Cartões de Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl border border-white/10 bg-[#050C07] space-y-1">
          <div className="flex items-center justify-between text-xs text-[#D5C5AA]/70">
            <span>Participantes Elegíveis</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#F7DECA]">
            {eligibleParticipants.length}
          </div>
          <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Validaram voto na Mesa-Redonda</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-white/10 bg-[#050C07] space-y-1">
          <div className="flex items-center justify-between text-xs text-[#D5C5AA]/70">
            <span>Total de Brindes</span>
            <Gift className="w-4 h-4 text-[#D5C5AA]" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-[#F7DECA]">
            {prizes.length}
          </div>
          <p className="text-[10px] text-[#D5C5AA]/60">Cadastrados no sistema</p>
        </div>

        <div className="p-4 rounded-2xl border border-white/10 bg-[#050C07] space-y-1">
          <div className="flex items-center justify-between text-xs text-[#D5C5AA]/70">
            <span>Brindes Sorteados</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-300">
            {drawnCount}
          </div>
          <p className="text-[10px] text-[#D5C5AA]/60">Ganhadores já definidos</p>
        </div>

        <div className="p-4 rounded-2xl border border-white/10 bg-[#050C07] space-y-1">
          <div className="flex items-center justify-between text-xs text-[#D5C5AA]/70">
            <span>Brindes Pendentes</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400">
            {pendingCount}
          </div>
          <p className="text-[10px] text-[#D5C5AA]/60">Aguardando sorteio ao vivo</p>
        </div>
      </div>

      {/* Lista de Brindes */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-[#F7DECA] flex items-center gap-2">
            <Trophy className="w-5 h-5 text-emerald-400" />
            <span>Brindes para Sorteio</span>
          </h2>
          <span className="text-xs text-[#D5C5AA]/70">
            {prizes.length} brinde(s) disponível(is)
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-[#D5C5AA]/60 animate-pulse">
            Carregando brindes e participantes elegíveis...
          </div>
        ) : prizes.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-white/15 rounded-2xl bg-[#050C07] space-y-2">
            <Gift className="w-8 h-8 text-[#D5C5AA]/40 mx-auto" />
            <p className="text-sm font-semibold text-[#F7DECA]">Nenhum brinde cadastrado ainda.</p>
            <p className="text-xs text-[#D5C5AA]/70">Clique em "Cadastrar Novo Brinde" acima para adicionar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prizes.map((prize, idx) => {
              const isDrawing = drawingId === prize.id;
              const isDrawn = prize.status === "DRAWN" && prize.winner;

              return (
                <div
                  key={prize.id}
                  style={{ borderRadius: "22px" }}
                  className={`border p-5 flex flex-col justify-between gap-4 transition shadow-lg ${
                    isDrawn
                      ? "border-emerald-500/50 bg-gradient-to-b from-emerald-950/40 to-[#050C07]"
                      : isDrawing
                        ? "border-emerald-400 bg-emerald-950/50 ring-2 ring-emerald-400/50 animate-pulse"
                        : "border-white/10 bg-[#050C07] hover:border-white/20"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header do Card */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-[#D5C5AA] uppercase tracking-wider">
                        Brinde #{idx + 1}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 ${
                          isDrawn
                            ? "bg-emerald-500 text-[#030A06]"
                            : isDrawing
                              ? "bg-amber-400 text-[#030A06] animate-pulse"
                              : "bg-[#030A06] border border-white/10 text-emerald-400"
                        }`}
                      >
                        {isDrawn ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                            <span>Sorteado</span>
                          </>
                        ) : isDrawing ? (
                          <>
                            <Sparkles className="w-3 h-3 animate-spin" />
                            <span>Sorteando...</span>
                          </>
                        ) : (
                          <span>Pendente</span>
                        )}
                      </span>
                    </div>

                    {/* Detalhes do Prêmio */}
                    <div className="space-y-1">
                      <h3 className="font-display font-extrabold text-base text-[#F7DECA] leading-snug">
                        {prize.title}
                      </h3>
                      {prize.description && (
                        <p className="text-xs text-[#D5C5AA]/75 leading-relaxed">
                          {prize.description}
                        </p>
                      )}
                      {prize.sponsor && (
                        <p className="text-[10px] font-semibold text-emerald-400 pt-0.5">
                          Oferecimento: {prize.sponsor}
                        </p>
                      )}
                    </div>

                    {/* Bloco do Vencedor se já sorteado */}
                    {isDrawn && prize.winner && (
                      <div className="p-3.5 rounded-xl border border-emerald-400/40 bg-[#030A06] space-y-1.5 shadow-inner">
                        <div className="flex items-center justify-between text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <Trophy className="w-3 h-3 text-amber-400" />
                            <span>Vencedor(a) Sorteado(a)</span>
                          </span>
                          <span className="font-mono text-[9px] bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                            #{prize.winner.credentialCode}
                          </span>
                        </div>
                        <div className="text-base font-extrabold text-[#F7DECA] truncate">
                          {prize.winner.name}
                        </div>
                        <div className="text-[11px] text-[#D5C5AA]/70 flex items-center justify-between">
                          <span className="truncate">{prize.winner.emailMasked}</span>
                          <span className="text-[9.5px] text-[#D5C5AA]/50 font-mono">
                            {new Date(prize.winner.drawnAt).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ações do Card */}
                  <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                    {!isDrawn ? (
                      <button
                        type="button"
                        disabled={isDrawing || eligibleParticipants.length === 0}
                        onClick={() => handleDrawWinner(prize.id)}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-[#030A06] font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer transition active:scale-[0.98] disabled:opacity-50"
                      >
                        <Sparkles className="w-4 h-4 stroke-[2.5]" />
                        <span>
                          {isDrawing
                            ? "Sorteando agora..."
                            : eligibleParticipants.length === 0
                              ? "Aguardando votos de participantes..."
                              : `Sortear entre os ${eligibleParticipants.length} elegíveis`}
                        </span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleResetPrize(prize.id)}
                          className="flex-1 py-2 px-3 rounded-lg border border-amber-500/30 bg-amber-950/20 text-amber-200 hover:bg-amber-950/40 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition"
                          title="Caso o ganhador não esteja presente, sorteie outro"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Re-sortear</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePrize(prize.id)}
                          className="p-2 rounded-lg border border-red-500/20 bg-red-950/20 text-red-300 hover:bg-red-950/40 cursor-pointer transition"
                          title="Excluir brinde"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabela de Participantes Elegíveis (Quem votou) */}
      <div className="p-5 rounded-2xl border border-white/10 bg-[#050C07] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#F7DECA] flex items-center gap-2">
              <Vote className="w-4 h-4 text-emerald-400" />
              <span>Lista de Participantes Elegíveis ({eligibleParticipants.length})</span>
            </h3>
            <p className="text-[11px] text-[#D5C5AA]/70">
              Participantes autenticados que confirmaram voto e estão concorrendo automaticamente a todos os brindes.
            </p>
          </div>
        </div>

        {eligibleParticipants.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#D5C5AA]/60 border border-dashed border-white/10 rounded-xl">
            Nenhum participante votou ainda. Assim que os votos começarem a ser registrados na Mesa-Redonda, os nomes aparecerão aqui.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 pt-1 max-h-56 overflow-y-auto pr-1">
            {eligibleParticipants.map((p) => (
              <div
                key={p.id}
                className="p-2.5 rounded-xl border border-white/[0.08] bg-[#030A06] flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-[#F7DECA] truncate">{p.name}</div>
                  <div className="text-[10px] text-[#D5C5AA]/60 truncate">{p.email || "Sem e-mail"}</div>
                </div>
                <span className="font-mono text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30 shrink-0">
                  #{p.credentialCode}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal para Cadastrar Novo Brinde */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            style={{ borderRadius: "24px" }}
            className="w-full max-w-md border border-[#D5C5AA]/30 bg-[#0A150D] p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="font-display font-extrabold text-lg text-[#F7DECA] flex items-center gap-2">
                <Gift className="w-5 h-5 text-emerald-400" />
                <span>Cadastrar Novo Brinde</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-xs text-[#D5C5AA]/70 hover:text-white"
              >
                Cancelar
              </button>
            </div>

            <form onSubmit={handleCreatePrize} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#D5C5AA]">
                  Título do Brinde *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex.: Kindle 11ª Geração"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/15 bg-[#030A06] text-sm text-[#F7DECA] outline-none focus:border-emerald-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#D5C5AA]">
                  Descrição do Brinde
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex.: Acompanha capa de proteção e assinatura Kindle Unlimited"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/15 bg-[#030A06] text-xs text-[#F7DECA] outline-none focus:border-emerald-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-[#D5C5AA]">
                  Patrocinador / Oferecimento
                </label>
                <input
                  type="text"
                  placeholder="Ex.: Editora Parceira / UEFS"
                  value={newSponsor}
                  onChange={(e) => setNewSponsor(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/15 bg-[#030A06] text-xs text-[#F7DECA] outline-none focus:border-emerald-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/15 text-xs font-semibold text-[#D5C5AA] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPrize || !newTitle.trim()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-[#030A06] font-extrabold text-xs shadow-md disabled:opacity-60 cursor-pointer"
                >
                  {savingPrize ? "Salvando..." : "Salvar e Disponibilizar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
