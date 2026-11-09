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
import { UserRole } from "@prisma/client";

export async function loginAdminAction(formData: FormData) {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "").trim();

  if (
    email === DEFAULT_ADMIN_EMAIL.toLowerCase() &&
    password === DEFAULT_ADMIN_PASSWORD
  ) {
    const admin = await prisma.user.upsert({
      where: { email: DEFAULT_ADMIN_EMAIL },
      update: { role: UserRole.ADMIN, status: "ACTIVE" },
      create: {
        email: DEFAULT_ADMIN_EMAIL,
        fullName: "Equipe Gestora · A Nova Moeda",
        role: UserRole.ADMIN,
        status: "ACTIVE",
      },
    });

    const token = createSignedAdminToken(admin.email);
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    await logAdminAction({
      userId: admin.id,
      action: "ADMIN_LOGIN_SUCCESS",
      entityType: "User",
      entityId: admin.id,
      metadata: { email: admin.email },
    });

    redirect("/admin");
  }

  redirect("/admin/login?error=credenciais_invalidas");
}

export async function logoutAdminAction() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  redirect("/admin/login");
}
