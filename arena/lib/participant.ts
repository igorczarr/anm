import crypto from "crypto";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  PARTICIPANT_SESSION_COOKIE,
  signAnonymousSessionToken,
  verifyAnonymousSessionToken,
} from "@/lib/session";
import type { QuestionStatus } from "@prisma/client";

const IP_SALT =
  process.env.ADMIN_SESSION_SECRET ||
  "anm-arena-secret-key-2026-economia-da-solidao-uefs";

export type PublicQuestionStatus =
  | "RECEIVED"
  | "ANALYZING"
  | "SELECTED"
  | "ANSWERED"
  | "NOT_SELECTED";

/** Estados visíveis ao participante (§8.3). O motivo da rejeição nunca é exposto. */
export function toPublicQuestionStatus(s: QuestionStatus): PublicQuestionStatus {
  switch (s) {
    case "RECEIVED":
      return "RECEIVED";
    case "ANALYZING":
    case "APPROVED":
      return "ANALYZING";
    case "SELECTED":
    case "DISPLAYED":
      return "SELECTED";
    case "ANSWERED":
      return "ANSWERED";
    default:
      return "NOT_SELECTED";
  }
}

export async function getClientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

export function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(`${IP_SALT}|${ip}`).digest("hex").slice(0, 32);
}

export async function getParticipantSession() {
  try {
    const store = await cookies();
    const raw = store.get(PARTICIPANT_SESSION_COOKIE)?.value;
    if (!raw) return null;
    const id = verifyAnonymousSessionToken(raw);
    if (!id) return null;

    const existing = await prisma.participantSession
      .findUnique({ where: { id } })
      .catch(() => null);
    if (existing) return existing;

    // Auto-recuperação caso a sessão tenha sido emitida durante cold-start do banco
    const metaRaw = store.get("anm_arena_participant_meta")?.value;
    if (metaRaw) {
      const meta = JSON.parse(
        Buffer.from(metaRaw, "base64url").toString("utf-8")
      );
      if (meta && meta.id === id && meta.eventId) {
        const ip = await getClientIp();
        const created = await prisma.participantSession
          .upsert({
            where: { id },
            update: { lastSeenAt: new Date(), isConnected: true },
            create: {
              id,
              eventId: meta.eventId,
              sessionToken: crypto.randomUUID(),
              anonymousCode:
                meta.code ||
                crypto.randomBytes(3).toString("hex").toUpperCase(),
              credentialCode: meta.credentialCode || `ANM-2026`,
              name: meta.name || null,
              email: meta.email || null,
              ipHash: hashIp(ip),
              consentAcceptedAt: new Date(),
            },
          })
          .catch(() => null);
        if (created) return created;

        const now = new Date();
        return {
          id,
          eventId: meta.eventId,
          sessionToken: id,
          anonymousCode: meta.code || "ANM",
          credentialCode: meta.credentialCode || "ANM-2026",
          name: meta.name || null,
          email: meta.email || null,
          userAgent: null,
          ipHash: "",
          isConnected: true,
          consentAcceptedAt: now,
          lastSeenAt: now,
          createdAt: now,
        } as any;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function createParticipantSession(
  eventId: string,
  data?: { name?: string; email?: string; credentialCode?: string }
) {
  const ip = await getClientIp();
  const h = await headers();
  const code = crypto.randomBytes(3).toString("hex").toUpperCase();
  const autoCredential =
    data?.credentialCode?.trim() || `ANM-${Math.floor(100 + Math.random() * 900)}`;
  const session = await prisma.participantSession.create({
    data: {
      eventId,
      sessionToken: crypto.randomUUID(),
      anonymousCode: code,
      credentialCode: autoCredential,
      name: data?.name?.trim() || null,
      email: data?.email?.trim().toLowerCase() || null,
      userAgent: (h.get("user-agent") || "").slice(0, 200),
      ipHash: hashIp(ip),
      consentAcceptedAt: new Date(),
    },
  });
  const store = await cookies();
  store.set(PARTICIPANT_SESSION_COOKIE, signAnonymousSessionToken(session.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24, // 24h
  });
  return session;
}

// Rate limiting em memória (camada extra; o controle forte é feito no banco).
const buckets = new Map<string, number[]>();
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) {
    buckets.set(key, arr);
    return false;
  }
  arr.push(now);
  buckets.set(key, arr);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) {
      if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
    }
  }
  return true;
}

/** Remove caracteres de controle e normaliza espaços; o React escapa o HTML na exibição. */
export function sanitizeQuestionText(text: string): string {
  return text
    .normalize("NFC")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
