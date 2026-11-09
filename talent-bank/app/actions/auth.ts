import crypto from "crypto";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD,
  SESSION_COOKIE_NAME,
  ADMIN_SESSION_COOKIE,
  createSessionToken,
  getDestinationForRole,
  hashPassword,
  verifyPassword,
} from "@/lib/session";
import { getCurrentAdminUser, logAdminAction } from "@/lib/admin-auth";
import { ConsentPurpose, UserRole } from "@prisma/client";

/**
 * Login unificado inteligente:
 * - Identifica automaticamente o papel do usuário (ADMIN, RECRUITER, JOB_MANAGER, ANALYST ou CANDIDATE)
 * - Se for ADMIN/RECRUITER/Equipe Gestora -> redireciona para /admin
 * - Se for CANDIDATE -> redireciona para /painel (ou /perfil)
 */
export async function unifiedLoginAction(formData: FormData) {
  "use server";

  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "").trim();

  if (!email || !password) {
    redirect("/entrar?error=campos_obrigatorios");
  }

  // 1. Verifica se é a credencial mestre do Administrador
  if (
    email === DEFAULT_ADMIN_EMAIL.toLowerCase() &&
    password === DEFAULT_ADMIN_PASSWORD
  ) {
    const admin = await prisma.user.upsert({
      where: { email: DEFAULT_ADMIN_EMAIL },
      update: {
        role: UserRole.ADMIN,
        status: "ACTIVE",
        passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
      },
      create: {
        email: DEFAULT_ADMIN_EMAIL,
        fullName: "Equipe Gestora · A Nova Moeda",
        role: UserRole.ADMIN,
        status: "ACTIVE",
        passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
      },
    });

    const token = createSessionToken(admin.id, admin.email, admin.role);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    cookieStore.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    redirect("/admin");
  }

  // 2. Busca o usuário no banco Neon PostgreSQL
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    redirect("/entrar?error=credenciais_invalidas");
  }

  // Se o usuário já tinha senha definida, valida; se era usuário demo do seed sem senha, define na primeira entrada
  if (user.passwordHash && !verifyPassword(password, user.passwordHash)) {
    redirect("/entrar?error=credenciais_invalidas");
  }

  if (!user.passwordHash) {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(password) },
    });
  }

  const token = createSessionToken(user.id, user.email, user.role);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  if (user.role !== "CANDIDATE") {
    cookieStore.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  const destination = getDestinationForRole(user.role);
  redirect(destination);
}

/**
 * Cadastro unificado (Candidato ou Recrutador via Link de Convite do Admin):
 * - Quando possui um inviteToken válido gerado pelo Admin, cria a conta já com status RECRUITER
 *   e redireciona direto para o Painel Administrativo (/admin).
 * - Quando é cadastro público normal, cria como CANDIDATE e direciona para construção do perfil (/perfil).
 */
export async function unifiedRegisterAction(formData: FormData) {
  "use server";

  const fullName = String(formData.get("fullName") || "").trim();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "").trim();
  const confirmPassword = String(formData.get("confirmPassword") || "").trim();
  const companyName = String(formData.get("companyName") || "").trim() || null;
  const inviteToken = String(formData.get("inviteToken") || "").trim();
  const acceptTerms = formData.get("acceptTerms") === "on";
  const allowPool = formData.get("allowPool") === "on";
  const allowSharing = formData.get("allowSharing") === "on";

  if (!fullName || !email || !password) {
    redirect(
      `/cadastro${
        inviteToken ? `?convite=${inviteToken}&` : "?"
      }error=campos_obrigatorios`
    );
  }

  if (password !== confirmPassword) {
    redirect(
      `/cadastro${
        inviteToken ? `?convite=${inviteToken}&` : "?"
      }error=senhas_diferentes`
    );
  }

  if (!acceptTerms) {
    redirect(
      `/cadastro${
        inviteToken ? `?convite=${inviteToken}&` : "?"
      }error=termos_obrigatorios`
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    redirect(
      `/cadastro${
        inviteToken ? `?convite=${inviteToken}&` : "?"
      }error=email_ja_cadastrado`
    );
  }

  let assignedRole: UserRole = UserRole.CANDIDATE;
  let validInviteId: string | null = null;
  let resolvedCompany = companyName;

  if (inviteToken) {
    const invite = await prisma.recruiterInvite.findUnique({
      where: { token: inviteToken },
    });

    if (
      !invite ||
      invite.usedAt !== null ||
      new Date(invite.expiresAt) < new Date()
    ) {
      redirect(`/cadastro?error=convite_invalido_ou_expirado`);
    }

    assignedRole = invite.role || UserRole.RECRUITER;
    validInviteId = invite.id;
    resolvedCompany = companyName || invite.companyName || null;
  }

  const createdUser = await prisma.user.create({
    data: {
      fullName,
      email,
      companyName: resolvedCompany,
      passwordHash: hashPassword(password),
      role: assignedRole,
      status: "ACTIVE",
      consentRecords: {
        create: [
          {
            purpose: ConsentPurpose.CORE_PLATFORM,
            termsVersion: "v1.0-2026",
            granted: true,
          },
          {
            purpose: ConsentPurpose.TALENT_POOL_OPPORTUNITIES,
            termsVersion: "v1.0-2026",
            granted: allowPool,
          },
          {
            purpose: ConsentPurpose.COMPANY_DATA_SHARING,
            termsVersion: "v1.0-2026",
            granted: allowSharing,
          },
        ],
      },
    },
  });

  if (validInviteId) {
    await prisma.recruiterInvite.update({
      where: { id: validInviteId },
      data: {
        usedAt: new Date(),
        usedByEmail: createdUser.email,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: createdUser.id,
        action: "RECRUITER_REGISTERED_VIA_INVITE",
        entityType: "RecruiterInvite",
        entityId: validInviteId,
        metadata: {
          email: createdUser.email,
          companyName: resolvedCompany,
          role: assignedRole,
        },
      },
    });
  } else {
    // Cria o CandidateProfile inicial para o candidato
    await prisma.candidateProfile.create({
      data: {
        userId: createdUser.id,
        fullName: createdUser.fullName,
        email: createdUser.email,
        isPublicInPool: allowPool,
        allowCompanySharing: allowSharing,
        completionPercent: 20,
      },
    });
  }

  const token = createSessionToken(
    createdUser.id,
    createdUser.email,
    createdUser.role
  );
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  if (createdUser.role !== "CANDIDATE") {
    cookieStore.set(ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    redirect("/admin");
  }

  redirect("/perfil");
}

export async function unifiedLogoutAction() {
  "use server";

  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(ADMIN_SESSION_COOKIE);
  redirect("/entrar");
}

/**
 * Gera link exclusivo de convite para Recrutador no Painel Administrativo
 */
export async function createRecruiterInviteAction(formData: FormData) {
  "use server";

  const admin = await getCurrentAdminUser();
  if (admin.role !== "ADMIN") return;

  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase() || null;
  const companyName = String(formData.get("companyName") || "").trim() || null;

  const token = `rec_${crypto.randomBytes(12).toString("hex")}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14); // Válido por 14 dias

  const invite = await prisma.recruiterInvite.create({
    data: {
      token,
      email,
      companyName,
      role: UserRole.RECRUITER,
      createdById: admin.id,
      expiresAt,
    },
  });

  await logAdminAction({
    userId: admin.id,
    action: "CREATE_RECRUITER_INVITE",
    entityType: "RecruiterInvite",
    entityId: invite.id,
    metadata: { email, companyName, token },
  });

  revalidatePath("/admin/auditoria");
  revalidatePath("/admin");
}
