import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/session";
import { updateGiveawayPrize, deleteGiveawayPrize } from "@/lib/giveaway";
import { bumpLiveStateSeq } from "@/lib/live-state";

export const dynamic = "force-dynamic";

export async function PUT(
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
    const body = await req.json();
    const updated = await updateGiveawayPrize(id, body);
    if (!updated) {
      return NextResponse.json(
        { error: "Brinde não encontrado." },
        { status: 404 }
      );
    }

    await bumpLiveStateSeq("giveaway.updated");

    return NextResponse.json({ ok: true, prize: updated });
  } catch (err) {
    return NextResponse.json(
      { error: "Erro ao atualizar brinde." },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    const success = await deleteGiveawayPrize(id);
    if (!success) {
      return NextResponse.json(
        { error: "Brinde não encontrado." },
        { status: 404 }
      );
    }

    await bumpLiveStateSeq("giveaway.deleted");

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Erro ao excluir brinde." },
      { status: 500 }
    );
  }
}
