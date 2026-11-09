"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getOrCreateCurrentCandidate } from "@/lib/current-candidate";
import { getCurrentAdminUser, logAdminAction } from "@/lib/admin-auth";
import { UserRole } from "@prisma/client";

// Solicitação de correção, portabilidade ou exclusão/anonimização (Seção 9 — LGPD)
export async function submitLgpdDataRequestAction(formData: FormData) {
  const { user, profile } = await getOrCreateCurrentCandidate();

  const requestType = String(formData.get("requestType") || "CORRECTION");
  const details = String(formData.get("details") || "").trim();

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: `LGPD_REQUEST_${requestType}`,
      entityType: "CandidateProfile",
      entityId: profile.id,
      metadata: {
        email: profile.email,
        requestType,
        details,
        requestedAt: new Date().toISOString(),
      },
    },
  });

  if (requestType === "REVOKE_SHARING") {
    await prisma.candidateProfile.update({
      where: { id: profile.id },
      data: {
        isPublicInPool: false,
        allowCompanySharing: false,
      },
    });
  }

  revalidatePath("/privacidade");
  revalidatePath("/conta");
  revalidatePath("/perfil");
  revalidatePath("/admin/auditoria");
}

// Gestão de papéis RBAC de usuários administrativos (Seção 8)
export async function updateUserRoleAdminAction(formData: FormData) {
  const admin = await getCurrentAdminUser();
  if (admin.role !== "ADMIN") return;

  const targetUserId = String(formData.get("userId") || "");
  const role = String(formData.get("role") || "CANDIDATE") as UserRole;

  if (!targetUserId) return;

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { role },
  });

  await logAdminAction({
    userId: admin.id,
    action: "RBAC_ROLE_UPDATE",
    entityType: "User",
    entityId: updated.id,
    metadata: { email: updated.email, newRole: role },
  });

  revalidatePath("/admin/auditoria");
}
