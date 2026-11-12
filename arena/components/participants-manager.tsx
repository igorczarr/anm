"use client";

import { PageHeader, Tabs, SearchBox, Toast, EmptyState } from "@/components/admin-ui";
import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  Smartphone,
  QrCode,
  BadgeCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Plus,
  X,
  MessageSquare,
  Vote,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  Clock,
} from "lucide-react";

interface SessionItem {
  id: string;
  anonymousCode: string;
  credentialCode: string | null;
  lastSeenAt: string;
  questionsCount: number;
  votesCount: number;
}

interface CredentialItem {
  id: string;
  code: string;
  label: string | null;
  isUsed: boolean;
}

interface ParticipantsManagerProps {
  event: {
    id: string;
    name: string;
    requireCredential: boolean;
    peakConnections: number;
  };
  participateUrl: string;
  qrSvg: string;
  sessions: SessionItem[];
  credentials: CredentialItem[];
  activeCount: number;
  usedCredentialsCount: number;
  totalCredentialsCount: number;
  onToggleRequireCredential: (requireCred: boolean) => Promise<void>;
  onGenerateCredentials: (formData: FormData) => Promise<void>;
}

export function ParticipantsManager({
  event,
  participateUrl,
  qrSvg,
  sessions: initialSessions,
  credentials: initialCredentials,
  activeCount,
  usedCredentialsCount,
  totalCredentialsCount,
  onToggleRequireCredential,
  onGenerateCredentials,
}: ParticipantsManagerProps) {
  const [activeTab, setActiveTab] = useState<"dispositivos" | "credenciais" | "qrcode">("dispositivos");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ONLINE" | "INACTIVE" | "QUESTIONS" | "VOTED">("ALL");
  const [credFilter, setCredFilter] = useState<"ALL" | "USED" | "FREE">("ALL");
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const activeCutoff = useMemo(() => new Date(Date.now() - 1000 * 60 * 3), []);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(participateUrl);
    setCopiedLink(true);
    showToast("Link copiado para a área de transferência!", "success");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleToggleCredentialMode = () => {
    const nextVal = !event.requireCredential;
    startTransition(async () => {
      try {
        await onToggleRequireCredential(nextVal);
        showToast(
          nextVal
            ? "Credencial individual agora é OBRIGATÓRIA para votar e perguntar."
            : "Modo simplificado ativo: Credencial individual é OPCIONAL.",
          "success"
        );
      } catch (err: any) {
        showToast(err?.message || "Erro ao alterar modo de credencial", "error");
      }
    });
  };

  const handleGenerateBatchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await onGenerateCredentials(formData);
        showToast("Novo lote de credenciais gerado com sucesso!", "success");
        setIsGeneratingBatch(false);
      } catch (err: any) {
        showToast(err?.message || "Erro ao gerar credenciais", "error");
      }
    });
  };

  const filteredSessions = useMemo(() => {
    return initialSessions.filter((s) => {
      const isOnline = new Date(s.lastSeenAt).getTime() >= activeCutoff.getTime();

      if (statusFilter === "ONLINE" && !isOnline) return false;
      if (statusFilter === "INACTIVE" && isOnline) return false;
      if (statusFilter === "QUESTIONS" && s.questionsCount === 0) return false;
      if (statusFilter === "VOTED" && s.votesCount === 0) return false;

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const anon = `#${s.anonymousCode}`.toLowerCase();
        const cred = (s.credentialCode || "").toLowerCase();
        return anon.includes(term) || cred.includes(term);
      }

      return true;
    });
  }, [initialSessions, statusFilter, searchTerm, activeCutoff]);

  const filteredCredentials = useMemo(() => {
    return initialCredentials.filter((c) => {
      if (credFilter === "USED" && !c.isUsed) return false;
      if (credFilter === "FREE" && c.isUsed) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return c.code.toLowerCase().includes(term);
      }
      return true;
    });
  }, [initialCredentials, credFilter, searchTerm]);

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <PageHeader
        title="Participantes"
        stats={[
          { label: "Online agora", value: activeCount, tone: "ok" },
          { label: "Pico", value: Math.max(event.peakConnections, activeCount) },
          { label: "Credenciais usadas", value: `${usedCredentialsCount}/${totalCredentialsCount}` },
        ]}
        actions={
          <button
            type="button"
            onClick={handleToggleCredentialMode}
            disabled={isPending}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
              event.requireCredential
                ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                : "text-[#D5C5AA]/70 border border-white/[0.1] hover:text-white hover:bg-white/[0.05]"
            }`}
          >
            Credencial {event.requireCredential ? "obrigatória" : "opcional"}
          </button>
        }
      />

      <Tabs
        value={activeTab}
        onChange={(v) => { setActiveTab(v); setSearchTerm(""); }}
        items={[
          { key: "dispositivos", label: "Presença", count: initialSessions.length },
          { key: "credenciais", label: "Credenciais", count: totalCredentialsCount },
          { key: "qrcode", label: "QR Code & Acesso" },
        ]}
        right={activeTab !== "qrcode" ? <SearchBox value={searchTerm} onChange={setSearchTerm} placeholder="Buscar participante…" /> : null}
      />

      {/* ABA 1: DISPOSITIVOS & PRESENÇA AO VIVO */}
      {activeTab === "dispositivos" && (
        <section className="space-y-4">
          {/* Barra de Filtros de Presença */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[#D5C5AA]/60 text-[11px] mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Filtrar:
              </span>
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`px-3 py-1 rounded-xl text-xs font-medium transition cursor-pointer ${
                  statusFilter === "ALL"
                    ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40 font-semibold"
                    : "bg-[#050C07] border border-white/[0.08] text-[#D5C5AA]/70 hover:text-white"
                }`}
              >
                Todos ({initialSessions.length})
              </button>

              <button
                onClick={() => setStatusFilter("ONLINE")}
                className={`px-3 py-1 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === "ONLINE"
                    ? "bg-emerald-500/25 text-emerald-300 ring-1 ring-emerald-500/50 font-semibold"
                    : "bg-[#050C07] border border-white/[0.08] text-[#D5C5AA]/70 hover:text-white"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Online Agora ({activeCount})</span>
              </button>

              <button
                onClick={() => setStatusFilter("QUESTIONS")}
                className={`px-3 py-1 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === "QUESTIONS"
                    ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40 font-semibold"
                    : "bg-[#050C07] border border-white/[0.08] text-[#D5C5AA]/70 hover:text-white"
                }`}
              >
                <MessageSquare className="w-3 h-3 text-emerald-400" />
                <span>Enviaram Perguntas</span>
              </button>

              <button
                onClick={() => setStatusFilter("VOTED")}
                className={`px-3 py-1 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  statusFilter === "VOTED"
                    ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40 font-semibold"
                    : "bg-[#050C07] border border-white/[0.08] text-[#D5C5AA]/70 hover:text-white"
                }`}
              >
                <Vote className="w-3 h-3 text-amber-400" />
                <span>Votaram na Mesa</span>
              </button>
            </div>

            <span className="text-[11px] text-[#D5C5AA]/50 font-mono">
              Mostrando {filteredSessions.length} de {initialSessions.length} participantes
            </span>
          </div>

          {/* Tabela de Dispositivos */}
          <div className="bg-[#0A120D]/90 border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#050C07] text-[10px] uppercase tracking-wider text-[#D5C5AA]/70 font-semibold">
                    <th className="p-3.5">Participante / Dispositivo</th>
                    <th className="p-3.5">Credencial Oficial</th>
                    <th className="p-3.5">Status de Conexão</th>
                    <th className="p-3.5 text-center">Perguntas Enviadas</th>
                    <th className="p-3.5 text-center">Voto na Mesa</th>
                    <th className="p-3.5 text-right">Última Atividade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {filteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-[#D5C5AA]/50 space-y-2">
                        <Users className="w-8 h-8 mx-auto text-[#D5C5AA]/20" />
                        <p>Nenhum participante encontrado com os filtros selecionados.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredSessions.map((session) => {
                      const isOnline = new Date(session.lastSeenAt).getTime() >= activeCutoff.getTime();

                      return (
                        <tr
                          key={session.id}
                          className="hover:bg-white/[0.02] transition"
                        >
                          <td className="p-3.5 font-semibold text-[#F7DECA] font-mono">
                            <span className="text-emerald-300">#{session.anonymousCode}</span>
                          </td>

                          <td className="p-3.5">
                            {session.credentialCode ? (
                              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 font-mono font-bold text-[11px]">
                                {session.credentialCode}
                              </span>
                            ) : (
                              <span className="text-[#D5C5AA]/40 text-[11px] italic">
                                Modo Simplificado (Sem Credencial)
                              </span>
                            )}
                          </td>

                          <td className="p-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                                isOnline
                                  ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                                  : "bg-white/[0.04] text-[#D5C5AA]/40"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isOnline ? "bg-emerald-400 animate-pulse" : "bg-neutral-600"
                                }`}
                              />
                              {isOnline ? "Online Agora" : "Inativo"}
                            </span>
                          </td>

                          <td className="p-3.5 text-center">
                            {session.questionsCount > 0 ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30 font-mono font-bold text-[11px]">
                                {session.questionsCount}
                              </span>
                            ) : (
                              <span className="text-[#D5C5AA]/30 font-mono">0</span>
                            )}
                          </td>

                          <td className="p-3.5 text-center">
                            {session.votesCount > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30 text-[11px] font-medium">
                                <Vote className="w-3 h-3" />
                                <span>Registrado</span>
                              </span>
                            ) : (
                              <span className="text-[#D5C5AA]/30 text-[11px]">—</span>
                            )}
                          </td>

                          <td className="p-3.5 text-right font-mono text-[11px] text-[#D5C5AA]/60">
                            {new Date(session.lastSeenAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ABA 2: CREDENCIAIS DE CHECK-IN */}
      {activeTab === "credenciais" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[#D5C5AA]/60 text-[11px] mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Filtrar:
              </span>
              <button
                onClick={() => setCredFilter("ALL")}
                className={`px-3 py-1 rounded-xl text-xs font-medium transition cursor-pointer ${
                  credFilter === "ALL"
                    ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40 font-semibold"
                    : "bg-[#050C07] border border-white/[0.08] text-[#D5C5AA]/70 hover:text-white"
                }`}
              >
                Todas ({initialCredentials.length})
              </button>

              <button
                onClick={() => setCredFilter("USED")}
                className={`px-3 py-1 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  credFilter === "USED"
                    ? "bg-emerald-500/25 text-emerald-300 ring-1 ring-emerald-500/50 font-semibold"
                    : "bg-[#050C07] border border-white/[0.08] text-[#D5C5AA]/70 hover:text-white"
                }`}
              >
                <BadgeCheck className="w-3 h-3 text-emerald-400" />
                <span>Em Uso ({usedCredentialsCount})</span>
              </button>

              <button
                onClick={() => setCredFilter("FREE")}
                className={`px-3 py-1 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                  credFilter === "FREE"
                    ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40 font-semibold"
                    : "bg-[#050C07] border border-white/[0.08] text-[#D5C5AA]/70 hover:text-white"
                }`}
              >
                <span>Livres ({totalCredentialsCount - usedCredentialsCount})</span>
              </button>
            </div>

            <button
              onClick={() => setIsGeneratingBatch(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-md"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Gerar Novo Lote</span>
            </button>
          </div>

          {/* Grade de Credenciais */}
          <div className="bg-[#0A120D]/90 border border-white/[0.08] p-5 rounded-2xl space-y-4 shadow-xl backdrop-blur-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 max-h-[500px] overflow-y-auto p-1">
              {filteredCredentials.map((cred) => (
                <div
                  key={cred.id}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-mono flex flex-col justify-between transition ${
                    cred.isUsed
                      ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-200 shadow-xs"
                      : "border-white/[0.08] bg-[#050C07] text-[#F7DECA]/80 hover:border-white/[0.2]"
                  }`}
                >
                  <strong className="text-sm font-bold">{cred.code}</strong>
                  <span
                    className={`text-[9px] uppercase tracking-wider font-semibold mt-1 inline-block ${
                      cred.isUsed ? "text-emerald-400" : "text-[#D5C5AA]/40"
                    }`}
                  >
                    {cred.isUsed ? "Em Uso" : "Disponível"}
                  </span>
                </div>
              ))}

              {filteredCredentials.length === 0 && (
                <div className="col-span-full p-8 text-center text-xs text-[#D5C5AA]/50">
                  Nenhuma credencial encontrada para o filtro informado.
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ABA 3: QR CODE & LINK DE ACESSO */}
      {activeTab === "qrcode" && (
        <section className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-5 bg-[#0A120D]/90 border border-white/[0.08] p-6 sm:p-7 rounded-2xl text-center space-y-5 shadow-xl backdrop-blur-sm">
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <QrCode className="w-4 h-4" />
              <span>QR Code Oficial de Participação</span>
            </div>

            <div
              className="w-56 h-56 mx-auto p-3.5 bg-white rounded-2xl border border-slate-300 shadow-2xl"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />

            <div className="space-y-1 text-xs">
              <div className="font-semibold text-[#F7DECA] text-sm">
                Aponte a câmera do celular para conectar
              </div>
              <p className="text-[11px] text-[#D5C5AA]/60">
                Pode ser escaneado diretamente pelo telão ou impresso em material de mesa.
              </p>
            </div>
          </div>

          <div className="md:col-span-7 bg-[#0A120D]/90 border border-white/[0.08] p-6 sm:p-7 rounded-2xl space-y-6 shadow-xl backdrop-blur-sm">
            <div>
              <h2 className="font-display text-lg text-[#F7DECA]">
                Endereço de Acesso Direto
              </h2>
              <p className="text-xs text-[#D5C5AA]/70">
                Compartilhe o link com a plateia ou abra em uma aba de teste para simular a experiência do participante.
              </p>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl border border-white/[0.1] bg-[#050C07]">
              <input
                type="text"
                readOnly
                value={participateUrl}
                className="w-full bg-transparent text-xs font-mono text-[#F7DECA] focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 transition cursor-pointer shadow-sm"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedLink ? "Copiado!" : "Copiar"}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="/participar"
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-xl bg-[#D5C5AA] hover:bg-[#F7DECA] text-[#030A06] font-semibold text-xs flex items-center gap-2 transition cursor-pointer shadow-sm"
              >
                <Smartphone className="w-4 h-4" />
                <span>Abrir Interface do Participante ↗</span>
              </a>

              <a
                href="/arena"
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-xl border border-white/[0.1] bg-[#050C07] text-[#F7DECA] font-medium text-xs flex items-center gap-2 hover:bg-white/5 transition cursor-pointer"
              >
                <span>Ver QR Code no Telão ARENA ↗</span>
              </a>
            </div>

            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/20 space-y-1.5 text-xs text-[#D5C5AA]/80">
              <span className="font-semibold text-emerald-400 block">
                Dica de Produção:
              </span>
              <p className="text-[11px] leading-relaxed">
                Durante o evento, o Telão ARENA projeta automaticamente o QR Code flutuante
                nas etapas de Espera, Introdução e Abertura de Votação, permitindo que os
                participantes se conectem sem interrupção da fala do expositor.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Modal Centrado de Geração de Credenciais */}
      {isGeneratingBatch && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-[#0A120D] border border-white/[0.1] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
                <BadgeCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-base text-[#F7DECA]">
                  Gerar Lote de Credenciais
                </h3>
                <p className="text-xs text-[#D5C5AA]/70">
                  Cria códigos sequenciais (ex: ANM-251 a ANM-300) para check-in.
                </p>
              </div>
            </div>

            <form onSubmit={handleGenerateBatchSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#D5C5AA]/80 font-medium mb-1">
                    Prefixo
                  </label>
                  <input
                    type="text"
                    name="prefix"
                    defaultValue="ANM"
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-white/[0.1] bg-[#050C07] text-[#F7DECA] font-mono focus:outline-none focus:border-emerald-500/60 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[#D5C5AA]/80 font-medium mb-1">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    defaultValue={50}
                    min={1}
                    max={500}
                    required
                    className="w-full px-3.5 py-2 rounded-xl border border-white/[0.1] bg-[#050C07] text-[#F7DECA] font-mono focus:outline-none focus:border-emerald-500/60"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#050C07] border border-white/[0.08] text-[11px] text-[#D5C5AA]/80 font-mono">
                Próximos códigos começarão em:{" "}
                <strong className="text-emerald-400 font-bold">
                  ANM-{String(totalCredentialsCount + 1).padStart(3, "0")}
                </strong>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setIsGeneratingBatch(false)}
                  className="px-3.5 py-2 rounded-xl border border-white/[0.1] bg-[#050C07] text-xs text-[#D5C5AA] hover:text-white hover:bg-white/[0.05] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isPending ? "Gerando..." : "Confirmar e Gerar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
