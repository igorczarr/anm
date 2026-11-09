"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOrCreateCurrentCandidate } from "@/lib/current-candidate";
import {
  EducationLevel,
  EducationStatus,
  WorkModality,
  LanguageProficiency,
  ConsentPurpose,
} from "@prisma/client";

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// A + B + G: Dados Pessoais, Apresentação e Preferências Profissionais
export async function updateProfileMainAction(formData: FormData) {
  const { profile, user } = await getOrCreateCurrentCandidate();

  const fullName = String(formData.get("fullName") || profile.fullName).trim();
  const removePhoto = formData.get("removePhoto") === "on";
  const photoFile = formData.get("photoFile") as File | null;

  let photoUrl = removePhoto ? null : profile.photoUrl;

  if (photoFile && typeof photoFile === "object" && photoFile.size > 0) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    const maxBytes = 10 * 1024 * 1024; // 10 MB
    if (allowedTypes.includes(photoFile.type) && photoFile.size <= maxBytes) {
      const arrayBuffer = await photoFile.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      photoUrl = `data:${photoFile.type};base64,${base64}`;
    }
  }

  const email = String(formData.get("email") || profile.email).trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const city = String(formData.get("city") || "").trim() || null;
  const state = String(formData.get("state") || "").trim() || null;
  const linkedinUrl = String(formData.get("linkedinUrl") || "").trim() || null;
  const portfolioUrl = String(formData.get("portfolioUrl") || "").trim() || null;

  const professionalTitle = String(formData.get("professionalTitle") || "").trim() || null;
  const summary = String(formData.get("summary") || "").trim() || null;
  const interestArea = String(formData.get("interestArea") || "").trim() || null;
  const careerObjective = String(formData.get("careerObjective") || "").trim() || null;

  const desiredRolesRaw = String(formData.get("desiredRoles") || "");
  const desiredRoles = desiredRolesRaw
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);

  const preferredModalityRaw = String(formData.get("preferredModality") || "");
  const preferredModality = (["PRESENCIAL", "HIBRIDO", "REMOTO"].includes(
    preferredModalityRaw
  )
    ? preferredModalityRaw
    : null) as WorkModality | null;

  const availability = String(formData.get("availability") || "").trim() || null;
  const salaryExpectationRaw = String(formData.get("salaryExpectation") || "").trim();
  const salaryExpectation =
    salaryExpectationRaw && !isNaN(Number(salaryExpectationRaw))
      ? Number(salaryExpectationRaw)
      : null;

  const isPublicInPool = formData.get("isPublicInPool") === "on";
  const allowCompanySharing = formData.get("allowCompanySharing") === "on";

  await prisma.candidateProfile.update({
    where: { id: profile.id },
    data: {
      fullName,
      photoUrl,
      email,
      phone,
      city,
      state,
      linkedinUrl,
      portfolioUrl,
      professionalTitle,
      summary,
      interestArea,
      careerObjective,
      desiredRoles,
      preferredModality,
      availability,
      salaryExpectation,
      isPublicInPool,
      allowCompanySharing,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { fullName },
  });

  // Registra atualização de consentimentos granulares LGPD
  await prisma.consentRecord.createMany({
    data: [
      {
        userId: user.id,
        purpose: ConsentPurpose.TALENT_POOL_OPPORTUNITIES,
        termsVersion: "v1.0-2026",
        granted: isPublicInPool,
      },
      {
        userId: user.id,
        purpose: ConsentPurpose.COMPANY_DATA_SHARING,
        termsVersion: "v1.0-2026",
        granted: allowCompanySharing,
      },
    ],
  });

  revalidatePath("/painel");
  revalidatePath("/perfil");
  revalidatePath("/curriculo");
  redirect("/perfil?salvo=dados");
}

// C. Formação Acadêmica
export async function addEducationAction(formData: FormData) {
  const { profile } = await getOrCreateCurrentCandidate();

  const institution = String(formData.get("institution") || "").trim();
  const course = String(formData.get("course") || "").trim();
  const level = (String(formData.get("level") || "GRADUACAO") as EducationLevel);
  const status = (String(formData.get("status") || "CONCLUIDO") as EducationStatus);
  const startDateStr = String(formData.get("startDate") || "");
  const endDateStr = String(formData.get("endDate") || "");

  if (!institution || !course || !startDateStr) return;

  await prisma.education.create({
    data: {
      candidateId: profile.id,
      institution,
      course,
      level,
      status,
      startDate: new Date(startDateStr),
      endDate: endDateStr ? new Date(endDateStr) : null,
    },
  });

  revalidatePath("/perfil");
  revalidatePath("/painel");
  revalidatePath("/curriculo");
  redirect("/perfil?salvo=formacao");
}

