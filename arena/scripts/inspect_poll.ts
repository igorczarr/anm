import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const polls = await prisma.poll.findMany({
    include: {
      options: {
        orderBy: { optionOrder: "asc" },
      },
    },
  });

  console.log(`Found ${polls.length} poll(s):`);
  for (const p of polls) {
    console.log(`\nPoll ID: ${p.id}, Question: "${p.question}", Status: ${p.status}`);
    for (const opt of p.options) {
      console.log(`  - Option #${opt.optionOrder} (ID: ${opt.id}):`);
      console.log(`    ThemeLabel: "${opt.themeLabel}"`);
      console.log(`    Label: "${opt.label}"`);
      console.log(`    Votes: ${opt.votesCount}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
