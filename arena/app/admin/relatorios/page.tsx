import { Suspense } from "react";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { getConsolidatedEventReport } from "@/lib/reports";
import { formatSecondsMMSS } from "@/lib/events";
import { purgeParticipantTechnicalDataAction } from "@/app/actions/compliance";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  MessageSquare,
  ShieldCheck,
  Trash2,
  Users,
  Vote,
} from "lucide-react";

async function AdminRelatoriosContent() {
  const admin = await getCurrentAdminUser();
  const report = await getConsolidatedEventReport();

  if (!report) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-sm text-[#D5C5AA]">
        Nenhum dado consolidado encontrado.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Cabeçalho */}
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#14532D] flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4" />
            Módulo 7 · Relatórios e Indicadores Pós-Evento (§15)
          </span>
          <h1 className="font-display text-2xl sm:text-3xl text-[#F7DECA]">
            Consolidação da Arena & Exportações Oficiais
          </h1>
          <p className="text-xs sm:text-sm text-[#D5C5AA]/80">
            Acompanhe o cumprimento do cronograma, métricas de engajamento do público
            e exporte os relatórios em PDF executivo, CSV e XLSX (Excel).
          </p>
        </div>

        {/* Botões de Download (§15.3) */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <a
            href="/api/admin/reports/pdf"
            download
            className="px-4 py-2.5 rounded-xl bg-[#14532D] text-white hover:bg-[#166534] transition font-semibold text-xs flex items-center gap-2 shadow-sm"
          >
            <FileText className="w-4 h-4" />
            <span>Exportar PDF</span>
          </a>

          <a
            href="/api/admin/reports/csv"
            download
            className="px-4 py-2.5 rounded-xl border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] hover:border-[#D5C5AA]/60 transition font-semibold text-xs flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-[#14532D]" />
            <span>Exportar CSV</span>
          </a>

          <a
            href="/api/admin/reports/xlsx"
            download
            className="px-4 py-2.5 rounded-xl border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] hover:border-[#D5C5AA]/60 transition font-semibold text-xs flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Exportar Excel (XLSX)</span>
          </a>
        </div>
      </div>

      {/* 1. Indicadores Gerais (§15.1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-[#D5C5AA]/70">
            <span>Duração & Cronograma</span>
            <Clock className="w-4 h-4 text-[#14532D]" />
          </div>
          <div className="font-display text-2xl text-[#F7DECA]">
            {report.durationActualMin} min
          </div>
          <div className="text-xs text-[#D5C5AA]/80">
            Previsto: <strong>{report.durationPlannedMin} min</strong> (131:00)
          </div>
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-[#D5C5AA]/70">
            <span>Dispositivos & Conexões</span>
            <Users className="w-4 h-4 text-[#14532D]" />
          </div>
          <div className="font-display text-2xl text-[#F7DECA]">
            {report.totalSessionsCount}
          </div>
          <div className="text-xs text-[#D5C5AA]/80">
            Pico simultâneo: <strong>{report.peakConnections}</strong> conexões
          </div>
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-[#D5C5AA]/70">
            <span>Perguntas do Público</span>
            <MessageSquare className="w-4 h-4 text-[#14532D]" />
          </div>
          <div className="font-display text-2xl text-[#F7DECA]">
            {report.questionsTotal} recebidas
          </div>
          <div className="text-xs text-[#D5C5AA]/80">
            Aprovadas: <strong>{report.questionsApproved}</strong> · Respondidas:{" "}
            <strong className="text-emerald-400">{report.questionsAnswered}</strong>
          </div>
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-[#D5C5AA]/70">
            <span>Votações Realizadas</span>
            <Vote className="w-4 h-4 text-[#14532D]" />
          </div>
          <div className="font-display text-2xl text-[#F7DECA]">
            {report.totalVotes} votos
          </div>
          <div className="text-xs text-[#D5C5AA]/80">
            Total de 6 rodadas de debate computadas
          </div>
        </div>
      </div>

      {/* 2. Relatório Detalhado por Pauta (§15.2) */}
      <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-6 rounded-2xl space-y-4">
        <div>
          <h2 className="font-display text-xl text-[#F7DECA]">
            2. Indicadores e Desempenho por Pauta (Seção 15.2)
          </h2>
          <p className="text-xs text-[#D5C5AA]/70">
            Tempos de exposição, tempo total da rodada, curadoria de perguntas e distribuição de votos.
          </p>
        </div>

        <div className="space-y-6">
          {report.topics.map((t) => (
            <div
              key={t.number}
              className="border border-[#D5C5AA]/20 bg-[#030A06] p-5 rounded-2xl space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D5C5AA]/15 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-0.5 rounded-full bg-[#14532D] text-white text-xs font-bold">
                      Pauta {t.number}
                    </span>
                    <h3 className="font-display text-lg text-[#F7DECA]">
                      {t.title}
                    </h3>
                  </div>
                  <div className="text-xs text-[#D5C5AA]/80">
                    Palestrante: <strong>{t.speakerName}</strong> · Provocador(a):{" "}
                    <strong>{t.provokerLabel}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div>
                    <span className="text-[#D5C5AA]/70 block">Exposição</span>
                    <strong className="text-[#F7DECA]">
                      {formatSecondsMMSS(t.expositionDurationSec)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#D5C5AA]/70 block">Rodada Efetiva</span>
                    <strong className="text-emerald-400">
                      {formatSecondsMMSS(t.actualDurationSec)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#D5C5AA]/70 block">Perguntas (Rec/Apr/Resp)</span>
                    <strong className="text-[#F7DECA]">
                      {t.questionsReceived} / {t.questionsApproved} / {t.questionsAnswered}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Votação e Distribuição das Alternativas */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#D5C5AA] flex items-center gap-1.5">
                    <Vote className="w-3.5 h-3.5 text-[#14532D]" />
                    Votação: &ldquo;{t.pollQuestion}&rdquo;
                  </span>
                  <span className="font-bold text-[#F7DECA]">
                    {t.totalVotes} votos computados
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {t.optionsDistribution.map((opt) => (
                    <div
                      key={opt.order}
                      className="border border-[#D5C5AA]/15 bg-[#0A150D] p-3 rounded-xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[#F7DECA]">
                          <strong>{opt.order}.</strong> {opt.label}
                        </span>
                        <strong className="font-mono text-emerald-400 shrink-0">
                          {opt.percentage}% ({opt.votesCount})
                        </strong>
                      </div>
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#14532D]"
                          style={{ width: `${opt.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Privacidade e Conformidade LGPD (§12.4) */}
      <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="font-bold text-sm text-[#F7DECA] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Conformidade LGPD & Expurgo de Dados Técnicos (§12.4)
          </div>
          <p className="text-xs text-[#D5C5AA]/75 max-w-2xl leading-relaxed">
            Após a conferência e exportação do relatório final, a organização pode
            limpar identificadores de IP e metadados das conexões, preservando os
            resultados estatísticos agregados sem qualquer rastro pessoal.
          </p>
        </div>

        <form action={purgeParticipantTechnicalDataAction}>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl border border-red-500/30 bg-red-950/20 text-red-300 hover:bg-red-950/40 transition font-semibold text-xs flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Executar Limpeza Técnica LGPD</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminRelatoriosPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-xs text-[#D5C5AA]/70">
          Carregando indicadores e relatórios pós-evento...
        </div>
      }
    >
      <AdminRelatoriosContent />
    </Suspense>
  );
}
