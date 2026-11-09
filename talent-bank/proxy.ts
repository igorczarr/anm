import { NextRequest, NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";

const hasValidClerkSecret = Boolean(
  process.env.CLERK_SECRET_KEY &&
    process.env.CLERK_SECRET_KEY.startsWith("sk_") &&
    !process.env.CLERK_SECRET_KEY.includes("REPLACE_WITH") &&
    !process.env.CLERK_SECRET_KEY.includes("…")
);

export default hasValidClerkSecret
  ? clerkMiddleware()
  : function proxy(_req: NextRequest) {
      return NextResponse.next();
    };

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
