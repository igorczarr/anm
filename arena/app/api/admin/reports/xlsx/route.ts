import { NextResponse } from "next/server";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { getConsolidatedEventReport } from "@/lib/reports";
import { buildSpreadsheetXmlBuffer } from "@/lib/pdf-generator";
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
    "Pauta Nº",
    "Título da Pauta",
    "Palestrante Principal",
    "Provocador(a)",
    "Tempo Previsto",
    "Tempo Efetivo",
    "Perguntas Recebidas",
    "Perguntas Aprovadas",
    "Perguntas Respondidas",
    "Total Votos Computados",
    "Enquete / Votação",
    "Alternativa Mais Votada",
  ];

  const rows = report.topics.map((t) => {
    const topOption = [...t.optionsDistribution].sort(
      (a, b) => b.votesCount - a.votesCount
    )[0];

    const topOptionStr = topOption
      ? `${topOption.label} (${topOption.percentage}%)`
      : "—";

    return [
      String(t.number),
      t.title,
      t.speakerName,
      t.provokerLabel,
      formatSecondsMMSS(t.plannedDurationSec),
      formatSecondsMMSS(t.actualDurationSec),
      String(t.questionsReceived),
      String(t.questionsApproved),
      String(t.questionsAnswered),
      String(t.totalVotes),
      t.pollQuestion,
      topOptionStr,
    ];
  });

  const xmlBuffer = buildSpreadsheetXmlBuffer(
    "Arena_A_Nova_Moeda",
    headers,
    rows
  );

  const filename = `Consolidado_Arena_A_Nova_Moeda_${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new NextResponse(new Uint8Array(xmlBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.ms-excel",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
