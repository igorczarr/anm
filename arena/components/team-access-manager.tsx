"use client";

import { PageHeader, Tabs, SearchBox, Toast, EmptyState } from "@/components/admin-ui";
import { useState, useTransition, useMemo } from "react";
import {
  Users,
  KeyRound,
  ShieldAlert,
  UserPlus,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  Edit3,
  Shield,
  Lock,
  Mail,
  User,
  Radio,
  Sliders,
  Tv,
} from "lucide-react";

export const OFFICIAL_ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  PRODUCER: "Produtor de Palco",
  MODERATOR: "Moderador de Perguntas",
  AUDIOVISUAL: "Operador do Telão ARENA",
  OPERATOR: "Produtor (Legado)",
  CURATOR: "Moderador (Legado)",
  OBSERVER: "Audiovisual (Legado)",
};

interface AdminUserItem {
  id: string;
  fullName: string;
  email: string;
  roleCode: string;
  status: string;
  createdAt: string;
}

interface RoleItem {
  id: string;
  name: string;
  code: string;
  description: string;
}

interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
  userName: string;
  justification: string | null;
}

interface TeamAccessManagerProps {
  users: AdminUserItem[];
  roles: RoleItem[];
  logs: AuditLogItem[];
  onCreateOrUpdateUser: (formData: FormData) => Promise<void>;
  onUpdateUserStatusRole: (formData: FormData) => Promise<void>;
}

