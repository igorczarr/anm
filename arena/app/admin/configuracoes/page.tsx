import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { getPrimaryEvent } from "@/lib/live-state";
import {
  updateEventSettingsAction,
  updateSpeakerAction,
  updateTopicAction,
} from "@/app/actions/foundation";
import { resetEntireEventAction } from "@/app/actions/live-operation";
import { SettingsManager } from "@/components/settings-manager";

async function AdminConfiguracoesContent() {
  await getCurrentAdminUser();
  const event = await getPrimaryEvent();

  if (!event) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-sm text-[#D5C5AA]">
        Evento não encontrado.
      </div>
    );
  }

  const [topics, speakers] = await Promise.all([
    prisma.topic.findMany({
      where: { eventId: event.id },
      include: { mainSpeaker: true },
      orderBy: { number: "asc" },
    }),
    prisma.speaker.findMany({
      where: { eventId: event.id },
      orderBy: { displayOrder: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <SettingsManager
        event={{
          id: event.id,
          name: event.name,
          theme: event.theme,
          institution: event.institution,
          estimatedAudience: event.estimatedAudience,
          programmedDurationMin: event.programmedDurationMin,
          certifiedHours: event.certifiedHours,
          formatDescription: event.formatDescription,
          questionCharLimit: event.questionCharLimit,
          maxQuestionsPerTopic: event.maxQuestionsPerTopic,
          minQuestionIntervalSec: event.minQuestionIntervalSec,
          soundAlertsEnabled: event.soundAlertsEnabled,
          showTimerOnArena: event.showTimerOnArena,
          requireAccessCode: event.requireAccessCode,
          requireCredential: event.requireCredential,
          accessCode: event.accessCode,
          scheduledStartAt: event.scheduledStartAt
            ? event.scheduledStartAt.toISOString()
            : null,
          status: event.status,
          scheduleLocked: event.scheduleLocked,
        }}
        topics={topics.map((t) => ({
          id: t.id,
          number: t.number,
          title: t.title,
          durationSec: t.durationSec,
          mainSpeakerId: t.mainSpeakerId,
          provokerLabel: t.provokerLabel,
          provokerId: t.provokerId,
          mainSpeaker: t.mainSpeaker
            ? { id: t.mainSpeaker.id, name: t.mainSpeaker.name }
            : null,
        }))}
        speakers={speakers.map((sp) => ({
          id: sp.id,
          name: sp.name,
          roleTitle: sp.roleTitle,
          bio: sp.bio,
          photoUrl: sp.photoUrl,
          displayOrder: sp.displayOrder,
        }))}
        onUpdateEventSettings={updateEventSettingsAction}
        onUpdateTopic={updateTopicAction}
        onUpdateSpeaker={updateSpeakerAction}
        onResetEntireEvent={resetEntireEventAction}
      />
    </div>
  );
}

export default function AdminConfiguracoesPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-xs text-[#D5C5AA]/70">
          Carregando configurações do evento e pautas...
        </div>
      }
    >
      <AdminConfiguracoesContent />
    </Suspense>
  );
}