export async function deleteEducationAction(formData: FormData) {
  const { profile } = await getOrCreateCurrentCandidate();
  const id = String(formData.get("id") || "");
  if (!id) return;

  await prisma.education.deleteMany({
    where: { id, candidateId: profile.id },
  });

  revalidatePath("/perfil");
  revalidatePath("/painel");
  revalidatePath("/curriculo");
  redirect("/perfil?salvo=formacao_removida");
}

// D. Experiência Profissional
export async function addExperienceAction(formData: FormData) {
  const { profile } = await getOrCreateCurrentCandidate();

  const company = String(formData.get("company") || "").trim();
  const role = String(formData.get("role") || "").trim();
  const modalityRaw = String(formData.get("modality") || "");
  const modality = (["PRESENCIAL", "HIBRIDO", "REMOTO"].includes(modalityRaw)
    ? modalityRaw
    : null) as WorkModality | null;
  const startDateStr = String(formData.get("startDate") || "");
  const endDateStr = String(formData.get("endDate") || "");
  const isCurrent = formData.get("isCurrent") === "on";
  const description = String(formData.get("description") || "").trim() || null;

  if (!company || !role || !startDateStr) return;

  await prisma.experience.create({
    data: {
      candidateId: profile.id,
      company,
      role,
      modality,
      startDate: new Date(startDateStr),
      endDate: isCurrent || !endDateStr ? null : new Date(endDateStr),
      isCurrent,
      description,
    },
  });

  revalidatePath("/perfil");
  revalidatePath("/painel");
  revalidatePath("/curriculo");
  redirect("/perfil?salvo=experiencia");
}

export async function deleteExperienceAction(formData: FormData) {
  const { profile } = await getOrCreateCurrentCandidate();
  const id = String(formData.get("id") || "");
  if (!id) return;

  await prisma.experience.deleteMany({
    where: { id, candidateId: profile.id },
  });

  revalidatePath("/perfil");
  revalidatePath("/painel");
  revalidatePath("/curriculo");
  redirect("/perfil?salvo=experiencia_removida");
}

// E. Competências (incluindo competências personalizadas ilimitadas)
export async function addSkillAction(formData: FormData) {
  const { profile } = await getOrCreateCurrentCandidate();

  const rawName = String(formData.get("skillName") || "").trim();
  const category = String(formData.get("category") || "Personalizada").trim();
  if (!rawName) return;

  const slug = slugify(rawName);
  if (!slug) return;

  const skill = await prisma.skill.upsert({
    where: { slug },
    update: {},
    create: {
      name: rawName,
      slug,
      category,
    },
  });

  await prisma.candidateSkill.upsert({
    where: {
      candidateId_skillId: {
        candidateId: profile.id,
        skillId: skill.id,
      },
    },
    update: {},
    create: {
      candidateId: profile.id,
      skillId: skill.id,
    },
  });

  revalidatePath("/perfil");
  revalidatePath("/painel");
  revalidatePath("/curriculo");
  redirect("/perfil?salvo=competencia");
}

export async function removeSkillAction(formData: FormData) {
  const { profile } = await getOrCreateCurrentCandidate();
  const candidateSkillId = String(formData.get("candidateSkillId") || "");
  if (!candidateSkillId) return;

  await prisma.candidateSkill.deleteMany({
    where: { id: candidateSkillId, candidateId: profile.id },
  });

  revalidatePath("/perfil");
  revalidatePath("/painel");
  revalidatePath("/curriculo");
  redirect("/perfil?salvo=competencia_removida");
}

// F. Idiomas
export async function addLanguageAction(formData: FormData) {
  const { profile } = await getOrCreateCurrentCandidate();
  const language = String(formData.get("language") || "").trim();
  const proficiency = (String(
    formData.get("proficiency") || "INTERMEDIARIO"
  ) as LanguageProficiency);

  if (!language) return;

  await prisma.language.create({
    data: {
      candidateId: profile.id,
      language,
      proficiency,
    },
  });

  revalidatePath("/perfil");
  revalidatePath("/painel");
  revalidatePath("/curriculo");
  redirect("/perfil?salvo=idioma");
}

export async function deleteLanguageAction(formData: FormData) {
  const { profile } = await getOrCreateCurrentCandidate();
  const id = String(formData.get("id") || "");
  if (!id) return;

  await prisma.language.deleteMany({
    where: { id, candidateId: profile.id },
  });

  revalidatePath("/perfil");
  revalidatePath("/painel");
  revalidatePath("/curriculo");
  redirect("/perfil?salvo=idioma_removido");
}
