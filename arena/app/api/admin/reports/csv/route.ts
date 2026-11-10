import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { getConsolidatedEventReport } from "@/lib/reports";
import { buildCsvBuffer } from "@/lib/pdf-generator";
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

  const headers = [
    "Pauta",
    "Titulo",
    "Palestrante",
    "Provocador",
    "Tempo Exposicao Previsto (s)",
    "Tempo Efetivo Rodada (s)",
    "Tempo Efetivo Formatado",
    "Perguntas Recebidas",
    "Perguntas Aprovadas",
    "Perguntas Respondidas",
    "Total Votos",
    "Pergunta Votacao",
    "Distribuicao Votos Resumo",
  ];

  const rows = report.topics.map((t) => [
    `Pauta ${t.number}`,
    t.title,
    t.speakerName,
    t.provokerLabel,
    String(t.plannedDurationSec),
    String(t.actualDurationSec),
    formatSecondsMMSS(t.actualDurationSec),
    String(t.questionsReceived),
    String(t.questionsApproved),
    String(t.questionsAnswered),
    String(t.totalVotes),
    t.pollQuestion,
    t.optionsDistribution
      .map((o) => `[Alt ${o.order}] ${o.label}: ${o.percentage}% (${o.votesCount})`)
      .join(" | "),
  ]);

  const csvBuffer = buildCsvBuffer(headers, rows);
  const filename = `Dados_Arena_A_Nova_Moeda_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(new Uint8Array(csvBuffer), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
