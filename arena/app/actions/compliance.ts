"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminPermission, logAdminAction } from "@/lib/admin-auth";
import { getPrimaryEvent } from "@/lib/live-state";

/**
 * Ação de Conformidade LGPD pós-evento (§12.4):
 * Exclui identificadores técnicos de IP, user-agent e sessões anônimas após a consolidação do relatório,
 * mantendo as estatísticas agregadas de votos e perguntas sem qualquer vínculo rastreável.
 */
export async function purgeParticipantTechnicalDataAction() {
  const admin = await requireAdminPermission("canManageAccess");
  const event = await getPrimaryEvent();
  if (!event) throw new Error("Evento não encontrado");

  // Anônima as sessões técnicas mantendo as chaves necessárias para integridade referencial
  await prisma.participantSession.updateMany({
    where: { eventId: event.id },
    data: {
      userAgent: null,
      ipHash: null,
      isConnected: false,
    },
  });

  await logAdminAction({
    eventId: event.id,
    userId: admin.id,
    action: "LGPD_TECHNICAL_DATA_PURGED",
    entityType: "ParticipantSession",
    metadata: {
      timestamp: new Date().toISOString(),
      performedBy: admin.email,
    },
  });

  revalidatePath("/admin/relatorios");
  revalidatePath("/admin/participantes");
}
