import { NextResponse } from "next/server";
import { PARTICIPANT_SESSION_COOKIE } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(PARTICIPANT_SESSION_COOKIE);
  res.cookies.delete("anm_arena_participant_meta");
  return res;
}

export async function GET() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(PARTICIPANT_SESSION_COOKIE);
  res.cookies.delete("anm_arena_participant_meta");
  return res;
}
