import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";
import { calculateProfileCompleteness } from "@/lib/completeness";
import { applyToJobAction } from "@/app/actions/applications";
import {
  DEFAULT_SELECTION_STAGES,
  evaluateJobTransparency,
} from "@/lib/transparency";
import { EVIDENCE_BADGES } from "@/lib/passport";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  ListChecks,
  Lock,
  MapPin,
  Send,
  ShieldCheck,
  TrendingUp,
  UserCheck,
} from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  RECEBIDA: "Recebida",
  EM_ANALISE: "Em análise",
  PRE_SELECIONADO: "Pré-selecionado",
  EM_PROCESSO_SELETIVO: "Em processo seletivo",
  APROVADO: "Aprovado",
  NAO_SELECIONADO: "Não selecionado",
  CANCELADA_PELO_CANDIDATO: "Cancelada pelo candidato",
};

async function JobDetailContent({
  paramsPromise,
}: {
  paramsPromise: Promise<{ slug: string }>;
}) {
  const { slug } = await paramsPromise;

  const job = await prisma.job.findUnique({
    where: { slug },
    include: {
      applications: {
        select: {
          status: true,
          appliedAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!job || job.status !== "PUBLISHED") {
    notFound();
  }

  const transparency = evaluateJobTransparency(job);
  const stages =
    job.selectionStages && job.selectionStages.length > 0
      ? job.selectionStages
      : DEFAULT_SELECTION_STAGES;

  // Cálculo objetivo de compromisso de resposta da empresa nesta oportunidade
  const totalApps = job.applications.length;
  const progressedApps = job.applications.filter(
    (a) => a.status !== "RECEBIDA"
  ).length;
  const responseRateText =
    totalApps > 0
      ? `${Math.round((progressedApps / totalApps) * 100)}% das candidaturas já atualizadas`
      : `Compromisso de retorno em até ${job.feedbackSlaDays || 7} dias`;

  const sessionUser = await getAuthenticatedUser();

  const profile = sessionUser
    ? await prisma.candidateProfile.findUnique({
        where: { userId: sessionUser.id },
        include: {
          educations: true,
          experiences: true,
          skills: { include: { skill: true, evidences: true } },
          achievements: true,
          languages: true,
          resumes: { orderBy: { updatedAt: "desc" } },
        },
      })
    : null;

  const completeness = profile
    ? calculateProfileCompleteness({
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        city: profile.city,
        state: profile.state,
        linkedinUrl: profile.linkedinUrl,
        professionalTitle: profile.professionalTitle,
        summary: profile.summary,
        interestArea: profile.interestArea,
        careerObjective: profile.careerObjective,
        educationsCount: profile.educations.length,
        experiencesCount: profile.experiences.length,
        skillsCount: profile.skills.length,
        evidencesCount: profile.skills.reduce(
          (acc, s) => acc + s.evidences.length,
          0
        ),
        achievementsCount: profile.achievements.length,
        languagesCount: profile.languages.length,
        preferredModality: profile.preferredModality,
        desiredRolesCount: profile.desiredRoles.length,
        hasResume:
          profile.resumes.some((r) => r.isActive) ||
          profile.educations.length > 0 ||
          profile.skills.length > 0,
      })
    : null;

  await Promise.all([
    prisma.jobView.create({
      data: {
        jobId: job.id,
        viewerId: sessionUser?.id || null,
      },
    }),
    prisma.job.update({
      where: { id: job.id },
      data: { viewsCount: { increment: 1 } },
    }),
  ]);

  const existingApplication = profile
    ? await prisma.application.findUnique({
        where: {
          candidateId_jobId: {
            candidateId: profile.id,
            jobId: job.id,
          },
        },
      })
    : null;

  const hasActiveApplication =
    existingApplication &&
    existingApplication.status !== "CANCELADA_PELO_CANDIDATO";

  const customQuestions: string[] = Array.isArray(job.customQuestions)
    ? (job.customQuestions as string[])
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <Link
        href="/vagas"
        className="inline-flex items-center gap-2 text-xs font-semibold text-[#D5C5AA] hover:text-[#F7DECA] transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Voltar ao Mural de Oportunidades
      </Link>

      {/* Cabeçalho da Oportunidade Transparente */}
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          {job.companyVerified && (
            <span className="px-3 py-1 rounded-full border border-emerald-400 bg-emerald-50 text-emerald-900 font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Empresa Verificada pelo Talent Hub
            </span>
          )}
          <span
            className={`px-3 py-1 rounded-full border font-semibold ${transparency.badgeClass}`}
          >
            Índice de Transparência: {transparency.score}/{transparency.maxScore}{" "}
            · {transparency.badgeLabel}
          </span>
          <span className="px-3 py-1 border border-[#57552E] bg-[#030A06] text-[#F7DECA]">
            {job.professionalArea}
          </span>
          <span className="px-3 py-1 border border-[#D5C5AA]/25 bg-[#030A06] text-[#D5C5AA]">
            {job.modality}
          </span>
          <span className="px-3 py-1 border border-[#D5C5AA]/25 bg-[#030A06] text-[#D5C5AA]">
            {job.contractType}
          </span>
          <span className="px-3 py-1 border border-[#D5C5AA]/25 bg-[#030A06] text-[#D5C5AA]">
            Nível: {job.experienceLevel}
          </span>
          {job.salaryRange && (
            <span className="px-3 py-1 border border-emerald-300 bg-[#ECFDF5] text-[#14532D] font-bold">
              Remuneração: {job.salaryRange}
            </span>
          )}
        </div>

        <div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-[#F7DECA]">
            {job.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-5 text-xs text-[#D5C5AA]/85">
            <span className="flex items-center gap-1.5 font-semibold text-[#F7DECA]">
              <Building2 className="w-4 h-4 text-[#D5C5AA]" />
              {job.companyName}
              {job.companyIdentifier && (
                <span className="text-slate-500 font-normal">
                  ({job.companyIdentifier})
                </span>
              )}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#D5C5AA]" />
              {job.location}
            </span>
            {job.workSchedule && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#D5C5AA]" />
                Jornada: {job.workSchedule}
              </span>
            )}
            {job.publishedAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#D5C5AA]" />
                Publicada em{" "}
                {new Date(job.publishedAt).toLocaleDateString("pt-BR")}
              </span>
            )}
            {job.applicationDeadline && (
              <span className="flex items-center gap-1.5 text-[#F7DECA] font-semibold">
                <Clock className="w-4 h-4" />
                Prazo de candidatura:{" "}
                {new Date(job.applicationDeadline).toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Painel de Oportunidade Transparente: Etapas, Prazo de Retorno e Critérios Verificáveis */}
          <section className="border border-emerald-200 bg-[#ECFDF5]/60 p-6 sm:p-8 rounded-2xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#14532D]">
                  <ShieldCheck className="w-4 h-4" />
                  Pilar de Confiança · Oportunidade Transparente
                </span>
                <h2 className="font-display text-2xl text-slate-900 mt-1">
                  O que acontece depois da sua candidatura
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full bg-white border border-emerald-300 text-xs font-semibold text-[#14532D]">
                {responseRateText}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Compromisso de Retorno
                </span>
                <p className="text-sm font-semibold text-slate-900">
                  {job.feedbackEstimate ||
                    `Retorno previsto em até ${job.feedbackSlaDays || 7} dias úteis`}
                </p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                  Jornada & Disponibilidade
                </span>
                <p className="text-sm font-semibold text-slate-900">
                  {job.workSchedule || `${job.modality} · ${job.contractType}`}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-slate-700 flex items-center gap-1.5">
                <ListChecks className="w-4 h-4 text-[#14532D]" />
                Etapas do Processo Seletivo ({stages.length} etapas)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {stages.map((stage, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-slate-200 px-3.5 py-2.5 rounded-lg text-xs font-medium text-slate-800 flex items-center gap-2.5"
                  >
                    <span className="w-5 h-5 rounded-full bg-[#ECFDF5] border border-emerald-300 text-[#14532D] font-bold text-[11px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span>{stage.replace(/^\d+\.\s*/, "")}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-emerald-200/70">
              <span className="text-[11px] font-semibold text-slate-700 block mb-2">
                Critérios verificáveis desta oportunidade ({transparency.score}/
                {transparency.maxScore}):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {transparency.criteria.map((c) => (
                  <span
                    key={c.key}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                      c.met
                        ? "bg-white border-emerald-300 text-emerald-900"
                        : "bg-slate-100 border-slate-200 text-slate-500"
                    }`}
                  >
                    {c.met ? "✓ " : "○ "}
                    {c.label}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 sm:p-8 space-y-3">
            <h2 className="font-display text-2xl text-[#F7DECA]">
              Descrição da Oportunidade
            </h2>
            <p className="text-sm text-[#D5C5AA]/90 leading-relaxed whitespace-pre-line">
              {job.description}
            </p>
          </section>

          <section className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 sm:p-8 space-y-3">
            <h2 className="font-display text-2xl text-[#F7DECA]">
              Atividades Reais e Responsabilidades
            </h2>
            <p className="text-sm text-[#D5C5AA]/90 leading-relaxed whitespace-pre-line">
              {job.responsibilities}
            </p>
          </section>

          <section className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 sm:p-8 space-y-4">
            <h2 className="font-display text-2xl text-[#F7DECA]">
              Requisitos Obrigatórios & Competências
            </h2>
            <p className="text-sm text-[#D5C5AA]/90 leading-relaxed whitespace-pre-line">
              {job.requirements}
            </p>

            {job.desiredSkills.length > 0 && (
              <div className="pt-2 space-y-2.5">
                <span className="text-xs font-semibold text-[#F7DECA] block">
                  Competências valorizadas nesta oportunidade:
                </span>
                <div className="flex flex-wrap gap-2">
                  {job.desiredSkills.map((skillName) => {
                    const matched = profile?.skills.find(
                      (cs) =>
                        cs.skill.name.toLowerCase() === skillName.toLowerCase()
                    );
                    const badge = matched
                      ? EVIDENCE_BADGES[matched.evidenceStatus]
                      : null;

                    return (
                      <span
                        key={skillName}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 ${
                          matched
                            ? "border-emerald-300 bg-[#ECFDF5] text-slate-900"
                            : "border-[#57552E] bg-[#030A06] text-[#F7DECA]"
                        }`}
                      >
                        <span>{skillName}</span>
                        {badge && (
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${badge.className}`}
                          >
                            Seu Passaporte: {badge.label}
                          </span>
                        )}
                      </span>
                    );
                  })}
                </div>
                {profile && (
                  <p className="text-[11px] text-slate-600">
                    Dica: você pode anexar planilhas, relatórios ou certificados
                    no seu{" "}
                    <Link
                      href="/perfil#passaporte"
                      className="text-[#14532D] font-semibold underline"
                    >
                      Passaporte de Talentos
                    </Link>{" "}
                    para comprovar essas competências.
                  </p>
                )}
              </div>
            )}
          </section>

          {job.differentials && (
            <section className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 sm:p-8 space-y-3">
              <h2 className="font-display text-2xl text-[#F7DECA]">
                Diferenciais Desejáveis
              </h2>
              <p className="text-sm text-[#D5C5AA]/90 leading-relaxed whitespace-pre-line">
                {job.differentials}
              </p>
            </section>
          )}

          {(job.benefits || job.growthPossibility) && (
            <section className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 sm:p-8 space-y-4">
              <h2 className="font-display text-2xl text-[#F7DECA] flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#14532D]" />
                Benefícios & Possibilidade de Desenvolvimento
              </h2>
              {job.benefits && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-slate-700 mb-1">
                    Benefícios e Contrapartidas
                  </h3>
                  <p className="text-sm text-[#D5C5AA]/90 leading-relaxed whitespace-pre-line">
                    {job.benefits}
                  </p>
                </div>
              )}
              {job.growthPossibility && (
                <div className="pt-2 border-t border-[#D5C5AA]/15">
                  <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-[#14532D] mb-1">
                    Plano de Desenvolvimento e Carreira
                  </h3>
                  <p className="text-sm text-[#D5C5AA]/90 leading-relaxed whitespace-pre-line">
                    {job.growthPossibility}
                  </p>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Coluna de Candidatura */}
        <div className="space-y-6">
          <div className="border border-[#D5C5AA]/30 bg-[#0A150D] p-6 space-y-5 sticky top-24">
            <div className="flex items-center justify-between border-b border-[#D5C5AA]/15 pb-3">
              <span className="text-xs font-bold text-[#F7DECA]">
                Candidatura com Passaporte de Talentos
              </span>
              <Send className="w-4 h-4 text-emerald-600" />
            </div>

            {transparency.isExpired ? (
              <div className="border border-amber-300 bg-amber-50 p-4 rounded-xl space-y-2 text-xs text-amber-950">
                <p className="font-bold">Prazo de inscrição encerrado</p>
                <p>
                  Esta oportunidade encerrou o recebimento de novas candidaturas
                  em{" "}
                  {job.applicationDeadline
                    ? new Date(job.applicationDeadline).toLocaleDateString(
                        "pt-BR"
                      )
                    : ""}
                  .
                </p>
                <Link
                  href="/vagas"
                  className="inline-block pt-1 font-semibold underline text-[#14532D]"
                >
                  Ver outras oportunidades ativas →
                </Link>
              </div>
            ) : !sessionUser || !profile ? (
              <div className="space-y-4">
                <p className="text-xs text-[#D5C5AA]/85 leading-relaxed">
                  Acesse sua conta ou crie seu Passaporte de Talentos em
                  segundos para se candidatar a esta oportunidade.
                </p>
                <Link
                  href="/entrar"
                  className="w-full py-3.5 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  Entrar para Candidatar-se
                </Link>
                <Link
                  href="/cadastro"
                  className="w-full py-3 border border-[#D5C5AA]/35 text-xs font-semibold text-[#F7DECA] flex items-center justify-center"
                >
                  Criar meu Passaporte gratuito
                </Link>
              </div>
            ) : hasActiveApplication ? (
              <div className="space-y-4">
                <div className="border border-emerald-500/40 bg-emerald-950/30 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Candidatura Ativa Registrada</span>
                  </div>
                  <p className="text-xs text-[#D5C5AA]/90">
                    Você já se candidatou a esta oportunidade em{" "}
                    {new Date(existingApplication.appliedAt).toLocaleDateString(
                      "pt-BR"
                    )}
                    .
                  </p>
                  <p className="text-xs text-[#F7DECA]">
                    Status atual:{" "}
                    <strong>
                      {STATUS_LABELS[existingApplication.status] ||
                        existingApplication.status}
                    </strong>
                  </p>
                  <p className="text-[11px] text-slate-600 pt-1">
                    Previsão de retorno da empresa:{" "}
                    {job.feedbackEstimate ||
                      `em até ${job.feedbackSlaDays || 7} dias`}
                  </p>
                </div>

                <Link
                  href="/candidaturas"
                  className="w-full py-3 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs flex items-center justify-center"
                >
                  Acompanhar Minhas Candidaturas
                </Link>
              </div>
            ) : (
              <form action={applyToJobAction} className="space-y-4">
                <input type="hidden" name="jobId" value={job.id} />
                <input type="hidden" name="jobSlug" value={job.slug} />

                <div className="border border-[#D5C5AA]/20 bg-[#030A06] p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[#F7DECA] font-semibold">
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5" />
                      {profile.fullName}
                    </span>
                    <span>{completeness?.percent || 0}% completo</span>
                  </div>
                  <p className="text-[#D5C5AA]/75">
                    {profile.professionalTitle || profile.email}
                  </p>
                  <p className="text-[11px] text-emerald-800">
                    {profile.skills.length} competência(s) no Passaporte ·{" "}
                    {profile.achievements.length} item(ns) no portfólio
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#D5C5AA]/80 mb-1.5">
                    Currículo & Passaporte Utilizados na Candidatura
                  </label>
                  <select
                    name="resumeId"
                    defaultValue={
                      profile.resumes.find((r) => r.isActive)?.id || ""
                    }
                    className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2.5 text-xs text-[#F7DECA]"
                  >
                    <option value="">
                      Passaporte de Talentos + Currículo Estruturado (
                      {completeness?.percent || 0}%)
                    </option>
                    {profile.resumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        Arquivo: {r.fileName} (v{r.version})
                      </option>
                    ))}
                  </select>
                </div>

                {customQuestions.map((question, idx) => (
                  <div key={idx}>
                    <label className="block text-xs font-semibold text-[#D5C5AA]/85 mb-1">
                      {question}
                    </label>
                    <textarea
                      name={`question_${question}`}
                      required
                      rows={2}
                      className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
                    />
                  </div>
                ))}

                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  Confirmar Candidatura
                </button>

                <div className="flex items-center justify-between pt-2 text-[11px] text-[#D5C5AA]/70">
                  <Link
                    href={`/passaporte/${profile.id}`}
                    className="hover:text-[#F7DECA] underline"
                  >
                    Ver meu Passaporte
                  </Link>
                  <Link
                    href="/curriculo"
                    className="hover:text-[#F7DECA] underline flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" />
                    Gerenciar currículo
                  </Link>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-sm text-[#D5C5AA]/70">
          Carregando detalhes da oportunidade transparente...
        </div>
      }
    >
      <JobDetailContent paramsPromise={params} />
    </Suspense>
  );
}
