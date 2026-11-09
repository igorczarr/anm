import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { generateExecutiveReportPdf } from "@/lib/pdf-generator";

export async function GET(req: NextRequest) {
  await getCurrentAdminUser();

  const jobId = req.nextUrl.searchParams.get("jobId");

  const job = jobId
    ? await prisma.job.findUnique({ where: { id: jobId } })
    : null;

  const applications = await prisma.application.findMany({
    where: jobId ? { jobId } : undefined,
    include: {
      candidate: {
        include: {
          educations: { orderBy: { startDate: "desc" }, take: 1 },
          experiences: { orderBy: { startDate: "desc" }, take: 1 },
        },
      },
      job: true,
    },
    orderBy: { appliedAt: "desc" },
  });

  const pdfBuffer = generateExecutiveReportPdf({
    documentTitle: job
      ? `RELATORIO DE CANDIDATURAS: ${job.title}`
      : "RELATORIO CONSOLIDADO DE CANDIDATURAS",
    subtitle: job
      ? `Empresa: ${job.companyName} | Local: ${job.location} | Total de Inscritos: ${applications.length}`
      : `Todas as oportunidades publicadas | Total de Inscricoes: ${applications.length}`,
    sections: [
      {
        title: "1. Informacoes da Oportunidade e Consolidado",
        lines: job
          ? [
              `Vaga: ${job.title} (${job.companyName})`,
              `Area: ${job.professionalArea} | Modalidade: ${job.modality}`,
              `Total de Candidatos Inscritos: ${applications.length}`,
            ]
          : [
              `Escopo: Todas as candidaturas registradas no Banco de Talentos A Nova Moeda`,
              `Total de Inscritos: ${applications.length}`,
            ],
      },
      {
        title: "2. Relacao Nominal de Candidatos, Formacao, Experiencia e Status",
        lines:
          applications.length === 0
            ? ["Nenhuma candidatura registrada para o filtro selecionado."]
            : applications.map((app, index) => {
                const edu = app.candidate.educations[0];
                const exp = app.candidate.experiences[0];
                return `${index + 1}. ${app.candidate.fullName} (${
                  app.candidate.email
                }) | Vaga: ${app.job.title} | Status: ${
                  app.status
                } | Data: ${new Date(app.appliedAt).toLocaleDateString(
                  "pt-BR"
                )} | Formacao: ${
                  edu ? `${edu.course} (${edu.level})` : "N/A"
                } | Experiencia: ${
                  exp ? `${exp.role} @ ${exp.company}` : "N/A"
                }`;
              }),
      },
    ],
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-candidaturas-a-nova-moeda.pdf"`,
    },
  });
}
