import { Suspense } from "react";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { getPrimaryEvent } from "@/lib/live-state";
import {
  generateParticipantCredentialsBatchAction,
  toggleRequireCredentialAction,
} from "@/app/actions/foundation";
import { ParticipantsManager } from "@/components/participants-manager";

async function AdminParticipantesContent() {
  await getCurrentAdminUser();
  const event = await getPrimaryEvent();

  const participateUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/participar`
    : "http://localhost:3000/participar";

  const qrSvg = await QRCode.toString(participateUrl, {
    type: "svg",
    margin: 1,
    color: {
      dark: "#14532D",
      light: "#FFFFFF",
    },
  });

  const activeCutoff = new Date(Date.now() - 1000 * 60 * 3);

  const [sessions, activeCount, credentials, usedCredentialsCount, totalCredentialsCount] =
    event
      ? await Promise.all([
          prisma.participantSession.findMany({
            where: { eventId: event.id },
            include: {
              _count: {
                select: { questions: true, votes: true },
              },
            },
            orderBy: { lastSeenAt: "desc" },
            take: 100,
          }),
          prisma.participantSession.count({
            where: {
              eventId: event.id,
              lastSeenAt: { gte: activeCutoff },
            },
          }),
          prisma.participantCredential.findMany({
            where: { eventId: event.id },
            orderBy: { code: "asc" },
            take: 120,
          }),
          prisma.participantCredential.count({
            where: { eventId: event.id, isUsed: true },
          }),
          prisma.participantCredential.count({
            where: { eventId: event.id },
          }),
        ])
      : [[], 0, [], 0, 0];

  if (!event) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-sm text-[#D5C5AA]">
        Evento não encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ParticipantsManager
        event={{
          id: event.id,
          name: event.name,
          requireCredential: event.requireCredential,
          peakConnections: event.peakConnections,
        }}
        participateUrl={participateUrl}
        qrSvg={qrSvg}
        sessions={sessions.map((s) => ({
          id: s.id,
          anonymousCode: s.anonymousCode,
          credentialCode: s.credentialCode,
          lastSeenAt: s.lastSeenAt.toISOString(),
          questionsCount: s._count.questions,
          votesCount: s._count.votes,
        }))}
        credentials={credentials.map((c) => ({
          id: c.id,
          code: c.code,
          label: c.label,
          isUsed: c.isUsed,
        }))}
        activeCount={activeCount}
        usedCredentialsCount={usedCredentialsCount}
        totalCredentialsCount={totalCredentialsCount}
        onToggleRequireCredential={toggleRequireCredentialAction}
        onGenerateCredentials={generateParticipantCredentialsBatchAction}
      />
    </div>
  );
}

export default function AdminParticipantesPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-xs text-[#D5C5AA]/70">
          Carregando participantes e credenciais...
        </div>
      }
    >
      <AdminParticipantesContent />
    </Suspense>
  );
}
