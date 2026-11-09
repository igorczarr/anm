import { NextRequest, NextResponse } from "next/server";
import { getArenaSyncSnapshot, getPrimaryEvent } from "@/lib/live-state";
import { getAuthenticatedAdmin } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sinceParam = searchParams.get("since");
    const sinceSeq = sinceParam ? Number(sinceParam) : undefined;
    const wantAdmin = searchParams.get("admin") === "1";

    let includeAdminStats = false;
    if (wantAdmin) {
      const admin = await getAuthenticatedAdmin();
      includeAdminStats = Boolean(admin);
    }

    const snapshot = await getArenaSyncSnapshot({
      sinceSeq,
      includeAdminStats,
    });

    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Erro em GET /api/state:", error);
    return NextResponse.json(
      { error: "Falha ao sincronizar estado da Arena" },
      { status: 500 }
    );
  }
}

/**
 * Heartbeat enviado pela tela pública ARENA para confirmar que o telão está online e sincronizado
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.source === "ARENA_SCREEN") {
      const event = await getPrimaryEvent();
      if (event) {
        await prisma.liveState.updateMany({
          where: { eventId: event.id },
          data: { arenaLastHeartbeatAt: new Date() },
        });
      }
    }
    return NextResponse.json({ ok: true, serverNow: Date.now() });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
