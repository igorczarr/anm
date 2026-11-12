import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { getPrimaryEvent } from "@/lib/live-state";
import {
  toggleScheduleLockAction,
  updateScheduleStepAction,
} from "@/app/actions/foundation";
import { ScheduleManager } from "@/components/schedule-manager";

async function AdminCronogramaContent() {
  await getCurrentAdminUser();
  const event = await getPrimaryEvent();

  if (!event) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-sm text-[#D5C5AA]">
        Evento não encontrado.
      </div>
    );
  }

  const [macroSteps, operationalSteps, speakers, topics] = await Promise.all([
    prisma.scheduleStep.findMany({
      where: { eventId: event.id, isMacroBlock: true },
      orderBy: { macroOrder: "asc" },
    }),
    prisma.scheduleStep.findMany({
      where: { eventId: event.id, isMacroBlock: false },
      orderBy: { sequenceOrder: "asc" },
    }),
    prisma.speaker.findMany({
      where: { eventId: event.id },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.topic.findMany({
      where: { eventId: event.id },
      include: { mainSpeaker: true },
      orderBy: { number: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <ScheduleManager
        event={{
          id: event.id,
          name: event.name,
          status: event.status,
          scheduleLocked: event.scheduleLocked,
          certifiedHours: event.certifiedHours,
          programmedDurationMin: event.programmedDurationMin,
        }}
        macroSteps={macroSteps.map((s) => ({
          id: s.id,
          code: s.code,
          title: s.title,
          sequenceOrder: s.sequenceOrder,
          macroOrder: s.macroOrder,
          isMacroBlock: s.isMacroBlock,
          durationSec: s.durationSec,
          responsibleName: s.responsibleName,
          arenaMode: s.arenaMode,
          status: s.status,
          topicId: s.topicId,
          speakerId: s.speakerId,
        }))}
        operationalSteps={operationalSteps.map((s) => ({
          id: s.id,
          code: s.code,
          title: s.title,
          sequenceOrder: s.sequenceOrder,
          macroOrder: s.macroOrder,
          isMacroBlock: s.isMacroBlock,
          durationSec: s.durationSec,
          responsibleName: s.responsibleName,
          arenaMode: s.arenaMode,
          status: s.status,
          topicId: s.topicId,
          speakerId: s.speakerId,
        }))}
        speakers={speakers.map((sp) => ({
          id: sp.id,
          name: sp.name,
          roleTitle: sp.roleTitle,
          photoUrl: sp.photoUrl,
        }))}
        topics={topics.map((t) => ({
          id: t.id,
          number: t.number,
          title: t.title,
          mainSpeaker: t.mainSpeaker ? { name: t.mainSpeaker.name } : null,
        }))}
        onUpdateStep={updateScheduleStepAction}
        onToggleLock={toggleScheduleLockAction}
      />
    </div>
  );
}

export default function AdminCronogramaPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-xs text-[#D5C5AA]/70">
          Carregando programação oficial e cronograma...
        </div>
      }
    >
      <AdminCronogramaContent />
    </Suspense>
  );
}
