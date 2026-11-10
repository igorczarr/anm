import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { Prisma, ApplicationStatus } from "@prisma/client";
import {
  updateApplicationStatusAdminAction,
  addInternalApplicationNoteAction,
} from "@/app/actions/admin";
import {
  ClipboardList,
  Download,
  FileDown,
  Filter,
  Lock,
  MessageSquarePlus,
  Star,
} from "lucide-react";

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "RECEBIDA", label: "Recebida" },
  { value: "EM_ANALISE", label: "Em análise" },
  { value: "PRE_SELECIONADO", label: "Pré-selecionado" },
  { value: "EM_PROCESSO_SELETIVO", label: "Em processo seletivo" },
  { value: "APROVADO", label: "Aprovado" },
  { value: "NAO_SELECIONADO", label: "Não selecionado" },
  { value: "CANCELADA_PELO_CANDIDATO", label: "Cancelada pelo candidato" },
];

interface ApplicationsAdminFilter {
  jobId?: string;
  status?: string;
  area?: string;
  selected?: string;
}

async function AdminApplicationsContent({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<ApplicationsAdminFilter>;
}) {
  const params = await searchParamsPromise;
  const jobId = (params.jobId || "").trim();
  const status = (params.status || "").trim();
  const area = (params.area || "").trim();
  const selectedId = (params.selected || "").trim();

  const where: Prisma.ApplicationWhereInput = {};
  if (jobId) where.jobId = jobId;
  if (status) where.status = status as ApplicationStatus;
  if (area) {
    where.candidate = {
      interestArea: { contains: area, mode: "insensitive" },
    };
  }

  const [applications, jobs] = await Promise.all([
    prisma.application.findMany({
      where,
      include: {
        candidate: {
          include: {
            educations: { orderBy: { startDate: "desc" }, take: 1 },
            experiences: { orderBy: { startDate: "desc" }, take: 1 },
          },
        },
        job: true,
        resume: true,
        history: {
          include: { actor: true },
          orderBy: { createdAt: "desc" },
        },
        notes: {
          include: { author: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { appliedAt: "desc" },
    }),
    prisma.job.findMany({ orderBy: { title: "asc" } }),
  ]);

  const selectedApp =
    applications.find((a) => a.id === selectedId) || applications[0] || null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Cabeçalho */}
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-[0.26em] text-[#D5C5AA]/70">
            Gestão de Candidaturas
          </span>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl text-[#F7DECA]">
            Administração de Candidaturas e Avaliações
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#D5C5AA]/80">
            Altere status, registre observações internas e avaliações privadas e gere relatórios por vaga.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`/talentos/api/admin/export/applications?${
              jobId ? `jobId=${jobId}&` : ""
            }${status ? `status=${status}` : ""}`}
            className="px-4 py-2.5 border border-[#D5C5AA]/40 text-xs uppercase tracking-[0.16em] text-[#F7DECA] flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </a>
          <a
            href={`/talentos/api/admin/reports/applications-pdf${
              jobId ? `?jobId=${jobId}` : ""
            }`}
            className="px-4 py-2.5 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs uppercase tracking-[0.16em] flex items-center gap-1.5"
          >
            <FileDown className="w-3.5 h-3.5" />
            Relatório PDF de Candidaturas
          </a>
        </div>
      </div>

      {/* Filtros (Seção 5.4) */}
      <form
        method="GET"
        action="/talentos/admin/candidaturas"
        className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-5 grid grid-cols-1 sm:grid-cols-4 gap-3"
      >
        <select
          name="jobId"
          defaultValue={jobId}
          className="bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
        >
          <option value="">Todas as oportunidades</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title} ({j.companyName})
            </option>
          ))}
        </select>

        <select
          name="status"
          defaultValue={status}
          className="bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
        >
          <option value="">Todos os status</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <input
          type="text"
          name="area"
          defaultValue={area}
          placeholder="Filtrar por área profissional..."
          className="bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
        />

        <button
          type="submit"
          className="px-4 py-2 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs uppercase tracking-[0.18em] cursor-pointer"
        >
          Filtrar Candidaturas
        </button>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Tabela de Candidaturas (Seção 5.4) */}
        <div className="lg:col-span-2 border border-[#D5C5AA]/20 bg-[#0A150D]/70 overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#D5C5AA]/20 bg-[#030A06] text-[10px] uppercase tracking-[0.18em] text-[#D5C5AA]/80">
                <th className="p-3.5">Candidato / Área</th>
                <th className="p-3.5">Vaga Pretendida</th>
                <th className="p-3.5">Formação / Exp.</th>
                <th className="p-3.5">Data</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Inspecionar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D5C5AA]/15">
              {applications.map((app) => {
                const edu = app.candidate.educations[0];
                const exp = app.candidate.experiences[0];
                const isSelected = selectedApp?.id === app.id;
                return (
                  <tr
                    key={app.id}
                    className={`transition ${
                      isSelected
                        ? "bg-[#030A06]"
                        : "hover:bg-[#030A06]/50"
                    }`}
                  >
                    <td className="p-3.5">
                      <div className="font-semibold text-[#F7DECA]">
                        {app.candidate.fullName}
                      </div>
                      <div className="text-[#D5C5AA]/70">
                        {app.candidate.interestArea || "—"}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="text-[#F7DECA]">{app.job.title}</div>
                      <div className="text-[#D5C5AA]/65">
                        {app.job.companyName}
                      </div>
                    </td>
                    <td className="p-3.5 text-[#D5C5AA]/80">
                      <div>{edu ? edu.course : "—"}</div>
                      <div className="text-[#D5C5AA]/65">
                        {exp ? exp.role : "—"}
                      </div>
                    </td>
                    <td className="p-3.5 text-[#D5C5AA]/75">
                      {new Date(app.appliedAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-1 border border-[#57552E] bg-[#030A06] text-[#F7DECA] text-[10px] uppercase tracking-[0.14em]">
                        {app.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <Link
                        href={`/admin/candidaturas?selected=${app.id}${
                          jobId ? `&jobId=${jobId}` : ""
                        }`}
                        className="px-3 py-1.5 border border-[#D5C5AA]/35 text-[#F7DECA] hover:border-[#F7DECA]"
                      >
                        Abrir
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Painel de Inspeção, Alteração de Status, Notas Internas e Avaliação */}
        <div className="border border-[#D5C5AA]/25 bg-[#0A150D] p-6 space-y-6">
          {!selectedApp ? (
            <p className="text-xs text-[#D5C5AA]/75">
              Selecione uma candidatura para visualizar detalhes, currículo e avaliações.
            </p>
          ) : (
            <>
              <div className="border-b border-[#D5C5AA]/15 pb-4 space-y-1">
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#D5C5AA]/70">
                  Dossiê da Candidatura
                </span>
                <h2 className="font-display text-2xl text-[#F7DECA]">
                  {selectedApp.candidate.fullName}
                </h2>
                <p className="text-xs text-[#D5C5AA]/85">
                  Vaga: <strong>{selectedApp.job.title}</strong>
                </p>
                <div className="pt-2 flex flex-wrap gap-2">
                  <Link
                    href={`/admin/candidatos/${selectedApp.candidate.id}`}
                    className="px-3 py-1.5 border border-[#D5C5AA]/40 text-[11px] uppercase tracking-[0.14em] text-[#F7DECA]"
                  >
                    Perfil Completo
                  </Link>
                  <a
                    href={`/talentos/api/resumes/pdf?candidateId=${selectedApp.candidate.id}`}
                    className="px-3 py-1.5 border border-[#57552E] bg-[#030A06] text-[11px] uppercase tracking-[0.14em] text-[#F7DECA]"
                  >
                    Currículo PDF
                  </a>
                </div>
              </div>

              {/* Contatos conforme consentimento LGPD */}
              <div className="border border-[#D5C5AA]/15 bg-[#030A06] p-3.5 text-xs space-y-1">
                <div className="font-semibold text-[#F7DECA]">
                  Contatos Autorizados (LGPD)
                </div>
                <div>E-mail: {selectedApp.candidate.email}</div>
                <div>Telefone: {selectedApp.candidate.phone || "—"}</div>
                <div className="text-[11px] text-[#D5C5AA]/65">
                  Compartilhamento c/ empresas:{" "}
                  {selectedApp.candidate.allowCompanySharing
                    ? "Autorizado"
                    : "Restrito à administração do evento"}
                </div>
              </div>

              {/* Alterar Status da Candidatura */}
              <form
                action={updateApplicationStatusAdminAction}
                className="space-y-3 border-t border-[#D5C5AA]/15 pt-4"
              >
                <input
                  type="hidden"
                  name="applicationId"
                  value={selectedApp.id}
                />
                <label className="block text-xs uppercase tracking-[0.16em] text-[#F7DECA]">
                  Alterar Status da Candidatura
                </label>
                <select
                  name="toStatus"
                  defaultValue={selectedApp.status}
                  className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  name="note"
                  placeholder="Observação para o histórico de status (opcional)..."
                  className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs uppercase tracking-[0.18em] cursor-pointer"
                >
                  Atualizar Status
                </button>
              </form>

              {/* Observações Internas e Avaliação Privada (Seção 5.4) */}
              <div className="space-y-4 border-t border-[#D5C5AA]/15 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.16em] text-[#F7DECA] flex items-center gap-1.5 font-semibold">
                    <Lock className="w-3.5 h-3.5" />
                    Observações Internas & Avaliação
                  </span>
                  <span className="text-[10px] text-[#D5C5AA]/65">
                    Invisível ao candidato
                  </span>
                </div>

                <form
                  action={addInternalApplicationNoteAction}
                  className="space-y-2.5"
                >
                  <input
                    type="hidden"
                    name="applicationId"
                    value={selectedApp.id}
                  />
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-[#D5C5AA]/80">
                      Nota (1 a 5):
                    </label>
                    <select
                      name="rating"
                      defaultValue="5"
                      className="bg-[#030A06] border border-[#D5C5AA]/30 px-2.5 py-1 text-xs text-[#F7DECA]"
                    >
                      <option value="5">5 ★ — Excelente aderência</option>
                      <option value="4">4 ★ — Forte candidato</option>
                      <option value="3">3 ★ — Adequado</option>
                      <option value="2">2 ★ — Parcial</option>
                      <option value="1">1 ★ — Baixa aderência</option>
                    </select>
                  </div>
                  <textarea
                    name="content"
                    required
                    rows={2}
                    placeholder="Registrar parecer técnico ou observação confidencial..."
                    className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
                  />
                  <button
                    type="submit"
                    className="w-full py-2 border border-[#D5C5AA]/40 text-xs uppercase tracking-[0.16em] text-[#F7DECA] hover:border-[#F7DECA] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5" />
                    Registrar Avaliação Interna
                  </button>
                </form>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedApp.notes.map((n) => (
                    <div
                      key={n.id}
                      className="border border-[#D5C5AA]/15 bg-[#030A06] p-3 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-[#F7DECA]">
                        <strong>{n.author.fullName}</strong>
                        {n.rating && (
                          <span className="flex items-center gap-0.5 text-amber-300">
                            <Star className="w-3 h-3 fill-amber-300" />
                            {n.rating}/5
                          </span>
                        )}
                      </div>
                      <p className="text-[#D5C5AA]/85">{n.content}</p>
                      <span className="block text-[10px] text-[#D5C5AA]/55">
                        {new Date(n.createdAt).toLocaleString("pt-BR")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<ApplicationsAdminFilter>;
}) {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-sm text-[#D5C5AA]/70">
          Carregando gestão de candidaturas...
        </div>
      }
    >
      <AdminApplicationsContent searchParamsPromise={searchParams} />
    </Suspense>
  );
}
