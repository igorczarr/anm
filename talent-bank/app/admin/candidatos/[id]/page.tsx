import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import {
  EVIDENCE_BADGES,
  LEVEL_LABELS,
  EXPERIENCE_TYPE_LABELS,
  ACHIEVEMENT_CATEGORY_LABELS,
} from "@/lib/passport";
import { setSkillEvidenceStatusAdminAction } from "@/app/actions/admin";
import {
  ArrowLeft,
  FileDown,
  FileText,
  GraduationCap,
  Briefcase,
  Award,
  ShieldCheck,
  FolderGit2,
  ExternalLink,
} from "lucide-react";

async function CandidateDetailAdminContent({
  paramsPromise,
}: {
  paramsPromise: Promise<{ id: string }>;
}) {
  const { id } = await paramsPromise;

  const candidate = await prisma.candidateProfile.findUnique({
    where: { id },
    include: {
      educations: { orderBy: { startDate: "desc" } },
      experiences: { orderBy: { startDate: "desc" } },
      skills: {
        include: { skill: true, evidences: { orderBy: { createdAt: "desc" } } },
      },
      achievements: { orderBy: { createdAt: "desc" } },
      languages: true,
      resumes: { orderBy: { updatedAt: "desc" } },
      applications: {
        include: { job: true },
        orderBy: { appliedAt: "desc" },
      },
    },
  });

  if (!candidate) notFound();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <Link
        href="/admin/candidatos"
        className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#D5C5AA] hover:text-[#F7DECA]"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Voltar para Gestão de Candidatos
      </Link>

      {/* Cabeçalho do Talento */}
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-[11px] uppercase tracking-[0.24em] text-[#D5C5AA]/70">
            Dossiê Individual do Talento · {candidate.completionPercent}% Completo
          </span>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl text-[#F7DECA]">
            {candidate.fullName}
          </h1>
          <p className="mt-1 text-sm text-[#D5C5AA]/85">
            {candidate.professionalTitle || candidate.interestArea}
          </p>
          <p className="mt-2 text-xs text-[#D5C5AA]/75">
            {candidate.email} · {candidate.phone || "Telefone não informado"} ·{" "}
            {[candidate.city, candidate.state].filter(Boolean).join("/")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/passaporte/${candidate.id}`}
            className="px-5 py-3 bg-[#14532D] text-white font-semibold text-xs uppercase tracking-[0.18em] hover:bg-[#166534] transition flex items-center gap-2 rounded-lg"
          >
            <ShieldCheck className="w-4 h-4" />
            Abrir Passaporte de Talentos
          </Link>
          <a
            href={`/talentos/api/resumes/pdf?candidateId=${candidate.id}`}
            className="px-5 py-3 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs uppercase tracking-[0.18em] hover:bg-[#F7DECA] transition flex items-center gap-2"
          >
            <FileDown className="w-4 h-4" />
            Gerar Currículo em PDF
          </a>
        </div>
      </div>

      {/* Consentimentos LGPD Aplicáveis */}
      <div className="border border-[#57552E] bg-[#030A06] p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-[#F7DECA]">
          <ShieldCheck className="w-4 h-4" />
          <span>Consentimentos LGPD do Candidato:</span>
        </div>
        <div className="flex flex-wrap gap-4">
          <span>
            Base Geral de Talentos:{" "}
            <strong className="text-[#F7DECA]">
              {candidate.isPublicInPool ? "Autorizado" : "Restrito"}
            </strong>
          </span>
          <span>
            Compartilhamento com Empresas:{" "}
            <strong className="text-[#F7DECA]">
              {candidate.allowCompanySharing ? "Autorizado" : "Restrito"}
            </strong>
          </span>
        </div>
      </div>

      {/* Apresentação & Preferências */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 space-y-3">
          <h2 className="font-display text-xl text-[#F7DECA]">
            Apresentação & Objetivo
          </h2>
          <p className="text-xs text-[#D5C5AA]/85 leading-relaxed">
            {candidate.summary || "Resumo não preenchido."}
          </p>
          {candidate.careerObjective && (
            <p className="text-xs text-[#D5C5AA]/75 pt-2 border-t border-[#D5C5AA]/15">
              <strong>Objetivo:</strong> {candidate.careerObjective}
            </p>
          )}
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 space-y-2 text-xs">
          <h2 className="font-display text-xl text-[#F7DECA] mb-2">
            Preferências Profissionais
          </h2>
          <p>
            <strong>Área de interesse:</strong> {candidate.interestArea || "—"}
          </p>
          <p>
            <strong>Cargos desejados:</strong>{" "}
            {candidate.desiredRoles.join(", ") || "—"}
          </p>
          <p>
            <strong>Modalidade preferida:</strong>{" "}
            {candidate.preferredModality || "—"}
          </p>
          <p>
            <strong>Disponibilidade:</strong> {candidate.availability || "—"}
          </p>
          <p>
            <strong>Pretensão salarial:</strong>{" "}
            {candidate.salaryExpectation
              ? `R$ ${Number(candidate.salaryExpectation).toLocaleString("pt-BR")}`
              : "Não informada"}
          </p>
        </div>
      </div>

      {/* Experiências & Formação */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 space-y-4">
          <h2 className="font-display text-xl text-[#F7DECA] flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Experiências, Estágios & Projetos
          </h2>
          {candidate.experiences.map((exp) => {
            const expTypeLabel =
              EXPERIENCE_TYPE_LABELS[exp.experienceType || "EMPREGO"];
            return (
              <div
                key={exp.id}
                className="border border-[#D5C5AA]/15 bg-[#030A06] p-4 text-xs space-y-1.5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-900 text-[10px] font-semibold uppercase tracking-[0.12em]">
                    {expTypeLabel}
                  </span>
                  <span className="font-semibold text-[#F7DECA]">
                    {exp.role} · {exp.company}
                  </span>
                </div>
                <div className="text-[#D5C5AA]/70">
                  {new Date(exp.startDate).toLocaleDateString("pt-BR")} -{" "}
                  {exp.isCurrent || !exp.endDate
                    ? "Atual"
                    : new Date(exp.endDate).toLocaleDateString("pt-BR")}
                </div>
                {exp.description && (
                  <p className="text-[#D5C5AA]/85 pt-1">{exp.description}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 space-y-4">
          <h2 className="font-display text-xl text-[#F7DECA] flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            Formação Acadêmica
          </h2>
          {candidate.educations.map((edu) => (
            <div
              key={edu.id}
              className="border border-[#D5C5AA]/15 bg-[#030A06] p-4 text-xs space-y-1"
            >
              <div className="font-semibold text-[#F7DECA]">
                {edu.course} ({edu.level})
              </div>
              <div className="text-[#D5C5AA]/80">{edu.institution}</div>
              <div className="text-[#D5C5AA]/65">{edu.status}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Competências, Idiomas e Documentos Enviados */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 space-y-4">
          <h2 className="font-display text-xl text-[#F7DECA] flex items-center gap-2">
            <Award className="w-4 h-4" />
            Competências, Evidências & Validação
          </h2>
          <div className="space-y-3">
            {candidate.skills.length === 0 && (
              <p className="text-xs text-[#D5C5AA]/70">
                Nenhuma competência cadastrada.
              </p>
            )}
            {candidate.skills.map((cs) => {
              const badge = EVIDENCE_BADGES[cs.evidenceStatus];
              return (
                <div
                  key={cs.id}
                  className="border border-[#57552E] bg-[#030A06] p-3.5 space-y-2.5 text-xs"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-[#F7DECA]">{cs.skill.name}</strong>
                    <span className="text-[#D5C5AA]/70">
                      {LEVEL_LABELS[cs.level]}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    {cs.validatedByName && (
                      <span className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        Avaliado por: {cs.validatedByName}
                      </span>
                    )}
                  </div>
                  {cs.evidences.map((ev) => (
                    <div key={ev.id} className="text-[#D5C5AA]/85">
                      • {ev.title} ({ev.type.toLowerCase()})
                      {ev.url && (
                        <>
                          {" "}
                          <a
                            href={ev.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline text-[#F7DECA]"
                          >
                            abrir evidência
                          </a>
                        </>
                      )}
                    </div>
                  ))}
                  <form
                    action={setSkillEvidenceStatusAdminAction}
                    className="grid grid-cols-1 sm:grid-cols-[140px_1fr_auto] gap-2 pt-1.5"
                  >
                    <input
                      type="hidden"
                      name="candidateSkillId"
                      value={cs.id}
                    />
                    <select
                      name="status"
                      defaultValue={cs.evidenceStatus}
                      className="bg-white border border-slate-300 px-2 py-1.5 text-[11px] text-slate-900"
                    >
                      <option value="DECLARADA">Declarada</option>
                      <option value="DOCUMENTADA">Documentada</option>
                      <option value="DEMONSTRADA">Demonstrada</option>
                      <option value="VALIDADA">Validada</option>
                    </select>
                    <input
                      type="text"
                      name="validatedByName"
                      defaultValue={cs.validatedByName || ""}
                      placeholder="Avaliador / Empresa (ex: Comissão ANM)"
                      className="bg-white border border-slate-300 px-2.5 py-1.5 text-[11px] text-slate-900"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-[#D5C5AA] text-[#030A06] font-semibold text-[11px] cursor-pointer"
                    >
                      Salvar estado
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
          <div className="pt-3 border-t border-[#D5C5AA]/15 space-y-1 text-xs">
            {candidate.languages.map((l) => (
              <div key={l.id}>
                <strong className="text-[#F7DECA]">{l.language}:</strong>{" "}
                {l.proficiency}
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {/* Portfólio & Conquistas */}
          <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 space-y-4">
            <h2 className="font-display text-xl text-[#F7DECA] flex items-center gap-2">
              <FolderGit2 className="w-4 h-4" />
              Portfólio, Trabalhos & Conquistas ({candidate.achievements.length})
            </h2>
            {candidate.achievements.length === 0 ? (
              <p className="text-xs text-[#D5C5AA]/75">
                Nenhum item de portfólio ou conquista anexado ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {candidate.achievements.map((item) => {
                  const catLabel = ACHIEVEMENT_CATEGORY_LABELS[item.category];
                  return (
                    <div
                      key={item.id}
                      className="border border-[#D5C5AA]/15 bg-[#030A06] p-3.5 text-xs space-y-1.5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-900 text-[10px] font-semibold uppercase tracking-[0.12em]">
                          {catLabel}
                        </span>
                        {item.achievedAt && (
                          <span className="text-[11px] text-slate-500">
                            {new Date(item.achievedAt).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-[#F7DECA]">
                        {item.title}
                      </div>
                      {item.issuerOrContext && (
                        <div className="text-[#D5C5AA]/80">
                          Contexto: {item.issuerOrContext}
                        </div>
                      )}
                      {item.description && (
                        <p className="text-[#D5C5AA]/75">{item.description}</p>
                      )}
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[#14532D] font-semibold underline pt-1"
                        >
                          Abrir evidência / trabalho
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 space-y-4">
            <h2 className="font-display text-xl text-[#F7DECA] flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documentos & Currículos Anexados
            </h2>
            {candidate.resumes.length === 0 ? (
              <p className="text-xs text-[#D5C5AA]/75">
                Nenhum arquivo PDF/DOCX anexado (utiliza Currículo Estruturado do Portal).
              </p>
            ) : (
              candidate.resumes.map((r) => (
                <div
                  key={r.id}
                  className="border border-[#D5C5AA]/15 bg-[#030A06] p-3.5 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-[#F7DECA]">
                      {r.fileName} (v{r.version})
                    </div>
                    <div className="text-[#D5C5AA]/65">
                      {new Date(r.updatedAt).toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <a
                    href={`/talentos/api/resumes/${r.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 border border-[#D5C5AA]/40 text-[#F7DECA]"
                  >
                    Abrir Arquivo
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminCandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto px-4 py-12 text-sm text-[#D5C5AA]/70">
          Carregando perfil completo do candidato...
        </div>
      }
    >
      <CandidateDetailAdminContent paramsPromise={params} />
    </Suspense>
  );
}
