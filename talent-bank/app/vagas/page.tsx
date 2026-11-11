import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import {
  Prisma,
  WorkModality,
  ContractType,
  ExperienceLevel,
} from "@prisma/client";
import { evaluateJobTransparency } from "@/lib/transparency";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  Filter,
  ListChecks,
  MapPin,
  Search,
  ShieldCheck,
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
  verified?: string;
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
  const verified = (params.verified || "").trim();
  const destaque = (params.destaque || "").trim();

  // Retira automaticamente vagas vencidas do mural ativo
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const andConditions: Prisma.JobWhereInput[] = [
    { status: "PUBLISHED" },
    {
      OR: [
        { applicationDeadline: null },
        { applicationDeadline: { gte: startOfToday } },
      ],
    },
  ];

  if (q) {
    andConditions.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { companyName: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { requirements: { contains: q, mode: "insensitive" } },
        { desiredSkills: { hasSome: [q] } },
      ],
    });
  }

  if (area) {
    andConditions.push({
      professionalArea: { equals: area, mode: "insensitive" },
    });
  }

  if (location) {
    andConditions.push({
      location: { contains: location, mode: "insensitive" },
    });
  }

  if (modality && ["PRESENCIAL", "HIBRIDO", "REMOTO"].includes(modality)) {
    andConditions.push({ modality: modality as WorkModality });
  }

  if (
    contract &&
    [
      "CLT",
      "PJ",
      "ESTAGIO",
      "TEMPORARIO",
      "FREELANCER",
      "JOVEM_APRENDIZ",
    ].includes(contract)
  ) {
    andConditions.push({ contractType: contract as ContractType });
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
    andConditions.push({ experienceLevel: level as ExperienceLevel });
  }

  if (verified === "1") {
    andConditions.push({ companyVerified: true });
  } else if (verified === "SALARY") {
    andConditions.push({
      salaryRange: { not: null },
      NOT: { salaryRange: "" },
    });
  }

  if (period) {
    const days = Number(period);
    if (!isNaN(days) && days > 0) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      andConditions.push({ publishedAt: { gte: since } });
    }
  }

  const where: Prisma.JobWhereInput = { AND: andConditions };

  const [jobs, allAreas] = await Promise.all([
    prisma.job.findMany({
      where,
      include: {
        _count: { select: { applications: true } },
      },
      orderBy: [{ companyVerified: "desc" }, { publishedAt: "desc" }],
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
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#14532D]">
            <ShieldCheck className="w-4 h-4" />
            Oportunidades Transparentes · Empresas Identificadas
          </span>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl text-[#F7DECA]">
            Mural de Oportunidades — Talent Hub
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[#D5C5AA]/80 max-w-2xl">
            Consulte oportunidades com atividades reais, etapas claras do
            processo seletivo, jornada definida e compromisso de retorno ao
            candidato.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
          <Link
            href="/passaporte"
            className="px-4 py-3 bg-[#14532D] text-white font-semibold text-xs uppercase tracking-[0.18em] hover:bg-[#166534] transition flex items-center gap-1.5 rounded-lg"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Meu Passaporte
          </Link>
          <Link
            href="/candidaturas"
            className="px-4 py-3 border border-[#D5C5AA]/40 text-xs uppercase tracking-[0.18em] text-[#F7DECA] hover:border-[#F7DECA] transition"
          >
            Minhas Candidaturas
          </Link>
        </div>
      </div>

      {/* Formulário de Pesquisa e Filtros no Servidor */}
      <form
        method="GET"
        action="/talentos/vagas"
        className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.2em] text-[#F7DECA] flex items-center gap-2 font-semibold">
            <Filter className="w-4 h-4" />
            Pesquisa e Filtros de Oportunidades Transparentes
          </span>
          {(q ||
            area ||
            location ||
            modality ||
            contract ||
            level ||
            period ||
            verified) && (
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
              placeholder="Cidade ou Estado (ex: Feira de Santana)"
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
              <option value="ESTAGIO">Estágio</option>
              <option value="JOVEM_APRENDIZ">Jovem Aprendiz</option>
              <option value="PJ">PJ</option>
              <option value="TEMPORARIO">Temporário</option>
              <option value="FREELANCER">Freelancer</option>
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
              <option value="SEM_EXPERIENCIA">
                Sem experiência (Primeiro Emprego)
              </option>
              <option value="ESTAGIO">Estágio</option>
              <option value="JUNIOR">Júnior</option>
              <option value="PLENO">Pleno</option>
              <option value="SENIOR">Sênior</option>
              <option value="ESPECIALISTA">Especialista</option>
              <option value="LIDERANCA">Liderança</option>
            </select>
          </div>

          {/* Filtro de Transparência + Botão Filtrar */}
          <div className="flex gap-2">
            <select
              name="verified"
              defaultValue={verified}
              className="flex-1 bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2.5 text-xs text-[#F7DECA]"
            >
              <option value="">Todas as oportunidades</option>
              <option value="1">Apenas Empresas Verificadas</option>
              <option value="SALARY">Com remuneração divulgada</option>
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
          {jobs.length === 1
            ? "oportunidade ativa e verificada"
            : "oportunidades ativas"}
        </span>
      </div>

      {/* Lista de Oportunidades */}
      {jobs.length === 0 ? (
        <div className="border border-dashed border-[#D5C5AA]/25 bg-[#0A150D]/40 p-12 text-center space-y-3">
          <Briefcase className="w-8 h-8 text-[#F7DECA] mx-auto" />
          <h3 className="font-display text-xl text-[#F7DECA]">
            Nenhuma oportunidade encontrada com estes filtros
          </h3>
          <p className="text-xs text-[#D5C5AA]/75 max-w-md mx-auto">
            Experimente limpar os filtros de busca ou mantenha seu Passaporte de
            Talentos atualizado para ser encontrado pelas empresas parceiras.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {jobs.map((job) => {
            const isHighlighted = destaque === job.slug;
            const transparency = evaluateJobTransparency(job);
            const stagesCount =
              job.selectionStages && job.selectionStages.length > 0
                ? job.selectionStages.length
                : 4;

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
                    <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em]">
                      {job.companyVerified && (
                        <span className="px-2.5 py-1 rounded-full border border-emerald-400 bg-emerald-50 text-emerald-900 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Empresa Verificada
                        </span>
                      )}
                      <span
                        className={`px-2.5 py-1 rounded-full border font-semibold ${transparency.badgeClass}`}
                      >
                        Transparência {transparency.score}/{transparency.maxScore}
                      </span>
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
                        {LEVEL_LABELS[job.experienceLevel] ||
                          job.experienceLevel}
                      </span>
                      {job.salaryRange && (
                        <span className="px-2.5 py-1 border border-emerald-300 bg-[#ECFDF5] text-[#14532D] font-semibold">
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
                        {job.companyIdentifier && (
                          <span className="text-[11px] font-normal text-slate-500">
                            ({job.companyIdentifier})
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#D5C5AA]" />
                        {job.location}
                      </span>
                      {job.workSchedule && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#D5C5AA]" />
                          {job.workSchedule}
                        </span>
                      )}
                      {job.publishedAt && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#D5C5AA]" />
                          Publicada em{" "}
                          {new Date(job.publishedAt).toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-[#D5C5AA]/85 leading-relaxed">
                      {job.description}
                    </p>

                    {/* Compromissos de Transparência da Vaga */}
                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
                        <ListChecks className="w-3.5 h-3.5 text-[#14532D]" />
                        {stagesCount} etapas no processo seletivo
                      </span>
                      <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
                        <Clock className="w-3.5 h-3.5 text-[#14532D]" />
                        {job.feedbackEstimate ||
                          `Retorno previsto em até ${job.feedbackSlaDays || 7} dias`}
                      </span>
                      {job.applicationDeadline && (
                        <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-900 px-2.5 py-1 rounded-md font-medium">
                          Inscrições até{" "}
                          {new Date(job.applicationDeadline).toLocaleDateString(
                            "pt-BR"
                          )}
                        </span>
                      )}
                    </div>

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
                      <span>Ver Etapas & Candidatar-se</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <span className="text-[11px] text-[#D5C5AA]/65 flex items-center gap-1 justify-center">
                      <Users className="w-3 h-3 text-[#F7DECA]" />
                      {job.vacanciesCount}{" "}
                      {job.vacanciesCount === 1
                        ? "vaga aberta"
                        : "vagas abertas"}
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
          Carregando oportunidades transparentes...
        </div>
      }
    >
      <JobsCatalogContent searchParamsPromise={searchParams} />
    </Suspense>
  );
}
