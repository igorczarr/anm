import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { Prisma, WorkModality, ContractType, ExperienceLevel } from "@prisma/client";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  Filter,
  MapPin,
  Search,
  Users,
} from "lucide-react";

const MODALITY_LABELS: Record<string, string> = {
  PRESENCIAL: "Presencial",
  HIBRIDO: "Híbrido",
  REMOTO: "Remoto",
};

const CONTRACT_LABELS: Record<string, string> = {
  CLT: "CLT",
  PJ: "PJ",
  ESTAGIO: "Estágio",
  TEMPORARIO: "Temporário",
  FREELANCER: "Freelancer",
  JOVEM_APRENDIZ: "Jovem Aprendiz",
};

const LEVEL_LABELS: Record<string, string> = {
  SEM_EXPERIENCIA: "Sem experiência",
  ESTAGIO: "Estágio",
  JUNIOR: "Júnior",
  PLENO: "Pleno",
  SENIOR: "Sênior",
  ESPECIALISTA: "Especialista",
  LIDERANCA: "Liderança",
};

interface JobsSearchParams {
  q?: string;
  area?: string;
  location?: string;
  modality?: string;
  contract?: string;
  level?: string;
  period?: string;
  destaque?: string;
}

async function JobsCatalogContent({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<JobsSearchParams>;
}) {
  const params = await searchParamsPromise;

  const q = (params.q || "").trim();
  const area = (params.area || "").trim();
  const location = (params.location || "").trim();
  const modality = (params.modality || "").trim();
  const contract = (params.contract || "").trim();
  const level = (params.level || "").trim();
  const period = (params.period || "").trim();
  const destaque = (params.destaque || "").trim();

  const where: Prisma.JobWhereInput = {
    status: "PUBLISHED",
  };

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { companyName: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { requirements: { contains: q, mode: "insensitive" } },
      { desiredSkills: { hasSome: [q] } },
    ];
  }

  if (area) {
    where.professionalArea = { equals: area, mode: "insensitive" };
  }

  if (location) {
    where.location = { contains: location, mode: "insensitive" };
  }

  if (modality && ["PRESENCIAL", "HIBRIDO", "REMOTO"].includes(modality)) {
    where.modality = modality as WorkModality;
  }

  if (
    contract &&
    ["CLT", "PJ", "ESTAGIO", "TEMPORARIO", "FREELANCER", "JOVEM_APRENDIZ"].includes(
      contract
    )
  ) {
    where.contractType = contract as ContractType;
  }

  if (
    level &&
    [
      "SEM_EXPERIENCIA",
      "ESTAGIO",
      "JUNIOR",
      "PLENO",
      "SENIOR",
      "ESPECIALISTA",
      "LIDERANCA",
    ].includes(level)
  ) {
    where.experienceLevel = level as ExperienceLevel;
  }

  if (period) {
    const days = Number(period);
    if (!isNaN(days) && days > 0) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      where.publishedAt = { gte: since };
    }
  }

  const [jobs, allAreas] = await Promise.all([
    prisma.job.findMany({
      where,
      include: {
        _count: { select: { applications: true } },
      },
      orderBy: { publishedAt: "desc" },
    }),
    prisma.job.findMany({
      where: { status: "PUBLISHED" },
      select: { professionalArea: true },
      distinct: ["professionalArea"],
    }),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Cabeçalho */}
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-[11px] uppercase tracking-[0.26em] text-[#D5C5AA]/70">
            Oportunidades Abertas
          </span>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl text-[#F7DECA]">
            Mural de Oportunidades — A Nova Moeda
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[#D5C5AA]/80 max-w-2xl">
            Consulte as vagas abertas nas empresas parceiras do evento, filtre por área, modalidade ou nível de experiência e candidate-se diretamente com seu perfil estruturado.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
          <Link
            href="/candidaturas"
            className="px-4 py-3 border border-[#D5C5AA]/40 text-xs uppercase tracking-[0.18em] text-[#F7DECA] hover:border-[#F7DECA] transition"
          >
            Minhas Candidaturas
          </Link>
          <Link
            href="/perfil"
            className="px-4 py-3 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs uppercase tracking-[0.18em] hover:bg-[#F7DECA] transition"
          >
            Atualizar Meu Perfil
          </Link>
        </div>
      </div>

      {/* Formulário de Pesquisa e Filtros no Servidor (Seção 4.2) */}
      <form
        method="GET"
        action="/talentos/vagas"
        className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.2em] text-[#F7DECA] flex items-center gap-2 font-semibold">
            <Filter className="w-4 h-4" />
            Pesquisa e Filtros de Oportunidades
          </span>
          {(q || area || location || modality || contract || level || period) && (
            <Link
              href="/vagas"
              className="text-xs uppercase tracking-[0.16em] text-[#D5C5AA] underline hover:text-[#F7DECA]"
            >
              Limpar filtros
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Palavra-chave */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-[#D5C5AA]/60 absolute left-3.5 top-3" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Buscar por cargo, empresa, competência ou palavra-chave..."
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 pl-10 pr-3.5 py-2.5 text-xs text-[#F7DECA] focus:border-[#F7DECA] outline-none"
            />
          </div>

          {/* Área profissional */}
          <div>
            <select
              name="area"
              defaultValue={area}
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3.5 py-2.5 text-xs text-[#F7DECA]"
            >
              <option value="">Todas as áreas profissionais</option>
              {allAreas.map((a) => (
                <option key={a.professionalArea} value={a.professionalArea}>
                  {a.professionalArea}
                </option>
              ))}
            </select>
          </div>

          {/* Localização */}
          <div>
            <input
              type="text"
              name="location"
              defaultValue={location}
              placeholder="Cidade ou Estado (ex: São Paulo)"
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3.5 py-2.5 text-xs text-[#F7DECA]"
            />
          </div>

          {/* Modalidade */}
          <div>
            <select
              name="modality"
              defaultValue={modality}
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3.5 py-2.5 text-xs text-[#F7DECA]"
            >
              <option value="">Todas as modalidades</option>
              <option value="PRESENCIAL">Presencial</option>
              <option value="HIBRIDO">Híbrido</option>
              <option value="REMOTO">Remoto</option>
            </select>
          </div>

          {/* Tipo de contratação */}
          <div>
            <select
              name="contract"
              defaultValue={contract}
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3.5 py-2.5 text-xs text-[#F7DECA]"
            >
              <option value="">Todos os tipos de contratação</option>
              <option value="CLT">CLT</option>
              <option value="PJ">PJ</option>
              <option value="ESTAGIO">Estágio</option>
              <option value="TEMPORARIO">Temporário</option>
              <option value="FREELANCER">Freelancer</option>
              <option value="JOVEM_APRENDIZ">Jovem Aprendiz</option>
            </select>
          </div>

          {/* Nível de experiência */}
          <div>
            <select
              name="level"
              defaultValue={level}
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3.5 py-2.5 text-xs text-[#F7DECA]"
            >
              <option value="">Todos os níveis de experiência</option>
              <option value="SEM_EXPERIENCIA">Sem experiência</option>
              <option value="ESTAGIO">Estágio</option>
              <option value="JUNIOR">Júnior</option>
              <option value="PLENO">Pleno</option>
              <option value="SENIOR">Sênior</option>
              <option value="ESPECIALISTA">Especialista</option>
              <option value="LIDERANCA">Liderança</option>
            </select>
          </div>

          {/* Data de publicação + Botão Filtrar */}
          <div className="flex gap-2">
            <select
              name="period"
              defaultValue={period}
              className="flex-1 bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2.5 text-xs text-[#F7DECA]"
            >
              <option value="">Qualquer data</option>
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
            </select>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs uppercase tracking-[0.18em] hover:bg-[#F7DECA] transition cursor-pointer shrink-0"
            >
              Filtrar
            </button>
          </div>
        </div>
      </form>

      {/* Contagem de resultados */}
      <div className="flex items-center justify-between text-xs text-[#D5C5AA]/80">
        <span>
          Exibindo <strong className="text-[#F7DECA]">{jobs.length}</strong>{" "}
          {jobs.length === 1 ? "oportunidade aberta" : "oportunidades abertas"}
        </span>
      </div>

      {/* Lista de Oportunidades (Seção 4.1) */}
      {jobs.length === 0 ? (
        <div className="border border-dashed border-[#D5C5AA]/25 bg-[#0A150D]/40 p-12 text-center space-y-3">
          <Briefcase className="w-8 h-8 text-[#F7DECA] mx-auto" />
          <h3 className="font-display text-xl text-[#F7DECA]">
            Nenhuma oportunidade encontrada com estes filtros
          </h3>
          <p className="text-xs text-[#D5C5AA]/75 max-w-md mx-auto">
            Experimente limpar os filtros de busca ou mantenha seu perfil 100% atualizado para ser encontrado pela curadoria do evento.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {jobs.map((job) => {
            const isHighlighted = destaque === job.slug;
            return (
              <div
                key={job.id}
                className={`border p-6 sm:p-8 transition ${
                  isHighlighted
                    ? "border-[#F7DECA] bg-[#0A150D]"
                    : "border-[#D5C5AA]/25 bg-[#0A150D]/80 hover:border-[#F7DECA]/70"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  <div className="space-y-3 max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em]">
                      <span className="px-2.5 py-1 border border-[#57552E] bg-[#030A06] text-[#F7DECA]">
                        {job.professionalArea}
                      </span>
                      <span className="px-2.5 py-1 border border-[#D5C5AA]/25 bg-[#030A06] text-[#D5C5AA]">
                        {MODALITY_LABELS[job.modality] || job.modality}
                      </span>
                      <span className="px-2.5 py-1 border border-[#D5C5AA]/25 bg-[#030A06] text-[#D5C5AA]">
                        {CONTRACT_LABELS[job.contractType] || job.contractType}
                      </span>
                      <span className="px-2.5 py-1 border border-[#D5C5AA]/25 bg-[#030A06] text-[#D5C5AA]">
                        {LEVEL_LABELS[job.experienceLevel] || job.experienceLevel}
                      </span>
                      {job.salaryRange && (
                        <span className="px-2.5 py-1 border border-[#57552E] bg-[#030A06] text-[#F7DECA]">
                          {job.salaryRange}
                        </span>
                      )}
                    </div>

                    <Link href={`/vagas/${job.slug}`} className="block group">
                      <h2 className="font-display text-2xl sm:text-3xl text-[#F7DECA] group-hover:underline">
                        {job.title}
                      </h2>
                    </Link>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#D5C5AA]/80">
                      <span className="flex items-center gap-1.5 font-semibold text-[#F7DECA]">
                        <Building2 className="w-3.5 h-3.5 text-[#D5C5AA]" />
                        {job.companyName}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#D5C5AA]" />
                        {job.location}
                      </span>
                      {job.publishedAt && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#D5C5AA]" />
                          Publicada em{" "}
                          {new Date(job.publishedAt).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                      {job.applicationDeadline && (
                        <span className="flex items-center gap-1.5 text-[#F7DECA]">
                          <Clock className="w-3.5 h-3.5" />
                          Inscrições até{" "}
                          {new Date(job.applicationDeadline).toLocaleDateString(
                            "pt-BR"
                          )}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-[#D5C5AA]/85 leading-relaxed">
                      {job.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {job.desiredSkills.map((skill) => (
                        <span
                          key={skill}
                          className="text-[11px] px-2.5 py-1 bg-[#030A06] border border-[#D5C5AA]/20 text-[#D5C5AA]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end justify-between gap-3 shrink-0">
                    <Link
                      href={`/vagas/${job.slug}`}
                      className="px-6 py-3.5 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs uppercase tracking-[0.2em] hover:bg-[#F7DECA] transition flex items-center justify-center gap-2"
                    >
                      <span>Ver Detalhes & Candidatar-se</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <span className="text-[11px] text-[#D5C5AA]/65 flex items-center gap-1 justify-center">
                      <Users className="w-3 h-3 text-[#F7DECA]" />
                      {job.vacanciesCount}{" "}
                      {job.vacanciesCount === 1 ? "vaga aberta" : "vagas abertas"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function VagasPage({
  searchParams,
}: {
  searchParams: Promise<JobsSearchParams>;
}) {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-sm text-[#D5C5AA]/70">
          Carregando oportunidades...
        </div>
      }
    >
      <JobsCatalogContent searchParamsPromise={searchParams} />
    </Suspense>
  );
}
