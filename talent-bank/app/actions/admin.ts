"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentAdminUser, logAdminAction } from "@/lib/admin-auth";
import { sendApplicationStatusEmail } from "@/lib/email";
import { evaluateJobTransparency } from "@/lib/transparency";
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

// Fase 2 — Oportunidades Transparentes: Criar ou atualizar vaga com padrão obrigatório de qualidade
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
  const companyIdentifier =
    String(formData.get("companyIdentifier") || "").trim() || null;
  const companyVerifiedInput = formData.get("companyVerified") === "on";
  const canVerifyCompany =
    admin.role === "ADMIN" || admin.role === "JOB_MANAGER";

  const professionalArea = String(formData.get("professionalArea") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const modality = (String(
    formData.get("modality") || "PRESENCIAL"
  ) as WorkModality);
  const contractType = (String(
    formData.get("contractType") || "CLT"
  ) as ContractType);
  const experienceLevel = (String(
    formData.get("experienceLevel") || "JUNIOR"
  ) as ExperienceLevel);
  const requiredEducationRaw = String(formData.get("requiredEducation") || "");
  const requiredEducation = (requiredEducationRaw
    ? requiredEducationRaw
    : null) as EducationLevel | null;

  const salaryRange = String(formData.get("salaryRange") || "").trim() || null;
  const workSchedule =
    String(formData.get("workSchedule") || "").trim() || null;
  const description = String(formData.get("description") || "").trim();
  const responsibilities = String(
    formData.get("responsibilities") || ""
  ).trim();
  const requirements = String(formData.get("requirements") || "").trim();
  const differentials =
    String(formData.get("differentials") || "").trim() || null;
  const benefits = String(formData.get("benefits") || "").trim() || null;
  const growthPossibility =
    String(formData.get("growthPossibility") || "").trim() || null;

  const desiredSkillsRaw = String(formData.get("desiredSkills") || "");
  const desiredSkills = desiredSkillsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const selectionStagesRaw = String(formData.get("selectionStages") || "");
  const selectionStages = selectionStagesRaw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const feedbackSlaDays = Math.max(
    1,
    Number(formData.get("feedbackSlaDays") || 7)
  );
  const feedbackEstimate =
    String(formData.get("feedbackEstimate") || "").trim() || null;

  const customQuestionsRaw = String(formData.get("customQuestions") || "");
  const customQuestions = customQuestionsRaw
    .split("\n")
    .map((q) => q.trim())
    .filter(Boolean);

  const vacanciesCount = Math.max(
    1,
    Number(formData.get("vacanciesCount") || 1)
  );
  const requestedStatus = (String(
    formData.get("status") || "PUBLISHED"
  ) as JobStatus);
  const deadlineRaw = String(formData.get("applicationDeadline") || "").trim();
  const applicationDeadline = deadlineRaw ? new Date(deadlineRaw) : null;

  if (!title || !companyName || !description || !responsibilities || !requirements) {
    return;
  }

  const transparency = evaluateJobTransparency({
    title,
    companyName,
    companyIdentifier,
    companyVerified: canVerifyCompany ? companyVerifiedInput : false,
    professionalArea,
    location,
    modality,
    contractType,
    salaryRange,
    workSchedule,
    description,
    responsibilities,
    requirements,
    differentials,
    benefits,
    growthPossibility,
    desiredSkills,
    selectionStages,
    feedbackSlaDays,
    feedbackEstimate,
    applicationDeadline,
  });

  // Guardrail Fase 2: bloqueia publicação se faltarem itens obrigatórios do Padrão de Transparência
  const blockedPublish =
    requestedStatus === "PUBLISHED" && !transparency.isTransparentStandard;
  const status: JobStatus = blockedPublish ? "DRAFT" : requestedStatus;

  let savedId = jobId;

  if (jobId) {
    const existing = await prisma.job.findUnique({ where: { id: jobId } });
    if (!existing) return;

    const nextCompanyVerified = canVerifyCompany
      ? companyVerifiedInput
      : existing.companyVerified;

    const updated = await prisma.job.update({
      where: { id: jobId },
      data: {
        title,
        companyName,
        companyIdentifier,
        companyVerified: nextCompanyVerified,
        companyVerifiedByName: nextCompanyVerified
          ? existing.companyVerifiedByName || admin.fullName
          : null,
        companyVerifiedAt: nextCompanyVerified
          ? existing.companyVerifiedAt || new Date()
          : null,
        professionalArea,
        location,
        modality,
        contractType,
        experienceLevel,
        requiredEducation,
        salaryRange,
        workSchedule,
        description,
        responsibilities,
        requirements,
        differentials,
        benefits,
        growthPossibility,
        desiredSkills,
        selectionStages,
        feedbackSlaDays,
        feedbackEstimate,
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
    savedId = updated.id;

    await logAdminAction({
      userId: admin.id,
      action: "UPDATE_JOB",
      entityType: "Job",
      entityId: updated.id,
      metadata: {
        title: updated.title,
        status: updated.status,
        transparencyScore: transparency.score,
        companyVerified: updated.companyVerified,
      },
    });
  } else {
    const baseSlug = slugify(`${title}-${companyName}`);
    const uniqueSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

    const nextCompanyVerified = canVerifyCompany ? companyVerifiedInput : false;

    const created = await prisma.job.create({
      data: {
        slug: uniqueSlug,
        title,
        companyName,
        companyIdentifier,
        companyVerified: nextCompanyVerified,
        companyVerifiedByName: nextCompanyVerified ? admin.fullName : null,
        companyVerifiedAt: nextCompanyVerified ? new Date() : null,
        professionalArea,
        location,
        modality,
        contractType,
        experienceLevel,
        requiredEducation,
        salaryRange,
        workSchedule,
        description,
        responsibilities,
        requirements,
        differentials,
        benefits,
        growthPossibility,
        desiredSkills,
        selectionStages,
        feedbackSlaDays,
        feedbackEstimate,
        customQuestions,
        vacanciesCount,
        status,
        publishedAt: status === "PUBLISHED" ? new Date() : null,
        applicationDeadline,
        ownerId: admin.id,
      },
    });
    savedId = created.id;

    await logAdminAction({
      userId: admin.id,
      action: "CREATE_JOB",
      entityType: "Job",
      entityId: created.id,
      metadata: {
        title: created.title,
        status: created.status,
        transparencyScore: transparency.score,
        companyVerified: created.companyVerified,
      },
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/vagas");
  revalidatePath("/vagas");
  revalidatePath("/");

  if (blockedPublish) {
    redirect(`/admin/vagas?edit=${savedId}&aviso=incompleta`);
  }
  redirect(`/admin/vagas?salvo=${status === "PUBLISHED" ? "publicada" : "salva"}`);
}

// Fase 2: Alterar status da vaga (com guardrail contra publicar vaga incompleta)
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

  const existing = await prisma.job.findUnique({ where: { id: jobId } });
  if (!existing) return;

  if (status === "PUBLISHED") {
    const transparency = evaluateJobTransparency(existing);
    if (!transparency.isTransparentStandard) {
      redirect(`/admin/vagas?edit=${existing.id}&aviso=incompleta`);
    }
  }

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

// Fase 2: Verificar / remover verificação de empresa na oportunidade
export async function toggleVerifyJobCompanyAdminAction(formData: FormData) {
  const admin = await getCurrentAdminUser();
  if (admin.role !== "ADMIN" && admin.role !== "JOB_MANAGER") return;

  const jobId = String(formData.get("jobId") || "");
  if (!jobId) return;

  const existing = await prisma.job.findUnique({ where: { id: jobId } });
  if (!existing) return;

  const nextVerified = !existing.companyVerified;

  const updated = await prisma.job.update({
    where: { id: jobId },
    data: {
      companyVerified: nextVerified,
      companyVerifiedByName: nextVerified ? admin.fullName : null,
      companyVerifiedAt: nextVerified ? new Date() : null,
    },
  });

  await logAdminAction({
    userId: admin.id,
    action: nextVerified ? "VERIFY_JOB_COMPANY" : "UNVERIFY_JOB_COMPANY",
    entityType: "Job",
    entityId: updated.id,
    metadata: {
      companyName: updated.companyName,
      companyIdentifier: updated.companyIdentifier,
      verified: nextVerified,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/vagas");
  revalidatePath("/vagas");
  revalidatePath(`/vagas/${updated.slug}`);
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

  const isValidated = status === "VALIDADA" || status === "DEMONSTRADA";
  const customEvaluator = String(formData.get("validatedByName") || "").trim();
  const evaluatorLabel =
    customEvaluator ||
    (admin.companyName
      ? `${admin.fullName} · ${admin.companyName}`
      : `${admin.fullName} · Equipe Talent Hub`);

  await prisma.candidateSkill.update({
    where: { id: candidateSkillId },
    data: {
      evidenceStatus: status as
        | "DECLARADA"
        | "DOCUMENTADA"
        | "DEMONSTRADA"
        | "VALIDADA",
      validatedById: isValidated ? admin.id : null,
      validatedByName: isValidated ? evaluatorLabel : null,
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
      evaluator: evaluatorLabel,
    },
  });

  revalidatePath(`/admin/candidatos/${current.candidateId}`);
  revalidatePath(`/passaporte/${current.candidateId}`);
  revalidatePath("/perfil");
}
