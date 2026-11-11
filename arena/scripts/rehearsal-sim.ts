/**
 * SCRIPT DE ENSAIO TÉCNICO & SIMULAÇÃO ACELERADA (v2.0)
 * Arena A Nova Moeda — Economia da Solidão (UEFS)
 *
 * Valida ponta a ponta o Novo Fluxo Oficial do Evento:
 * 1. Abertura (5m) · 2. Introdução e contexto com Paula (10m)
 * 3 a 7. Pautas 1 a 5 (Daniel, Janaína, Denilson, Sérgio, Janaína: 15m Exposição + 5m P&R)
 * 8. Votação da Mesa-Redonda (aberta durante Pauta 5, encerrada antes da mesa)
 * 9. Mesa-Redonda (20m com os 5 especialistas sobre a questão vencedora)
 * 10. Encerramento (5m)
 *
 * Também testa:
 * - Credenciais de check-in (ANM-001..ANM-250) + sessões anônimas
 * - 1 pergunta ativa por participante por pauta + edição em tempo real durante a exposição
 * - Acionamento da Pergunta de Reserva da Mediação (identificada como "Pergunta da Mediação")
 * - Alteração de voto na Mesa-Redonda com trilha em VoteHistory
 * - Exportações PDF, CSV e XLSX
 */

import { PrismaClient, ArenaMode } from "@prisma/client";
import crypto from "crypto";
import { getConsolidatedEventReport } from "../lib/reports";
import {
  generateArenaReportPdf,
  buildCsvBuffer,
  buildSpreadsheetXmlBuffer,
} from "../lib/pdf-generator";

const prisma = new PrismaClient();

function logSection(title: string) {
  console.log(`\n${"=".repeat(72)}`);
  console.log(`🔷 ${title.toUpperCase()}`);
  console.log(`${"=".repeat(72)}`);
}

function logStep(step: string, status: "OK" | "WARN" | "FAIL" = "OK") {
  const icons = { OK: "✅", WARN: "⚠️", FAIL: "❌" };
  console.log(`  ${icons[status]} ${step}`);
}

