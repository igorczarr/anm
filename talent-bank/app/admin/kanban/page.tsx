import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { ApplicationStatus } from "@prisma/client";
import { updateApplicationStatusAdminAction } from "@/app/actions/admin";
import {
  ArrowLeft,
  ArrowRight,
  Columns3,
  Eye,
  Filter,
} from "lucide-react";

const KANBAN_COLUMNS: {
  status: ApplicationStatus;
  title: string;
  accent: string;
}[] = [
  { status: "RECEBIDA", title: "Recebidas", accent: "border-t-4 border-t-slate-400" },
  { status: "EM_ANALISE", title: "Em análise", accent: "border-t-4 border-t-blue-500" },
  { status: "PRE_SELECIONADO", title: "Pré-selecionados", accent: "border-t-4 border-t-purple-500" },
  { status: "EM_PROCESSO_SELETIVO", title: "Em entrevista", accent: "border-t-4 border-t-amber-500" },
  { status: "APROVADO", title: "Aprovados", accent: "border-t-4 border-t-emerald-500" },
  { status: "NAO_SELECIONADO", title: "Banco / Arquivo", accent: "border-t-4 border-t-rose-400" },
];

async function AdminKanbanContent({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ jobId?: string }>;
}) {
  const { jobId } = await searchParamsPromise;

  const [applications, jobs] = await Promise.all([
    prisma.application.findMany({
      where: jobId ? { jobId } : undefined,
      include: {
        candidate: true,
        job: true,
        history: {
          include: { actor: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.job.findMany({ orderBy: { title: "asc" } }),
  ]);

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="border border-[#D5C5AA]/20 bg-[#0A150D] p-6 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-emerald-600">
            Pipeline Visual de Seleção
          </span>
          <h1 className="mt-1 font-bold text-2xl sm:text-3xl text-[#F7DECA] flex items-center gap-2.5">
            <Columns3 className="w-6 h-6 text-emerald-600" />
            Quadro Kanban de Candidaturas
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#D5C5AA]/80">
            Mova candidatos entre as etapas com um clique. Todo avanço atualiza automaticamente o histórico do candidato.
          </p>
        </div>

        <form method="GET" action="/admin/kanban" className="flex items-center gap-2.5">
          <Filter className="w-4 h-4 text-[#D5C5AA]/70" />
          <select
            name="jobId"
            defaultValue={jobId || ""}
            className="bg-[#030A06] border border-[#D5C5AA]/30 px-3.5 py-2 text-xs text-[#F7DECA] rounded-xl"
          >
            <option value="">Todas as vagas abertas</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} ({j.companyName})
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs rounded-xl cursor-pointer"
          >
            Filtrar
          </button>
        </form>
      </div>

      {/* Colunas estilo Trello / ClickUp / Monday */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {KANBAN_COLUMNS.map((col, colIndex) => {
          const items = applications.filter((a) => a.status === col.status);
          const prevCol = KANBAN_COLUMNS[colIndex - 1];
          const nextCol = KANBAN_COLUMNS[colIndex + 1];

          return (
            <div
              key={col.status}
              className={`border border-[#D5C5AA]/20 bg-[#0A150D] rounded-2xl flex flex-col min-h-[500px] overflow-hidden ${col.accent}`}
            >
              <div className="p-4 border-b border-[#D5C5AA]/15 flex items-center justify-between">
                <span className="text-xs font-bold text-[#F7DECA]">
                  {col.title}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#030A06] border border-[#D5C5AA]/20 text-xs font-bold text-[#F7DECA]">
                  {items.length}
                </span>
              </div>

              <div className="p-3 space-y-3 flex-1">
                {items.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#D5C5AA]/50 border border-dashed border-[#D5C5AA]/20 rounded-xl">
                    Sem candidatos
                  </div>
                ) : (
                  items.map((app) => {
                    const lastHistory = app.history[0];
                    return (
                      <div
                        key={app.id}
                        className="border border-[#D5C5AA]/20 bg-[#030A06] p-4 rounded-xl space-y-3 hover:shadow-md transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-xs text-[#F7DECA]">
                              {app.candidate.fullName}
                            </div>
                            <div className="text-[11px] font-medium text-[#D5C5AA]/80 mt-0.5">
                              {app.job.title}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600">
                            {app.candidate.completionPercent}%
                          </span>
                        </div>

                        <div className="text-[11px] text-[#D5C5AA]/70">
                          {app.candidate.interestArea || "Geral"}
                        </div>

                        {lastHistory && (
                          <div className="text-[10px] text-[#D5C5AA]/60 border-t border-[#D5C5AA]/15 pt-2">
                            Atualizado em{" "}
                            {new Date(lastHistory.createdAt).toLocaleDateString(
                              "pt-BR"
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-[#D5C5AA]/15">
                          {prevCol ? (
                            <form action={updateApplicationStatusAdminAction}>
                              <input
                                type="hidden"
                                name="applicationId"
                                value={app.id}
                              />
                              <input
                                type="hidden"
                                name="toStatus"
                                value={prevCol.status}
                              />
                              <input
                                type="hidden"
                                name="note"
                                value={`Movido no Kanban para ${prevCol.title}`}
                              />
                              <button
                                type="submit"
                                className="p-1.5 rounded-lg border border-[#D5C5AA]/25 text-xs text-[#D5C5AA] hover:text-[#F7DECA] cursor-pointer"
                                title={`Voltar para ${prevCol.title}`}
                              >
                                <ArrowLeft className="w-3.5 h-3.5" />
                              </button>
                            </form>
                          ) : (
                            <span />
                          )}

                          <Link
                            href={`/admin/candidaturas?selected=${app.id}`}
                            className="px-2.5 py-1 rounded-lg border border-[#D5C5AA]/25 text-[11px] font-semibold text-[#F7DECA] flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            Ficha
                          </Link>

                          {nextCol ? (
                            <form action={updateApplicationStatusAdminAction}>
                              <input
                                type="hidden"
                                name="applicationId"
                                value={app.id}
                              />
                              <input
                                type="hidden"
                                name="toStatus"
                                value={nextCol.status}
                              />
                              <input
                                type="hidden"
                                name="note"
                                value={`Avançado no Kanban para ${nextCol.title}`}
                              />
                              <button
                                type="submit"
                                className="px-2.5 py-1 rounded-lg bg-[#D5C5AA] text-[#030A06] font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                                title={`Avançar para ${nextCol.title}`}
                              >
                                <span>Avançar</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </form>
                          ) : (
                            <span />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminKanbanPage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-sm text-[#D5C5AA]/70">
          Carregando funil Kanban de recrutamento...
        </div>
      }
    >
      <AdminKanbanContent searchParamsPromise={searchParams} />
    </Suspense>
  );
}
