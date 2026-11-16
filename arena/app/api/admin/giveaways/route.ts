import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/session";
import {
  getGiveawaysSnapshot,
  getEligibleParticipants,
  addGiveawayPrize,
} from "@/lib/giveaway";
import { bumpLiveStateSeq } from "@/lib/live-state";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const [snapshot, eligible] = await Promise.all([
      getGiveawaysSnapshot(),
      getEligibleParticipants(),
    ]);

    return NextResponse.json({
      ...snapshot,
      eligibleParticipants: eligible,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Erro ao obter informações de sorteios." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { title, description, sponsor, quantity } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "O título do prêmio é obrigatório." },
        { status: 400 }
      );
    }

    const prize = await addGiveawayPrize({
      title,
      description: description || "",
      sponsor: sponsor || "A Nova Moeda",
      quantity: Number(quantity) || 1,
    });

    await bumpLiveStateSeq("giveaway.created");

    return NextResponse.json({ ok: true, prize });
  } catch (err) {
    return NextResponse.json(
      { error: "Erro ao cadastrar novo prêmio." },
      { status: 500 }
    );
  }
}
