"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission, logAdminAction } from "@/lib/admin-auth";
import { hashPassword } from "@/lib/session";
import { getPrimaryEvent, updateLiveStateAtomic } from "@/lib/live-state";
import { AdminRoleType, ArenaMode, UserStatus } from "@prisma/client";

const EventSettingsSchema = z.object({
  name: z.string().min(2).max(120),
  theme: z.string().min(2).max(160),
  institution: z.string().min(2).max(160),
  estimatedAudience: z.coerce.number().int().min(1).max(10000),
  programmedDurationMin: z.coerce.number().int().min(10).max(600),
  certifiedHours: z.coerce.number().int().min(1).max(40).default(4),
  formatDescription: z.string().min(5).max(400),
  questionCharLimit: z.coerce.number().int().min(50).max(1000),
  maxQuestionsPerTopic: z.coerce.number().int().min(1).max(20),
  minQuestionIntervalSec: z.coerce.number().int().min(0).max(300),
  soundAlertsEnabled: z.boolean(),
  showTimerOnArena: z.boolean(),
  requireAccessCode: z.boolean(),
  requireCredential: z.boolean(),
  accessCode: z.string().max(40).optional().nullable(),
});

export async function updateEventSettingsAction(formData: FormData) {
  const admin = await requireAdminPermission("canEditSchedule");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const parsed = EventSettingsSchema.parse({
    name: formData.get("name"),
    theme: formData.get("theme"),
    institution: formData.get("institution"),
    estimatedAudience: formData.get("estimatedAudience"),
    programmedDurationMin: formData.get("programmedDurationMin"),
    certifiedHours: formData.get("certifiedHours") || 4,
    formatDescription: formData.get("formatDescription"),
    questionCharLimit: formData.get("questionCharLimit"),
    maxQuestionsPerTopic: formData.get("maxQuestionsPerTopic") || 1,
    minQuestionIntervalSec: formData.get("minQuestionIntervalSec") || 10,
    soundAlertsEnabled: formData.get("soundAlertsEnabled") === "on",
    showTimerOnArena: formData.get("showTimerOnArena") === "on",
    requireAccessCode: formData.get("requireAccessCode") === "on",
    requireCredential: formData.get("requireCredential") === "on",
    accessCode: String(formData.get("accessCode") || "").trim() || null,
  });

  const scheduledStartRaw = String(formData.get("scheduledStartAt") || "").trim();
  const scheduledStartAt = scheduledStartRaw ? new Date(scheduledStartRaw) : null;

  await prisma.event.update({
    where: { id: event.id },
    data: {
      ...parsed,
      scheduledStartAt,
    },
  });

  await updateLiveStateAtomic(event.id, "config.updated", {
    soundAlertsEnabled: parsed.soundAlertsEnabled,
    showTimerOnArena: parsed.showTimerOnArena,
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "EVENT_SETTINGS_UPDATED",
    entityType: "Event",
    entityId: event.id,
    metadata: parsed,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin/cronograma");
}

const TopicUpdateSchema = z.object({
  topicId: z.string().min(1),
  title: z.string().min(3).max(240),
  durationMin: z.coerce.number().int().min(1).max(120),
  mainSpeakerId: z.string().min(1),
  provokerId: z.string().optional().nullable(),
  provokerLabel: z.string().min(2).max(120),
});

export async function updateTopicAction(formData: FormData) {
  const admin = await requireAdminPermission("canEditSchedule");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const justification = String(formData.get("justification") || "").trim();
  if (
    (event.status === "LIVE" || event.scheduleLocked) &&
    !justification
  ) {
    throw new Error(
      "O evento está em andamento (Programação Bloqueada). Informe uma justificativa administrativa para editar uma pauta."
    );
  }

  const rawProvokerId = String(formData.get("provokerId") || "").trim();
  const parsed = TopicUpdateSchema.parse({
    topicId: formData.get("topicId"),
    title: formData.get("title"),
    durationMin: formData.get("durationMin"),
    mainSpeakerId: formData.get("mainSpeakerId"),
    provokerId: rawProvokerId || null,
    provokerLabel: formData.get("provokerLabel") || "Pergunta da Plateia (5 min)",
  });

  const durationSec = parsed.durationMin * 60;

  const updated = await prisma.topic.update({
    where: { id: parsed.topicId },
    data: {
      title: parsed.title,
      durationSec,
      mainSpeakerId: parsed.mainSpeakerId,
      provokerId: parsed.provokerId,
      provokerLabel: parsed.provokerLabel,
    },
    include: { mainSpeaker: true },
  });

  await prisma.scheduleStep.updateMany({
    where: {
      eventId: event.id,
      topicId: updated.id,
      isMacroBlock: true,
    },
    data: {
      title: `${updated.number + 2}. Pauta ${updated.number} — ${updated.title}`,
      durationSec,
      responsibleName: `${updated.mainSpeaker.name} (15m Exposição + 5m P&R)`,
    },
  });

  await updateLiveStateAtomic(event.id, "config.updated", {});

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "TOPIC_UPDATED",
    entityType: "Topic",
    entityId: updated.id,
    justification: justification || null,
    metadata: {
      number: updated.number,
      title: updated.title,
      durationMin: parsed.durationMin,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin/cronograma");
}

const SpeakerSchema = z.object({
  speakerId: z.string().optional(),
  name: z.string().min(2).max(100),
  roleTitle: z.string().max(140).optional(),
  bio: z.string().max(500).optional(),
  photoUrl: z.string().max(300).optional(),
});

export async function updateSpeakerAction(formData: FormData) {
  const admin = await requireAdminPermission("canEditSchedule");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const parsed = SpeakerSchema.parse({
    speakerId: String(formData.get("speakerId") || "").trim() || undefined,
    name: formData.get("name"),
    roleTitle: String(formData.get("roleTitle") || "").trim(),
    bio: String(formData.get("bio") || "").trim(),
    photoUrl: String(formData.get("photoUrl") || "").trim(),
  });

  if (parsed.speakerId) {
    await prisma.speaker.update({
      where: { id: parsed.speakerId },
      data: {
        name: parsed.name,
        roleTitle: parsed.roleTitle || null,
        bio: parsed.bio || null,
        photoUrl: parsed.photoUrl || null,
      },
    });
  }

  await updateLiveStateAtomic(event.id, "config.updated", {});

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "SPEAKER_UPDATED",
    entityType: "Speaker",
    entityId: parsed.speakerId,
    metadata: { name: parsed.name },
  });

  revalidatePath("/admin/configuracoes");
  revalidatePath("/admin/cronograma");
}

const StepUpdateSchema = z.object({
  stepId: z.string().min(1),
  title: z.string().min(2).max(200),
  durationSec: z.coerce.number().int().min(10).max(7200),
  responsibleName: z.string().min(1).max(140),
  arenaMode: z.nativeEnum(ArenaMode).optional(),
});

export async function updateScheduleStepAction(formData: FormData) {
  const admin = await requireAdminPermission("canEditSchedule");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const justification = String(formData.get("justification") || "").trim();
  if (
    (event.status === "LIVE" || event.scheduleLocked) &&
    !justification
  ) {
    throw new Error(
      "A programação oficial fica bloqueada durante o evento ao vivo. Para realizar uma alteração excepcional, preencha a justificativa obrigatória."
    );
  }

  const arenaModeRaw = String(formData.get("arenaMode") || "").trim();
  const parsed = StepUpdateSchema.parse({
    stepId: formData.get("stepId"),
    title: formData.get("title"),
    durationSec: formData.get("durationSec"),
    responsibleName: formData.get("responsibleName"),
    arenaMode: arenaModeRaw ? (arenaModeRaw as ArenaMode) : undefined,
  });

  const step = await prisma.scheduleStep.update({
    where: { id: parsed.stepId },
    data: {
      title: parsed.title,
      durationSec: parsed.durationSec,
      responsibleName: parsed.responsibleName,
      ...(parsed.arenaMode ? { arenaMode: parsed.arenaMode } : {}),
    },
  });

  if (step.isMacroBlock) {
    const allMacros = await prisma.scheduleStep.findMany({
      where: { eventId: event.id, isMacroBlock: true },
    });
    const totalSec = allMacros.reduce((acc, s) => acc + s.durationSec, 0);
    await prisma.event.update({
      where: { id: event.id },
      data: { programmedDurationMin: Math.round(totalSec / 60) },
    });
  }

  await updateLiveStateAtomic(event.id, "config.updated", {});

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action:
      event.status === "LIVE" || event.scheduleLocked
        ? "SCHEDULE_STEP_EMERGENCY_EDIT"
        : "SCHEDULE_STEP_UPDATED",
    entityType: "ScheduleStep",
    entityId: step.id,
    justification: justification || null,
    metadata: {
      code: step.code,
      title: step.title,
      durationSec: step.durationSec,
    },
  });

  revalidatePath("/admin/cronograma");
  revalidatePath("/admin");
}

