import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";
import { calculateProfileCompleteness } from "@/lib/completeness";
import { applyToJobAction } from "@/app/actions/applications";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  MapPin,
  Send,
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
  });

  if (!job || job.status !== "PUBLISHED") {
    notFound();
  }

  const sessionUser = await getAuthenticatedUser();

  const profile = sessionUser
    ? await prisma.candidateProfile.findUnique({
        where: { userId: sessionUser.id },
        include: {
          educations: true,
          experiences: true,
          skills: { include: { skill: true } },
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
        languagesCount: profile.languages.length,
        preferredModality: profile.preferredModality,
        desiredRolesCount: profile.desiredRoles.length,
        hasResume:
          profile.resumes.some((r) => r.isActive) ||
          (profile.educations.length > 0 && profile.experiences.length > 0),
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

      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
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
            <span className="px-3 py-1 border border-[#57552E] bg-[#030A06] text-[#F7DECA]">
              Faixa Salarial: {job.salaryRange}
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
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#D5C5AA]" />
              {job.location}
            </span>
            {job.publishedAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-[#D5C5AA]" />
                Publicada em{" "}
                {new Date(job.publishedAt).toLocaleDateString("pt-BR")}
              </span>
            )}
            {job.applicationDeadline && (
              <span className="flex items-center gap-1.5 text-[#F7DECA]">
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
              Responsabilidades e Atribuições
            </h2>
            <p className="text-sm text-[#D5C5AA]/90 leading-relaxed whitespace-pre-line">
              {job.responsibilities}
            </p>
          </section>

          <section className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 sm:p-8 space-y-3">
            <h2 className="font-display text-2xl text-[#F7DECA]">
              Requisitos e Qualificações
            </h2>
            <p className="text-sm text-[#D5C5AA]/90 leading-relaxed whitespace-pre-line">
              {job.requirements}
            </p>

            {job.desiredSkills.length > 0 && (
              <div className="pt-4">
                <span className="text-xs font-semibold text-[#F7DECA] block mb-2">
                  Competências Desejadas:
                </span>
                <div className="flex flex-wrap gap-2">
                  {job.desiredSkills.map((skill) => (
                    <span
                      key={skill}
                      className="px-3 py-1 border border-[#57552E] bg-[#030A06] text-xs text-[#F7DECA]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {job.differentials && (
            <section className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 sm:p-8 space-y-3">
              <h2 className="font-display text-2xl text-[#F7DECA]">
                Diferenciais
              </h2>
              <p className="text-sm text-[#D5C5AA]/90 leading-relaxed whitespace-pre-line">
                {job.differentials}
              </p>
            </section>
          )}

          {job.benefits && (
            <section className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 sm:p-8 space-y-3">
              <h2 className="font-display text-2xl text-[#F7DECA]">
                Benefícios e Contrapartidas
              </h2>
              <p className="text-sm text-[#D5C5AA]/90 leading-relaxed whitespace-pre-line">
                {job.benefits}
              </p>
            </section>
          )}
        </div>

        {/* Coluna de Candidatura */}
        <div className="space-y-6">
          <div className="border border-[#D5C5AA]/30 bg-[#0A150D] p-6 space-y-5 sticky top-24">
            <div className="flex items-center justify-between border-b border-[#D5C5AA]/15 pb-3">
              <span className="text-xs font-bold text-[#F7DECA]">
                Candidatura Rápida
              </span>
              <Send className="w-4 h-4 text-emerald-600" />
            </div>

            {!sessionUser || !profile ? (
              <div className="space-y-4">
                <p className="text-xs text-[#D5C5AA]/85 leading-relaxed">
                  Acesse sua conta ou crie seu perfil em segundos para se candidatar a esta oportunidade.
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
                  Criar meu perfil gratuito
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
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#D5C5AA]/80 mb-1.5">
                    Currículo Utilizado na Candidatura
                  </label>
                  <select
                    name="resumeId"
                    defaultValue={
                      profile.resumes.find((r) => r.isActive)?.id || ""
                    }
                    className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2.5 text-xs text-[#F7DECA]"
                  >
                    <option value="">
                      Currículo Estruturado no Portal ({completeness?.percent || 0}%)
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
                  <Link href="/perfil" className="hover:text-[#F7DECA] underline">
                    Revisar meu perfil
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
          Carregando detalhes da oportunidade...
        </div>
      }
    >
      <JobDetailContent paramsPromise={params} />
    </Suspense>
  );
}
