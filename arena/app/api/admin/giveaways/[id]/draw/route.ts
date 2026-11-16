import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/session";
import { drawGiveawayWinner } from "@/lib/giveaway";
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
    const result = await drawGiveawayWinner(id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await bumpLiveStateSeq("giveaway.drawn");

    return NextResponse.json({
      ok: true,
      prize: result.prize,
      winner: result.winner,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Erro ao executar sorteio." },
      { status: 500 }
    );
  }
}
