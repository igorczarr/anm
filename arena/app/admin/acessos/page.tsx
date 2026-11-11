import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentAdminUser, OFFICIAL_ROLE_LABELS } from "@/lib/admin-auth";
import {
  createOrUpdateAdminUserAction,
  updateAdminUserStatusRoleAction,
} from "@/app/actions/foundation";
import { Clock, KeyRound, ShieldAlert, UserPlus, Users } from "lucide-react";

async function AdminAcessosContent() {
  await getCurrentAdminUser();

  const [users, roles, logs] = await Promise.all([
    prisma.adminUser.findMany({
      include: { role: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.adminRole.findMany({
      where: {
        code: { in: ["ADMIN", "PRODUCER", "MODERATOR", "AUDIOVISUAL"] },
      },
      orderBy: { code: "asc" },
    }),
    prisma.auditLog.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Cabeçalho */}
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8 rounded-2xl">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#14532D]">
          Módulo 9 · Perfis de Operação e Permissões (§5)
        </span>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl text-[#F7DECA]">
          Gerenciamento dos 4 Perfis Oficiais e Trilha de Auditoria
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#D5C5AA]/80">
          O sistema organiza o trabalho da equipe em quatro perfis com
          permissões validadas no servidor: <strong>Administrador</strong>,{" "}
          <strong>Produtor</strong>, <strong>Moderador</strong> e{" "}
          <strong>Operador Audiovisual</strong>.
        </p>
      </div>

      {/* 1. Cadastrar ou Redefinir Credencial Administrativa */}
      <section className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-6 sm:p-8 rounded-2xl space-y-5">
        <div className="flex items-center gap-2 text-[#F7DECA]">
          <UserPlus className="w-5 h-5 text-[#14532D]" />
          <h2 className="font-display text-xl">
            Cadastrar Membro da Equipe ou Redefinir Senha
          </h2>
        </div>

        <form
          action={createOrUpdateAdminUserAction}
          className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end text-xs"
        >
          <div>
            <label className="block font-semibold text-[#D5C5AA]/80 mb-1">
              Nome Completo / Função
            </label>
            <input
              type="text"
              name="fullName"
              required
              placeholder="Ex.: Produção de Palco"
              className="w-full px-3 py-2 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#D5C5AA]/80 mb-1">
              E-mail Institucional
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="produtor@anovamoeda.com.br"
              className="w-full px-3 py-2 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#D5C5AA]/80 mb-1">
              Senha de Acesso
            </label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-3 py-2 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#D5C5AA]/80 mb-1">
              Perfil Oficial (§5)
            </label>
            <select
              name="roleCode"
              defaultValue="PRODUCER"
              className="w-full px-3 py-2 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA]"
            >
              <option value="ADMIN">ADMIN — Administrador</option>
              <option value="PRODUCER">PRODUCER — Produtor</option>
              <option value="MODERATOR">MODERATOR — Moderador</option>
              <option value="AUDIOVISUAL">
                AUDIOVISUAL — Operador Audiovisual
              </option>
            </select>
          </div>

          <button
            type="submit"
            className="px-4 py-2.5 bg-[#D5C5AA] text-[#030A06] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            <span>Salvar Credencial</span>
          </button>
        </form>
      </section>

      {/* 2. Tabela de Usuários Administrativos & Revogação */}
      <section className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-6 sm:p-8 rounded-2xl space-y-4">
        <h2 className="font-display text-xl text-[#F7DECA] flex items-center gap-2">
          <Users className="w-5 h-5 text-[#14532D]" />
          Equipe Operacional Cadastrada
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#D5C5AA]/20 bg-[#030A06] text-[10px] uppercase tracking-wider text-[#D5C5AA]/80">
                <th className="p-3.5">Nome</th>
                <th className="p-3.5">E-mail</th>
                <th className="p-3.5">Perfil Oficial</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Alterar Perfil / Revogar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D5C5AA]/15">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="p-3.5 font-semibold text-[#F7DECA]">
                    {u.fullName}
                  </td>
                  <td className="p-3.5 text-[#D5C5AA]">{u.email}</td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-950/30 text-emerald-300 font-semibold text-[11px]">
                      {OFFICIAL_ROLE_LABELS[u.roleCode] || u.roleCode}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`px-2.5 py-1 rounded-full font-semibold text-[11px] ${
                        u.status === "ACTIVE"
                          ? "bg-emerald-950/30 text-emerald-300"
                          : "bg-red-950/30 text-red-300"
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <form
                      action={updateAdminUserStatusRoleAction}
                      className="inline-flex flex-wrap items-center justify-end gap-2"
                    >
                      <input type="hidden" name="userId" value={u.id} />
                      <select
                        name="roleCode"
                        defaultValue={u.roleCode}
                        className="px-2.5 py-1 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA]"
                      >
                        <option value="ADMIN">ADMIN (Administrador)</option>
                        <option value="PRODUCER">PRODUCER (Produtor)</option>
                        <option value="MODERATOR">MODERATOR (Moderador)</option>
                        <option value="AUDIOVISUAL">
                          AUDIOVISUAL (Operador AV)
                        </option>
                      </select>
                      <select
                        name="status"
                        defaultValue={u.status}
                        className="px-2.5 py-1 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA]"
                      >
                        <option value="ACTIVE">ACTIVE (Ativo)</option>
                        <option value="SUSPENDED">SUSPENDED (Suspenso)</option>
                        <option value="REVOKED">REVOKED (Revogado)</option>
                      </select>
                      <button
                        type="submit"
                        className="px-3 py-1 bg-[#D5C5AA] text-[#030A06] font-semibold cursor-pointer"
                      >
                        Aplicar
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Matriz dos 4 Perfis Oficiais e Logs de Auditoria com Justificativa */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-6 rounded-2xl space-y-4">
          <h2 className="font-display text-lg text-[#F7DECA]">
            Os 4 Perfis Oficiais de Operação (§5)
          </h2>
          <div className="space-y-2.5">
            {roles.map((r) => (
              <div
                key={r.id}
                className="border border-[#D5C5AA]/15 bg-[#030A06] p-3.5 rounded-xl text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <strong className="text-[#F7DECA]">
                    {r.name} ({r.code})
                  </strong>
                </div>
                <p className="text-[#D5C5AA]/75">{r.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-6 rounded-2xl space-y-4">
          <h2 className="font-display text-lg text-[#F7DECA] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#14532D]" />
            Histórico de Auditoria e Justificativas (`AuditLog`)
          </h2>
          <div className="space-y-2.5 max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-xs text-[#D5C5AA]/70">
                Nenhuma ação administrativa registrada ainda.
              </p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="border border-[#D5C5AA]/15 bg-[#030A06] p-3.5 rounded-xl text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between font-semibold text-[#F7DECA]">
                    <span>
                      {log.action} · {log.entityType}
                    </span>
                    <span className="text-[11px] text-[#D5C5AA]/70 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(log.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div className="text-[#D5C5AA]/80">
                    Operador: {log.user?.fullName || "Sistema"}
                  </div>
                  {log.justification && (
                    <div className="px-2.5 py-1.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-200 text-[11px]">
                      <strong>Justificativa registrada:</strong>{" "}
                      {log.justification}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminAcessosPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-xs text-[#D5C5AA]/70">
          Carregando gerenciamento de acessos e auditoria...
        </div>
      }
    >
      <AdminAcessosContent />
    </Suspense>
  );
}
