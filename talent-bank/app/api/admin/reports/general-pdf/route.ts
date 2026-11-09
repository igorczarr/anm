import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { generateExecutiveReportPdf } from "@/lib/pdf-generator";

export async function GET() {
  await getCurrentAdminUser();

  const [candidates, jobs, applications] = await Promise.all([
    prisma.candidateProfile.findMany({
      where: { archivedAt: null },
      include: {
        educations: true,
        experiences: true,
        skills: { include: { skill: true } },
      },
    }),
    prisma.job.findMany({ where: { archivedAt: null } }),
    prisma.application.findMany(),
  ]);

  const byArea: Record<string, number> = {};
  const byGeo: Record<string, number> = {};
  const byEdu: Record<string, number> = {};
  const bySkill: Record<string, number> = {};

  for (const c of candidates) {
    const area = c.interestArea || "Nao informada";
    byArea[area] = (byArea[area] || 0) + 1;

    const geo = [c.city, c.state].filter(Boolean).join("/") || "Nao informada";
    byGeo[geo] = (byGeo[geo] || 0) + 1;

    const edu = c.educations[0]?.level || "Nao informada";
    byEdu[edu] = (byEdu[edu] || 0) + 1;

    for (const cs of c.skills) {
      bySkill[cs.skill.name] = (bySkill[cs.skill.name] || 0) + 1;
    }
  }

  const pdfBuffer = generateExecutiveReportPdf({
    documentTitle: "RELATORIO GERAL DO BANCO DE TALENTOS",
    subtitle: `Iniciativa A Nova Moeda · Consolidado Executivo de Talentos, Vagas e Candidaturas`,
    sections: [
      {
        title: "1. Indicadores Globais da Plataforma",
        lines: [
          `Total de Candidatos Ativos: ${candidates.length}`,
          `Total de Vagas Cadastradas: ${jobs.length}`,
          `Total de Candidaturas Realizadas: ${applications.length}`,
          `Candidatos com Experiencia Profissional Registrada: ${
            candidates.filter((c) => c.experiences.length > 0).length
          }`,
        ],
      },
      {
        title: "2. Distribuicao por Area Profissional",
        lines: Object.entries(byArea).map(
          ([k, v]) => `${k}: ${v} talento(s)`
        ),
      },
      {
        title: "3. Distribuicao Geografica (Cidade / UF)",
        lines: Object.entries(byGeo).map(
          ([k, v]) => `${k}: ${v} talento(s)`
        ),
      },
      {
        title: "4. Formacao Academica Predominante",
        lines: Object.entries(byEdu).map(
          ([k, v]) => `${k}: ${v} talento(s)`
        ),
      },
      {
        title: "5. Competencias Mais Frequentes na Base",
        lines:
          Object.keys(bySkill).length === 0
            ? ["Nenhuma competencia registrada."]
            : Object.entries(bySkill)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => `${k}: ${v} ocorrencia(s)`),
      },
    ],
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-geral-banco-de-talentos-a-nova-moeda.pdf"`,
    },
  });
}