export function TeamAccessManager({
  users: initialUsers,
  roles,
  logs: initialLogs,
  onCreateOrUpdateUser,
  onUpdateUserStatusRole,
}: TeamAccessManagerProps) {
  const [activeTab, setActiveTab] = useState<"equipe" | "cadastro" | "perfis" | "auditoria">("equipe");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const handleCreateUserSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      try {
        await onCreateOrUpdateUser(formData);
        showToast("Credencial administrativa salva com sucesso!", "success");
        form.reset();
        setActiveTab("equipe");
      } catch (err: any) {
        showToast(err?.message || "Erro ao salvar usuário", "error");
      }
    });
  };

  const handleUpdateStatusRoleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;

    const formData = new FormData(e.currentTarget);
    formData.set("userId", editingUser.id);

    startTransition(async () => {
      try {
        await onUpdateUserStatusRole(formData);
        showToast(`Permissões de ${editingUser.fullName} atualizadas!`, "success");
        setEditingUser(null);
      } catch (err: any) {
        showToast(err?.message || "Erro ao atualizar permissões", "error");
      }
    });
  };

  const filteredUsers = useMemo(() => {
    return initialUsers.filter((u) => {
      if (roleFilter !== "ALL" && u.roleCode !== roleFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          u.fullName.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [initialUsers, roleFilter, searchTerm]);

  const activeCount = useMemo(
    () => initialUsers.filter((u) => u.status === "ACTIVE").length,
    [initialUsers]
  );

  return (
    <div className="space-y-6">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <PageHeader
        title="Equipe e Permissões"
        stats={[{ label: "Membros ativos", value: `${activeCount}/${initialUsers.length}`, tone: "ok" }]}
        actions={
          <button
            onClick={() => setActiveTab("cadastro")}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md transition"
          >
            <UserPlus className="w-3.5 h-3.5" /> Novo membro
          </button>
        }
      />

      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        items={[
          { key: "equipe", label: "Equipe", count: initialUsers.length },
          { key: "cadastro", label: "Novo cadastro" },
          { key: "perfis", label: "Perfis e matriz" },
          { key: "auditoria", label: "Auditoria", count: initialLogs.length },
        ]}
        right={activeTab === "equipe" ? <SearchBox value={searchTerm} onChange={setSearchTerm} placeholder="Nome ou e-mail…" /> : null}
      />

      {/* ABA 1: EQUIPE CADASTRADA */}
      {activeTab === "equipe" && (
        <section className="space-y-4">
          {/* Filtros por Perfil */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[#D5C5AA]/60 text-[11px] mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Perfil:
              </span>
              {["ALL", "ADMIN", "PRODUCER", "MODERATOR", "AUDIOVISUAL"].map((code) => {
                const label = code === "ALL" ? "Todos" : OFFICIAL_ROLE_LABELS[code] || code;
                return (
                  <button
                    key={code}
                    onClick={() => setRoleFilter(code)}
                    className={`px-3 py-1 rounded-xl text-xs font-medium transition cursor-pointer ${
                      roleFilter === code
                        ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40 font-semibold"
                        : "bg-[#050C07] border border-white/[0.08] text-[#D5C5AA]/70 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <span className="text-[11px] text-[#D5C5AA]/50 font-mono">
              {filteredUsers.length} membros encontrados
            </span>
          </div>

          {/* Tabela de Membros */}
          <div className="bg-[#0A120D]/90 border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#050C07] text-[10px] uppercase tracking-wider text-[#D5C5AA]/70 font-semibold">
                    <th className="p-3.5">Membro da Equipe</th>
                    <th className="p-3.5">E-mail Institucional</th>
                    <th className="p-3.5">Perfil Operacional</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-[#D5C5AA]/50 space-y-2">
                        <Users className="w-8 h-8 mx-auto text-[#D5C5AA]/20" />
                        <p>Nenhum membro encontrado com os filtros selecionados.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const initials = u.fullName
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();

                      return (
                        <tr key={u.id} className="hover:bg-white/[0.02] transition">
                          <td className="p-3.5 font-semibold text-[#F7DECA]">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0">
                                {initials || "ANM"}
                              </div>
                              <span className="truncate">{u.fullName}</span>
                            </div>
                          </td>

                          <td className="p-3.5 text-[#D5C5AA]/70 font-mono text-[11px]">
                            {u.email}
                          </td>

                          <td className="p-3.5">
                            <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-semibold text-[11px]">
                              {OFFICIAL_ROLE_LABELS[u.roleCode] || u.roleCode}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                                u.status === "ACTIVE"
                                  ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                                  : "bg-red-500/20 text-red-300 ring-1 ring-red-500/40"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  u.status === "ACTIVE" ? "bg-emerald-400" : "bg-red-400"
                                }`}
                              />
                              {u.status === "ACTIVE" ? "Ativo" : u.status}
                            </span>
                          </td>

                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => setEditingUser(u)}
                              className="px-3 py-1.5 rounded-lg border border-white/[0.1] bg-[#050C07] hover:bg-white/[0.05] text-[#F7DECA] font-medium text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Editar</span>
                            </button>
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

      {/* ABA 2: NOVO CADASTRO */}
      {activeTab === "cadastro" && (
        <section className="bg-[#0A120D]/90 border border-white/[0.08] p-6 sm:p-8 rounded-2xl space-y-6 max-w-3xl shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-2.5 text-[#F7DECA]">
            <UserPlus className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-display text-xl text-[#F7DECA]">
                Cadastrar Membro da Equipe ou Redefinir Senha
              </h2>
              <p className="text-xs text-[#D5C5AA]/70">
                Se o e-mail já existir, a senha e o perfil serão atualizados mantendo o histórico de auditoria.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateUserSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-[#D5C5AA]/80 mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Nome Completo / Função</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  required
                  placeholder="Ex: Carlos Eduardo (Produção de Palco)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.1] bg-[#050C07] text-[#F7DECA] focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              <div>
                <label className="block font-medium text-[#D5C5AA]/80 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-400" />
                  <span>E-mail Institucional</span>
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="operador@anm.org.br"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.1] bg-[#050C07] text-[#F7DECA] focus:outline-none focus:border-emerald-500/60"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-medium text-[#D5C5AA]/80 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Senha de Acesso</span>
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.1] bg-[#050C07] text-[#F7DECA] focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              <div>
                <label className="block font-medium text-[#D5C5AA]/80 mb-1.5 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Perfil Oficial de Operação</span>
                </label>
                <select
                  name="roleCode"
                  defaultValue="PRODUCER"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.1] bg-[#050C07] text-[#F7DECA] focus:outline-none focus:border-emerald-500/60"
                >
                  <option value="ADMIN">ADMIN — Administrador Geral</option>
                  <option value="PRODUCER">PRODUCER — Produtor de Palco &amp; Mesa</option>
                  <option value="MODERATOR">MODERATOR — Curador de Perguntas</option>
                  <option value="AUDIOVISUAL">AUDIOVISUAL — Operador do Telão ARENA</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="submit"
                disabled={isPending}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50 transition"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isPending ? "Cadastrando..." : "Salvar Membro na Equipe"}</span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ABA 3: MATRIZ DOS 4 PERFIS OFICIAIS */}
      {activeTab === "perfis" && (
        <section className="space-y-4">
          <div className="bg-[#0A120D]/90 border border-white/[0.08] p-6 sm:p-8 rounded-2xl space-y-4 shadow-xl backdrop-blur-sm">
            <div className="flex items-center gap-2.5 text-[#F7DECA]">
              <Shield className="w-5 h-5 text-emerald-400" />
              <div>
                <h2 className="font-display text-xl text-[#F7DECA]">
                  Matriz de Responsabilidades dos 4 Perfis Oficiais
                </h2>
                <p className="text-xs text-[#D5C5AA]/70">
                  Garante que moderadores foquem em perguntas, operadores foquem no telão e o produtor conduza o palco.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="border border-white/[0.08] bg-[#050C07] p-5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <strong className="text-sm text-[#F7DECA]">Administrador (ADMIN)</strong>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                    Acesso Total
                  </span>
                </div>
                <p className="text-xs text-[#D5C5AA]/70 leading-relaxed">
                  Acesso irrestrito a todas as áreas: configuração de parâmetros do evento, edição de cronograma,
                  gerenciamento da equipe de segurança, auditoria completa e emissão de relatórios oficiais.
                </p>
              </div>

              <div className="border border-white/[0.08] bg-[#050C07] p-5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-emerald-400" />
                    <strong className="text-sm text-[#F7DECA]">Produtor de Palco (PRODUCER)</strong>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                    Controle ao Vivo
                  </span>
                </div>
                <p className="text-xs text-[#D5C5AA]/70 leading-relaxed">
                  Operador da Mesa Principal: avanço de etapas de palco, controle do cronômetro oficial, disparo de alertas,
                  abertura de votação da Mesa-Redonda e publicação dos resultados no telão.
                </p>
              </div>

              <div className="border border-white/[0.08] bg-[#050C07] p-5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <strong className="text-sm text-[#F7DECA]">Moderador (MODERATOR)</strong>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                    Curadoria
                  </span>
                </div>
                <p className="text-xs text-[#D5C5AA]/70 leading-relaxed">
                  Focado na triagem e aprovação das perguntas da plateia, edição de textos para clareza
                  e seleção da pergunta principal que é enviada ao telão na etapa de P&amp;R.
                </p>
              </div>

              <div className="border border-white/[0.08] bg-[#050C07] p-5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tv className="w-4 h-4 text-emerald-400" />
                    <strong className="text-sm text-[#F7DECA]">Operador Audiovisual (AUDIOVISUAL)</strong>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                    Telão ARENA
                  </span>
                </div>
                <p className="text-xs text-[#D5C5AA]/70 leading-relaxed">
                  Responsável pelo espelhamento no projetor do auditório, alternância de mensagens operacionais na tela,
                  controle de som/chimes e modo de contingência técnica se necessário.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ABA 4: AUDITORIA (AuditLog) */}
      {activeTab === "auditoria" && (
        <section className="space-y-4">
          <div className="bg-[#0A120D]/90 border border-white/[0.08] p-6 sm:p-8 rounded-2xl space-y-4 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2.5 text-[#F7DECA]">
                <Clock className="w-5 h-5 text-emerald-400" />
                <div>
                  <h2 className="font-display text-xl text-[#F7DECA]">
                    Histórico Auditável de Ações Administrativas
                  </h2>
                  <p className="text-xs text-[#D5C5AA]/70">
                    Registro imutável de quem alterou o cronômetro, avançou etapas ou alterou permissões.
                  </p>
                </div>
              </div>

              <span className="text-xs text-[#D5C5AA]/50 font-mono">
                {initialLogs.length} registros recentes
              </span>
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto p-1">
              {initialLogs.length === 0 ? (
                <EmptyState text="Nenhuma ação administrativa registrada ainda." />
              ) : (
                initialLogs.map((log) => (
                  <div
                    key={log.id}
                    className="border border-white/[0.08] bg-[#050C07] p-4 rounded-xl text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between font-semibold text-[#F7DECA] flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono">
                          {log.action}
                        </span>
                        <span className="text-xs">{log.entityType}</span>
                      </div>
                      <span className="text-[11px] text-[#D5C5AA]/50 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-[#D5C5AA]/40" />
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </span>
                    </div>

                    <div className="text-[#D5C5AA]/70 text-[11px]">
                      Operador: <strong className="text-[#F7DECA]">{log.userName}</strong>
                    </div>

                    {log.justification && (
                      <div className="px-3 py-1.5 rounded-lg bg-amber-950/30 border border-amber-500/40 text-amber-200 text-[11px]">
                        <strong>Justificativa:</strong> {log.justification}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* Modal Centrado de Edição de Membro */}
      {editingUser && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div className="w-full max-w-md bg-[#0A120D] border border-white/[0.1] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-sm flex items-center justify-center shrink-0">
                  {editingUser.fullName.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-display text-base text-[#F7DECA]">
                    Editar Permissões do Membro
                  </h3>
                  <p className="text-xs text-[#D5C5AA]/70">{editingUser.fullName}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-[#D5C5AA]/60 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatusRoleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#D5C5AA]/80 mb-1">
                  Perfil de Operação
                </label>
                <select
                  name="roleCode"
                  defaultValue={editingUser.roleCode}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.1] bg-[#050C07] text-[#F7DECA] focus:outline-none focus:border-emerald-500/60"
                >
                  <option value="ADMIN">ADMIN (Administrador)</option>
                  <option value="PRODUCER">PRODUCER (Produtor de Palco)</option>
                  <option value="MODERATOR">MODERATOR (Moderador de Perguntas)</option>
                  <option value="AUDIOVISUAL">AUDIOVISUAL (Operador do Telão)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-[#D5C5AA]/80 mb-1">
                  Status da Conta
                </label>
                <select
                  name="status"
                  defaultValue={editingUser.status}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.1] bg-[#050C07] text-[#F7DECA] focus:outline-none focus:border-emerald-500/60"
                >
                  <option value="ACTIVE">ACTIVE (Ativo — Pode Acessar)</option>
                  <option value="SUSPENDED">SUSPENDED (Suspenso Temporariamente)</option>
                  <option value="REVOKED">REVOKED (Revogado Definitivamente)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3.5 py-2 rounded-xl border border-white/[0.1] bg-[#050C07] text-xs text-[#D5C5AA] hover:text-white hover:bg-white/[0.05] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isPending ? "Salvando..." : "Confirmar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
