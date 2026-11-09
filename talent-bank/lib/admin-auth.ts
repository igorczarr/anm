import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_SESSION_COOKIE,
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
  createSessionToken,
  getAuthenticatedUser,
} from "@/lib/session";

export { ADMIN_SESSION_COOKIE, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD };

export function createSignedAdminToken(email: string): string {
  return createSessionToken("admin", email, "ADMIN");
}

export async function getCurrentAdminUser() {
  const sessionUser = await getAuthenticatedUser();
  if (
    sessionUser &&
    (sessionUser.role === "ADMIN" ||
      sessionUser.role === "RECRUITER" ||
      sessionUser.role === "JOB_MANAGER" ||
      sessionUser.role === "ANALYST")
  ) {
    return sessionUser;
  }

  redirect("/entrar");
}

export async function logAdminAction({
  userId,
  action,
  entityType,
  entityId,
  metadata,
}: {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId: entityId || null,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
    },
  });
}
