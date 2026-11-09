"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOrCreateCurrentCandidate } from "@/lib/current-candidate";
import { sendApplicationStatusEmail } from "@/lib/email";
import { ApplicationStatus } from "@prisma/client";

export async function applyToJobAction(formData: FormData) {
  const { profile, user } = await getOrCreateCurrentCandidate();

  const jobId = String(formData.get("jobId") || "").trim();
  const jobSlug = String(formData.get("jobSlug") || "").trim();
  const resumeIdRaw = String(formData.get("resumeId") || "").trim();

  if (!jobId) return;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
  });

  if (!job || job.status !== "PUBLISHED") {
    return;
  }

  // Coleta respostas de perguntas adicionais caso existam
  const answers: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("question_")) {
      const qLabel = key.replace("question_", "");
      answers[qLabel] = String(value).trim();
    }
  }

  const activeResume =
    (resumeIdRaw
      ? profile.resumes.find((r) => r.id === resumeIdRaw)
      : profile.resumes.find((r) => r.isActive)) || null;

  // Snapshot estruturado do perfil e currículo no momento exato da candidatura
  const profileSnapshot = {
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    city: profile.city,
    state: profile.state,
    professionalTitle: profile.professionalTitle,
    summary: profile.summary,
    interestArea: profile.interestArea,
    completionPercent: profile.completionPercent,
    educations: profile.educations.map((e) => ({
      institution: e.institution,
      course: e.course,
      level: e.level,
      status: e.status,
    })),
    experiences: profile.experiences.map((ex) => ({
      company: ex.company,
      role: ex.role,
      isCurrent: ex.isCurrent,
    })),
    skills: profile.skills.map((s) => s.skill.name),
    languages: profile.languages.map((l) => ({
      language: l.language,
      proficiency: l.proficiency,
    })),
    capturedAt: new Date().toISOString(),
  };

  const existing = await prisma.application.findUnique({
    where: {
      candidateId_jobId: {
        candidateId: profile.id,
        jobId: job.id,
      },
    },
  });

  if (existing) {
    // Se já houver uma candidatura ativa, impede duplicidade (Seção 4.4)
    if (existing.status !== ApplicationStatus.CANCELADA_PELO_CANDIDATO) {
      return;
    }

    // Se havia sido cancelada anteriormente pelo candidato, permite reativar
    await prisma.application.update({
      where: { id: existing.id },
      data: {
        status: ApplicationStatus.RECEBIDA,
        resumeId: activeResume?.id || null,
        profileSnapshot,
        answers,
        appliedAt: new Date(),
        history: {
          create: {
            fromStatus: ApplicationStatus.CANCELADA_PELO_CANDIDATO,
            toStatus: ApplicationStatus.RECEBIDA,
            actorId: user.id,
            note: "Candidatura reenviada pelo candidato no portal.",
          },
        },
      },
    });
  } else {
    await prisma.application.create({
      data: {
        candidateId: profile.id,
        jobId: job.id,
        resumeId: activeResume?.id || null,
        profileSnapshot,
        answers,
        status: ApplicationStatus.RECEBIDA,
        history: {
          create: {
            fromStatus: null,
            toStatus: ApplicationStatus.RECEBIDA,
            actorId: user.id,
            note: "Candidatura recebida via Portal do Candidato A Nova Moeda.",
          },
        },
      },
    });
  }

  try {
    await sendApplicationStatusEmail({
      to: profile.email,
      candidateName: profile.fullName,
      jobTitle: job.title,
      companyName: job.companyName,
      newStatus: "Recebida",
    });
  } catch {
    // Falha de envio de e-mail não interrompe o registro da candidatura
  }

  revalidatePath("/vagas");
  if (jobSlug) revalidatePath(`/vagas/${jobSlug}`);
  revalidatePath("/candidaturas");
  revalidatePath("/painel");
}

export async function cancelApplicationAction(formData: FormData) {
  const { profile, user } = await getOrCreateCurrentCandidate();
  const applicationId = String(formData.get("applicationId") || "").trim();

  if (!applicationId) return;

  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      candidateId: profile.id,
    },
  });

  if (
    !application ||
    application.status === ApplicationStatus.CANCELADA_PELO_CANDIDATO
  ) {
    return;
  }

  await prisma.application.update({
    where: { id: application.id },
    data: {
      status: ApplicationStatus.CANCELADA_PELO_CANDIDATO,
      history: {
        create: {
          fromStatus: application.status,
          toStatus: ApplicationStatus.CANCELADA_PELO_CANDIDATO,
          actorId: user.id,
          note: "Candidatura cancelada pelo próprio candidato.",
        },
      },
    },
  });

  revalidatePath("/candidaturas");
  revalidatePath("/painel");
  revalidatePath("/vagas");
}