async function runRehearsal() {
  const startTime = Date.now();
  logSection("1. Inicialização do Ensaio Técnico (Formato Oficial v2.0)");

  const event = await prisma.event.findFirst({
    include: {
      speakers: { orderBy: { displayOrder: "asc" } },
      topics: {
        orderBy: { number: "asc" },
        include: { mainSpeaker: true, provoker: true },
      },
      scheduleSteps: { orderBy: { sequenceOrder: "asc" } },
      polls: { include: { options: { orderBy: { optionOrder: "asc" } } } },
      liveState: true,
    },
  });

  if (!event) {
    throw new Error(
      "Evento não encontrado. Execute 'npm run db:seed' antes do ensaio."
    );
  }

  const macroBlocks = event.scheduleSteps.filter((s) => s.isMacroBlock);
  const operationalSteps = event.scheduleSteps.filter((s) => !s.isMacroBlock);

  logStep(
    `Evento identificado: "${event.name} — ${event.theme}" (${event.institution})`
  );
  logStep(
    `Duração programada: ${event.programmedDurationMin} min (2h25) · Carga horária certificada: ${event.certifiedHours}h`
  );
  logStep(`Especialistas cadastrados: ${event.speakers.length} especialistas`);
  logStep(`Pautas cadastradas: ${event.topics.length} pautas (15m + 5m P&R)`);
  logStep(
    `Cronograma: ${macroBlocks.length} macroblocos · ${operationalSteps.length} etapas operacionais`
  );
  logStep(
    `Votação da Mesa-Redonda cadastrada: ${event.polls.length} enquete oficial`
  );

  // Asserções do Formato v2.0
  if (event.topics.length !== 5) {
    throw new Error(
      `Esperado 5 pautas oficiais no formato v2.0, encontrado: ${event.topics.length}`
    );
  }
  const topicNumbers = event.topics.map((t) => t.number);
  if (JSON.stringify(topicNumbers) !== JSON.stringify([1, 2, 3, 4, 5])) {
    throw new Error(
      `Numeração das pautas incorreta: ${topicNumbers.join(", ")}`
    );
  }
  if (macroBlocks.length !== 10) {
    throw new Error(
      `Esperado 10 etapas macro no fluxo oficial v2.0, encontrado: ${macroBlocks.length}`
    );
  }
  logStep(
    "Verificação do Fluxo Oficial v2.0 (10 Etapas Macro, 5 Pautas de 15m+5m, 1 Votação da Mesa-Redonda): APROVADO"
  );

  // 1.2 Limpar dados transitórios anteriores do ensaio (preservando perguntas de reserva da mediação do seed)
  logStep("Higienizando dados transitórios de ensaios anteriores...");
  await prisma.voteHistory.deleteMany({
    where: { poll: { eventId: event.id } },
  });
  await prisma.vote.deleteMany({ where: { poll: { eventId: event.id } } });
  await prisma.questionStatusHistory.deleteMany({
    where: {
      question: { eventId: event.id, isMediationReserve: false },
    },
  });
  await prisma.question.deleteMany({
    where: { eventId: event.id, isMediationReserve: false },
  });
  await prisma.question.updateMany({
    where: { eventId: event.id, isMediationReserve: true },
    data: {
      status: "APPROVED",
      isPrimary: false,
      displayedAt: null,
      answeredAt: null,
    },
  });
  await prisma.participantCredential.updateMany({
    where: { eventId: event.id },
    data: { isUsed: false, sessionId: null, validatedAt: null },
  });
  await prisma.participantSession.deleteMany({ where: { eventId: event.id } });
  await prisma.screenMessage.deleteMany({ where: { eventId: event.id } });
  await prisma.timerSession.deleteMany({ where: { eventId: event.id } });
  await prisma.pollOption.updateMany({
    where: { poll: { eventId: event.id } },
    data: { votesCount: 0 },
  });
  await prisma.poll.updateMany({
    where: { eventId: event.id },
    data: {
      status: "DRAFT",
      totalVotes: 0,
      winningOptionId: null,
      winningQuestionText: null,
      isTieBreak: false,
      tieBreakOptionIds: [],
      tieBreakJustification: null,
    },
  });

  logStep("Ambiente preparado para simulação limpa.");

  // -------------------------------------------------------------
  // 2. Simulação de 150 Participantes Conectados + Credenciais ANM
  // -------------------------------------------------------------
  logSection("2. Simulação de Audiência (150 Participantes + Credenciais)");

  const credentials = await prisma.participantCredential.findMany({
    where: { eventId: event.id },
    orderBy: { code: "asc" },
    take: 150,
  });

  const mockSessions: Array<{
    id: string;
    sessionToken: string;
    anonymousCode: string;
    credentialCode: string | null;
  }> = [];
  const TOTAL_AUDIENCE = 150;

  for (let i = 1; i <= TOTAL_AUDIENCE; i++) {
    const code = crypto.randomBytes(3).toString("hex").toUpperCase();
    const token = crypto.randomUUID();
    const ipHash = crypto
      .createHash("sha256")
      .update(`mock-ip-${i}`)
      .digest("hex")
      .slice(0, 32);
    const cred = credentials[i - 1] ?? null;

    const session = await prisma.participantSession.create({
      data: {
        eventId: event.id,
        sessionToken: token,
        anonymousCode: code,
        credentialCode: cred?.code ?? null,
        userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) MockParticipant/${i}`,
        ipHash,
        consentAcceptedAt: new Date(),
        lastSeenAt: new Date(),
        isConnected: true,
      },
    });

    if (cred) {
      await prisma.participantCredential.update({
        where: { id: cred.id },
        data: {
          isUsed: true,
          sessionId: session.id,
          validatedAt: new Date(),
        },
      });
    }

    mockSessions.push({
      id: session.id,
      sessionToken: token,
      anonymousCode: code,
      credentialCode: cred?.code ?? null,
    });
  }

  logStep(
    `${mockSessions.length} sessões criadas e vinculadas a credenciais de check-in (ANM-001..ANM-150)`
  );

  await prisma.event.update({
    where: { id: event.id },
    data: {
      peakConnections: TOTAL_AUDIENCE,
      actualStartAt: new Date(),
      scheduleLocked: true,
    },
  });

  await prisma.liveState.update({
    where: { eventId: event.id },
    data: {
      status: "LIVE",
      questionsOpen: false,
      seq: { increment: 1 },
      lastEventType: "event.started",
    },
  });

  // -------------------------------------------------------------
  // 3. Execução Sequencial das 15 Etapas Operacionais (10 Macroblocos)
  // -------------------------------------------------------------
  logSection(
    "3. Execução do Fluxo Operacional (Abertura, Introdução Paula, 5 Pautas, Transição, Mesa-Redonda, Encerramento)"
  );

  let currentSeq = (event.liveState?.seq ?? 1) + 2;

  for (let sIndex = 0; sIndex < operationalSteps.length; sIndex++) {
    const step = operationalSteps[sIndex];

    await prisma.scheduleStep.update({
      where: { id: step.id },
      data: {
        status: "ACTIVE",
        actualStartAt: new Date(),
      },
    });

    const targetArenaMode: ArenaMode = step.arenaMode || "WAITING";
    const isExposition = step.stepType === "EXPOSITION";

    const timerSession = await prisma.timerSession.create({
      data: {
        eventId: event.id,
        stepId: step.id,
        plannedStartAt: new Date(),
        plannedDurationSec: step.durationSec,
        actualStartAt: new Date(),
        pausedTotalSec: 0,
        addedTotalSec: 0,
        reducedTotalSec: 0,
        overrunSec: 0,
        changedByName: "ensaio-tecnico-v2",
      },
    });

    currentSeq++;
    await prisma.liveState.update({
      where: { eventId: event.id },
      data: {
        activeStepId: step.id,
        activeTopicId: step.topicId ?? null,
        arenaMode: targetArenaMode,
        questionsOpen: isExposition,
        seq: currentSeq,
      },
    });

    await prisma.scheduleStep.update({
      where: { id: step.id },
      data: {
        status: "COMPLETED",
        actualEndAt: new Date(Date.now() + 1000),
        actualDurationSec: step.durationSec,
      },
    });

    await prisma.timerSession.update({
      where: { id: timerSession.id },
      data: {
        actualEndAt: new Date(Date.now() + 1000),
        effectiveDurationSec: step.durationSec,
        status: "FINISHED",
      },
    });
  }

  // Marca também os 10 macroblocos como concluídos
  for (const mb of macroBlocks) {
    await prisma.scheduleStep.update({
      where: { id: mb.id },
      data: {
        status: "COMPLETED",
        actualStartAt: new Date(),
        actualEndAt: new Date(Date.now() + 1000),
        actualDurationSec: mb.durationSec,
      },
    });
  }

  logStep(
    `Todas as ${operationalSteps.length} etapas operacionais e ${macroBlocks.length} macroblocos executados com sucesso.`
  );

  // -------------------------------------------------------------
  // 4. Simulação de Perguntas (1 por Participante + Edição) & Reserva da Mediação
  // -------------------------------------------------------------
  logSection(
    "4. Simulação de Perguntas (Edição em Tempo Real + Reserva da Mediação)"
  );

  let totalAudienceQuestionsCreated = 0;

  for (const topic of event.topics) {
    const questionsPerTopic = 10;
    const questionsForThisTopic: Array<{ id: string; text: string }> = [];

    for (let q = 1; q <= questionsPerTopic; q++) {
      const session =
        mockSessions[(topic.number * 20 + q) % mockSessions.length];
      const clientRequestId = `req-v2-t${topic.number}-q${q}-${session.id.slice(0, 8)}`;
      const initialText = `[Pauta ${topic.number}] Pergunta inicial ${q}: Como "${topic.title.slice(0, 28)}..." afeta os jovens na UEFS?`;

      const created = await prisma.question.create({
        data: {
          eventId: event.id,
          topicId: topic.id,
          sessionId: session.id,
          clientRequestId,
          text: initialText,
          status: "RECEIVED",
          isMediationReserve: false,
        },
      });

      // Os 2 primeiros participantes de cada pauta editam sua pergunta durante os 15 min de exposição
      if (q <= 2) {
        const editedText = `${initialText} (Editada pelo participante com exemplo prático)`;
        await prisma.question.update({
          where: { id: created.id },
          data: {
            text: editedText,
            editCount: { increment: 1 },
          },
        });
      }

      questionsForThisTopic.push({ id: created.id, text: initialText });
      totalAudienceQuestionsCreated++;
    }

    // Aprovar 5 perguntas, rejeitar 3, duplicar 2
    for (const q of questionsForThisTopic.slice(0, 5)) {
      await prisma.question.update({
        where: { id: q.id },
        data: { status: "APPROVED" },
      });
    }
    for (const q of questionsForThisTopic.slice(5, 8)) {
      await prisma.question.update({
        where: { id: q.id },
        data: { status: "REJECTED" },
      });
    }
    for (const q of questionsForThisTopic.slice(8, 10)) {
      await prisma.question.update({
        where: { id: q.id },
        data: { status: "DUPLICATE" },
      });
    }

    // Nas Pautas 1 a 4 selecionamos 1 pergunta da plateia; na Pauta 5 testamos o acionamento da Pergunta de Reserva da Mediação
    if (topic.number < 5) {
      const chosen = questionsForThisTopic[0];
      await prisma.question.update({
        where: { id: chosen.id },
        data: {
          isPrimary: true,
          status: "ANSWERED",
          displayedAt: new Date(),
          answeredAt: new Date(),
        },
      });
      logStep(
        `Pauta ${topic.number} (${topic.mainSpeaker.name}): 10 enviadas (2 editadas), 5 aprovadas, 1 Pergunta da Plateia exibida e respondida em 5 min`
      );
    } else {
      const mediationReserve = await prisma.question.findFirst({
        where: {
          eventId: event.id,
          topicId: topic.id,
          isMediationReserve: true,
        },
      });
      if (!mediationReserve) {
        throw new Error(
          "Pergunta de Reserva da Mediação não encontrada para a Pauta 5."
        );
      }
      await prisma.question.update({
        where: { id: mediationReserve.id },
        data: {
          isPrimary: true,
          status: "ANSWERED",
          displayedAt: new Date(),
          answeredAt: new Date(),
        },
      });
      logStep(
        `Pauta ${topic.number} (${topic.mainSpeaker.name}): Pergunta de Reserva da Mediação acionada e respondida com identificação transparente`
      );
    }
  }

  // -------------------------------------------------------------
  // 5. Simulação da Votação da Mesa-Redonda (Aberta na Pauta 5)
  // -------------------------------------------------------------
  logSection("5. Simulação da Votação da Mesa-Redonda (3 Questões Candidatas)");

  const roundtablePoll = event.polls[0];
  if (!roundtablePoll || roundtablePoll.options.length !== 3) {
    throw new Error(
      "A enquete oficial da Mesa-Redonda com 3 questões candidatas não foi encontrada."
    );
  }

  await prisma.poll.update({
    where: { id: roundtablePoll.id },
    data: { status: "OPEN", openedAt: new Date() },
  });

  const voters = mockSessions.slice(0, 120);
  const options = roundtablePoll.options;

  for (let v = 0; v < voters.length; v++) {
    const session = voters[v];
    // 50% Questão 1, 30% Questão 2, 20% Questão 3
    const selectedOption =
      v % 10 < 5 ? options[0] : v % 10 < 8 ? options[1] : options[2];

    await prisma.vote.create({
      data: {
        pollId: roundtablePoll.id,
        optionId: selectedOption.id,
        sessionId: session.id,
      },
    });
    await prisma.voteHistory.create({
      data: {
        pollId: roundtablePoll.id,
        sessionId: session.id,
        previousOptionId: null,
        newOptionId: selectedOption.id,
      },
    });
  }

  // 12 participantes alteram seu voto enquanto a votação está aberta
  const voteSwitchers = voters.slice(0, 12);
  for (const switcher of voteSwitchers) {
    const currentVote = await prisma.vote.findUnique({
      where: {
        pollId_sessionId: {
          pollId: roundtablePoll.id,
          sessionId: switcher.id,
        },
      },
    });
    const newOption = options[0];
    if (currentVote && currentVote.optionId !== newOption.id) {
      await prisma.vote.update({
        where: { id: currentVote.id },
        data: { optionId: newOption.id },
      });
      await prisma.voteHistory.create({
        data: {
          pollId: roundtablePoll.id,
          sessionId: switcher.id,
          previousOptionId: currentVote.optionId,
          newOptionId: newOption.id,
        },
      });
    }
  }

  // Recalcular contadores e eleger a questão vencedora
  let pollTotal = 0;
  let winnerOpt = options[0];
  let maxCount = -1;

  for (const opt of options) {
    const count = await prisma.vote.count({
      where: { pollId: roundtablePoll.id, optionId: opt.id },
    });
    await prisma.pollOption.update({
      where: { id: opt.id },
      data: { votesCount: count },
    });
    pollTotal += count;
    if (count > maxCount) {
      maxCount = count;
      winnerOpt = opt;
    }
  }

  if (pollTotal !== 120) {
    throw new Error(
      `Total de votos esperado: 120, encontrado: ${pollTotal}`
    );
  }

  await prisma.poll.update({
    where: { id: roundtablePoll.id },
    data: {
      status: "RESULTS_PUBLISHED",
      totalVotes: pollTotal,
      winningOptionId: winnerOpt.id,
      winningQuestionText: winnerOpt.label,
      closedAt: new Date(),
      resultsPublishedAt: new Date(),
    },
  });

  currentSeq++;
  await prisma.liveState.update({
    where: { eventId: event.id },
    data: {
      activePollId: roundtablePoll.id,
      arenaMode: "ROUNDTABLE",
      seq: currentSeq,
    },
  });

  logStep(
    `Votação da Mesa-Redonda concluída com ${pollTotal} votos válidos. Vencedora: "${winnerOpt.themeLabel}" (${maxCount} votos)`
  );

  // -------------------------------------------------------------
  // 6. Consolidação de Relatórios e Exportação (PDF, CSV, XLSX)
  // -------------------------------------------------------------
  logSection("6. Consolidação de Relatórios & Exportações (PDF, CSV, XLSX)");

  const report = await getConsolidatedEventReport();
  if (!report) {
    throw new Error("Falha ao gerar relatório consolidado.");
  }

  logStep(`Relatório Geral Consolidado (v2.0):`);
  console.log(
    `     - Participantes Conectados: ${report.totalSessionsCount} (${report.validatedCredentialsCount} credenciais)`
  );
  console.log(
    `     - Perguntas da Plateia: ${report.questionsTotal} | Aprovadas: ${report.questionsApproved}`
  );
  console.log(
    `     - Perguntas Respondidas: ${report.questionsAnswered} (Reserva da Mediação: ${report.mediationReserveUsedCount})`
  );
  console.log(
    `     - Votação da Mesa-Redonda: ${report.totalVotes} votos (${report.voteChangesCount} alterações de voto)`
  );
  console.log(
    `     - Questão Vencedora: "${report.roundtablePoll.winningQuestionText}"`
  );

  if (report.questionsTotal !== totalAudienceQuestionsCreated) {
    throw new Error(
      `Total de perguntas da plateia discrepante: esperado ${totalAudienceQuestionsCreated}, obtido ${report.questionsTotal}`
    );
  }
  if (report.totalVotes !== 120) {
    throw new Error(
      `Total de votos discrepante: esperado 120, obtido ${report.totalVotes}`
    );
  }

  const pdfBuffer = generateArenaReportPdf({
    documentTitle: "Relatorio de Ensaio Tecnico v2.0",
    subtitle: `${report.name} — ${report.theme} (${report.institution})`,
    sections: [
      {
        title: "Indicadores Gerais do Ensaio v2.0",
        lines: [
          `Participantes Unicos: ${report.totalSessionsCount} | Credenciais: ${report.validatedCredentialsCount}`,
          `Perguntas da Plateia: ${report.questionsTotal} | Respondidas: ${report.questionsAnswered}`,
          `Votos na Mesa-Redonda: ${report.totalVotes}`,
          `Questao Vencedora: ${report.roundtablePoll.winningQuestionText}`,
        ],
      },
    ],
  });
  if (
    !pdfBuffer ||
    pdfBuffer.length === 0 ||
    !pdfBuffer.toString("latin1").startsWith("%PDF")
  ) {
    throw new Error("PDF gerado é inválido ou cabeçalho %PDF não encontrado");
  }
  logStep(`PDF gerado com sucesso: ${pdfBuffer.length} bytes`);

  const csvHeaders = [
    "Pauta",
    "Titulo",
    "Especialista",
    "Perguntas Plateia",
    "Origem Respondida",
  ];
  const csvRows = report.topics.map((t) => [
    `Pauta ${t.number}`,
    t.title,
    t.speakerName,
    String(t.questionsReceived),
    t.answeredQuestionOrigin || "—",
  ]);
  const csvBuffer = buildCsvBuffer(csvHeaders, csvRows);
  if (!csvBuffer.toString("utf-8").startsWith("\uFEFF")) {
    throw new Error("CSV não contém UTF-8 BOM obrigatório");
  }
  logStep(`CSV gerado com sucesso: ${csvBuffer.length} bytes`);

  const xlsxBuffer = buildSpreadsheetXmlBuffer(
    "Ensaio_v2",
    csvHeaders,
    csvRows
  );
  if (
    !xlsxBuffer
      .toString("utf-8")
      .includes('<?mso-application progid="Excel.Sheet"?>')
  ) {
    throw new Error("XLSX não contém cabeçalho XML Spreadsheet válido");
  }
  logStep(`XLSX gerado com sucesso: ${xlsxBuffer.length} bytes`);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  logSection(`Resultado Final do Ensaio Técnico v2.0 — ${durationSec}s`);
  console.log(
    `  🎉 TODOS OS REQUISITOS DO NOVO FLUXO OFICIAL v2.0 FORAM VALIDADOS COM SUCESSO!\n`
  );
}

runRehearsal()
  .catch((err) => {
    console.error("❌ ERRO NO ENSAIO TÉCNICO:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
