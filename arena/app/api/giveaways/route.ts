import { NextResponse } from "next/server";
import { getGiveawaysSnapshot } from "@/lib/giveaway";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getGiveawaysSnapshot();
    return NextResponse.json(snapshot);
  } catch (err) {
    return NextResponse.json(
      { error: "Erro ao carregar sorteios." },
      { status: 500 }
    );
  }
}
