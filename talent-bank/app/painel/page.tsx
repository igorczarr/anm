import Link from "next/link";
import { Suspense } from "react";
import { getOrCreateCurrentCandidate } from "@/lib/current-candidate";
import { prisma } from "@/lib/prisma";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock,
  FileDown,
  FileText,
  Settings,
  UserCheck,
  AlertCircle,
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

async function CandidateDashboardContent() {
  const { profile, completeness } = await getOrCreateCurrentCandidate();

  const [openJobsCount, recentJobs] = await Promise.all([
    prisma.job.count({ where: { status: "PUBLISHED" } }),
    prisma.job.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 3,
    }),
  ]);

  const activeResume = profile.resumes.find((r) => r.isActive);
  const activeApplicationsCount = profile.applications.filter(
    (a) =>
      a.status !== "CANCELADA_PELO_CANDIDATO" && a.status !== "NAO_SELECIONADO"
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Cabeçalho com saudação e atalhos rápidos */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8">
        <div>
          <span className="text-[11px] uppercase tracking-[0.26em] text-[#D5C5AA]/70">
            Painel do Candidato · A Nova Moeda
          </span>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl text-[#F7DECA]">
            Olá, {profile.fullName}
          </h1>
          <p className="mt-2 text-sm text-[#D5C5AA]/80">
            {profile.professionalTitle ||
              "Complete seu perfil profissional para ampliar sua visibilidade nas oportunidades do evento."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/perfil"
            className="px-4 py-2.5 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs uppercase tracking-[0.18em] hover:bg-[#F7DECA] transition"
          >
            Editar meu perfil
          </Link>
          <Link
            href="/curriculo"
            className="px-4 py-2.5 border border-[#D5C5AA]/40 text-[#F7DECA] text-xs uppercase tracking-[0.18em] hover:border-[#F7DECA] transition flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" />
            Meu currículo
          </Link>
          <a
            href="/api/resumes/pdf"
            className="px-4 py-2.5 border border-[#57552E] bg-[#030A06] text-[#D5C5AA] text-xs uppercase tracking-[0.18em] hover:text-[#F7DECA] transition flex items-center gap-1.5"
          >
            <FileDown className="w-3.5 h-3.5" />
            Baixar PDF
          </a>
        </div>
      </div>

      {/* Barra visual de progresso de preenchimento do perfil */}
      <div className="border border-[#D5C5AA]/20 bg-[#030A06]/95 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs uppercase tracking-[0.2em] text-[#F7DECA] font-semibold">
              Progresso do Perfil Profissional
            </span>
            <p className="text-xs text-[#D5C5AA]/75 mt-1">
              {completeness.isComplete
                ? "Excelente! Seu perfil está completo e pronto para candidaturas em 1 clique."
                : "Complete os blocos pendentes para atingir 100% de destaque no Banco de Talentos."}
            </p>
          </div>
          <span className="font-display text-3xl text-[#F7DECA]">
            {completeness.percent}%
          </span>
        </div>

        <div className="mt-4 h-2.5 w-full bg-[#0A150D] border border-[#D5C5AA]/20 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#57552E] via-[#D5C5AA] to-[#F7DECA] transition-all duration-500"
            style={{ width: `${completeness.percent}%` }}
          />
        </div>

        {completeness.missingSteps.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/70 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-[#F7DECA]" />
              Pendências sugeridas:
            </span>
            {completeness.missingSteps.map((step) => (
              <Link
                key={step}
                href="/perfil"
                className="text-[11px] px-2.5 py-1 border border-[#57552E] bg-[#0A150D] text-[#F7DECA] hover:border-[#D5C5AA] transition"
              >
                + {step}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Indicadores principais (Seção 3.5) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5">
          <span className="text-[11px] uppercase tracking-[0.2em] text-[#D5C5AA]/70">
            Situação do Currículo
          </span>
          <p className="font-display text-xl text-[#F7DECA] mt-2">
            {activeResume ? "Arquivo Enviado + Estruturado" : "Currículo Estruturado Ativo"}
          </p>
          <p className="text-xs text-[#D5C5AA]/70 mt-1">
            Última atualização:{" "}
            {new Date(
              activeResume?.updatedAt || profile.updatedAt
            ).toLocaleDateString("pt-BR")}
          </p>
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5">
          <span className="text-[11px] uppercase tracking-[0.2em] text-[#D5C5AA]/70">
            Vagas Disponíveis
          </span>
          <p className="font-display text-3xl text-[#F7DECA] mt-2">
            {openJobsCount}
          </p>
          <Link
            href="/vagas"
            className="text-xs text-[#F7DECA] underline mt-1 inline-block"
          >
            Explorar oportunidades
          </Link>
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5">
          <span className="text-[11px] uppercase tracking-[0.2em] text-[#D5C5AA]/70">
            Candidaturas Realizadas
          </span>
          <p className="font-display text-3xl text-[#F7DECA] mt-2">
            {profile.applications.length}
          </p>
          <span className="text-xs text-[#D5C5AA]/70 mt-1 block">
            Histórico total na plataforma
          </span>
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5">
          <span className="text-[11px] uppercase tracking-[0.2em] text-[#D5C5AA]/70">
            Em Andamento
          </span>
          <p className="font-display text-3xl text-[#F7DECA] mt-2">
            {activeApplicationsCount}
          </p>
          <Link
            href="/candidaturas"
            className="text-xs text-[#F7DECA] underline mt-1 inline-block"
          >
            Acompanhar status
          </Link>
        </div>
      </div>

      {/* Atalhos Rápidos do Portal (Seção 3.5) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Link
          href="/perfil"
          className="border border-[#D5C5AA]/20 bg-[#030A06] p-4 hover:border-[#F7DECA] transition flex flex-col justify-between"
        >
          <UserCheck className="w-5 h-5 text-[#F7DECA]" />
          <span className="mt-3 text-xs uppercase tracking-[0.16em] text-[#F7DECA]">
            Meu Perfil
          </span>
        </Link>
        <Link
          href="/curriculo"
          className="border border-[#D5C5AA]/20 bg-[#030A06] p-4 hover:border-[#F7DECA] transition flex flex-col justify-between"
        >
          <FileText className="w-5 h-5 text-[#F7DECA]" />
          <span className="mt-3 text-xs uppercase tracking-[0.16em] text-[#F7DECA]">
            Meu Currículo
          </span>
        </Link>
        <Link
          href="/vagas"
          className="border border-[#D5C5AA]/20 bg-[#030A06] p-4 hover:border-[#F7DECA] transition flex flex-col justify-between"
        >
          <Briefcase className="w-5 h-5 text-[#F7DECA]" />
          <span className="mt-3 text-xs uppercase tracking-[0.16em] text-[#F7DECA]">
            Explorar Vagas
          </span>
        </Link>
        <Link
          href="/candidaturas"
          className="border border-[#D5C5AA]/20 bg-[#030A06] p-4 hover:border-[#F7DECA] transition flex flex-col justify-between"
        >
          <CheckCircle2 className="w-5 h-5 text-[#F7DECA]" />
          <span className="mt-3 text-xs uppercase tracking-[0.16em] text-[#F7DECA]">
            Minhas Candidaturas
          </span>
        </Link>
        <Link
          href="/conta"
          className="border border-[#D5C5AA]/20 bg-[#030A06] p-4 hover:border-[#F7DECA] transition flex flex-col justify-between col-span-2 sm:col-span-1"
        >
          <Settings className="w-5 h-5 text-[#F7DECA]" />
          <span className="mt-3 text-xs uppercase tracking-[0.16em] text-[#F7DECA]">
            Configurações & LGPD
          </span>
        </Link>
      </div>

      {/* Candidaturas em andamento & Atualizações recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/70 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl text-[#F7DECA]">
              Candidaturas & Atualizações Recentes
            </h2>
            <Link
              href="/candidaturas"
              className="text-xs uppercase tracking-[0.16em] text-[#D5C5AA] hover:text-[#F7DECA]"
            >
              Ver todas
            </Link>
          </div>

          {profile.applications.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-[#D5C5AA]/20 p-6">
              <p className="text-sm text-[#D5C5AA]/80">
                Você ainda não realizou candidaturas.
              </p>
              <Link
                href="/vagas"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#D5C5AA] text-[#030A06] text-xs uppercase tracking-[0.18em] font-semibold"
              >
                Ver oportunidades abertas <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {profile.applications.map((app) => (
                <div
                  key={app.id}
                  className="border border-[#D5C5AA]/20 bg-[#030A06] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-[#F7DECA]">
                      {app.job.title}
                    </h3>
                    <p className="text-xs text-[#D5C5AA]/75">
                      {app.job.companyName} · Inscrito em{" "}
                      {new Date(app.appliedAt).toLocaleDateString("pt-BR")}
                    </p>
                    {app.history[0]?.note && (
                      <p className="text-[11px] text-[#D5C5AA]/70 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#F7DECA]" />
                        {app.history[0].note}
                      </p>
                    )}
                  </div>
                  <span className="px-3 py-1 text-[11px] uppercase tracking-[0.16em] border border-[#57552E] bg-[#0A150D] text-[#F7DECA] self-start sm:self-center">
                    {STATUS_LABELS[app.status] || app.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vagas recomendadas para o perfil */}
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/70 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl text-[#F7DECA]">
              Oportunidades em Destaque
            </h2>
            <Link
              href="/vagas"
              className="text-xs uppercase tracking-[0.16em] text-[#D5C5AA] hover:text-[#F7DECA]"
            >
              Explorar todas
            </Link>
          </div>

          <div className="space-y-4">
            {recentJobs.map((job) => (
              <div
                key={job.id}
                className="border border-[#D5C5AA]/20 bg-[#030A06] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#D5C5AA]/70">
                    {job.professionalArea} · {job.modality}
                  </span>
                  <h3 className="text-sm font-semibold text-[#F7DECA] mt-0.5">
                    {job.title}
                  </h3>
                  <p className="text-xs text-[#D5C5AA]/75">
                    {job.companyName} · {job.location}
                  </p>
                </div>
                <Link
                  href={`/vagas/${job.slug}`}
                  className="px-3.5 py-2 border border-[#D5C5AA]/40 text-xs uppercase tracking-[0.16em] text-[#F7DECA] hover:border-[#F7DECA] transition self-start sm:self-center shrink-0"
                >
                  Detalhes
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CandidateDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-sm text-[#D5C5AA]/70">
          Carregando seu painel pessoal...
        </div>
      }
    >
      <CandidateDashboardContent />
    </Suspense>
  );
}
