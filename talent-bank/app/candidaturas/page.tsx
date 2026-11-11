import Link from "next/link";
import { Suspense } from "react";
import { getOrCreateCurrentCandidate } from "@/lib/current-candidate";
import { cancelApplicationAction } from "@/app/actions/applications";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  XCircle,
} from "lucide-react";

const STATUS_STEPS = [
  { key: "RECEBIDA", label: "1. Recebida" },
  { key: "EM_ANALISE", label: "2. Em análise" },
  { key: "PRE_SELECIONADO", label: "3. Pré-selecionado" },
  { key: "EM_PROCESSO_SELETIVO", label: "4. Em processo seletivo" },
  { key: "APROVADO", label: "5. Aprovado" },
];

const STATUS_LABELS: Record<string, string> = {
  RECEBIDA: "Recebida",
  EM_ANALISE: "Em análise",
  PRE_SELECIONADO: "Pré-selecionado",
  EM_PROCESSO_SELETIVO: "Em processo seletivo",
  APROVADO: "Aprovado",
  NAO_SELECIONADO: "Não selecionado",
  CANCELADA_PELO_CANDIDATO: "Cancelada pelo candidato",
};

async function MyApplicationsContent() {
  const { profile } = await getOrCreateCurrentCandidate();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Cabeçalho */}
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-[0.26em] text-[#D5C5AA]/70">
            Acompanhamento de Candidaturas
          </span>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl text-[#F7DECA]">
            Minhas Candidaturas
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#D5C5AA]/80">
            Acompanhe o status atual e o histórico completo de movimentações de cada oportunidade.
          </p>
        </div>

        <Link
          href="/vagas"
          className="px-5 py-3 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs uppercase tracking-[0.18em] hover:bg-[#F7DECA] transition self-start sm:self-auto"
        >
          Explorar Mais Oportunidades
        </Link>
      </div>

      {profile.applications.length === 0 ? (
        <div className="border border-dashed border-[#D5C5AA]/25 bg-[#0A150D]/40 p-12 text-center space-y-4">
          <Briefcase className="w-8 h-8 text-[#F7DECA] mx-auto" />
          <h2 className="font-display text-2xl text-[#F7DECA]">
            Você ainda não possui candidaturas registradas
          </h2>
          <p className="text-xs text-[#D5C5AA]/75 max-w-md mx-auto">
            Navegue pelo mural de vagas abertas e candidate-se em 1 clique com seu perfil e currículo cadastrados.
          </p>
          <Link
            href="/vagas"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs uppercase tracking-[0.2em]"
          >
            Ver Oportunidades Abertas <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {profile.applications.map((app) => {
            const currentStepIndex = STATUS_STEPS.findIndex(
              (s) => s.key === app.status
            );
            const isCanceled = app.status === "CANCELADA_PELO_CANDIDATO";
            const isNotSelected = app.status === "NAO_SELECIONADO";

            return (
              <div
                key={app.id}
                className="border border-[#D5C5AA]/25 bg-[#0A150D]/80 p-6 sm:p-8 space-y-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#D5C5AA]/15 pb-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[#D5C5AA]/75">
                      {app.job.companyVerified && (
                        <span className="px-2 py-0.5 rounded-full border border-emerald-400 bg-emerald-50 text-emerald-900 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          Empresa Verificada
                        </span>
                      )}
                      <span>{app.job.professionalArea}</span>
                      <span>·</span>
                      <span>{app.job.modality}</span>
                    </div>
                    <Link
                      href={`/vagas/${app.job.slug}`}
                      className="mt-1 inline-block font-display text-2xl text-[#F7DECA] hover:underline"
                    >
                      {app.job.title}
                    </Link>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-[#D5C5AA]/80">
                      <span className="flex items-center gap-1.5 font-semibold text-[#F7DECA]">
                        <Building2 className="w-3.5 h-3.5 text-[#D5C5AA]" />
                        {app.job.companyName}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#D5C5AA]" />
                        {app.job.location}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#D5C5AA]" />
                        Candidatura em{" "}
                        {new Date(app.appliedAt).toLocaleString("pt-BR")}
                      </span>
                      <span className="flex items-center gap-1.5 text-[#14532D] font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        {app.job.feedbackEstimate ||
                          `Previsão de retorno: até ${app.job.feedbackSlaDays || 7} dias`}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className={`px-4 py-2 text-xs uppercase tracking-[0.18em] font-semibold border ${
                        isCanceled || isNotSelected
                          ? "border-amber-500/40 bg-amber-950/30 text-amber-200"
                          : "border-[#57552E] bg-[#030A06] text-[#F7DECA]"
                      }`}
                    >
                      Status: {STATUS_LABELS[app.status] || app.status}
                    </span>

                    {!isCanceled && !isNotSelected && app.status !== "APROVADO" && (
                      <form action={cancelApplicationAction}>
                        <input
                          type="hidden"
                          name="applicationId"
                          value={app.id}
                        />
                        <button
                          type="submit"
                          className="px-3.5 py-2 border border-red-500/35 text-xs uppercase tracking-[0.14em] text-red-300 hover:bg-red-950/40 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Cancelar Candidatura
                        </button>
                      </form>
                    )}
                  </div>
                </div>

                {/* Trilha de Etapas do Processo Seletivo */}
                {!isCanceled && !isNotSelected && (
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    {STATUS_STEPS.map((step, index) => {
                      const active = index <= currentStepIndex;
                      return (
                        <div
                          key={step.key}
                          className={`p-3 border text-xs flex items-center gap-2 ${
                            active
                              ? "border-[#D5C5AA] bg-[#030A06] text-[#F7DECA]"
                              : "border-[#D5C5AA]/15 bg-[#030A06]/40 text-[#D5C5AA]/45"
                          }`}
                        >
                          <CheckCircle2
                            className={`w-4 h-4 shrink-0 ${
                              active ? "text-[#F7DECA]" : "text-[#D5C5AA]/30"
                            }`}
                          />
                          <span className="uppercase tracking-[0.12em] text-[11px]">
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Histórico de Atualizações Auditável */}
                <div className="space-y-2.5 pt-2">
                  <span className="text-xs uppercase tracking-[0.18em] text-[#F7DECA] block">
                    Histórico de Atualizações
                  </span>
                  <div className="space-y-2">
                    {app.history.map((item) => (
                      <div
                        key={item.id}
                        className="border border-[#D5C5AA]/15 bg-[#030A06] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="space-y-0.5">
                          <span className="font-semibold text-[#F7DECA]">
                            {item.fromStatus
                              ? `${STATUS_LABELS[item.fromStatus] || item.fromStatus} → ${
                                  STATUS_LABELS[item.toStatus] || item.toStatus
                                }`
                              : STATUS_LABELS[item.toStatus] || item.toStatus}
                          </span>
                          {item.note && (
                            <p className="text-[#D5C5AA]/80">{item.note}</p>
                          )}
                        </div>
                        <span className="text-[11px] text-[#D5C5AA]/65 flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          {new Date(item.createdAt).toLocaleString("pt-BR")}
                        </span>
                      </div>
                    ))}
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

export default function CandidaturasPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-sm text-[#D5C5AA]/70">
          Carregando suas candidaturas...
        </div>
      }
    >
      <MyApplicationsContent />
    </Suspense>
  );
}
