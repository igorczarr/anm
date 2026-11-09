import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  FileText,
  MapPin,
  Users,
  ShieldCheck,
  Zap,
} from "lucide-react";

async function FeaturedOpportunities() {
  const jobs = await prisma.job.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: 3,
  });

  const [totalCandidates, totalJobs, totalApplications] = await Promise.all([
    prisma.candidateProfile.count(),
    prisma.job.count({ where: { status: "PUBLISHED" } }),
    prisma.application.count(),
  ]);

  return (
    <div className="space-y-10">
      {/* KPIs estilo Monday / Linear */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D] p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#D5C5AA]/70">
              Vagas Abertas
            </span>
            <p className="text-3xl font-bold text-[#F7DECA] mt-1">
              {totalJobs}
            </p>
            <span className="text-xs text-[#D5C5AA]/70 mt-1 block">
              Prontas para candidatura em 1 clique
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <Briefcase className="w-6 h-6" />
          </div>
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D] p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#D5C5AA]/70">
              Talentos Conectados
            </span>
            <p className="text-3xl font-bold text-[#F7DECA] mt-1">
              {totalCandidates}
            </p>
            <span className="text-xs text-[#D5C5AA]/70 mt-1 block">
              Perfis estruturados na comunidade
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D] p-6 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-[#D5C5AA]/70">
              Conexões em Andamento
            </span>
            <p className="text-3xl font-bold text-[#F7DECA] mt-1">
              {totalApplications}
            </p>
            <span className="text-xs text-[#D5C5AA]/70 mt-1 block">
              Processos ativos no funil Kanban
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Zap className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Cards de vagas estilo LinkedIn / Wellfound */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {jobs.map((job) => (
          <Link
            key={job.id}
            href={`/vagas/${job.slug}`}
            className="flex flex-col justify-between border border-[#D5C5AA]/20 bg-[#0A150D] p-6 rounded-2xl hover:shadow-lg transition group"
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600">
                  {job.modality}
                </span>
                {job.salaryRange && (
                  <span className="text-xs font-medium text-[#D5C5AA]/75">
                    {job.salaryRange}
                  </span>
                )}
              </div>

              <h3 className="mt-4 font-bold text-lg text-[#F7DECA] group-hover:underline leading-snug">
                {job.title}
              </h3>

              <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-[#D5C5AA]/80">
                <Building2 className="w-3.5 h-3.5" />
                <span>{job.companyName}</span>
              </div>

              <p className="mt-3 text-xs text-[#D5C5AA]/75 line-clamp-3 leading-relaxed">
                {job.description}
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {job.desiredSkills.slice(0, 4).map((skill) => (
                  <span
                    key={skill}
                    className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-[#030A06] border border-[#D5C5AA]/20 text-[#D5C5AA]"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#D5C5AA]/15 flex items-center justify-between text-xs font-semibold text-[#F7DECA]">
              <span className="flex items-center gap-1 text-[#D5C5AA]/75 font-normal">
                <MapPin className="w-3.5 h-3.5" />
                {job.location}
              </span>
              <span className="inline-flex items-center gap-1 group-hover:translate-x-1 transition">
                Candidatar-se <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="space-y-16 pb-12">
      {/* Hero limpo, autoral e contemporâneo */}
      <section className="pt-12 pb-16 sm:pt-16 sm:pb-20 border-b border-[#D5C5AA]/15 bg-[#0A150D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#D5C5AA]/25 bg-[#030A06] text-xs font-semibold text-[#F7DECA]">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>A Nova Moeda · Edição 17 de Novembro</span>
            </div>

            <h1 className="font-bold text-4xl sm:text-5xl lg:text-6xl text-[#F7DECA] tracking-tight leading-[1.08]">
              Seu próximo passo profissional começa com uma{" "}
              <span className="font-editorial italic font-normal">conexão</span>.
            </h1>

            <p className="text-base sm:text-lg text-[#D5C5AA]/85 leading-relaxed max-w-2xl">
              Construa seu perfil em menos de 2 minutos, gere seu currículo estruturado em PDF e conecte-se direto com as empresas e recrutadores do ecossistema{" "}
              <strong className="text-[#F7DECA] font-semibold">
                A Nova Moeda
              </strong>
              .
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                href="/cadastro"
                className="px-6 py-3.5 rounded-xl bg-[#D5C5AA] text-[#030A06] font-semibold text-sm hover:opacity-95 transition flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Criar meu perfil</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/vagas"
                className="px-6 py-3.5 rounded-xl border border-[#D5C5AA]/35 bg-[#030A06] text-[#F7DECA] font-semibold text-sm hover:opacity-90 transition flex items-center justify-center gap-2"
              >
                <Briefcase className="w-4 h-4" />
                <span>Explorar vagas</span>
              </Link>
              <Link
                href="/entrar"
                className="px-5 py-3.5 text-sm font-semibold text-[#D5C5AA] hover:text-[#F7DECA] transition flex items-center justify-center"
              >
                Já tenho conta →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Oportunidades e Indicadores em Destaque */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-emerald-600">
              Oportunidades em Tempo Real
            </span>
            <h2 className="mt-1 font-bold text-2xl sm:text-3xl text-[#F7DECA]">
              Vagas abertas para a comunidade
            </h2>
          </div>
          <Link
            href="/vagas"
            className="text-xs font-semibold text-[#F7DECA] border border-[#D5C5AA]/35 bg-[#0A150D] px-4 py-2.5 rounded-xl hover:opacity-90 transition self-start sm:self-auto"
          >
            Ver todas as vagas →
          </Link>
        </div>

        <Suspense
          fallback={
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-64 rounded-2xl border border-[#D5C5AA]/15 bg-[#0A150D] animate-pulse p-6"
                />
              ))}
            </div>
          }
        >
          <FeaturedOpportunities />
        </Suspense>
      </section>

      {/* Jornada em 4 etapas — visual estilo ClickUp / Monday */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D] rounded-2xl p-6 sm:p-10 space-y-8">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold text-emerald-600">
              Experiência Fluida
            </span>
            <h2 className="mt-1 font-bold text-2xl sm:text-3xl text-[#F7DECA]">
              Como funciona o Talent Hub
            </h2>
            <p className="mt-2 text-sm text-[#D5C5AA]/80">
              Sem formulários cansativos e repetitivos: você cria seu perfil uma única vez e acompanha cada etapa como em um quadro visual.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="border border-[#D5C5AA]/15 bg-[#030A06] p-5 rounded-xl space-y-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h3 className="font-bold text-base text-[#F7DECA]">
                Conta rápida
              </h3>
              <p className="text-xs text-[#D5C5AA]/80 leading-relaxed">
                Acesse pelo QR Code do evento e crie sua conta em segundos com controle transparente de privacidade.
              </p>
            </div>

            <div className="border border-[#D5C5AA]/15 bg-[#030A06] p-5 rounded-xl space-y-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500/15 text-blue-600 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h3 className="font-bold text-base text-[#F7DECA]">
                Perfil & Currículo PDF
              </h3>
              <p className="text-xs text-[#D5C5AA]/80 leading-relaxed">
                Adicione suas competências em 1 clique, anexe seu PDF/DOCX ou gere seu currículo oficial automaticamente.
              </p>
            </div>

            <div className="border border-[#D5C5AA]/15 bg-[#030A06] p-5 rounded-xl space-y-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/15 text-purple-600 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h3 className="font-bold text-base text-[#F7DECA]">
                Match sem retrabalho
              </h3>
              <p className="text-xs text-[#D5C5AA]/80 leading-relaxed">
                Filtre vagas por modalidade (remoto, híbrido, presencial) e candidate-se usando o perfil salvo.
              </p>
            </div>

            <div className="border border-[#D5C5AA]/15 bg-[#030A06] p-5 rounded-xl space-y-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold text-sm">
                4
              </div>
              <h3 className="font-bold text-base text-[#F7DECA]">
                Status em tempo real
              </h3>
              <p className="text-xs text-[#D5C5AA]/80 leading-relaxed">
                Veja em qual etapa sua candidatura está e receba avisos conforme recrutadores avançam seu perfil.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
