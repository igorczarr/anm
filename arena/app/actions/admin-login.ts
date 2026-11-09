"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_SESSION_COOKIE,
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
  createSignedAdminToken,
  logAdminAction,
} from "@/lib/admin-auth";
import { hashPassword, verifyPassword } from "@/lib/session";
import { getPrimaryEvent } from "@/lib/live-state";

export async function loginAdminAction(formData: FormData) {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "").trim();

  if (!email || !password) {
    redirect("/admin/login?error=credenciais_invalidas");
  }

  let user = await prisma.adminUser.findUnique({
    where: { email },
    include: { role: true },
  });

  // Se for o admin padrão com a senha mestre, garante o registro ativo
  if (
    email === DEFAULT_ADMIN_EMAIL.toLowerCase() &&
    password === DEFAULT_ADMIN_PASSWORD
  ) {
    const adminRole = await prisma.adminRole.findUnique({
      where: { code: "ADMIN" },
    });
    user = await prisma.adminUser.upsert({
      where: { email: DEFAULT_ADMIN_EMAIL },
      update: {
        status: "ACTIVE",
        revokedAt: null,
        lastLoginAt: new Date(),
        roleCode: "ADMIN",
        roleId: adminRole?.id ?? null,
      },
      create: {
        email: DEFAULT_ADMIN_EMAIL,
        fullName: "Direção Operacional · A Nova Moeda",
        passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
        roleCode: "ADMIN",
        roleId: adminRole?.id ?? null,
        status: "ACTIVE",
        lastLoginAt: new Date(),
      },
      include: { role: true },
    });
  } else {
    if (
      !user ||
      user.status !== "ACTIVE" ||
      user.revokedAt ||
      !verifyPassword(password, user.passwordHash)
    ) {
      redirect("/admin/login?error=credenciais_invalidas");
    }

    await prisma.adminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
  }

  const token = createSignedAdminToken(user.id, user.email, user.roleCode);
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 dias
  });

  const event = await getPrimaryEvent();
  await logAdminAction({
    eventId: event?.id,
    userId: user.id,
    action: "ADMIN_LOGIN_SUCCESS",
    entityType: "AdminUser",
    entityId: user.id,
    metadata: { email: user.email, role: user.roleCode },
  });

  redirect("/admin");
}

export async function logoutAdminAction() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  redirect("/admin/login");
}
