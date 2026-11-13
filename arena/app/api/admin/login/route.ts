import { NextRequest, NextResponse } from "next/server";
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

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    let email = "";
    let password = "";

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      email = String(body.email || "");
      password = String(body.password || "");
    } else if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const formData = await req.formData().catch(() => null);
      if (formData) {
        email = String(formData.get("email") || "");
        password = String(formData.get("password") || "");
      }
    } else {
      const body = await req.json().catch(() => ({}));
      email = String(body.email || "");
      password = String(body.password || "");
    }

    email = email.trim().toLowerCase();
    password = password.trim();

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Informe e-mail e senha administrativa." },
        { status: 400 }
      );
    }

    let user = await prisma.adminUser.findUnique({
      where: { email },
      include: { role: true },
    });

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
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return NextResponse.json(
          { ok: false, error: "E-mail ou senha administrativa inválidos." },
          { status: 401 }
        );
      }

      if (user.status !== "ACTIVE" || user.revokedAt) {
        return NextResponse.json(
          { ok: false, error: "Acesso administrativo inativo ou revogado." },
          { status: 403 }
        );
      }

      await prisma.adminUser.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    }

    const token = createSignedAdminToken(user.id, user.email, user.roleCode);
    const event = await getPrimaryEvent().catch(() => null);

    await logAdminAction({
      eventId: event?.id,
      userId: user.id,
      action: "ADMIN_LOGIN_SUCCESS",
      entityType: "AdminUser",
      entityId: user.id,
      metadata: { email: user.email, role: user.roleCode },
    }).catch((e) => console.error("Falha ao registrar audit log:", e));

    const response = NextResponse.json({
      ok: true,
      redirectTo: "/admin/operacao",
      user: {
        id: user.id,
        email: user.email,
        roleCode: user.roleCode,
      },
    });

    response.cookies.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    return response;
  } catch (error) {
    console.error("Erro em /api/admin/login:", error);
    return NextResponse.json(
      { ok: false, error: "Erro interno no servidor ao processar autenticação." },
      { status: 500 }
    );
  }
}
