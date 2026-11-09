import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

export const SESSION_COOKIE_NAME = "anm_session";
export const ADMIN_SESSION_COOKIE = "anm_admin_session";
export const DEFAULT_ADMIN_EMAIL = "admin@anovamoeda.com.br";
export const DEFAULT_ADMIN_PASSWORD =
  process.env.ADMIN_MASTER_PASSWORD || "ANM@Admin2026!";

const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  "anm-talent-bank-secret-key-2026-economia-da-solidao";

export function hashPassword(password: string): string {
  return crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(password)
    .digest("hex");
}

export function verifyPassword(password: string, hash?: string | null): boolean {
  if (!hash) return false;
  return hashPassword(password) === hash;
}

export function createSessionToken(userId: string, email: string, role: string): string {
  const payload = `${userId}|${email}|${role}|${Date.now()}`;
  const sig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("hex");
  return Buffer.from(`${payload}|${sig}`).toString("base64url");
}

export function verifySessionToken(
  token: string
): { userId: string; email: string; role: UserRole } | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const [userId, email, role, timestamp, sig] = decoded.split("|");
    if (!userId || !email || !role || !timestamp || !sig) return null;
    const expected = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(`${userId}|${email}|${role}|${timestamp}`)
      .digest("hex");
    if (sig !== expected) return null;
    return { userId, email, role: role as UserRole };
  } catch {
    return null;
  }
}

export async function getAuthenticatedUser() {
  try {
    const cookieStore = await cookies();
    const token =
      cookieStore.get(SESSION_COOKIE_NAME)?.value ||
      cookieStore.get(ADMIN_SESSION_COOKIE)?.value;

    if (token) {
      const parsed = verifySessionToken(token);
      if (parsed) {
        const user = await prisma.user.findUnique({
          where: { id: parsed.userId },
        });
        if (user) return user;
      }
    }
  } catch {
    // Continua
  }
  return null;
}

export function getDestinationForRole(role: UserRole): string {
  if (
    role === "ADMIN" ||
    role === "RECRUITER" ||
    role === "JOB_MANAGER" ||
    role === "ANALYST"
  ) {
    return "/admin";
  }
  return "/painel";
}
