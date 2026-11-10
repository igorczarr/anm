import { NextRequest, NextResponse } from "next/server";
import { getOrCreateCurrentCandidate } from "@/lib/current-candidate";
import { prisma } from "@/lib/prisma";

function buildSimplePdfBuffer({
  fullName,
  professionalTitle,
  email,
  phone,
  location,
  linkedinUrl,
  summary,
  careerObjective,
  educations,
  experiences,
  skills,
  languages,
}: {
  fullName: string;
  professionalTitle: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl: string;
  summary: string;
  careerObjective: string;
  educations: { course: string; institution: string; level: string; status: string; year: string }[];
  experiences: { role: string; company: string; period: string; description: string }[];
  skills: string[];
  languages: { language: string; proficiency: string }[];
}): Buffer {
  // Normaliza caracteres latinos para WinAnsi/PDF Standard Type1 Helvetica
  const clean = (str: string) =>
    str
      .replace(/[()\\]/g, "")
      .replace(/[^\x20-\x7E\xA0-\xFF]/g, " ")
      .trim();

  const wrapLine = (text: string, maxChars = 84): string[] => {
    const words = clean(text).split(/\s+/);
    const lines: string[] = [];
    let current = "";
    for (const w of words) {
      if ((current + " " + w).trim().length > maxChars) {
        if (current) lines.push(current);
        current = w;
      } else {
        current = (current + " " + w).trim();
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  const ops: string[] = [];
  let y = 785;

  const drawText = (
    text: string,
    x: number,
    yPos: number,
    font: "F1" | "F2" = "F1",
    size = 10,
    rgb: [number, number, number] = [0.12, 0.14, 0.12]
  ) => {
    ops.push(
      `BT /${font} ${size} Tf ${rgb[0]} ${rgb[1]} ${rgb[2]} rg ${x} ${yPos} Td (${clean(
        text
      )}) Tj ET`
    );
  };

  // Faixa superior elegante A Nova Moeda
  ops.push("0.04 0.08 0.05 rg 0 740 595 102 re f");
  ops.push("0.83 0.77 0.66 RG 1 w 40 740 m 555 740 l S");

  drawText("A NOVA MOEDA · BANCO DE TALENTOS", 42, 812, "F2", 8, [0.83, 0.77, 0.66]);
  drawText(fullName.toUpperCase(), 42, 786, "F2", 18, [0.97, 0.87, 0.79]);
  drawText(
    professionalTitle || "Profissional Cadastrado — A Nova Moeda",
    42,
    767,
    "F1",
    11,
    [0.83, 0.77, 0.66]
  );

  const contactLine = [email, phone, location, linkedinUrl]
    .filter(Boolean)
    .join("  |  ");
  drawText(contactLine, 42, 750, "F1", 8.5, [0.83, 0.77, 0.66]);

  y = 715;

  const drawSectionHeader = (title: string) => {
    if (y < 90) return;
    y -= 8;
    drawText(title.toUpperCase(), 42, y, "F2", 10.5, [0.34, 0.33, 0.18]);
    y -= 5;
    ops.push(`0.83 0.77 0.66 RG 0.8 w 42 ${y} m 553 ${y} l S`);
    y -= 15;
  };

  if (summary) {
    drawSectionHeader("Resumo Profissional");
    for (const line of wrapLine(summary, 88)) {
      if (y < 60) break;
      drawText(line, 42, y, "F1", 9.5);
      y -= 13;
    }
  }

  if (careerObjective) {
    drawSectionHeader("Objetivo Profissional");
    for (const line of wrapLine(careerObjective, 88)) {
      if (y < 60) break;
      drawText(line, 42, y, "F1", 9.5);
      y -= 13;
    }
  }

  if (experiences.length > 0) {
    drawSectionHeader("Experiencia Profissional");
    for (const exp of experiences) {
      if (y < 80) break;
      drawText(`${exp.role} — ${exp.company}`, 42, y, "F2", 10);
      drawText(exp.period, 430, y, "F1", 8.5, [0.4, 0.4, 0.4]);
      y -= 13;
      if (exp.description) {
        for (const line of wrapLine(exp.description, 86)) {
          if (y < 60) break;
          drawText(line, 48, y, "F1", 9, [0.22, 0.22, 0.22]);
          y -= 12;
        }
      }
      y -= 4;
    }
  }

  if (educations.length > 0) {
    drawSectionHeader("Formacao Academica");
    for (const edu of educations) {
      if (y < 70) break;
      drawText(`${edu.course} (${edu.level})`, 42, y, "F2", 10);
      drawText(edu.year, 430, y, "F1", 8.5, [0.4, 0.4, 0.4]);
      y -= 13;
      drawText(`${edu.institution} · ${edu.status}`, 48, y, "F1", 9, [0.25, 0.25, 0.25]);
      y -= 15;
    }
  }

  if (skills.length > 0) {
    drawSectionHeader("Competencias Principais");
    for (const line of wrapLine(skills.join("  •  "), 88)) {
      if (y < 60) break;
      drawText(line, 42, y, "F1", 9.5);
      y -= 13;
    }
  }

  if (languages.length > 0) {
    drawSectionHeader("Idiomas");
    const langLine = languages
      .map((l) => `${l.language} (${l.proficiency})`)
      .join("   |   ");
    drawText(langLine, 42, y, "F1", 9.5);
    y -= 14;
  }

  // Rodapé institucional
  const issuedDate = new Date().toLocaleDateString("pt-BR");
  ops.push("0.83 0.77 0.66 RG 0.5 w 42 38 m 553 38 l S");
  drawText(
    `Currículo oficial gerado pelo Banco de Talentos — A Nova Moeda em ${issuedDate}`,
    42,
    24,
    "F1",
    8,
    [0.45, 0.45, 0.45]
  );
  drawText("Página 1 de 1", 495, 24, "F1", 8, [0.45, 0.45, 0.45]);

  const contentStream = ops.join("\n");

  const objects: string[] = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n",
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n",
    `6 0 obj\n<< /Length ${Buffer.byteLength(
      contentStream,
      "latin1"
    )} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];

  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += obj;
  }

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${
    objects.length + 1
  } /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "latin1");
}

export async function GET(req: NextRequest) {
  const candidateIdParam = req.nextUrl.searchParams.get("candidateId");
  const { profile: currentProfile, user } = await getOrCreateCurrentCandidate();

  let targetProfile = currentProfile;

  if (
    candidateIdParam &&
    candidateIdParam !== currentProfile.id &&
    (user.role === "ADMIN" ||
      user.role === "RECRUITER" ||
      user.role === "JOB_MANAGER" ||
      user.role === "ANALYST")
  ) {
    const found = await prisma.candidateProfile.findUnique({
      where: { id: candidateIdParam },
      include: {
        educations: { orderBy: { startDate: "desc" } },
        experiences: { orderBy: { startDate: "desc" } },
        skills: { include: { skill: true, evidences: true } },
        languages: { orderBy: { createdAt: "asc" } },
        resumes: { orderBy: { updatedAt: "desc" } },
        applications: {
          include: {
            job: true,
            history: { orderBy: { createdAt: "desc" } },
          },
        },
      },
    });
    if (found) targetProfile = found;
  }

  const pdfBuffer = buildSimplePdfBuffer({
    fullName: targetProfile.fullName,
    professionalTitle:
      targetProfile.professionalTitle ||
      targetProfile.interestArea ||
      "Profissional — Banco de Talentos A Nova Moeda",
    email: targetProfile.email,
    phone: targetProfile.phone || "",
    location: [targetProfile.city, targetProfile.state]
      .filter(Boolean)
      .join(" - "),
    linkedinUrl: targetProfile.linkedinUrl || "",
    summary: targetProfile.summary || "",
    careerObjective: targetProfile.careerObjective || "",
    educations: targetProfile.educations.map((e) => ({
      course: e.course,
      institution: e.institution,
      level: e.level,
      status: e.status,
      year: `${new Date(e.startDate).getFullYear()} - ${
        e.endDate ? new Date(e.endDate).getFullYear() : "Atual"
      }`,
    })),
    experiences: targetProfile.experiences.map((ex) => ({
      role: ex.role,
      company: ex.company,
      period: `${new Date(ex.startDate).getFullYear()} - ${
        ex.isCurrent || !ex.endDate
          ? "Atual"
          : new Date(ex.endDate).getFullYear()
      }`,
      description: ex.description || "",
    })),
    skills: targetProfile.skills.map((s) => s.skill.name),
    languages: targetProfile.languages.map((l) => ({
      language: l.language,
      proficiency: l.proficiency,
    })),
  });

  const safeSlug = targetProfile.fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="curriculo-${safeSlug}-a-nova-moeda.pdf"`,
    },
  });
}
