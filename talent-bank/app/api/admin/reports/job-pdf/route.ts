import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { generateExecutiveReportPdf } from "@/lib/pdf-generator";

export async function GET(req: NextRequest) {
  await getCurrentAdminUser();

  const jobId = req.nextUrl.searchParams.get("jobId");
  const job = jobId
    ? await prisma.job.findUnique({
        where: { id: jobId },
        include: { _count: { select: { applications: true, views: true } } },
      })
    : await prisma.job.findFirst({
        include: { _count: { select: { applications: true, views: true } } },
        orderBy: { createdAt: "desc" },
      });

  if (!job) {
    return NextResponse.json(
      { error: "Nenhuma vaga encontrada para geração de PDF." },
      { status: 404 }
    );
  }

  const pdfBuffer = generateExecutiveReportPdf({
    documentTitle: `DOCUMENTO DE OPORTUNIDADE: ${job.title}`,
    subtitle: `${job.companyName}  |  ${job.location}  |  Modalidade: ${job.modality}  |  Status: ${job.status}`,
    sections: [
      {
        title: "1. Resumo Operacional da Vaga",
        lines: [
          `Titulo da Oportunidade: ${job.title}`,
          `Empresa Contratante: ${job.companyName}`,
          `Area Profissional: ${job.professionalArea}`,
          `Localizacao: ${job.location} (${job.modality})`,
          `Tipo de Contratacao: ${job.contractType} | Nivel: ${job.experienceLevel}`,
          `Faixa Salarial: ${job.salaryRange || "A combinar"}`,
          `Prazo de Candidatura: ${
            job.applicationDeadline
              ? new Date(job.applicationDeadline).toLocaleDateString("pt-BR")
              : "Fluxo continuo"
          }`,
          `Total de Candidatos Inscritos: ${job._count.applications}`,
          `Visualizacoes Registradas: ${Math.max(
            job.viewsCount,
            job._count.views
          )}`,
        ],
      },
      {
        title: "2. Descricao da Oportunidade",
        lines: [job.description],
      },
      {
        title: "3. Responsabilidades e Atribuicoes",
        lines: [job.responsibilities],
      },
      {
        title: "4. Requisitos e Competencias Desejadas",
        lines: [
          job.requirements,
          job.desiredSkills.length > 0
            ? `Competencias-chave: ${job.desiredSkills.join(", ")}`
            : "",
        ].filter(Boolean),
      },
      {
        title: "5. Diferenciais e Beneficios",
        lines: [
          `Diferenciais: ${job.differentials || "Nao especificados"}`,
          `Beneficios: ${job.benefits || "Nao especificados"}`,
        ],
      },
    ],
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="vaga-${job.slug}.pdf"`,
    },
  });
}
