import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_SESSION_COOKIE,
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
  createSessionToken,
  getAuthenticatedAdmin,
} from "@/lib/session";
import { AdminRoleType, Prisma } from "@prisma/client";

export { ADMIN_SESSION_COOKIE, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD };

export type PermissionKey =
  | "canOperateTimer"
  | "canModerateQuestions"
  | "canManagePolls"
  | "canEditSchedule"
  | "canManageAccess"
  | "canExportReports";

export function createSignedAdminToken(
  userId: string,
  email: string,
  roleCode: AdminRoleType = "ADMIN"
): string {
  return createSessionToken(userId, email, roleCode);
}

export async function getCurrentAdminUser() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    redirect("/admin/login");
  }
  return admin;
}

export function hasAdminPermission(
  user: Awaited<ReturnType<typeof getAuthenticatedAdmin>>,
  permission: PermissionKey
): boolean {
  if (!user || user.status !== "ACTIVE") return false;
  if (user.roleCode === "ADMIN") return true;
  if (user.role && user.role[permission]) return true;

  // Fallback matrix by roleCode when role record is not linked
  const matrix: Record<AdminRoleType, PermissionKey[]> = {
    ADMIN: [
      "canOperateTimer",
      "canModerateQuestions",
      "canManagePolls",
      "canEditSchedule",
      "canManageAccess",
      "canExportReports",
    ],
    OPERATOR: [
      "canOperateTimer",
      "canManagePolls",
      "canModerateQuestions",
      "canEditSchedule",
      "canExportReports",
    ],
    CURATOR: ["canModerateQuestions", "canExportReports"],
    MODERATOR: ["canModerateQuestions", "canManagePolls"],
    OBSERVER: ["canExportReports"],
  };

  return matrix[user.roleCode]?.includes(permission) ?? false;
}

export async function requireAdminPermission(permission: PermissionKey) {
  const user = await getCurrentAdminUser();
  if (!hasAdminPermission(user, permission)) {
    throw new Error(`Permissão insuficiente: requer ${permission}`);
  }
  return user;
}

export async function logAdminAction({
  eventId,
  userId,
  action,
  entityType,
  entityId,
  metadata,
}: {
  eventId?: string | null;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        eventId: eventId || null,
        userId: userId || null,
        action,
        entityType,
        entityId: entityId || null,
        metadata: metadata
          ? (metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull,
      },
    });
  } catch (err) {
    console.error("Falha ao registrar AuditLog:", err);
  }
}
