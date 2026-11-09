import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import {
  BarChart3,
  Download,
  FileDown,
  FileSpreadsheet,
  TrendingUp,
} from "lucide-react";

async function AdminReportsAnalyticsContent({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ jobId?: string }>;
}) {
  const { jobId } = await searchParamsPromise;

  const [candidates, jobs, applications] = await Promise.all([
    prisma.candidateProfile.findMany({
      where: { archivedAt: null },
      include: {
        educations: true,
        experiences: true,
        skills: { include: { skill: true } },
        applications: true,
      },
    }),
    prisma.job.findMany({
      where: { archivedAt: null },
      include: {
        _count: { select: { applications: true, views: true } },
        applications: {
          include: {
            candidate: {
              include: {
                educations: true,
                experiences: true,
                skills: { include: { skill: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.application.findMany(),
  ]);

  const selectedJob =
    jobs.find((j) => j.id === jobId) || jobs[0] || null;

  // Analytics Gerais (Seção 7.3)
  const areaCount: Record<string, number> = {};
  const skillCount: Record<string, number> = {};
  const eduCount: Record<string, number> = {};
  const stageCount: Record<string, number> = {};

  for (const c of candidates) {
    const area = c.interestArea || "Não informada";
    areaCount[area] = (areaCount[area] || 0) + 1;

    const edu = c.educations[0]?.level || "Não informada";
    eduCount[edu] = (eduCount[edu] || 0) + 1;

    for (const cs of c.skills) {
      skillCount[cs.skill.name] = (skillCount[cs.skill.name] || 0) + 1;
    }
  }

  for (const a of applications) {
    stageCount[a.status] = (stageCount[a.status] || 0) + 1;
  }

  const topArea =
    Object.entries(areaCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  const topSkill =
    Object.entries(skillCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  const topEdu =
    Object.entries(eduCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  const topStage =
    Object.entries(stageCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  const totalViewsAllJobs = jobs.reduce(
    (acc, j) => acc + Math.max(j.viewsCount, j._count.views),
    0
  );
  const overallConversion =
    totalViewsAllJobs > 0
      ? `${((applications.length / totalViewsAllJobs) * 100).toFixed(1)}%`
      : "—";

  // Analytics da vaga selecionada (Seção 7.2)
  const selectedJobViews = selectedJob
    ? Math.max(selectedJob.viewsCount, selectedJob._count.views)
    : 0;
  const selectedJobApps = selectedJob ? selectedJob.applications.length : 0;
  const selectedJobConversion =
    selectedJobViews > 0
      ? `${((selectedJobApps / selectedJobViews) * 100).toFixed(1)}%`
      : "0%";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Cabeçalho */}
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-[0.26em] text-[#D5C5AA]/70">
            Documentos, Exportações e Inteligência de Dados
          </span>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl text-[#F7DECA]">
            Central de Relatórios PDF, CSV/XLSX & Analytics
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#D5C5AA]/80">
            Gere documentos oficiais em PDF com identidade visual A Nova Moeda, exporte planilhas e analise métricas reais de conversão.
          </p>
        </div>

        <a
          href="/api/admin/reports/general-pdf"
          className="px-5 py-3.5 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs uppercase tracking-[0.2em] hover:bg-[#F7DECA] transition flex items-center gap-2 self-start lg:self-auto"
        >
          <FileDown className="w-4 h-4" />
          Baixar Relatório Geral em PDF
        </a>
      </div>

      {/* Central de Emissão de PDFs e Exportações CSV/XLSX */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/70 p-6 space-y-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#D5C5AA]/70">
              Consolidado Executivo
            </span>
            <h2 className="mt-1 font-display text-xl text-[#F7DECA]">
              Relatório Geral do Banco de Talentos
            </h2>
            <p className="mt-2 text-xs text-[#D5C5AA]/80">
              Documento PDF com total de candidatos, distribuição por área e geográfica, formação acadêmica, competências mais frequentes, vagas e candidaturas.
            </p>
          </div>
          <a
            href="/api/admin/reports/general-pdf"
            className="px-4 py-2.5 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs uppercase tracking-[0.18em] flex items-center justify-center gap-2"
          >
            <FileDown className="w-4 h-4" />
            Emitir Relatório Geral (PDF)
          </a>
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/70 p-6 space-y-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#D5C5AA]/70">
              Base de Talentos
            </span>
            <h2 className="mt-1 font-display text-xl text-[#F7DECA]">
              Exportação de Candidatos (CSV & Excel)
            </h2>
            <p className="mt-2 text-xs text-[#D5C5AA]/80">
              Exporte a relação estruturada de candidatos com formação, experiência, competências, completude e status de consentimento LGPD.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <a
              href="/api/admin/export/candidates?format=csv"
              className="px-3 py-2.5 border border-[#D5C5AA]/40 text-xs uppercase tracking-[0.16em] text-[#F7DECA] flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </a>
            <a
              href="/api/admin/export/candidates?format=xlsx"
              className="px-3 py-2.5 border border-[#57552E] bg-[#030A06] text-xs uppercase tracking-[0.16em] text-[#F7DECA] flex items-center justify-center gap-1.5"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel (.xls)
            </a>
          </div>
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/70 p-6 space-y-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#D5C5AA]/70">
              Candidaturas
            </span>
            <h2 className="mt-1 font-display text-xl text-[#F7DECA]">
              Exportação de Candidaturas (PDF, CSV, Excel)
            </h2>
            <p className="mt-2 text-xs text-[#D5C5AA]/80">
              Gere relatórios consolidados de todas as inscrições recebidas, com status, formação e data de inscrição.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <a
              href="/api/admin/reports/applications-pdf"
              className="px-2.5 py-2.5 bg-[#D5C5AA] text-[#030A06] font-semibold text-[11px] uppercase tracking-[0.14em] flex items-center justify-center gap-1"
            >
              <FileDown className="w-3.5 h-3.5" />
              PDF
            </a>
            <a
              href="/api/admin/export/applications?format=csv"
              className="px-2.5 py-2.5 border border-[#D5C5AA]/40 text-[11px] uppercase tracking-[0.14em] text-[#F7DECA] flex items-center justify-center"
            >
              CSV
            </a>
            <a
              href="/api/admin/export/applications?format=xlsx"
              className="px-2.5 py-2.5 border border-[#57552E] bg-[#030A06] text-[11px] uppercase tracking-[0.14em] text-[#F7DECA] flex items-center justify-center"
            >
              Excel
            </a>
          </div>
        </div>
      </div>

      {/* Perguntas Estratégicas Respondidas com Dados Reais */}
      <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2 border-b border-[#D5C5AA]/15 pb-3">
          <TrendingUp className="w-4 h-4 text-[#F7DECA]" />
          <h2 className="font-display text-2xl text-[#F7DECA]">
            Inteligência de Dados — Respostas Executivas em Tempo Real
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div className="border border-[#D5C5AA]/15 bg-[#030A06] p-4 space-y-1">
            <span className="text-[10px] uppercase tracking-[0.16em] text-[#D5C5AA]/70">
              Área com maior concentração de talentos
            </span>
            <p className="font-display text-xl text-[#F7DECA]">{topArea}</p>
          </div>

          <div className="border border-[#D5C5AA]/15 bg-[#030A06] p-4 space-y-1">
            <span className="text-[10px] uppercase tracking-[0.16em] text-[#D5C5AA]/70">
              Competência mais frequente na base
            </span>
            <p className="font-display text-xl text-[#F7DECA]">{topSkill}</p>
          </div>

          <div className="border border-[#D5C5AA]/15 bg-[#030A06] p-4 space-y-1">
            <span className="text-[10px] uppercase tracking-[0.16em] text-[#D5C5AA]/70">
              Formação predominante entre os cadastrados
            </span>
            <p className="font-display text-xl text-[#F7DECA]">{topEdu}</p>
          </div>

          <div className="border border-[#D5C5AA]/15 bg-[#030A06] p-4 space-y-1">
            <span className="text-[10px] uppercase tracking-[0.16em] text-[#D5C5AA]/70">
              Taxa global de conversão das vagas
            </span>
            <p className="font-display text-xl text-[#F7DECA]">
              {overallConversion} ({applications.length} inscrições /{" "}
              {totalViewsAllJobs} visualizações)
            </p>
          </div>

          <div className="border border-[#D5C5AA]/15 bg-[#030A06] p-4 space-y-1">
            <span className="text-[10px] uppercase tracking-[0.16em] text-[#D5C5AA]/70">
              Etapa do funil com maior concentração
            </span>
            <p className="font-display text-xl text-[#F7DECA]">{topStage}</p>
          </div>

          <div className="border border-[#D5C5AA]/15 bg-[#030A06] p-4 space-y-1">
            <span className="text-[10px] uppercase tracking-[0.16em] text-[#D5C5AA]/70">
              Vaga com maior procura
            </span>
            <p className="font-display text-lg text-[#F7DECA] line-clamp-1">
              {[...jobs].sort(
                (a, b) => b._count.applications - a._count.applications
              )[0]?.title || "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Analytics Detalhado por Oportunidade + Emissão de PDFs da Vaga */}
      {selectedJob && (
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#D5C5AA]/15 pb-4">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#D5C5AA]/70">
                Analytics por Vaga
              </span>
              <h2 className="font-display text-2xl text-[#F7DECA]">
                {selectedJob.title} ({selectedJob.companyName})
              </h2>
            </div>

            <form
              method="GET"
              action="/admin/relatorios"
              className="flex flex-wrap items-center gap-2"
            >
              <select
                name="jobId"
                defaultValue={selectedJob.id}
                className="bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
              >
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="px-4 py-2 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs uppercase tracking-[0.16em] cursor-pointer"
              >
                Selecionar Vaga
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border border-[#D5C5AA]/15 bg-[#030A06] p-4">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#D5C5AA]/70">
                Visualizações da Página
              </span>
              <p className="font-display text-3xl text-[#F7DECA] mt-1">
                {selectedJobViews}
              </p>
            </div>
            <div className="border border-[#D5C5AA]/15 bg-[#030A06] p-4">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#D5C5AA]/70">
                Candidaturas Recebidas
              </span>
              <p className="font-display text-3xl text-[#F7DECA] mt-1">
                {selectedJobApps}
              </p>
            </div>
            <div className="border border-[#D5C5AA]/15 bg-[#030A06] p-4">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[#D5C5AA]/70">
                Conversão (Views → Candidatura)
              </span>
              <p className="font-display text-3xl text-emerald-300 mt-1">
                {selectedJobConversion}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href={`/api/admin/reports/job-pdf?jobId=${selectedJob.id}`}
              className="px-4 py-2.5 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs uppercase tracking-[0.16em] flex items-center gap-1.5"
            >
              <FileDown className="w-3.5 h-3.5" />
              Baixar PDF desta Vaga
            </a>
            <a
              href={`/api/admin/reports/applications-pdf?jobId=${selectedJob.id}`}
              className="px-4 py-2.5 border border-[#D5C5AA]/40 text-xs uppercase tracking-[0.16em] text-[#F7DECA] flex items-center gap-1.5"
            >
              <FileDown className="w-3.5 h-3.5" />
              Baixar PDF de Candidaturas desta Vaga
            </a>
          </div>
        </div>
      )}

      {/* Analytics Individual de Candidatos */}
      <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 sm:p-8 space-y-4">
        <h2 className="font-display text-2xl text-[#F7DECA] flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Analytics de Candidatos e Emissão de Currículo PDF
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#D5C5AA]/20 bg-[#030A06] text-[10px] uppercase tracking-[0.18em] text-[#D5C5AA]/80">
                <th className="p-3.5">Talento</th>
                <th className="p-3.5">Completude</th>
                <th className="p-3.5">Candidaturas</th>
                <th className="p-3.5">Área de Interesse</th>
                <th className="p-3.5">Competências</th>
                <th className="p-3.5">Última Atualização</th>
                <th className="p-3.5 text-right">PDF de Candidato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D5C5AA]/15">
              {candidates.map((c) => (
                <tr key={c.id}>
                  <td className="p-3.5 font-semibold text-[#F7DECA]">
                    {c.fullName}
                  </td>
                  <td className="p-3.5">{c.completionPercent}%</td>
                  <td className="p-3.5">{c.applications.length}</td>
                  <td className="p-3.5">{c.interestArea || "—"}</td>
                  <td className="p-3.5">
                    {c.skills.map((s) => s.skill.name).join(", ") || "—"}
                  </td>
                  <td className="p-3.5">
                    {new Date(c.updatedAt).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="p-3.5 text-right">
                    <a
                      href={`/api/resumes/pdf?candidateId=${c.id}`}
                      className="px-3 py-1.5 border border-[#D5C5AA]/40 text-[#F7DECA] inline-flex items-center gap-1"
                    >
                      <FileDown className="w-3 h-3" />
                      Currículo PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-sm text-[#D5C5AA]/70">
          Carregando relatórios e inteligência de dados...
        </div>
      }
    >
      <AdminReportsAnalyticsContent searchParamsPromise={searchParams} />
    </Suspense>
  );
}