export async function toggleScheduleLockAction(
  locked: boolean,
  justification?: string
) {
  const admin = await requireAdminPermission("canManageAccess");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  await prisma.event.update({
    where: { id: event.id },
    data: { scheduleLocked: locked },
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: locked ? "SCHEDULE_LOCKED" : "SCHEDULE_UNLOCKED_EXCEPTION",
    entityType: "Event",
    entityId: event.id,
    justification:
      justification ||
      (locked
        ? "Bloqueio da programação oficial"
        : "Desbloqueio administrativo excepcional da programação"),
  });

  revalidatePath("/admin/cronograma");
  revalidatePath("/admin");
}

/**
 * Gera um lote adicional de Credenciais Individuais para Check-in de Participantes (§4 e §7)
 */
export async function generateParticipantCredentialsBatchAction(
  formData: FormData
) {
  const admin = await requireAdminPermission("canManageAccess");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  const quantity = Math.min(
    500,
    Math.max(1, Number(formData.get("quantity") || 50))
  );
  const prefix =
    String(formData.get("prefix") || "ANM")
      .trim()
      .toUpperCase() || "ANM";

  const existingCount = await prisma.participantCredential.count({
    where: { eventId: event.id },
  });

  const batch = [];
  for (let i = 1; i <= quantity; i++) {
    const seqNum = existingCount + i;
    const code = `${prefix}-${String(seqNum).padStart(3, "0")}`;
    batch.push({
      eventId: event.id,
      code,
      label: `Credencial Participante #${String(seqNum).padStart(3, "0")}`,
      isUsed: false,
    });
  }

  await prisma.participantCredential.createMany({
    data: batch,
    skipDuplicates: true,
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "CREDENTIALS_BATCH_GENERATED",
    entityType: "ParticipantCredential",
    metadata: { quantity, prefix },
  });

  revalidatePath("/admin/participantes");
}

