import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import {
  buildCsvBuffer,
  buildSpreadsheetXmlBuffer,
} from "@/lib/pdf-generator";
import { Prisma, EducationLevel } from "@prisma/client";

export async function GET(req: NextRequest) {
  await getCurrentAdminUser();

  const sp = req.nextUrl.searchParams;
  const format = (sp.get("format") || "csv").toLowerCase();
  const q = (sp.get("q") || "").trim();
  const area = (sp.get("area") || "").trim();
  const city = (sp.get("city") || "").trim();
  const education = (sp.get("education") || "").trim();
  const skill = (sp.get("skill") || "").trim();

  const where: Prisma.CandidateProfileWhereInput = { archivedAt: null };
  if (q) {
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  if (area) where.interestArea = { equals: area, mode: "insensitive" };
  if (city) where.city = { contains: city, mode: "insensitive" };
  if (education) {
    where.educations = { some: { level: education as EducationLevel } };
  }
  if (skill) {
    where.skills = {
      some: { skill: { name: { contains: skill, mode: "insensitive" } } },
    };
  }

  const candidates = await prisma.candidateProfile.findMany({
    where,
    include: {
      educations: { orderBy: { startDate: "desc" }, take: 1 },
      experiences: { orderBy: { startDate: "desc" }, take: 1 },
      skills: { include: { skill: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "Nome Completo",
    "E-mail",
    "Telefone",
    "Cidade/UF",
    "Area Profissional",
    "Titulo Profissional",
    "Formacao Principal",
    "Experiencia Principal",
    "Competencias",
    "Completude (%)",
    "Autoriza Base de Talentos",
    "Autoriza Compartilhamento Empresas",
    "Data de Cadastro",
  ];

  const rows = candidates.map((c) => [
    c.fullName,
    c.email,
    c.phone || "",
    [c.city, c.state].filter(Boolean).join("/"),
    c.interestArea || "",
    c.professionalTitle || "",
    c.educations[0]
      ? `${c.educations[0].course} (${c.educations[0].level})`
      : "",
    c.experiences[0]
      ? `${c.experiences[0].role} @ ${c.experiences[0].company}`
      : "",
    c.skills.map((s) => s.skill.name).join(", "),
    String(c.completionPercent),
    c.isPublicInPool ? "Sim" : "Nao",
    c.allowCompanySharing ? "Sim" : "Nao",
    new Date(c.createdAt).toLocaleDateString("pt-BR"),
  ]);

  if (format === "xlsx") {
    const xmlBuf = buildSpreadsheetXmlBuffer("Candidatos", headers, rows);
    return new NextResponse(new Uint8Array(xmlBuf), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.ms-excel; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="candidatos-a-nova-moeda.xls"',
      },
    });
  }

  const csvBuf = buildCsvBuffer(headers, rows);
  return new NextResponse(new Uint8Array(csvBuf), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="candidatos-a-nova-moeda.csv"',
    },
  });
}
