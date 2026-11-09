import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import {
  saveJobAdminAction,
  updateJobStatusAdminAction,
} from "@/app/actions/admin";
import {
  Briefcase,
  Eye,
  FileDown,
  PauseCircle,
  PlayCircle,
  Plus,
  Save,
  XCircle,
  Archive,
} from "lucide-react";

async function AdminJobsContent({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParamsPromise;

  const [jobs, editingJob] = await Promise.all([
    prisma.job.findMany({
      include: {
        _count: { select: { applications: true, views: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    edit ? prisma.job.findUnique({ where: { id: edit } }) : null,
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Cabeçalho */}
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-[0.26em] text-[#D5C5AA]/70">
            Gestão de Oportunidades
          </span>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl text-[#F7DECA]">
            Publicação e Administração de Vagas
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#D5C5AA]/80">
            Crie vagas, salve rascunhos, publique, pause, encerre, reabra ou arquive oportunidades.
          </p>
        </div>

        {editingJob && (
          <Link
            href="/admin/vagas"
            className="px-4 py-2.5 border border-[#D5C5AA]/40 text-xs uppercase tracking-[0.18em] text-[#F7DECA]"
          >
            + Nova Vaga em Branco
          </Link>
        )}
      </div>

      {/* Formulário Completo de Criação / Edição de Vaga (Seção 5.3) */}
      <form
        action={saveJobAdminAction}
        className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 sm:p-8 space-y-6"
      >
        <div className="flex items-center justify-between border-b border-[#D5C5AA]/15 pb-3">
          <h2 className="font-display text-xl text-[#F7DECA] flex items-center gap-2">
            {editingJob ? (
              <>Editando Vaga: {editingJob.title}</>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Cadastrar Nova Oportunidade
              </>
            )}
          </h2>
          {editingJob && (
            <input type="hidden" name="jobId" value={editingJob.id} />
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Título da Vaga *
            </label>
            <input
              type="text"
              name="title"
              required
              defaultValue={editingJob?.title || ""}
              placeholder="Ex: Analista de Estratégia & BI"
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Empresa / Organização *
            </label>
            <input
              type="text"
              name="companyName"
              required
              defaultValue={editingJob?.companyName || ""}
              placeholder="Ex: Grupo Vanguarda"
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Área Profissional *
            </label>
            <input
              type="text"
              name="professionalArea"
              required
              defaultValue={editingJob?.professionalArea || "Dados & Estratégia"}
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Localização *
            </label>
            <input
              type="text"
              name="location"
              required
              defaultValue={editingJob?.location || "São Paulo, SP"}
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Modalidade
            </label>
            <select
              name="modality"
              defaultValue={editingJob?.modality || "HIBRIDO"}
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            >
              <option value="PRESENCIAL">Presencial</option>
              <option value="HIBRIDO">Híbrido</option>
              <option value="REMOTO">Remoto</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Tipo de Contratação
            </label>
            <select
              name="contractType"
              defaultValue={editingJob?.contractType || "CLT"}
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            >
              <option value="CLT">CLT</option>
              <option value="PJ">PJ</option>
              <option value="ESTAGIO">Estágio</option>
              <option value="TEMPORARIO">Temporário</option>
              <option value="FREELANCER">Freelancer</option>
              <option value="JOVEM_APRENDIZ">Jovem Aprendiz</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Nível de Experiência
            </label>
            <select
              name="experienceLevel"
              defaultValue={editingJob?.experienceLevel || "PLENO"}
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            >
              <option value="SEM_EXPERIENCIA">Sem experiência</option>
              <option value="ESTAGIO">Estágio</option>
              <option value="JUNIOR">Júnior</option>
              <option value="PLENO">Pleno</option>
              <option value="SENIOR">Sênior</option>
              <option value="ESPECIALISTA">Especialista</option>
              <option value="LIDERANCA">Liderança</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Formação Exigida
            </label>
            <select
              name="requiredEducation"
              defaultValue={editingJob?.requiredEducation || "GRADUACAO"}
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            >
              <option value="">Não exigida</option>
              <option value="MEDIO">Ensino Médio</option>
              <option value="TECNICO">Técnico</option>
              <option value="GRADUACAO">Graduação</option>
              <option value="POS_GRADUACAO">Pós-graduação</option>
              <option value="MESTRADO">Mestrado</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Faixa Salarial
            </label>
            <input
              type="text"
              name="salaryRange"
              defaultValue={editingJob?.salaryRange || ""}
              placeholder="Ex: R$ 6.000 - R$ 8.000"
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Quantidade de Vagas
            </label>
            <input
              type="number"
              name="vacanciesCount"
              min={1}
              defaultValue={editingJob?.vacanciesCount || 1}
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Prazo de Inscrição
            </label>
            <input
              type="date"
              name="applicationDeadline"
              defaultValue={
                editingJob?.applicationDeadline
                  ? new Date(editingJob.applicationDeadline)
                      .toISOString()
                      .slice(0, 10)
                  : ""
              }
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Competências Desejadas (separadas por vírgula)
            </label>
            <input
              type="text"
              name="desiredSkills"
              defaultValue={editingJob?.desiredSkills.join(", ") || ""}
              placeholder="Power BI, Excel, Comunicação, Liderança"
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Status de Publicação
            </label>
            <select
              name="status"
              defaultValue={editingJob?.status || "PUBLISHED"}
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            >
              <option value="PUBLISHED">Publicada (Visível no Portal)</option>
              <option value="DRAFT">Rascunho</option>
              <option value="PAUSED">Pausada</option>
              <option value="CLOSED">Encerrada</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Descrição da Oportunidade *
            </label>
            <textarea
              name="description"
              required
              rows={3}
              defaultValue={editingJob?.description || ""}
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Responsabilidades *
            </label>
            <textarea
              name="responsibilities"
              required
              rows={3}
              defaultValue={editingJob?.responsibilities || ""}
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Requisitos *
            </label>
            <textarea
              name="requirements"
              required
              rows={2}
              defaultValue={editingJob?.requirements || ""}
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Diferenciais
            </label>
            <textarea
              name="differentials"
              rows={2}
              defaultValue={editingJob?.differentials || ""}
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Benefícios
            </label>
            <textarea
              name="benefits"
              rows={2}
              defaultValue={editingJob?.benefits || ""}
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Perguntas Adicionais ao Candidato (1 por linha - Opcional)
            </label>
            <textarea
              name="customQuestions"
              rows={2}
              defaultValue={
                Array.isArray(editingJob?.customQuestions)
                  ? (editingJob.customQuestions as string[]).join("\n")
                  : ""
              }
              placeholder="Ex: Qual sua disponibilidade para início?"
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs uppercase tracking-[0.2em] hover:bg-[#F7DECA] transition flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {editingJob ? "Salvar Alterações da Vaga" : "Criar e Publicar Oportunidade"}
          </button>
        </div>
      </form>

      {/* Tabela de Vagas Cadastradas */}
      <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/70 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#D5C5AA]/20 bg-[#030A06] text-[10px] uppercase tracking-[0.2em] text-[#D5C5AA]/80">
              <th className="p-4">Oportunidade / Empresa</th>
              <th className="p-4">Área / Modalidade</th>
              <th className="p-4">Status</th>
              <th className="p-4">Visualizações / Inscritos</th>
              <th className="p-4 text-right">Ações de Ciclo de Vida</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D5C5AA]/15">
            {jobs.map((job) => {
              const views = Math.max(job.viewsCount, job._count.views);
              const apps = job._count.applications;
              const conversion =
                views > 0 ? `${Math.round((apps / views) * 100)}%` : "—";

              return (
                <tr key={job.id} className="hover:bg-[#030A06]/60 transition">
                  <td className="p-4">
                    <div className="font-semibold text-[#F7DECA]">
                      {job.title}
                    </div>
                    <div className="text-[#D5C5AA]/75">
                      {job.companyName} · {job.location}
                    </div>
                  </td>
                  <td className="p-4">
                    <div>{job.professionalArea}</div>
                    <div className="text-[#D5C5AA]/65">
                      {job.modality} · {job.contractType}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 border border-[#57552E] bg-[#030A06] text-[#F7DECA] uppercase text-[10px] tracking-[0.16em]">
                      {job.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div>
                      <strong>{apps}</strong> candidaturas ·{" "}
                      <strong>{views}</strong> views
                    </div>
                    <div className="text-[#D5C5AA]/65">
                      Conversão: {conversion}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Link
                        href={`/admin/vagas?edit=${job.id}`}
                        className="px-2.5 py-1 border border-[#D5C5AA]/35 text-[#F7DECA]"
                      >
                        Editar
                      </Link>
                      <Link
                        href={`/vagas/${job.slug}`}
                        className="px-2.5 py-1 border border-[#D5C5AA]/25 text-[#D5C5AA] flex items-center gap-1"
                        title="Abrir página pública"
                      >
                        <Eye className="w-3 h-3" />
                      </Link>
                      <a
                        href={`/api/admin/reports/job-pdf?jobId=${job.id}`}
                        className="px-2.5 py-1 border border-[#57552E] bg-[#030A06] text-[#F7DECA] flex items-center gap-1"
                        title="Gerar PDF da Vaga"
                      >
                        <FileDown className="w-3 h-3" />
                        PDF
                      </a>

                      {/* Publicar / Reabrir */}
                      {job.status !== "PUBLISHED" && (
                        <form action={updateJobStatusAdminAction}>
                          <input type="hidden" name="jobId" value={job.id} />
                          <input
                            type="hidden"
                            name="status"
                            value="PUBLISHED"
                          />
                          <button
                            type="submit"
                            className="px-2.5 py-1 border border-emerald-500/40 text-emerald-300 flex items-center gap-1 cursor-pointer"
                            title="Publicar / Reabrir vaga"
                          >
                            <PlayCircle className="w-3 h-3" />
                            Publicar
                          </button>
                        </form>
                      )}

                      {/* Pausar */}
                      {job.status === "PUBLISHED" && (
                        <form action={updateJobStatusAdminAction}>
                          <input type="hidden" name="jobId" value={job.id} />
                          <input type="hidden" name="status" value="PAUSED" />
                          <button
                            type="submit"
                            className="px-2.5 py-1 border border-amber-500/40 text-amber-200 flex items-center gap-1 cursor-pointer"
                            title="Pausar candidaturas"
                          >
                            <PauseCircle className="w-3 h-3" />
                            Pausar
                          </button>
                        </form>
                      )}

                      {/* Encerrar */}
                      {job.status !== "CLOSED" && (
                        <form action={updateJobStatusAdminAction}>
                          <input type="hidden" name="jobId" value={job.id} />
                          <input type="hidden" name="status" value="CLOSED" />
                          <button
                            type="submit"
                            className="px-2.5 py-1 border border-red-500/40 text-red-300 flex items-center gap-1 cursor-pointer"
                            title="Encerrar oportunidade"
                          >
                            <XCircle className="w-3 h-3" />
                            Encerrar
                          </button>
                        </form>
                      )}

                      {/* Arquivar */}
                      {job.status !== "ARCHIVED" && (
                        <form action={updateJobStatusAdminAction}>
                          <input type="hidden" name="jobId" value={job.id} />
                          <input type="hidden" name="status" value="ARCHIVED" />
                          <button
                            type="submit"
                            className="p-1 border border-[#D5C5AA]/20 text-[#D5C5AA]/70 cursor-pointer"
                            title="Arquivar vaga"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-sm text-[#D5C5AA]/70">
          Carregando gestão de vagas...
        </div>
      }
    >
      <AdminJobsContent searchParamsPromise={searchParams} />
    </Suspense>
  );
}
