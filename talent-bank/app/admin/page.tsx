import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  BarChart3,
  Briefcase,
  CheckCircle2,
  FileText,
  Filter,
  TrendingUp,
  Users,
} from "lucide-react";

interface DashboardFilterParams {
  period?: string;
  jobId?: string;
}

function DistributionBar({
  label,
  count,
  total,
}: {
  label: string;
  count: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#F7DECA]">{label}</span>
        <span className="text-[#D5C5AA]/80">
          {count} ({pct}%)
        </span>
      </div>
      <div className="h-2 w-full bg-[#030A06] border border-[#D5C5AA]/15">
        <div
          className="h-full bg-gradient-to-r from-[#57552E] to-[#D5C5AA]"
          style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
        />
      </div>
    </div>
  );
}

async function AdminDashboardContent({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<DashboardFilterParams>;
}) {
  const params = await searchParamsPromise;
  const periodDays = Number(params.period || 0);
  const selectedJobId = (params.jobId || "").trim();

  let sinceDate: Date | undefined;
  if (periodDays > 0) {
    sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - periodDays);
  }

  const candidateWhere: Prisma.CandidateProfileWhereInput = {
    archivedAt: null,
    ...(sinceDate ? { createdAt: { gte: sinceDate } } : {}),
  };

  const applicationWhere: Prisma.ApplicationWhereInput = {
    ...(sinceDate ? { appliedAt: { gte: sinceDate } } : {}),
    ...(selectedJobId ? { jobId: selectedJobId } : {}),
  };

  const [
    candidates,
    resumesCount,
    allJobs,
    applications,
  ] = await Promise.all([
    prisma.candidateProfile.findMany({
      where: candidateWhere,
      include: {
        educations: true,
        skills: { include: { skill: true } },
      },
    }),
    prisma.resume.count({ where: { isActive: true } }),
    prisma.job.findMany({
      where: { archivedAt: null },
      include: {
        _count: { select: { applications: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.application.findMany({
      where: applicationWhere,
      include: { job: true },
      orderBy: { appliedAt: "desc" },
    }),
  ]);

  const totalCandidates = candidates.length;
  const completeProfiles = candidates.filter((c) => c.completionPercent >= 80).length;
  const incompleteProfiles = totalCandidates - completeProfiles;

  // Todo candidato com perfil estruturado (>=60%) ou PDF enviado conta como currículo estruturado/cadastrado
  const structuredResumesCount = Math.max(
    resumesCount,
    candidates.filter((c) => c.completionPercent >= 60).length
  );

  const totalJobs = allJobs.length;
  const openJobs = allJobs.filter((j) => j.status === "PUBLISHED").length;
  const closedJobs = allJobs.filter(
    (j) => j.status === "CLOSED" || j.status === "PAUSED"
  ).length;

  const totalApplications = applications.length;
  const avgApplicationsPerJob =
    totalJobs > 0 ? (totalApplications / totalJobs).toFixed(1) : "0.0";

  // Distribuições reais (Seção 5.1)
  const areaMap: Record<string, number> = {};
  const locationMap: Record<string, number> = {};
  const modalityMap: Record<string, number> = {};
  const educationMap: Record<string, number> = {};

  for (const c of candidates) {
    const area = c.interestArea || "Não informada";
    areaMap[area] = (areaMap[area] || 0) + 1;

    const loc =
      c.city && c.state ? `${c.city}/${c.state}` : c.city || "Não informada";
    locationMap[loc] = (locationMap[loc] || 0) + 1;

    const mod = c.preferredModality || "Não informada";
    modalityMap[mod] = (modalityMap[mod] || 0) + 1;

    const topEdu = c.educations[0]?.level || "Não informada";
    educationMap[topEdu] = (educationMap[topEdu] || 0) + 1;
  }

  // Evolução por dia (cadastros e candidaturas)
  const registrationsByDay: Record<string, number> = {};
  for (const c of candidates) {
    const day = new Date(c.createdAt).toLocaleDateString("pt-BR");
    registrationsByDay[day] = (registrationsByDay[day] || 0) + 1;
  }

  const applicationsByDay: Record<string, number> = {};
  for (const a of applications) {
    const day = new Date(a.appliedAt).toLocaleDateString("pt-BR");
    applicationsByDay[day] = (applicationsByDay[day] || 0) + 1;
  }

  const jobsByApplications = [...allJobs].sort(
    (a, b) => b._count.applications - a._count.applications
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Cabeçalho + Filtros por Período e Vaga (Seção 5.1) */}
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <span className="text-[11px] uppercase tracking-[0.26em] text-[#D5C5AA]/70">
            Centro de Controle
          </span>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl text-[#F7DECA]">
            Dashboard Administrativo
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#D5C5AA]/80">
            Indicadores calculados em tempo real a partir dos registros reais do banco Neon PostgreSQL.
          </p>
        </div>

        <form
          method="GET"
          action="/talentos/admin"
          className="flex flex-wrap items-center gap-3"
        >
          <div className="flex items-center gap-2 text-xs text-[#D5C5AA]">
            <Filter className="w-3.5 h-3.5 text-[#F7DECA]" />
            <span>Filtrar:</span>
          </div>
          <select
            name="period"
            defaultValue={params.period || ""}
            className="bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
          >
            <option value="">Todo o período</option>
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
          </select>

          <select
            name="jobId"
            defaultValue={selectedJobId}
            className="bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
          >
            <option value="">Todas as vagas</option>
            {allJobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs uppercase tracking-[0.16em] hover:bg-[#F7DECA] cursor-pointer"
          >
            Aplicar
          </button>
        </form>
      </div>

      {/* 10 Indicadores Principais (Seção 5.1) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#D5C5AA]/70">
            Total de Candidatos
          </span>
          <p className="font-display text-3xl text-[#F7DECA] mt-2">
            {totalCandidates}
          </p>
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#D5C5AA]/70">
            Perfis Completos (≥80%)
          </span>
          <p className="font-display text-3xl text-emerald-300 mt-2">
            {completeProfiles}
          </p>
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#D5C5AA]/70">
            Perfis Incompletos
          </span>
          <p className="font-display text-3xl text-amber-200 mt-2">
            {incompleteProfiles}
          </p>
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#D5C5AA]/70">
            Currículos Cadastrados
          </span>
          <p className="font-display text-3xl text-[#F7DECA] mt-2">
            {structuredResumesCount}
          </p>
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#D5C5AA]/70">
            Total de Vagas
          </span>
          <p className="font-display text-3xl text-[#F7DECA] mt-2">
            {totalJobs}
          </p>
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#D5C5AA]/70">
            Vagas Abertas
          </span>
          <p className="font-display text-3xl text-emerald-300 mt-2">
            {openJobs}
          </p>
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#D5C5AA]/70">
            Vagas Encerradas / Pausadas
          </span>
          <p className="font-display text-3xl text-[#D5C5AA] mt-2">
            {closedJobs}
          </p>
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#D5C5AA]/70">
            Total de Candidaturas
          </span>
          <p className="font-display text-3xl text-[#F7DECA] mt-2">
            {totalApplications}
          </p>
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#D5C5AA]/70">
            Média por Oportunidade
          </span>
          <p className="font-display text-3xl text-[#F7DECA] mt-2">
            {avgApplicationsPerJob}
          </p>
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5 flex flex-col justify-between">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#D5C5AA]/70">
            Funil de Seleção
          </span>
          <Link
            href="/admin/kanban"
            className="text-xs uppercase tracking-[0.16em] text-[#F7DECA] underline mt-2"
          >
            Abrir Kanban →
          </Link>
        </div>
      </div>

      {/* Gráficos de Distribuição e Evolução (Seção 5.1) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Vagas com maior número de candidaturas */}
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#D5C5AA]/15 pb-3">
            <h2 className="font-display text-xl text-[#F7DECA] flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Candidaturas por Vaga
            </h2>
            <Link
              href="/admin/vagas"
              className="text-xs uppercase tracking-[0.16em] text-[#D5C5AA] hover:text-[#F7DECA]"
            >
              Gerenciar vagas
            </Link>
          </div>
          <div className="space-y-3">
            {jobsByApplications.map((job) => (
              <DistributionBar
                key={job.id}
                label={`${job.title} (${job.companyName})`}
                count={job._count.applications}
                total={Math.max(totalApplications, 1)}
              />
            ))}
          </div>
        </div>

        {/* Distribuição por Área Profissional */}
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#D5C5AA]/15 pb-3">
            <h2 className="font-display text-xl text-[#F7DECA] flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Distribuição por Área Profissional
            </h2>
          </div>
          <div className="space-y-3">
            {Object.entries(areaMap).map(([area, count]) => (
              <DistributionBar
                key={area}
                label={area}
                count={count}
                total={totalCandidates}
              />
            ))}
          </div>
        </div>

        {/* Distribuição por Localização & Modalidade */}
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 space-y-5">
          <h2 className="font-display text-xl text-[#F7DECA] border-b border-[#D5C5AA]/15 pb-3">
            Distribuição por Localização & Modalidade
          </h2>
          <div className="space-y-3">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[#D5C5AA]/70 block">
              Cidades / Estados
            </span>
            {Object.entries(locationMap).map(([loc, count]) => (
              <DistributionBar
                key={loc}
                label={loc}
                count={count}
                total={totalCandidates}
              />
            ))}
          </div>
          <div className="space-y-3 pt-3 border-t border-[#D5C5AA]/15">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[#D5C5AA]/70 block">
              Modalidade Preferida
            </span>
            {Object.entries(modalityMap).map(([mod, count]) => (
              <DistributionBar
                key={mod}
                label={mod}
                count={count}
                total={totalCandidates}
              />
            ))}
          </div>
        </div>

        {/* Distribuição por Nível de Formação & Evolução por Período */}
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 space-y-5">
          <h2 className="font-display text-xl text-[#F7DECA] border-b border-[#D5C5AA]/15 pb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Formação Acadêmica & Evolução no Período
          </h2>
          <div className="space-y-3">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[#D5C5AA]/70 block">
              Nível de Formação
            </span>
            {Object.entries(educationMap).map(([lvl, count]) => (
              <DistributionBar
                key={lvl}
                label={lvl}
                count={count}
                total={totalCandidates}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-[#D5C5AA]/15 text-xs">
            <div className="bg-[#030A06] border border-[#D5C5AA]/15 p-3">
              <span className="text-[10px] uppercase tracking-[0.16em] text-[#D5C5AA]/70 block mb-2">
                Evolução de Cadastros
              </span>
              {Object.entries(registrationsByDay).map(([day, count]) => (
                <div key={day} className="flex justify-between py-0.5">
                  <span>{day}</span>
                  <strong className="text-[#F7DECA]">{count}</strong>
                </div>
              ))}
            </div>
            <div className="bg-[#030A06] border border-[#D5C5AA]/15 p-3">
              <span className="text-[10px] uppercase tracking-[0.16em] text-[#D5C5AA]/70 block mb-2">
                Evolução de Candidaturas
              </span>
              {Object.entries(applicationsByDay).map(([day, count]) => (
                <div key={day} className="flex justify-between py-0.5">
                  <span>{day}</span>
                  <strong className="text-[#F7DECA]">{count}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardFilterParams>;
}) {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-sm text-[#D5C5AA]/70">
          Calculando indicadores reais do Banco de Talentos...
        </div>
      }
    >
      <AdminDashboardContent searchParamsPromise={searchParams} />
    </Suspense>
  );
}
