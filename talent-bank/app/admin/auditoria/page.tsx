import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { updateUserRoleAdminAction } from "@/app/actions/lgpd";
import { createRecruiterInviteAction } from "@/app/actions/auth";

export const dynamic = "force-dynamic";
import {
  ShieldAlert,
  Users,
  FileCheck,
  Clock,
  Link2,
  UserPlus,
  CheckCircle2,
} from "lucide-react";

async function AdminAuditAndRbacContent() {
  const [users, invites, logs, consents] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
    }),
    prisma.recruiterInvite.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.auditLog.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.consentRecord.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Cabeçalho */}
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8">
        <span className="text-[11px] uppercase tracking-[0.26em] text-[#D5C5AA]/70">
          Permissões, Convites de Recrutadores, Logs e LGPD
        </span>
        <h1 className="mt-1 font-display text-3xl sm:text-4xl text-[#F7DECA]">
          Gestão de Recrutadores, Permissões (RBAC) e Auditoria
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#D5C5AA]/80">
          Gere links exclusivos de cadastro para Recrutadores (`RECRUITER`), gerencie papéis de usuários e audite as operações da plataforma.
        </p>
      </div>

      {/* Gerador de Link de Cadastro para Recrutador */}
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/80 p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2 text-[#F7DECA]">
          <UserPlus className="w-5 h-5" />
          <h2 className="font-display text-2xl">
            Gerar Link de Cadastro para Recrutador (Role: RECRUITER)
          </h2>
        </div>
        <p className="text-xs text-[#D5C5AA]/80">
          Gere um link de convite e envie ao recrutador parceiro. Assim que ele preencher o cadastro pelo link, entrará automaticamente no sistema com o papel de <strong>Recrutador (`RECRUITER`)</strong> e será direcionado para o ambiente de gestão.
        </p>

        <form
          action={createRecruiterInviteAction}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          <input
            type="email"
            name="email"
            placeholder="E-mail do recrutador (opcional)"
            className="bg-[#030A06] border border-[#D5C5AA]/30 px-3.5 py-2.5 text-xs text-[#F7DECA]"
          />
          <input
            type="text"
            name="companyName"
            placeholder="Empresa ou Consultoria Parceira (opcional)"
            className="bg-[#030A06] border border-[#D5C5AA]/30 px-3.5 py-2.5 text-xs text-[#F7DECA]"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs uppercase tracking-[0.18em] hover:bg-[#F7DECA] transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Link2 className="w-4 h-4" />
            Gerar Novo Link de Recrutador
          </button>
        </form>

        {/* Lista de links gerados */}
        {invites.length > 0 && (
          <div className="space-y-2.5 pt-4 border-t border-[#D5C5AA]/15">
            <span className="text-xs uppercase tracking-[0.18em] text-[#F7DECA] block">
              Links de Cadastro de Recrutador Gerados (Copie e envie ao recrutador):
            </span>
            {invites.map((inv) => {
              const relativeUrl = `/talentos/cadastro?convite=${inv.token}`;
              const fullProdUrl = `https://anm.vrtice.com.br/talentos/cadastro?convite=${inv.token}`;
              return (
                <div
                  key={inv.id}
                  className="border border-[#D5C5AA]/20 bg-[#030A06] p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 border border-[#57552E] bg-[#0A150D] text-[#F7DECA] text-[10px] uppercase tracking-[0.16em]">
                        Role: {inv.role}
                      </span>
                      {inv.companyName && (
                        <strong className="text-[#F7DECA]">
                          {inv.companyName}
                        </strong>
                      )}
                      {inv.email && (
                        <span className="text-[#D5C5AA]/75">({inv.email})</span>
                      )}
                    </div>
                    <div className="font-mono text-[#F7DECA] bg-[#0A150D] px-3 py-1.5 border border-[#D5C5AA]/20 select-all">
                      {fullProdUrl}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {inv.usedAt ? (
                      <span className="text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Utilizado por {inv.usedByEmail}
                      </span>
                    ) : (
                      <a
                        href={relativeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 border border-[#D5C5AA]/40 text-[11px] uppercase tracking-[0.16em] text-[#F7DECA] hover:border-[#F7DECA]"
                      >
                        Testar Link de Convite →
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Gestão de Papéis RBAC (Seção 8) */}
      <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 space-y-4">
        <h2 className="font-display text-xl text-[#F7DECA] flex items-center gap-2">
          <Users className="w-4 h-4" />
          Gestão de Usuários e Permissões Baseadas em Papéis (RBAC)
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#D5C5AA]/20 bg-[#030A06] text-[10px] uppercase tracking-[0.18em] text-[#D5C5AA]/80">
                <th className="p-3.5">Nome / Empresa</th>
                <th className="p-3.5">E-mail</th>
                <th className="p-3.5">Papel Atual</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Alterar Permissão RBAC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D5C5AA]/15">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="p-3.5">
                    <div className="font-semibold text-[#F7DECA]">
                      {u.fullName}
                    </div>
                    {u.companyName && (
                      <div className="text-[#D5C5AA]/70">{u.companyName}</div>
                    )}
                  </td>
                  <td className="p-3.5">{u.email}</td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-1 border border-[#57552E] bg-[#030A06] text-[#F7DECA] text-[10px] uppercase tracking-[0.14em]">
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3.5">{u.status}</td>
                  <td className="p-3.5 text-right">
                    <form
                      action={updateUserRoleAdminAction}
                      className="inline-flex items-center gap-2"
                    >
                      <input type="hidden" name="userId" value={u.id} />
                      <select
                        name="role"
                        defaultValue={u.role}
                        className="bg-[#030A06] border border-[#D5C5AA]/30 px-2.5 py-1 text-xs text-[#F7DECA]"
                      >
                        <option value="ADMIN">Administrador (ADMIN)</option>
                        <option value="RECRUITER">Recrutador (RECRUITER)</option>
                        <option value="JOB_MANAGER">Gestor de Vagas</option>
                        <option value="ANALYST">Analista</option>
                        <option value="CANDIDATE">Candidato (CANDIDATE)</option>
                      </select>
                      <button
                        type="submit"
                        className="px-3 py-1 bg-[#D5C5AA] text-[#030A06] font-semibold text-[11px] uppercase tracking-[0.14em] cursor-pointer"
                      >
                        Salvar
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Logs de Auditoria e Rastreabilidade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 space-y-4">
          <h2 className="font-display text-xl text-[#F7DECA] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            Logs de Atividades Administrativas e Solicitações LGPD
          </h2>

          <div className="space-y-2.5 max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-xs text-[#D5C5AA]/70">
                Nenhuma operação registrada ainda.
              </p>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="border border-[#D5C5AA]/15 bg-[#030A06] p-3.5 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-[#F7DECA] font-semibold">
                    <span>
                      {log.action} · {log.entityType}
                    </span>
                    <span className="text-[10px] text-[#D5C5AA]/65 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(log.createdAt).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div className="text-[#D5C5AA]/80">
                    Operador: {log.user?.fullName || "Sistema"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 space-y-4">
          <h2 className="font-display text-xl text-[#F7DECA] flex items-center gap-2">
            <FileCheck className="w-4 h-4" />
            Registros de Consentimento LGPD (ConsentRecords)
          </h2>

          <div className="space-y-2.5 max-h-96 overflow-y-auto">
            {consents.map((rec) => (
              <div
                key={rec.id}
                className="border border-[#D5C5AA]/15 bg-[#030A06] p-3.5 text-xs flex items-center justify-between gap-2"
              >
                <div>
                  <div className="font-semibold text-[#F7DECA]">
                    {rec.user.fullName} ({rec.user.email})
                  </div>
                  <div className="text-[#D5C5AA]/75">
                    Finalidade: {rec.purpose} · Termo {rec.termsVersion}
                  </div>
                </div>
                <span
                  className={
                    rec.granted ? "text-emerald-300" : "text-amber-300"
                  }
                >
                  {rec.granted ? "Autorizado" : "Revogado"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminAuditPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-sm text-[#D5C5AA]/70">
          Carregando logs de auditoria e controle RBAC...
        </div>
      }
    >
      <AdminAuditAndRbacContent />
    </Suspense>
  );
}
