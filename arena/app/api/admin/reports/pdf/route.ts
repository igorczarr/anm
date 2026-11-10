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
      title: "1. Indicadores Gerais do Evento (§15.1)",
      lines: [
        `Evento: ${report.name} — ${report.theme}`,
        `Instituicao: ${report.institution}`,
        `Inicio Programado: ${report.scheduledStartAt ? new Date(report.scheduledStartAt).toLocaleString("pt-BR") : "Nao configurado"}`,
        `Inicio Efetivo: ${report.actualStartAt ? new Date(report.actualStartAt).toLocaleString("pt-BR") : "Aguardando / Ao Vivo"}`,
        `Encerramento Efetivo: ${report.actualEndAt ? new Date(report.actualEndAt).toLocaleString("pt-BR") : "Em andamento"}`,
        `Duracao Total Prevista: ${report.durationPlannedMin} minutos`,
        `Duracao Total Realizada: ${report.durationActualMin} minutos`,
        `Sessoes de Participantes: ${report.totalSessionsCount} dispositivos (estimativa tecnica)`,
        `Pico de Conexoes Simultaneas: ${report.peakConnections} dispositivos`,
        `Perguntas Recebidas: ${report.questionsTotal} | Aprovadas: ${report.questionsApproved}`,
        `Perguntas Selecionadas para o Debate: ${report.questionsSelected}`,
        `Perguntas Respondidas no Palco: ${report.questionsAnswered}`,
        `Total Geral de Votos Computados: ${report.totalVotes} votos`,
      ],
    },
  ];

  for (const t of report.topics) {
    const lines = [
      `Palestrante Principal: ${t.speakerName} | Provocador: ${t.provokerLabel}`,
      `Tempo de Exposicao Efetivo: ${formatSecondsMMSS(t.expositionDurationSec)}`,
      `Tempo Efetivo da Rodada: ${formatSecondsMMSS(t.actualDurationSec)} (Previsto: ${formatSecondsMMSS(t.plannedDurationSec)})`,
      `Perguntas: ${t.questionsReceived} recebidas, ${t.questionsApproved} aprovadas, ${t.questionsAnswered} respondidas`,
      `Votacao (${t.totalVotes} votos): ${t.pollQuestion}`,
      ...t.optionsDistribution.map(
        (opt) => `  [Alternativa ${opt.order}] ${opt.label} -> ${opt.percentage}% (${opt.votesCount} votos)`
      ),
    ];

    sections.push({
      title: `Pauta ${t.number}: ${t.title}`,
      lines,
    });
  }

  sections.push({
    title: "Conformidade LGPD e Auditoria (§12.4)",
    lines: [
      "Relatorio emitido exclusivamente com dados estatisticos agregados.",
      "Identificadores de rede, hashes e sessoes anonimas preservam a privacidade dos participantes.",
      `Emissao gerada por: ${admin.fullName} (${admin.email} - Perfil ${admin.roleCode})`,
    ],
  });

  const pdfBuffer = generateArenaReportPdf({
    documentTitle: "Relatorio Consolidado Pos-Evento — Arena A Nova Moeda",
    subtitle: `${report.institution} · ${report.theme} · 131 Minutos`,
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
