import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { Prisma, EducationLevel, EvidenceStatus } from "@prisma/client";
import { toggleArchiveCandidateAction } from "@/app/actions/admin";
import {
  Archive,
  Eye,
  FileDown,
  Filter,
  Search,
  Download,
  ShieldCheck,
} from "lucide-react";

interface CandidateFilters {
  q?: string;
  area?: string;
  education?: string;
  city?: string;
  skill?: string;
  evidence?: string;
  sort?: string;
  archived?: string;
}

async function AdminCandidatesContent({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<CandidateFilters>;
}) {
  const params = await searchParamsPromise;

  const q = (params.q || "").trim();
  const area = (params.area || "").trim();
  const education = (params.education || "").trim();
  const city = (params.city || "").trim();
  const skill = (params.skill || "").trim();
  const evidence = (params.evidence || "").trim();
  const sort = params.sort === "asc" ? "asc" : "desc";
  const showArchived = params.archived === "1";

  const where: Prisma.CandidateProfileWhereInput = {
    archivedAt: showArchived ? { not: null } : null,
  };

  if (q) {
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { professionalTitle: { contains: q, mode: "insensitive" } },
    ];
  }

  if (area) {
    where.interestArea = { equals: area, mode: "insensitive" };
  }

  if (city) {
    where.city = { contains: city, mode: "insensitive" };
  }

  if (education) {
    where.educations = {
      some: { level: education as EducationLevel },
    };
  }

  const skillSomeFilter: Prisma.CandidateSkillWhereInput = {};
  if (skill) {
    skillSomeFilter.skill = {
      name: { contains: skill, mode: "insensitive" },
    };
  }
  if (evidence === "COM_EVIDENCIA") {
    skillSomeFilter.evidenceStatus = {
      in: ["DOCUMENTADA", "DEMONSTRADA", "VALIDADA"],
    };
  } else if (
    evidence === "DOCUMENTADA" ||
    evidence === "DEMONSTRADA" ||
    evidence === "VALIDADA" ||
    evidence === "DECLARADA"
  ) {
    skillSomeFilter.evidenceStatus = evidence as EvidenceStatus;
  }

  if (Object.keys(skillSomeFilter).length > 0) {
    where.skills = { some: skillSomeFilter };
  }

  const [candidates, allSkills] = await Promise.all([
    prisma.candidateProfile.findMany({
      where,
      include: {
        educations: { orderBy: { startDate: "desc" } },
        experiences: { orderBy: { startDate: "desc" } },
        skills: { include: { skill: true } },
        achievements: true,
        resumes: { where: { isActive: true } },
      },
      orderBy: { createdAt: sort },
    }),
    prisma.skill.findMany({ orderBy: { name: "asc" } }),
  ]);

  const queryForExport = new URLSearchParams();
  if (q) queryForExport.set("q", q);
  if (area) queryForExport.set("area", area);
  if (city) queryForExport.set("city", city);
  if (education) queryForExport.set("education", education);
  if (skill) queryForExport.set("skill", skill);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-[0.26em] text-[#D5C5AA]/70">
            Gestão de Talentos · Passaporte de Competências
          </span>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl text-[#F7DECA]">
            Base de Talentos & Evidências
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#D5C5AA]/80">
            Pesquise por área, formação, cidade, competências e maturidade de evidências (Documentada, Demonstrada ou Validada).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href={`/talentos/api/admin/export/candidates?${queryForExport.toString()}`}
            className="px-4 py-2.5 border border-[#D5C5AA]/40 text-xs uppercase tracking-[0.18em] text-[#F7DECA] hover:border-[#F7DECA] transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV (Filtros Atuais)
          </a>
        </div>
      </div>

      {/* Pesquisa e Filtros */}
      <form
        method="GET"
        action="/talentos/admin/candidatos"
        className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.2em] text-[#F7DECA] flex items-center gap-2 font-semibold">
            <Filter className="w-4 h-4" />
            Filtros Avançados de Talentos & Evidências
          </span>
          <Link
            href="/admin/candidatos"
            className="text-xs uppercase tracking-[0.16em] text-[#D5C5AA] underline"
          >
            Limpar filtros
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-[#D5C5AA]/60 absolute left-3 top-2.5" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Pesquisar por nome, e-mail ou título profissional..."
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 pl-9 pr-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <input
            type="text"
            name="area"
            defaultValue={area}
            placeholder="Área profissional (ex: Finanças)"
            className="bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
          />

          <input
            type="text"
            name="city"
            defaultValue={city}
            placeholder="Cidade (ex: Feira de Santana)"
            className="bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
          />

          <select
            name="education"
            defaultValue={education}
            className="bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
          >
            <option value="">Todas as formações</option>
            <option value="GRADUACAO">Graduação</option>
            <option value="POS_GRADUACAO">Pós-graduação</option>
            <option value="MESTRADO">Mestrado</option>
            <option value="DOUTORADO">Doutorado</option>
            <option value="TECNICO">Técnico</option>
            <option value="MEDIO">Ensino Médio</option>
          </select>

          <select
            name="skill"
            defaultValue={skill}
            className="bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
          >
            <option value="">Qualquer competência</option>
            {allSkills.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            name="evidence"
            defaultValue={evidence}
            className="bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
          >
            <option value="">Qualquer estágio de evidência</option>
            <option value="COM_EVIDENCIA">
              Com evidência (Documentada, Demonstrada ou Validada)
            </option>
            <option value="VALIDADA">Validada por avaliador</option>
            <option value="DEMONSTRADA">Demonstrada em desafio</option>
            <option value="DOCUMENTADA">Documentada com link/anexo</option>
            <option value="DECLARADA">Apenas declarada</option>
          </select>

          <div className="flex items-center gap-2">
            <select
              name="archived"
              defaultValue={showArchived ? "1" : "0"}
              className="flex-1 bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            >
              <option value="0">Ativos</option>
              <option value="1">Arquivados</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs uppercase tracking-[0.16em] hover:bg-[#F7DECA] cursor-pointer"
            >
              Filtrar
            </button>
          </div>
        </div>
      </form>

      {/* Tabela de Candidatos */}
      <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/70 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#D5C5AA]/20 bg-[#030A06] text-[10px] uppercase tracking-[0.2em] text-[#D5C5AA]/80">
              <th className="p-4">Candidato / E-mail</th>
              <th className="p-4">Cidade</th>
              <th className="p-4">Área Profissional</th>
              <th className="p-4">Formação & Trajetória</th>
              <th className="p-4">Passaporte & Evidências</th>
              <th className="p-4">Preenchimento</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D5C5AA]/15">
            {candidates.map((c) => {
              const latestEdu = c.educations[0];
              const latestExp = c.experiences[0];
              const valCount = c.skills.filter(
                (s) => s.evidenceStatus === "VALIDADA"
              ).length;
              const demCount = c.skills.filter(
                (s) => s.evidenceStatus === "DEMONSTRADA"
              ).length;
              const docCount = c.skills.filter(
                (s) => s.evidenceStatus === "DOCUMENTADA"
              ).length;

              return (
                <tr key={c.id} className="hover:bg-[#030A06]/60 transition">
                  <td className="p-4">
                    <div className="font-semibold text-[#F7DECA]">
                      {c.fullName}
                    </div>
                    <div className="text-[#D5C5AA]/70">{c.email}</div>
                  </td>
                  <td className="p-4 text-[#D5C5AA]">
                    {[c.city, c.state].filter(Boolean).join("/") || "—"}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 border border-[#57552E] bg-[#030A06] text-[#F7DECA]">
                      {c.interestArea || "Não informada"}
                    </span>
                  </td>
                  <td className="p-4 text-[#D5C5AA]/85">
                    <div>
                      <strong>Formação:</strong>{" "}
                      {latestEdu
                        ? `${latestEdu.course} (${latestEdu.level})`
                        : "—"}
                    </div>
                    <div className="text-[#D5C5AA]/70">
                      <strong>Exp:</strong>{" "}
                      {latestExp
                        ? `${latestExp.role} @ ${latestExp.company}`
                        : "—"}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1.5">
                      {valCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-900 border border-emerald-300">
                          {valCount} Validada(s)
                        </span>
                      )}
                      {demCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-300">
                          {demCount} Demonstrada(s)
                        </span>
                      )}
                      {docCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-50 text-sky-900 border border-sky-200">
                          {docCount} Documentada(s)
                        </span>
                      )}
                      {valCount === 0 && demCount === 0 && docCount === 0 && (
                        <span className="text-[11px] text-slate-500">
                          {c.skills.length} declarada(s)
                        </span>
                      )}
                    </div>
                    {c.achievements.length > 0 && (
                      <div className="text-[11px] text-slate-500 mt-1">
                        {c.achievements.length} item(ns) no portfólio
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="font-semibold text-[#F7DECA]">
                      {c.completionPercent}%
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/passaporte/${c.id}`}
                        className="px-2.5 py-1.5 bg-[#ECFDF5] border border-emerald-300 text-[#14532D] font-semibold hover:bg-emerald-100 flex items-center gap-1 rounded-md"
                        title="Abrir Passaporte de Talentos"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Passaporte
                      </Link>
                      <Link
                        href={`/admin/candidatos/${c.id}`}
                        className="px-2.5 py-1.5 border border-[#D5C5AA]/35 text-[#F7DECA] hover:border-[#F7DECA] flex items-center gap-1"
                        title="Avaliar competências e perfil completo"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Avaliar
                      </Link>
                      <a
                        href={`/talentos/api/resumes/pdf?candidateId=${c.id}`}
                        className="px-2.5 py-1.5 border border-[#57552E] bg-[#030A06] text-[#D5C5AA] hover:text-[#F7DECA] flex items-center gap-1"
                        title="Baixar Currículo em PDF"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        PDF
                      </a>
                      <form action={toggleArchiveCandidateAction}>
                        <input type="hidden" name="candidateId" value={c.id} />
                        <button
                          type="submit"
                          className="p-1.5 border border-[#D5C5AA]/20 text-[#D5C5AA]/70 hover:text-amber-300 cursor-pointer"
                          title={
                            c.archivedAt
                              ? "Restaurar registro"
                              : "Arquivar registro"
                          }
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                      </form>
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

export default function AdminCandidatesPage({
  searchParams,
}: {
  searchParams: Promise<CandidateFilters>;
}) {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-sm text-[#D5C5AA]/70">
          Carregando base de candidatos...
        </div>
      }
    >
      <AdminCandidatesContent searchParamsPromise={searchParams} />
    </Suspense>
  );
}
