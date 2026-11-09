import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import {
  buildCsvBuffer,
  buildSpreadsheetXmlBuffer,
} from "@/lib/pdf-generator";
import { Prisma, ApplicationStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  await getCurrentAdminUser();

  const sp = req.nextUrl.searchParams;
  const format = (sp.get("format") || "csv").toLowerCase();
  const jobId = (sp.get("jobId") || "").trim();
  const status = (sp.get("status") || "").trim();

  const where: Prisma.ApplicationWhereInput = {};
  if (jobId) where.jobId = jobId;
  if (status) where.status = status as ApplicationStatus;

  const applications = await prisma.application.findMany({
    where,
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

  const headers = [
    "Candidato",
    "E-mail",
    "Telefone",
    "Vaga",
    "Empresa",
    "Area Profissional",
    "Formacao",
    "Experiencia",
    "Status da Candidatura",
    "Data da Inscricao",
  ];

  const rows = applications.map((app) => [
    app.candidate.fullName,
    app.candidate.email,
    app.candidate.phone || "",
    app.job.title,
    app.job.companyName,
    app.candidate.interestArea || "",
    app.candidate.educations[0]?.course || "",
    app.candidate.experiences[0]?.role || "",
    app.status,
    new Date(app.appliedAt).toLocaleString("pt-BR"),
  ]);

  if (format === "xlsx") {
    const xmlBuf = buildSpreadsheetXmlBuffer("Candidaturas", headers, rows);
    return new NextResponse(new Uint8Array(xmlBuf), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="candidaturas-a-nova-moeda.xls"',
      },
    });
  }

  const csvBuf = buildCsvBuffer(headers, rows);
  return new NextResponse(new Uint8Array(csvBuf), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="candidaturas-a-nova-moeda.csv"',
    },
  });
}
