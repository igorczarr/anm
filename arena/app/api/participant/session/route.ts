import { NextResponse } from "next/server";
import { getPrimaryEvent } from "@/lib/live-state";
import {
  createParticipantSession,
  getClientIp,
  getParticipantSession,
  rateLimit,
} from "@/lib/participant";

export const dynamic = "force-dynamic";

/** Cria (ou reaproveita) a sessão anônima do dispositivo. Nenhum dado pessoal é coletado. */
export async function POST() {
  try {
    const event = await getPrimaryEvent();
    if (!event) {
      return NextResponse.json({ error: "Evento indisponível." }, { status: 503 });
    }

    const existing = await getParticipantSession();
    if (existing && existing.eventId === event.id) {
      return NextResponse.json({ ok: true, code: existing.anonymousCode });
    }

    const ip = await getClientIp();
    if (!rateLimit(`session:${ip}`, 30, 10 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde alguns instantes." },
        { status: 429 }
      );
    }

    const session = await createParticipantSession(event.id);
    return NextResponse.json({ ok: true, code: session.anonymousCode });
  } catch (error) {
    console.error("POST /api/participant/session:", error);
    return NextResponse.json(
      { error: "Não foi possível entrar agora. Tente novamente." },
      { status: 500 }
    );
  }
}
