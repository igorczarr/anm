"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentAdminUser, logAdminAction } from "@/lib/admin-auth";
import { sendApplicationStatusEmail } from "@/lib/email";
import {
  ApplicationStatus,
  ContractType,
  EducationLevel,
  ExperienceLevel,
  JobStatus,
  WorkModality,
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

// 5.3. Criar ou atualizar vaga
export async function saveJobAdminAction(formData: FormData) {
  const admin = await getCurrentAdminUser();
  if (
    admin.role !== "ADMIN" &&
    admin.role !== "RECRUITER" &&
    admin.role !== "JOB_MANAGER"
  ) {
    return;
  }

  const jobId = String(formData.get("jobId") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const companyName = String(formData.get("companyName") || "").trim();
  const professionalArea = String(formData.get("professionalArea") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const modality = (String(formData.get("modality") || "HIBRIDO") as WorkModality);
  const contractType = (String(
    formData.get("contractType") || "CLT"
  ) as ContractType);
  const experienceLevel = (String(
    formData.get("experienceLevel") || "PLENO"
  ) as ExperienceLevel);
  const requiredEducationRaw = String(formData.get("requiredEducation") || "");
  const requiredEducation = (requiredEducationRaw
    ? requiredEducationRaw
    : null) as EducationLevel | null;

  const salaryRange = String(formData.get("salaryRange") || "").trim() || null;
  const description = String(formData.get("description") || "").trim();
  const responsibilities = String(formData.get("responsibilities") || "").trim();
  const requirements = String(formData.get("requirements") || "").trim();
  const differentials = String(formData.get("differentials") || "").trim() || null;
  const benefits = String(formData.get("benefits") || "").trim() || null;

  const desiredSkillsRaw = String(formData.get("desiredSkills") || "");
  const desiredSkills = desiredSkillsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const customQuestionsRaw = String(formData.get("customQuestions") || "");
  const customQuestions = customQuestionsRaw
    .split("\n")
    .map((q) => q.trim())
    .filter(Boolean);

  const vacanciesCount = Math.max(
    1,
    Number(formData.get("vacanciesCount") || 1)
  );
  const status = (String(formData.get("status") || "PUBLISHED") as JobStatus);
  const deadlineRaw = String(formData.get("applicationDeadline") || "").trim();
  const applicationDeadline = deadlineRaw ? new Date(deadlineRaw) : null;

  if (!title || !companyName || !description || !responsibilities || !requirements) {
    return;
  }

  if (jobId) {
    const existing = await prisma.job.findUnique({ where: { id: jobId } });
    if (!existing) return;

    const updated = await prisma.job.update({
      where: { id: jobId },
      data: {
        title,
        companyName,
        professionalArea,
        location,
        modality,
        contractType,
        experienceLevel,
        requiredEducation,
        salaryRange,
        description,
        responsibilities,
        requirements,
        differentials,
        benefits,
        desiredSkills,
        customQuestions,
        vacanciesCount,
        status,
        publishedAt:
          status === "PUBLISHED" && !existing.publishedAt
            ? new Date()
            : existing.publishedAt,
        applicationDeadline,
      },
    });

    await logAdminAction({
      userId: admin.id,
      action: "UPDATE_JOB",
      entityType: "Job",
      entityId: updated.id,
      metadata: { title: updated.title, status: updated.status },
    });
  } else {
    const baseSlug = slugify(`${title}-${companyName}`);
    const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

    const created = await prisma.job.create({
      data: {
        slug: uniqueSlug,
        title,
        companyName,
        professionalArea,
        location,
        modality,
        contractType,
        experienceLevel,
        requiredEducation,
        salaryRange,
        description,
        responsibilities,
        requirements,
        differentials,
        benefits,
        desiredSkills,
        customQuestions,
        vacanciesCount,
        status,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        applicationDeadline,
        ownerId: admin.id,
      },
    });

    await logAdminAction({
      userId: admin.id,
      action: "CREATE_JOB",
      entityType: "Job",
      entityId: created.id,
      metadata: { title: created.title, status: created.status },
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/vagas");
  revalidatePath("/vagas");
  revalidatePath("/");
}

// 5.3. Alterar status da vaga (Publicar, Pausar, Encerrar, Reabrir, Arquivar)
export async function updateJobStatusAdminAction(formData: FormData) {
  const admin = await getCurrentAdminUser();
  if (
    admin.role !== "ADMIN" &&
    admin.role !== "RECRUITER" &&
    admin.role !== "JOB_MANAGER"
  )
    return;

  const jobId = String(formData.get("jobId") || "");
  const status = String(formData.get("status") || "") as JobStatus;

  if (!jobId || !status) return;

  const job = await prisma.job.update({
    where: { id: jobId },
    data: {
      status,
      publishedAt: status === "PUBLISHED" ? new Date() : undefined,
      archivedAt: status === "ARCHIVED" ? new Date() : null,
    },
  });

  await logAdminAction({
    userId: admin.id,
    action: `JOB_STATUS_${status}`,
    entityType: "Job",
    entityId: job.id,
    metadata: { title: job.title, newStatus: status },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/vagas");
  revalidatePath("/vagas");
  revalidatePath("/");
}

// 5.4 e 5.5. Alterar status de candidatura (Tabela e Funil Kanban) com histórico auditável
export async function updateApplicationStatusAdminAction(formData: FormData) {
  const admin = await getCurrentAdminUser();
  const applicationId = String(formData.get("applicationId") || "");
  const toStatus = String(formData.get("toStatus") || "") as ApplicationStatus;
  const note = String(formData.get("note") || "").trim() || null;

  if (!applicationId || !toStatus) return;

  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      candidate: true,
      job: true,
    },
  });

  if (!app || app.status === toStatus) return;

  await prisma.application.update({
    where: { id: applicationId },
    data: {
      status: toStatus,
      history: {
        create: {
          fromStatus: app.status,
          toStatus,
          actorId: admin.id,
          note:
            note ||
            `Status atualizado pela equipe gestora (${admin.fullName}).`,
        },
      },
    },
  });

  await logAdminAction({
    userId: admin.id,
    action: "APPLICATION_STATUS_CHANGE",
    entityType: "Application",
    entityId: app.id,
    metadata: {
      fromStatus: app.status,
      toStatus,
      candidate: app.candidate.fullName,
      job: app.job.title,
    },
  });

  try {
    await sendApplicationStatusEmail({
      to: app.candidate.email,
      candidateName: app.candidate.fullName,
      jobTitle: app.job.title,
      companyName: app.job.companyName,
      newStatus: toStatus,
    });
  } catch {
    // Continua normalmente caso o envio de e-mail falhe
  }

  revalidatePath("/admin");
  revalidatePath("/admin/candidaturas");
  revalidatePath("/admin/kanban");
  revalidatePath("/candidaturas");
  revalidatePath("/painel");
}

// 5.4. Adicionar observação interna e avaliação privada (invisível ao candidato)
export async function addInternalApplicationNoteAction(formData: FormData) {
  const admin = await getCurrentAdminUser();
  const applicationId = String(formData.get("applicationId") || "");
  const content = String(formData.get("content") || "").trim();
  const ratingRaw = String(formData.get("rating") || "").trim();
  const rating =
    ratingRaw && !isNaN(Number(ratingRaw)) ? Number(ratingRaw) : null;

  if (!applicationId || !content) return;

  const note = await prisma.applicationNote.create({
    data: {
      applicationId,
      authorId: admin.id,
      content,
      rating,
    },
  });

  await logAdminAction({
    userId: admin.id,
    action: "ADD_INTERNAL_NOTE",
    entityType: "ApplicationNote",
    entityId: note.id,
    metadata: { applicationId, rating },
  });

  revalidatePath("/admin/candidaturas");
}

// 5.2. Arquivar ou restaurar registro de candidato (respeitando retenção e privacidade)
export async function toggleArchiveCandidateAction(formData: FormData) {
  const admin = await getCurrentAdminUser();
  if (admin.role !== "ADMIN") return;

  const candidateId = String(formData.get("candidateId") || "");
  if (!candidateId) return;

  const candidate = await prisma.candidateProfile.findUnique({
    where: { id: candidateId },
  });

  if (!candidate) return;

  const nextArchivedAt = candidate.archivedAt ? null : new Date();

  await prisma.candidateProfile.update({
    where: { id: candidateId },
    data: { archivedAt: nextArchivedAt },
  });

  await logAdminAction({
    userId: admin.id,
    action: nextArchivedAt ? "ARCHIVE_CANDIDATE" : "RESTORE_CANDIDATE",
    entityType: "CandidateProfile",
    entityId: candidate.id,
    metadata: { fullName: candidate.fullName },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/candidatos");
  revalidatePath(`/admin/candidatos/${candidateId}`);
}


// Passaporte de Talentos: avaliador identificado altera o estado da competência
export async function setSkillEvidenceStatusAdminAction(formData: FormData) {
  const admin = await getCurrentAdminUser();
  if (
    admin.role !== "ADMIN" &&
    admin.role !== "RECRUITER" &&
    admin.role !== "JOB_MANAGER"
  )
    return;

  const candidateSkillId = String(formData.get("candidateSkillId") || "");
  const status = String(formData.get("status") || "");
  if (
    !candidateSkillId ||
    !["DECLARADA", "DOCUMENTADA", "DEMONSTRADA", "VALIDADA"].includes(status)
  )
    return;

  const current = await prisma.candidateSkill.findUnique({
    where: { id: candidateSkillId },
    include: { skill: true },
  });
  if (!current) return;

  const isValidated = status === "VALIDADA";
  await prisma.candidateSkill.update({
    where: { id: candidateSkillId },
    data: {
      evidenceStatus: status as "DECLARADA" | "DOCUMENTADA" | "DEMONSTRADA" | "VALIDADA",
      validatedById: isValidated ? admin.id : null,
      validatedAt: isValidated ? new Date() : null,
    },
  });

  await logAdminAction({
    userId: admin.id,
    action: "SKILL_STATUS_CHANGE",
    entityType: "CandidateSkill",
    entityId: candidateSkillId,
    metadata: {
      skill: current.skill.name,
      from: current.evidenceStatus,
      to: status,
    },
  });

  revalidatePath(`/admin/candidatos/${current.candidateId}`);
  revalidatePath("/perfil");
}