export async function toggleRequireCredentialAction(requireCred: boolean) {
  const admin = await requireAdminPermission("canManageAccess");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  await prisma.event.update({
    where: { id: event.id },
    data: { requireCredential: requireCred },
  });

  await updateLiveStateAtomic(event.id, "config.updated", {});

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: requireCred
      ? "CREDENTIAL_CHECKIN_REQUIRED"
      : "CREDENTIAL_CHECKIN_OPTIONAL",
    entityType: "Event",
    entityId: event.id,
  });

  revalidatePath("/admin/participantes");
  revalidatePath("/admin/configuracoes");
}

const CreateAdminUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(2).max(120),
  password: z.string().min(6).max(100),
  roleCode: z.nativeEnum(AdminRoleType),
});

export async function createOrUpdateAdminUserAction(formData: FormData) {
  const admin = await requireAdminPermission("canManageAccess");
  const event = await getPrimaryEvent();

  const parsed = CreateAdminUserSchema.parse({
    email: String(formData.get("email") || "")
      .trim()
      .toLowerCase(),
    fullName: String(formData.get("fullName") || "").trim(),
    password: String(formData.get("password") || "").trim(),
    roleCode: formData.get("roleCode"),
  });

  const role = await prisma.adminRole.findUnique({
    where: { code: parsed.roleCode },
  });

  const target = await prisma.adminUser.upsert({
    where: { email: parsed.email },
    update: {
      fullName: parsed.fullName,
      passwordHash: hashPassword(parsed.password),
      roleCode: parsed.roleCode,
      roleId: role?.id ?? null,
      status: "ACTIVE",
      revokedAt: null,
    },
    create: {
      email: parsed.email,
      fullName: parsed.fullName,
      passwordHash: hashPassword(parsed.password),
      roleCode: parsed.roleCode,
      roleId: role?.id ?? null,
      status: "ACTIVE",
    },
  });

  await logAdminAction({
    eventId: event?.id,
    userId: admin.id,
    action: "ADMIN_USER_UPSERTED",
    entityType: "AdminUser",
    entityId: target.id,
    metadata: { email: target.email, roleCode: target.roleCode },
  });

  revalidatePath("/admin/acessos");
}

export async function updateAdminUserStatusRoleAction(formData: FormData) {
  const admin = await requireAdminPermission("canManageAccess");
  const event = await getPrimaryEvent();

  const userId = String(formData.get("userId") || "");
  const roleCode = String(formData.get("roleCode") || "PRODUCER") as AdminRoleType;
  const status = String(formData.get("status") || "ACTIVE") as UserStatus;

  const role = await prisma.adminRole.findUnique({
    where: { code: roleCode },
  });

  const updated = await prisma.adminUser.update({
    where: { id: userId },
    data: {
      roleCode,
      roleId: role?.id ?? null,
      status,
      revokedAt: status === "REVOKED" ? new Date() : null,
    },
  });

  await logAdminAction({
    eventId: event?.id,
    userId: admin.id,
    action: "ADMIN_USER_PERMISSION_CHANGED",
    entityType: "AdminUser",
    entityId: updated.id,
    metadata: { email: updated.email, roleCode, status },
  });

  revalidatePath("/admin/acessos");
}
