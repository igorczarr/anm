import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SAVED_VOTES = [
  { id: 'cmwigzjts00052og0a24tlz3u', participant: 'Lucas Almeida', cred: 'ANM-152', option: 'TECNOLOGIA E RESPONSABILIDADE' },
  { id: 'cmwimvwhn0005l808ksd83gn4', participant: 'igor', cred: 'ANM-575', option: 'TECNOLOGIA E RESPONSABILIDADE' },
  { id: 'cmwinimbb00012ov0ei22pw79', participant: 'Lucas Almeida', cred: 'ANM-545', option: 'MERCADO E RELAÇÕES HUMANAS' },
  { id: 'cmwjfk3050005k108dv998cs7', participant: 'Michael Gabriel', cred: 'ANM-877', option: 'TECNOLOGIA E RESPONSABILIDADE' },
  { id: 'cmwjfl860000dk108g5mslx31', participant: 'Liz Oliveira', cred: 'ANM-649', option: 'TRABALHO E SOCIEDADE' },
  { id: 'cmwjfotau0005jj07winpy2y4', participant: 'Letícia Guimarães', cred: 'ANM-927', option: 'MERCADO E RELAÇÕES HUMANAS' },
  { id: 'cmwjfpb16000djj07fz6iplrb', participant: 'nielli rios dantas', cred: 'ANM-353', option: 'TECNOLOGIA E RESPONSABILIDADE' },
  { id: 'cmwjfte6c000hjj07si7j9uql', participant: 'Jaqueline Alves Silva', cred: 'ANM-524', option: 'MERCADO E RELAÇÕES HUMANAS' },
  { id: 'cmwjftwgn000ljj075kip5eez', participant: 'Paloma Oliveira Nunes', cred: 'ANM-912', option: 'TRABALHO E SOCIEDADE' },
  { id: 'cmwjfvagb000tjj07wppfuhjx', participant: 'Guilherme Carneiro Guimarães', cred: 'ANM-987', option: 'TRABALHO E SOCIEDADE' },
  { id: 'cmwjfwuer0009l907izzop55v', participant: 'Alex kauan', cred: 'ANM-831', option: 'TRABALHO E SOCIEDADE' },
  { id: 'cmwjfzta20011jj07yfqrti97', participant: 'Nathália Oliveira', cred: 'ANM-219', option: 'TRABALHO E SOCIEDADE' },
  { id: 'cmwjg18tc0005if07fqqkyo4u', participant: 'Maria Clara Miranda de Lima', cred: 'ANM-264', option: 'TECNOLOGIA E RESPONSABILIDADE' },
  { id: 'cmwjgf1l0000pl907gye7vhm7', participant: 'Andresa Cerqueira Soares', cred: 'ANM-912', option: 'TRABALHO E SOCIEDADE' },
  { id: 'cmwjgf8w3000tl907ft570soh', participant: 'Kauan Victor Ferreira Batista', cred: 'ANM-467', option: 'TECNOLOGIA E RESPONSABILIDADE' },
  { id: 'cmwjght4z0011l907czzz44p7', participant: 'Lorena Tupinambás da Hora', cred: 'ANM-239', option: 'TECNOLOGIA E RESPONSABILIDADE' },
  { id: 'cmwjgwf770019l9073bh5thsp', participant: 'Franciele Vitoria da Silva Pinto', cred: 'ANM-950', option: 'TECNOLOGIA E RESPONSABILIDADE' },
  { id: 'cmwjh5t2q0005jt0835ef7k5x', participant: 'Cauã Fernandes', cred: 'ANM-743', option: 'TRABALHO E SOCIEDADE' },
  { id: 'cmwjh5tm40009jt08gptwp4fj', participant: 'Noemi Borges Ferreira Santos', cred: 'ANM-640', option: 'MERCADO E RELAÇÕES HUMANAS' },
  { id: 'cmwjh64y5000djt08vqercc5n', participant: 'Weslei Brandão', cred: 'ANM-990', option: 'MERCADO E RELAÇÕES HUMANAS' },
  { id: 'cmwjhirhm0005jq07yo8z1oox', participant: 'Alice de Cerqueira Lisboa', cred: 'ANM-211', option: 'TECNOLOGIA E RESPONSABILIDADE' },
  { id: 'cmwji43aq0009lg08g7tjx1q4', participant: 'Lucas de Souza Marinho', cred: 'ANM-845', option: 'TECNOLOGIA E RESPONSABILIDADE' },
  { id: 'cmwji4i4n000dlg0826j55yin', participant: 'Byanca Correia Lucena', cred: 'ANM-738', option: 'TECNOLOGIA E RESPONSABILIDADE' },
  { id: 'cmwjifkwe0005l607owsuu5yq', participant: 'Beatriz Santana Souza', cred: 'ANM-193', option: 'TECNOLOGIA E RESPONSABILIDADE' },
  { id: 'cmwjivrx20005ku07pgsospwf', participant: 'Kauane Oliveira Sousa', cred: 'ANM-381', option: 'MERCADO E RELAÇÕES HUMANAS' },
  { id: 'cmwjj0k8h000dku07lrqsxwni', participant: 'Gabriel da Silva Alves', cred: 'ANM-110', option: 'MERCADO E RELAÇÕES HUMANAS' },
  { id: 'cmwjk3qmc0005l707ce5v2gyk', participant: 'Nadyjane Bezerra Marques da Costa', cred: 'ANM-136', option: 'TECNOLOGIA E RESPONSABILIDADE' },
  { id: 'cmwjowack0005jy074zlsrwx4', participant: 'Maria Clara Dantas Matos', cred: 'ANM-358', option: 'TECNOLOGIA E RESPONSABILIDADE' },
  { id: 'cmwjqnanc0001kx0876h1457u', participant: 'thauanny mendes', cred: 'ANM-875', option: 'TECNOLOGIA E RESPONSABILIDADE' },
];

