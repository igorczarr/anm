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
  try {
    const email = String(formData.get("email") || "")
      .trim()
      .toLowerCase();
    const password = String(formData.get("password") || "").trim();

    if (!email || !password) {
      redirect("/admin/login?error=credenciais_invalidas");
    }

    const isMasterAdmin =
      email === DEFAULT_ADMIN_EMAIL.toLowerCase() &&
      password === DEFAULT_ADMIN_PASSWORD;

    let user: { id: string; email: string; roleCode: any } | null = null;

    if (isMasterAdmin) {
      try {
        const adminRole = await prisma.adminRole.findUnique({
          where: { code: "ADMIN" },
        }).catch(() => null);

        const upserted = await prisma.adminUser.upsert({
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
        user = {
          id: upserted.id,
          email: upserted.email,
          roleCode: upserted.roleCode,
        };
      } catch (dbErr) {
        console.warn("Aviso: Banco em reconexão durante login mestre (action), usando fallback seguro:", dbErr);
        user = {
          id: "cmw9umw1000062orc0hqs3a3a",
          email: DEFAULT_ADMIN_EMAIL,
          roleCode: "ADMIN",
        };
      }
    } else {
      let dbUser = null;
      try {
        dbUser = await prisma.adminUser.findUnique({
          where: { email },
          include: { role: true },
        });
      } catch (dbErr) {
        console.error("Erro ao validar login admin em banco:", dbErr);
        redirect("/admin/login?error=conexao_banco");
      }

      if (
        !dbUser ||
        dbUser.status !== "ACTIVE" ||
        dbUser.revokedAt ||
        !verifyPassword(password, dbUser.passwordHash)
      ) {
        redirect("/admin/login?error=credenciais_invalidas");
      }

      user = {
        id: dbUser.id,
        email: dbUser.email,
        roleCode: dbUser.roleCode,
      };

      prisma.adminUser.update({
        where: { id: dbUser.id },
        data: { lastLoginAt: new Date() },
      }).catch((e) => console.warn("Falha ao atualizar lastLoginAt:", e));
    }

    if (!user) {
      redirect("/admin/login?error=credenciais_invalidas");
    }

    const token = createSignedAdminToken(user.id, user.email, user.roleCode);
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    getPrimaryEvent()
      .then((event) =>
        logAdminAction({
          eventId: event?.id,
          userId: user.id,
          action: "ADMIN_LOGIN_SUCCESS",
          entityType: "AdminUser",
          entityId: user.id,
          metadata: { email: user.email, role: user.roleCode },
        })
      )
      .catch((e) => console.warn("Falha ao registrar log de login:", e));

    redirect("/admin/operacao");
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "digest" in err &&
      typeof (err as { digest?: unknown }).digest === "string" &&
      (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }
    console.error("Erro em loginAdminAction:", err);
    redirect("/admin/login?error=falha_servidor");
  }
}

export async function logoutAdminAction() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  redirect("/admin/login");
}
