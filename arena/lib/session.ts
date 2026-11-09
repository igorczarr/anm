import crypto from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AdminRoleType } from "@prisma/client";

export const ADMIN_SESSION_COOKIE = "anm_arena_admin_session";
export const PARTICIPANT_SESSION_COOKIE = "anm_arena_participant_session";

export const DEFAULT_ADMIN_EMAIL = "admin@anovamoeda.com.br";
export const DEFAULT_ADMIN_PASSWORD =
  process.env.ADMIN_MASTER_PASSWORD || "ANM@Arena2026!";

const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  "anm-arena-secret-key-2026-economia-da-solidao-uefs";

export function hashPassword(password: string): string {
  return crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(password)
    .digest("hex");
}

export function verifyPassword(password: string, hash?: string | null): boolean {
  if (!hash) return false;
  const computed = hashPassword(password);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed, "hex"),
      Buffer.from(hash, "hex")
    );
  } catch {
    return false;
  }
}

export function createSessionToken(
  userId: string,
  email: string,
  roleCode: AdminRoleType
): string {
  const payload = `${userId}|${email}|${roleCode}|${Date.now()}`;
  const sig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("hex");
  return Buffer.from(`${payload}|${sig}`).toString("base64url");
}

export function verifySessionToken(token: string): {
  userId: string;
  email: string;
  roleCode: AdminRoleType;
  issuedAt: number;
} | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const [userId, email, roleCode, timestamp, sig] = decoded.split("|");
    if (!userId || !email || !roleCode || !timestamp || !sig) return null;
    const expected = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(`${userId}|${email}|${roleCode}|${timestamp}`)
      .digest("hex");
    if (sig !== expected) return null;
    return {
      userId,
      email,
      roleCode: roleCode as AdminRoleType,
      issuedAt: Number(timestamp),
    };
  } catch {
    return null;
  }
}

export function signAnonymousSessionToken(sessionId: string): string {
  const sig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(`participant|${sessionId}`)
    .digest("hex");
  return `${sessionId}.${sig}`;
}

export function verifyAnonymousSessionToken(rawToken: string): string | null {
  const parts = rawToken.split(".");
  if (parts.length !== 2) return null;
  const [sessionId, sig] = parts;
  const expected = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(`participant|${sessionId}`)
    .digest("hex");
  if (sig !== expected) return null;
  return sessionId;
}

export async function getAuthenticatedAdmin() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
    if (!token) return null;

    const parsed = verifySessionToken(token);
    if (!parsed) return null;

    const user = await prisma.adminUser.findUnique({
      where: { id: parsed.userId },
      include: { role: true },
    });

    if (!user || user.status !== "ACTIVE" || user.revokedAt) {
      return null;
    }

    return user;
  } catch {
    return null;
  }
}
