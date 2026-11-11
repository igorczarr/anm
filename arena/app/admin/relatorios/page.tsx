import { Suspense } from "react";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { getConsolidatedEventReport } from "@/lib/reports";
import { formatSecondsMMSS } from "@/lib/events";
import { purgeParticipantTechnicalDataAction } from "@/app/actions/compliance";
import {
  BarChart3,
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
  await getCurrentAdminUser();
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
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4" />
            Módulo 7 · Relatórios e Indicadores Pós-Evento (Formato Oficial v2.0)
          </span>
          <h1 className="font-display text-2xl sm:text-3xl text-[#F7DECA]">
            Consolidação da Arena & Exportações Oficiais
          </h1>
          <p className="text-xs sm:text-sm text-[#D5C5AA]/80">
            Acompanhe o cumprimento do cronograma de {report.durationPlannedMin} min
            ({report.certifiedHours}h certificadas), métricas das 5 exposições,
            votação da Mesa-Redonda e exporte em PDF executivo, CSV e XLSX.
          </p>
        </div>

        {/* Botões de Download */}
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
            <Download className="w-4 h-4 text-emerald-400" />
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

      {/* 1. Indicadores Gerais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-[#D5C5AA]/70">
            <span>Duração & Carga Horária</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-display text-2xl text-[#F7DECA]">
            {report.durationActualMin} min
          </div>
          <div className="text-xs text-[#D5C5AA]/80">
            Previsto: <strong>{report.durationPlannedMin} min</strong> (2h25) ·{" "}
            <strong>{report.certifiedHours}h</strong> cert.
          </div>
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-[#D5C5AA]/70">
            <span>Credenciais & Sessões</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-display text-2xl text-[#F7DECA]">
            {report.totalSessionsCount}
          </div>
          <div className="text-xs text-[#D5C5AA]/80">
            Credenciais: <strong>{report.validatedCredentialsCount}</strong> ·
            Pico: <strong>{report.peakConnections}</strong>
          </div>
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-[#D5C5AA]/70">
            <span>Perguntas (Plateia & Mediação)</span>
            <MessageSquare className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-display text-2xl text-[#F7DECA]">
            {report.questionsTotal} da plateia
          </div>
          <div className="text-xs text-[#D5C5AA]/80">
            Respondidas:{" "}
            <strong className="text-emerald-400">
              {report.questionsAnswered}
            </strong>{" "}
            (Reserva mediação: <strong>{report.mediationReserveUsedCount}</strong>)
          </div>
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-5 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs text-[#D5C5AA]/70">
            <span>Votação da Mesa-Redonda</span>
            <Vote className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-display text-2xl text-[#F7DECA]">
            {report.totalVotes} votos
          </div>
          <div className="text-xs text-[#D5C5AA]/80">
            Alterações de voto rastreadas:{" "}
            <strong>{report.voteChangesCount}</strong>
          </div>
        </div>
      </div>

      {/* 2. Consolidação da Votação da Mesa-Redonda (20 min) */}
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 rounded-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Escolha do Público para a Mesa-Redonda (20 min)
            </span>
            <h2 className="font-display text-xl text-[#F7DECA]">
              {report.roundtablePoll.question}
            </h2>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#14532D] text-white text-xs font-bold">
            {report.roundtablePoll.totalVotes} votos válidos ·{" "}
            {report.roundtablePoll.voteChangesCount} alterações de voto
          </span>
        </div>

        {report.roundtablePoll.winningQuestionText && (
          <div className="border border-emerald-500/40 bg-emerald-950/30 p-4 rounded-xl space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              Questão Vencedora Debatida pelos 5 Especialistas
            </span>
            <p className="font-display text-base sm:text-lg text-[#F7DECA]">
              &ldquo;{report.roundtablePoll.winningQuestionText}&rdquo;
            </p>
            {report.roundtablePoll.tieBreakJustification && (
              <p className="text-xs text-[#D5C5AA]/80 pt-1">
                Justificativa operacional de desempate/síntese:{" "}
                <em>{report.roundtablePoll.tieBreakJustification}</em>
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {report.roundtablePoll.options.map((opt) => (
            <div
              key={opt.order}
              className={`border p-4 rounded-xl space-y-2 ${
                opt.isWinner
                  ? "border-emerald-400 bg-emerald-950/25"
                  : "border-[#D5C5AA]/15 bg-[#030A06]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold uppercase tracking-wider text-emerald-400 text-[11px]">
                  {opt.themeLabel}
                </span>
                <strong className="font-mono text-[#F7DECA]">
                  {opt.percentage}% ({opt.votesCount})
                </strong>
              </div>
              <p className="text-[#F7DECA] leading-relaxed">{opt.label}</p>
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

      {/* 3. Relatório Detalhado por Pauta (1 a 5) */}
      <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-6 rounded-2xl space-y-4">
        <div>
          <h2 className="font-display text-xl text-[#F7DECA]">
            Indicadores por Pauta (5 Exposições Individuais: 15m Exposição + 5m P&R)
          </h2>
          <p className="text-xs text-[#D5C5AA]/70">
            Tempos de exposição e resposta, perguntas recebidas e identificação da
            pergunta respondida (Plateia vs. Mediação).
          </p>
        </div>

        <div className="space-y-4">
          {report.topics.map((t) => (
            <div
              key={t.number}
              className="border border-[#D5C5AA]/20 bg-[#030A06] p-5 rounded-2xl space-y-3"
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
                    Especialista: <strong>{t.speakerName}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <div>
                    <span className="text-[#D5C5AA]/70 block">Exposição (15m)</span>
                    <strong className="text-[#F7DECA]">
                      {formatSecondsMMSS(t.expositionDurationSec)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#D5C5AA]/70 block">P&R (5m)</span>
                    <strong className="text-[#F7DECA]">
                      {formatSecondsMMSS(t.qaDurationSec)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#D5C5AA]/70 block">Total Pauta</span>
                    <strong className="text-emerald-400">
                      {formatSecondsMMSS(t.actualDurationSec)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#D5C5AA]/70 block">
                      Perguntas (Rec/Apr/Resp)
                    </span>
                    <strong className="text-[#F7DECA]">
                      {t.questionsReceived} / {t.questionsApproved} /{" "}
                      {t.questionsAnswered}
                    </strong>
                  </div>
                </div>
              </div>

              {t.answeredQuestionText && (
                <div className="text-xs bg-[#0A150D] border border-[#D5C5AA]/15 p-3.5 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-emerald-400">
                      Pergunta Selecionada ({t.answeredQuestionOrigin})
                    </span>
                    {t.answeredQuestionModerator && (
                      <span className="text-[#D5C5AA]/70">
                        Moderador(a): {t.answeredQuestionModerator}
                      </span>
                    )}
                  </div>
                  <p className="text-[#F7DECA] leading-relaxed">
                    &ldquo;{t.answeredQuestionText}&rdquo;
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 4. Privacidade e Conformidade LGPD */}
      <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="font-bold text-sm text-[#F7DECA] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Conformidade LGPD & Expurgo de Dados Técnicos
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
