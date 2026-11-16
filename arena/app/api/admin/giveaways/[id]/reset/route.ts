import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/session";
import { resetGiveawayDraw } from "@/lib/giveaway";
import { bumpLiveStateSeq } from "@/lib/live-state";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  try {
    const prize = await resetGiveawayDraw(id);
    if (!prize) {
      return NextResponse.json(
        { error: "Brinde não encontrado." },
        { status: 404 }
      );
    }

    await bumpLiveStateSeq("giveaway.reset");

    return NextResponse.json({ ok: true, prize });
  } catch (err) {
    return NextResponse.json(
      { error: "Erro ao resetar sorteio." },
      { status: 500 }
    );
  }
}
