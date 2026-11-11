import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { getConsolidatedEventReport } from "@/lib/reports";
import { generateArenaReportPdf, PdfSection } from "@/lib/pdf-generator";
import { formatSecondsMMSS } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const report = await getConsolidatedEventReport();
  if (!report) {
    return NextResponse.json({ error: "Dados indisponíveis" }, { status: 404 });
  }

  const sections: PdfSection[] = [
    {
      title: "1. Indicadores Gerais do Evento (Formato Oficial v2.0)",
      lines: [
        `Evento: ${report.name} — ${report.theme}`,
        `Instituicao: ${report.institution}`,
        `Inicio Programado: ${report.scheduledStartAt ? new Date(report.scheduledStartAt).toLocaleString("pt-BR") : "Nao configurado"}`,
        `Inicio Efetivo: ${report.actualStartAt ? new Date(report.actualStartAt).toLocaleString("pt-BR") : "Aguardando / Ao Vivo"}`,
        `Encerramento Efetivo: ${report.actualEndAt ? new Date(report.actualEndAt).toLocaleString("pt-BR") : "Em andamento"}`,
        `Duracao Total Prevista: ${report.durationPlannedMin} minutos (2h25) | Carga Horaria Certificada: ${report.certifiedHours}h`,
        `Duracao Total Realizada: ${report.durationActualMin} minutos`,
        `Sessoes de Participantes: ${report.totalSessionsCount} dispositivos | Credenciais Validadas: ${report.validatedCredentialsCount}`,
        `Pico de Conexoes Simultaneas: ${report.peakConnections} dispositivos`,
        `Perguntas Recebidas da Plateia: ${report.questionsTotal} | Aprovadas: ${report.questionsApproved}`,
        `Perguntas Respondidas: ${report.questionsAnswered} (Reserva da Mediacao acionada: ${report.mediationReserveUsedCount})`,
        `Total de Votos na Mesa-Redonda: ${report.totalVotes} votos | Alteracoes de Voto: ${report.voteChangesCount}`,
      ],
    },
    {
      title: "2. Votacao da Mesa-Redonda (20 Minutos — 5 Especialistas)",
      lines: [
        `Pergunta da Enquete: ${report.roundtablePoll.question}`,
        `Questao Vencedora Debatida: ${report.roundtablePoll.winningQuestionText || "Ainda nao encerrada"}`,
        ...(report.roundtablePoll.tieBreakJustification
          ? [
              `Justificativa de Desempate / Sintese: ${report.roundtablePoll.tieBreakJustification}`,
            ]
          : []),
        ...report.roundtablePoll.options.map(
          (opt) =>
            `  [${opt.themeLabel}] ${opt.label} -> ${opt.percentage}% (${opt.votesCount} votos)${opt.isWinner ? " [VENCEDORA]" : ""}`
        ),
      ],
    },
  ];

  for (const t of report.topics) {
    const lines = [
      `Especialista Responsavel: ${t.speakerName}`,
      `Tempo de Exposicao Efetivo: ${formatSecondsMMSS(t.expositionDurationSec)} | Tempo P&R (5m): ${formatSecondsMMSS(t.qaDurationSec)}`,
      `Tempo Efetivo da Pauta: ${formatSecondsMMSS(t.actualDurationSec)} (Previsto: ${formatSecondsMMSS(t.plannedDurationSec)})`,
      `Perguntas da Plateia: ${t.questionsReceived} recebidas, ${t.questionsApproved} aprovadas, ${t.questionsAnswered} respondidas`,
      ...(t.answeredQuestionText
        ? [
            `Pergunta Respondida (${t.answeredQuestionOrigin}): "${t.answeredQuestionText}"`,
          ]
        : []),
    ];

    sections.push({
      title: `Pauta ${t.number}: ${t.title}`,
      lines,
    });
  }

  sections.push({
    title: "Conformidade LGPD e Auditoria",
    lines: [
      "Relatorio emitido exclusivamente com dados estatisticos agregados.",
      "Identificadores de rede, hashes e sessoes anonimas preservam a privacidade dos participantes.",
      `Emissao gerada por: ${admin.fullName} (${admin.email} - Perfil ${admin.roleCode})`,
    ],
  });

  const pdfBuffer = generateArenaReportPdf({
    documentTitle: "Relatorio Consolidado Pos-Evento — Arena A Nova Moeda",
    subtitle: `${report.institution} · ${report.theme} · ${report.durationPlannedMin} Minutos (${report.certifiedHours}h Certificadas)`,
    sections,
  });

  const filename = `Relatorio_Arena_A_Nova_Moeda_${new Date().toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
