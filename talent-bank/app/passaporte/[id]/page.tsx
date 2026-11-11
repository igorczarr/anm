import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";
import { togglePublicPassportAction } from "@/app/actions/candidate";
import { CopyPassportLinkButton } from "@/components/copy-passport-link-button";
import {
  ACHIEVEMENT_CATEGORY_LABELS,
  EVIDENCE_BADGES,
  EVIDENCE_TYPE_LABELS,
  EXPERIENCE_TYPE_LABELS,
  LEVEL_LABELS,
} from "@/lib/passport";
import {
  Award,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  FileDown,
  FolderKanban,
  GraduationCap,
  Globe,
  Lock,
  MapPin,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PassportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ modo?: string }>;
}) {
  const [{ id }, query, viewer] = await Promise.all([
    params,
    searchParams,
    getAuthenticatedUser(),
  ]);

  const viewMode = query.modo === "completo" ? "completo" : "demonstrativo";

  const candidate = await prisma.candidateProfile.findUnique({
    where: { id },
    include: {
      skills: {
        include: {
          skill: true,
          evidences: { orderBy: { createdAt: "desc" } },
        },
      },
      achievements: { orderBy: { createdAt: "desc" } },
      educations: { orderBy: { startDate: "desc" } },
      experiences: { orderBy: { startDate: "desc" } },
      languages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!candidate || candidate.archivedAt) notFound();

  const isOwner = Boolean(viewer && viewer.id === candidate.userId);
  const isStaff = Boolean(
    viewer &&
      (viewer.role === "ADMIN" ||
        viewer.role === "RECRUITER" ||
        viewer.role === "JOB_MANAGER" ||
        viewer.role === "ANALYST")
  );

  // Respeito rigoroso à LGPD: público externo só visualiza se o talento autorizou
  if (!candidate.isPublicInPool && !isOwner && !isStaff) {
    notFound();
  }

  const sortedSkills = [...candidate.skills].sort(
    (a, b) =>
      EVIDENCE_BADGES[b.evidenceStatus].rank -
      EVIDENCE_BADGES[a.evidenceStatus].rank
  );

  const allSkillEvidences = sortedSkills.flatMap((cs) =>
    cs.evidences.map((ev) => ({
      ...ev,
      skillName: cs.skill.name,
      skillStatus: cs.evidenceStatus,
    }))
  );

  const countByStatus = {
    VALIDADA: sortedSkills.filter((s) => s.evidenceStatus === "VALIDADA").length,
    DEMONSTRADA: sortedSkills.filter((s) => s.evidenceStatus === "DEMONSTRADA")
      .length,
    DOCUMENTADA: sortedSkills.filter((s) => s.evidenceStatus === "DOCUMENTADA")
      .length,
    DECLARADA: sortedSkills.filter((s) => s.evidenceStatus === "DECLARADA")
      .length,
  };

  const totalEvidencesCount =
    allSkillEvidences.length + candidate.achievements.length;

  const latestEducation = candidate.educations[0];
  const subtitleLine =
    candidate.professionalTitle ||
    (latestEducation
      ? `Talento em ${latestEducation.course}`
      : candidate.interestArea
      ? `Profissional em ${candidate.interestArea}`
      : "Talento · A Nova Moeda");

  const locationLine =
    [candidate.city, candidate.state].filter(Boolean).join(" - ") ||
    "Feira de Santana - BA";

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Barra do Proprietário (visível apenas para o próprio candidato) */}
      {isOwner && (
        <div className="border border-slate-200 bg-white p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-900">
              {candidate.isPublicInPool ? (
                <>
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span>
                    Seu Passaporte de Talentos está ativo para empresas e recrutadores
                  </span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span>
                    Passaporte em modo privado (apenas você e a curadoria visualizam)
                  </span>
                </>
              )}
            </div>
            <p className="text-xs text-slate-600">
              Adicione novas competências, projetos e certificados para elevar suas habilidades de{" "}
              <strong>Declarada</strong> para <strong>Documentada</strong>,{" "}
              <strong>Demonstrada</strong> ou <strong>Validada</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <CopyPassportLinkButton candidateId={candidate.id} />

            <form action={togglePublicPassportAction}>
              <input
                type="hidden"
                name="enable"
                value={candidate.isPublicInPool ? "0" : "1"}
              />
              <button
                type="submit"
                className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-50 transition cursor-pointer"
              >
                {candidate.isPublicInPool
                  ? "Tornar Privado"
                  : "Ativar Link Público (LGPD)"}
              </button>
            </form>

            <Link
              href="/perfil#passaporte"
              className="px-4 py-2.5 rounded-xl bg-[#14532D] text-white text-xs font-semibold hover:bg-[#166534] transition"
            >
              Editar Passaporte
            </Link>
          </div>
        </div>
      )}

      {/* Cabeçalho Oficial do Passaporte de Talentos */}
      <div className="border border-slate-200 bg-white p-6 sm:p-8 rounded-2xl space-y-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="w-20 h-20 rounded-2xl border border-slate-200 bg-[#ECFDF5] overflow-hidden flex items-center justify-center shrink-0">
              {candidate.photoUrl ? (
                <img
                  src={candidate.photoUrl}
                  alt={candidate.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-[#14532D]">
                  {candidate.fullName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ECFDF5] border border-[#14532D]/20 text-[11px] font-semibold text-[#14532D]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Passaporte de Talentos · Talent Hub</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                {candidate.fullName}
              </h1>

              <p className="text-sm font-medium text-slate-700">{subtitleLine}</p>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 pt-0.5">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#14532D]" />
                  {locationLine}
                </span>
                {candidate.availability && (
                  <span>· {candidate.availability}</span>
                )}
                {candidate.preferredModality && (
                  <span>· Modalidade: {candidate.preferredModality}</span>
                )}
                {candidate.interestArea && (
                  <span>· Área: {candidate.interestArea}</span>
                )}
              </div>
            </div>
          </div>

          {/* Seletor: Perfil Demonstrativo vs Perfil Completo */}
          <div className="flex flex-col sm:items-end gap-3 shrink-0">
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1 text-xs">
              <Link
                href={`/passaporte/${candidate.id}?modo=demonstrativo`}
                className={`px-3.5 py-2 rounded-lg font-semibold transition ${
                  viewMode === "demonstrativo"
                    ? "bg-[#14532D] text-white shadow-xs"
                    : "text-slate-700 hover:text-slate-900"
                }`}
              >
                Perfil demonstrativo
              </Link>
              <Link
                href={`/passaporte/${candidate.id}?modo=completo`}
                className={`px-3.5 py-2 rounded-lg font-semibold transition ${
                  viewMode === "completo"
                    ? "bg-[#14532D] text-white shadow-xs"
                    : "text-slate-700 hover:text-slate-900"
                }`}
              >
                Perfil completo
              </Link>
            </div>

            {(isOwner || isStaff) && (
              <a
                href={`/talentos/api/resumes/pdf?candidateId=${candidate.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#14532D] hover:underline"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Exportar Passaporte em PDF</span>
              </a>
            )}
          </div>
        </div>

        {candidate.summary && (
          <p className="text-sm text-slate-700 leading-relaxed border-t border-slate-100 pt-4 whitespace-pre-line">
            {candidate.summary}
          </p>
        )}

        {/* Painel de Maturidade das Evidências */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
            <span className="text-[11px] font-semibold text-emerald-800 block">
              Validadas
            </span>
            <span className="text-2xl font-bold text-emerald-900">
              {countByStatus.VALIDADA}
            </span>
            <span className="text-[11px] text-emerald-700 block">
              Por avaliador/empresa
            </span>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
            <span className="text-[11px] font-semibold text-amber-800 block">
              Demonstradas
            </span>
            <span className="text-2xl font-bold text-amber-900">
              {countByStatus.DEMONSTRADA}
            </span>
            <span className="text-[11px] text-amber-700 block">
              Em desafio prático
            </span>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5">
            <span className="text-[11px] font-semibold text-blue-800 block">
              Documentadas
            </span>
            <span className="text-2xl font-bold text-blue-900">
              {countByStatus.DOCUMENTADA}
            </span>
            <span className="text-[11px] text-blue-700 block">
              Com certificado/arquivo
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <span className="text-[11px] font-semibold text-slate-700 block">
              Declaradas
            </span>
            <span className="text-2xl font-bold text-slate-900">
              {countByStatus.DECLARADA}
            </span>
            <span className="text-[11px] text-slate-600 block">
              Autodeclaradas
            </span>
          </div>
        </div>
      </div>

      {/* Bloco Principal: Competências (4 estados) + Evidências Disponíveis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Coluna 1: Matriz de Competências */}
        <div className="lg:col-span-7 border border-slate-200 bg-white p-6 rounded-2xl space-y-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#14532D]" />
              <h2 className="text-lg font-bold text-slate-900">
                Competências e Origem da Evidência
              </h2>
            </div>
            <span className="text-xs font-medium text-slate-500">
              {sortedSkills.length} registrada(s)
            </span>
          </div>

          {sortedSkills.length === 0 ? (
            <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center space-y-2">
              <p className="text-xs text-slate-600">
                Nenhuma competência registrada neste Passaporte ainda.
              </p>
              {isOwner && (
                <Link
                  href="/perfil#passaporte"
                  className="inline-block px-4 py-2 rounded-lg bg-[#14532D] text-white text-xs font-semibold"
                >
                  + Adicionar minhas competências
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedSkills.map((cs) => {
                const badge = EVIDENCE_BADGES[cs.evidenceStatus];
                return (
                  <div
                    key={cs.id}
                    className="border border-slate-200 rounded-xl p-4 space-y-2.5 hover:border-slate-300 transition"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-bold text-sm text-slate-900">
                          {cs.skill.name}
                        </span>
                        <span className="ml-2 text-xs text-slate-600 font-medium">
                          · {LEVEL_LABELS[cs.level]}
                        </span>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${badge.className}`}
                        title={badge.hint}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`}
                        />
                        {badge.label}
                      </span>
                    </div>

                    {cs.validatedByName && (
                      <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>
                          Reconhecida por: <strong>{cs.validatedByName}</strong>
                        </span>
                      </p>
                    )}

                    {cs.evidences.length > 0 && (
                      <div className="pt-1 space-y-1.5">
                        {cs.evidences.map((ev) => (
                          <div
                            key={ev.id}
                            className="flex items-center justify-between gap-2 text-xs bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-lg"
                          >
                            <div className="text-slate-800">
                              <span className="font-semibold">{ev.title}</span>{" "}
                              <span className="text-slate-500 text-[11px]">
                                ({EVIDENCE_TYPE_LABELS[ev.type]})
                              </span>
                              {ev.description && (
                                <p className="text-[11px] text-slate-600 mt-0.5">
                                  {ev.description}
                                </p>
                              )}
                            </div>
                            {ev.url && (
                              <a
                                href={ev.url}
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-[#14532D] hover:underline shrink-0"
                              >
                                <span>Abrir</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-500 leading-relaxed">
            <strong>Critérios de validação do Talent Hub:</strong>{" "}
            <strong>Declarada</strong> (informada pelo candidato) ·{" "}
            <strong>Documentada</strong> (acompanhada de certificado, planilha ou
            projeto) · <strong>Demonstrada</strong> (comprovada em atividade
            prática) · <strong>Validada</strong> (reconhecida por instituição,
            empresa ou avaliador identificado).
          </div>
        </div>

        {/* Coluna 2: Evidências Disponíveis, Portfólio & Conquistas */}
        <div className="lg:col-span-5 border border-slate-200 bg-white p-6 rounded-2xl space-y-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-[#14532D]" />
              <h2 className="text-lg font-bold text-slate-900">
                Evidências Disponíveis & Portfólio
              </h2>
            </div>
            <span className="text-xs font-medium text-slate-500">
              {totalEvidencesCount} item(ns)
            </span>
          </div>

          {totalEvidencesCount === 0 ? (
            <div className="border border-dashed border-slate-200 rounded-xl p-6 text-center space-y-2">
              <p className="text-xs text-slate-600">
                Nenhuma entrega prática, planilha, relatório ou certificado
                anexado ainda.
              </p>
              {isOwner && (
                <Link
                  href="/perfil#portfolio"
                  className="inline-block px-4 py-2 rounded-lg bg-[#14532D] text-white text-xs font-semibold"
                >
                  + Adicionar evidência ou portfólio
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {candidate.achievements.map((ach) => (
                <div
                  key={ach.id}
                  className="border border-slate-200 bg-slate-50/70 p-3.5 rounded-xl space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-[#14532D] block">
                        {ACHIEVEMENT_CATEGORY_LABELS[ach.category]}
                      </span>
                      <h3 className="text-xs font-bold text-slate-900 mt-0.5">
                        {ach.title}
                      </h3>
                      {ach.issuerOrContext && (
                        <p className="text-[11px] text-slate-600">
                          {ach.issuerOrContext}
                        </p>
                      )}
                    </div>
                    {ach.url && (
                      <a
                        href={ach.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-[11px] font-semibold text-[#14532D] hover:bg-[#ECFDF5] shrink-0"
                      >
                        <span>Ver</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  {ach.description && (
                    <p className="text-xs text-slate-700">{ach.description}</p>
                  )}
                </div>
              ))}

              {allSkillEvidences.map((ev) => (
                <div
                  key={ev.id}
                  className="border border-slate-200 p-3.5 rounded-xl flex items-start justify-between gap-3"
                >
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 block">
                      {EVIDENCE_TYPE_LABELS[ev.type]} · {ev.skillName}
                    </span>
                    <h3 className="text-xs font-bold text-slate-900 mt-0.5">
                      {ev.title}
                    </h3>
                    {ev.description && (
                      <p className="text-xs text-slate-600 mt-0.5">
                        {ev.description}
                      </p>
                    )}
                  </div>
                  {ev.url && (
                    <a
                      href={ev.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-[11px] font-semibold text-[#14532D] hover:bg-[#ECFDF5] shrink-0"
                    >
                      <span>Ver</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {candidate.portfolioUrl && (
            <div className="pt-2 border-t border-slate-100">
              <a
                href={candidate.portfolioUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-xs font-semibold text-[#14532D] inline-flex items-center gap-1.5 hover:underline"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Acessar Portfólio / Repositório Externo</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Visão Completa (ou Resumo da Trajetória): Formação, Experiências/Projetos e Preferências */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Experiências, Estágios, Projetos Acadêmicos e Voluntariado */}
        <div className="border border-slate-200 bg-white p-6 rounded-2xl space-y-4 shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Briefcase className="w-5 h-5 text-[#14532D]" />
            <h2 className="text-lg font-bold text-slate-900">
              Experiências, Projetos e Vivências Práticas
            </h2>
          </div>

          {candidate.experiences.length === 0 ? (
            <p className="text-xs text-slate-600">
              Talento em início de carreira — confira as competências e
              evidências práticas acima.
            </p>
          ) : (
            <div className="space-y-3">
              {(viewMode === "completo"
                ? candidate.experiences
                : candidate.experiences.slice(0, 3)
              ).map((exp) => (
                <div
                  key={exp.id}
                  className="border border-slate-200 rounded-xl p-3.5 space-y-1"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-700">
                      {EXPERIENCE_TYPE_LABELS[exp.experienceType]}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {new Date(exp.startDate).toLocaleDateString("pt-BR", {
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      —{" "}
                      {exp.isCurrent || !exp.endDate
                        ? "Atual"
                        : new Date(exp.endDate).toLocaleDateString("pt-BR", {
                            month: "short",
                            year: "numeric",
                          })}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 pt-0.5">
                    {exp.role} · {exp.company}
                  </h3>
                  {exp.description && (
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {exp.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Formação Acadêmica, Idiomas e Preferências */}
        <div className="border border-slate-200 bg-white p-6 rounded-2xl space-y-5 shadow-xs">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <GraduationCap className="w-5 h-5 text-[#14532D]" />
              <h2 className="text-lg font-bold text-slate-900">
                Formação & Qualificações
              </h2>
            </div>

            {candidate.educations.length === 0 ? (
              <p className="text-xs text-slate-600">
                Formação acadêmica ainda não cadastrada.
              </p>
            ) : (
              <div className="space-y-2.5">
                {candidate.educations.map((edu) => (
                  <div
                    key={edu.id}
                    className="border border-slate-200 rounded-xl p-3.5"
                  >
                    <h3 className="text-sm font-bold text-slate-900">
                      {edu.course}
                    </h3>
                    <p className="text-xs text-slate-700">{edu.institution}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {edu.level} · {edu.status}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {viewMode === "completo" && (
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#14532D]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Preferências e Objetivos Profissionais
                </h3>
              </div>

              {candidate.careerObjective && (
                <p className="text-xs text-slate-700">
                  <strong>Objetivo:</strong> {candidate.careerObjective}
                </p>
              )}

              {candidate.desiredRoles.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {candidate.desiredRoles.map((role) => (
                    <span
                      key={role}
                      className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-medium"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              )}

              {candidate.languages.length > 0 && (
                <div className="pt-2 text-xs text-slate-700">
                  <strong>Idiomas:</strong>{" "}
                  {candidate.languages
                    .map((l) => `${l.language} (${l.proficiency})`)
                    .join(" · ")}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
