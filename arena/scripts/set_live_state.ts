import { prisma } from "../lib/prisma";

async function main() {
  const deck = process.argv[2] ?? "sergio";
  const index = parseInt(process.argv[3] ?? "0", 10);
  const mode = process.argv[4] ?? "SPEAKER_EXPOSITION";

  const event = await prisma.event.findFirst();
  if (!event) throw new Error("Event not found");

  await prisma.liveState.update({
    where: { eventId: event.id },
    data: {
      arenaMode: mode as any,
      activeStepId: "cmwe31zkr002h2ogkc1ic2u9y",
      activeTopicId: "cmwe31wid00192ogkrmg314n5",
      slideDeck: deck === "null" ? null : deck,
      slideIndex: index,
    },
  });

  console.log(`LiveState updated: deck=${deck}, index=${index}, mode=${mode}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
