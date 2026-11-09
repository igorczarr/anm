import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_SESSION_COOKIE,
  SESSION_COOKIE_NAME,
  createSessionToken,
  getAuthenticatedUser,
  getDestinationForRole,
} from "@/lib/session";
import { ConsentPurpose, UserRole } from "@prisma/client";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const email = (sp.get("email") || "").trim().toLowerCase();
  const fullName = (sp.get("name") || "").trim();
  const clerkId = (sp.get("clerkId") || "").trim();
  const inviteToken = (sp.get("convite") || "").trim();

  if (email) {
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      let role: UserRole = UserRole.CANDIDATE;
      let companyName: string | null = null;
      let validInviteId: string | null = null;

      if (inviteToken) {
        const invite = await prisma.recruiterInvite.findUnique({
          where: { token: inviteToken },
        });
        if (
          invite &&
          !invite.usedAt &&
          new Date(invite.expiresAt) >= new Date()
        ) {
          role = invite.role || UserRole.RECRUITER;
          companyName = invite.companyName || null;
          validInviteId = invite.id;
        }
      }

      user = await prisma.user.create({
        data: {
          email,
          fullName: fullName || email.split("@")[0],
          clerkId: clerkId || null,
          companyName,
          role,
          status: "ACTIVE",
          consentRecords: {
            create: [
              {
                purpose: ConsentPurpose.CORE_PLATFORM,
                termsVersion: "v1.0-2026",
                granted: true,
              },
            ],
          },
        },
      });

      if (validInviteId) {
        await prisma.recruiterInvite.update({
          where: { id: validInviteId },
          data: { usedAt: new Date(), usedByEmail: user.email },
        });
      } else {
        await prisma.candidateProfile.create({
          data: {
            userId: user.id,
            fullName: user.fullName,
            email: user.email,
            completionPercent: 20,
          },
        });
      }
    } else if (clerkId && !user.clerkId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { clerkId },
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

    return NextResponse.redirect(
      new URL(getDestinationForRole(user.role), req.url)
    );
  }

  const existing = await getAuthenticatedUser();
  if (existing) {
    return NextResponse.redirect(
      new URL(getDestinationForRole(existing.role), req.url)
    );
  }

  return NextResponse.redirect(new URL("/entrar", req.url));
}
