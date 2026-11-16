import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const newOptions = [
  {
    order: 1,
    theme: "TECNOLOGIA E RESPONSABILIDADE",
    label:
      "A tecnologia que lucra com a sua atenção também pode combater a sua solidão ou está apenas criando novas dependências?",
  },
  {
    order: 2,
    theme: "MERCADO E RELAÇÕES HUMANAS",
    label:
      "Se até o pertencimento virou produto, o mercado está combatendo a solidão ou lucrando com ela?",
  },
  {
    order: 3,
    theme: "TRABALHO E SOCIEDADE",
    label:
      "Estamos cada vez mais conectados, mas também mais isolados. A culpa é das nossas escolhas ou da forma como a sociedade funciona?",
  },
];

async function main() {
  console.log("Atualizando temas e textos das opções de votação no banco de dados...");

  for (const opt of newOptions) {
    const res = await prisma.pollOption.updateMany({
      where: {
        optionOrder: opt.order,
      },
      data: {
        themeLabel: opt.theme,
        label: opt.label,
      },
    });
    console.log(`Opção #${opt.order} (${opt.theme}): ${res.count} registro(s) atualizado(s).`);
  }

  // Incrementa seq do LiveState para forçar atualização em tempo real de todos os clientes conectados
  const liveState = await prisma.liveState.findFirst();
  if (liveState) {
    await prisma.liveState.update({
      where: { id: liveState.id },
      data: {
        seq: { increment: 1 },
      },
    });
    console.log("LiveState seq incrementado com sucesso para sincronização em tempo real.");
  }

  console.log("\nVerificando opções atualizadas no banco de dados:");
  const options = await prisma.pollOption.findMany({
    orderBy: { optionOrder: "asc" },
  });
  for (const o of options) {
    console.log(`\n[Opção #${o.optionOrder}] ${o.themeLabel}`);
    console.log(`Texto: "${o.label}"`);
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