function decodeCuidTimestamp(cuid: string): Date {
  const tsBase36 = cuid.slice(1, 9);
  const ms = parseInt(tsBase36, 36);
  return new Date(ms);
}

async function main() {
  const poll = await prisma.poll.findFirst({
    include: { options: true },
  });
  if (!poll) throw new Error("Poll não encontrada!");

  const sessions = await prisma.participantSession.findMany({
    where: { name: { not: null } },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Encontradas ${sessions.length} sessões identificadas no banco.`);

  let restoredCount = 0;
  const optionCounts: Record<string, number> = {};
  for (const opt of poll.options) {
    optionCounts[opt.id] = 0;
  }

  for (const sv of SAVED_VOTES) {
    const matchSession = sessions.find(
      (s) => s.name === sv.participant && s.credentialCode === sv.cred
    );
    if (!matchSession) {
      console.error("SESSÃO NÃO ENCONTRADA PARA:", sv);
      continue;
    }

    const matchOption = poll.options.find(
      (o) => o.themeLabel === sv.option || o.label === sv.option
    );
    if (!matchOption) {
      console.error("OPÇÃO NÃO ENCONTRADA PARA:", sv);
      continue;
    }

    const createdAt = decodeCuidTimestamp(sv.id);

    await prisma.vote.upsert({
      where: {
        pollId_sessionId: {
          pollId: poll.id,
          sessionId: matchSession.id,
        },
      },
      update: {
        id: sv.id,
        optionId: matchOption.id,
        createdAt,
        updatedAt: createdAt,
      },
      create: {
        id: sv.id,
        pollId: poll.id,
        optionId: matchOption.id,
        sessionId: matchSession.id,
        createdAt,
        updatedAt: createdAt,
      },
    });

    await prisma.voteHistory.create({
      data: {
        pollId: poll.id,
        sessionId: matchSession.id,
        previousOptionId: null,
        newOptionId: matchOption.id,
        changedAt: createdAt,
      },
    });

    optionCounts[matchOption.id] = (optionCounts[matchOption.id] || 0) + 1;
    restoredCount++;
    console.log(
      `✓ Restaurado [${restoredCount}/30]: ${sv.participant} (${sv.cred}) -> ${sv.option} @ ${createdAt.toISOString()}`
    );
  }

  for (const opt of poll.options) {
    const count = optionCounts[opt.id] || 0;
    await prisma.pollOption.update({
      where: { id: opt.id },
      data: { votesCount: count },
    });
  }

  await prisma.poll.update({
    where: { id: poll.id },
    data: {
      totalVotes: restoredCount,
      status: "OPEN",
    },
  });

  const verifyPoll = await prisma.poll.findFirst({
    include: { options: true, _count: { select: { votes: true } } },
  });

  console.log("\n=== CONFERÊNCIA FINAL PÓS-RESTAURAÇÃO ===");
  console.log(`Total de votos na tabela Vote: ${verifyPoll?._count.votes}`);
  console.log(`TotalVotes na Poll: ${verifyPoll?.totalVotes}`);
  for (const o of verifyPoll?.options || []) {
    console.log(`  - ${o.themeLabel}: ${o.votesCount} votos`);
  }
}

main()
  .catch((e) => {
    console.error("Erro na restauração:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
