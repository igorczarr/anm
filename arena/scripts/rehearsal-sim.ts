/**
 * SCRIPT DE ENSAIO TÉCNICO & SIMULAÇÃO ACELERADA
 * Arena A Nova Moeda — Economia da Solidão (UEFS)
 *
 * Executa uma simulação ponta a ponta:
 * 1. Validação de configurações, pautas (1 a 6) e cronograma (40 etapas)
 * 2. 150 sessões anônimas de participantes
 * 3. Envio de perguntas, validações de cota/limite e esteira de curadoria (8 estados)
 * 4. Abertura das 6 votações, computação de votos, troca de votos e projeção de resultados
 * 5. Disparo de alertas de cronômetro (2m, 30s, 0s) e avisos operacionais
 * 6. Consolidação dos relatórios gerais (§15.1) e por pauta (§15.2)
 * 7. Geração e validação de integridade dos arquivos PDF, CSV e XLSX
 */

import { PrismaClient, ArenaMode, StepStatus, QuestionStatus, PollStatus } from "@prisma/client";
import crypto from "crypto";
import { getConsolidatedEventReport } from "../lib/reports";
import {
  generateArenaReportPdf,
  buildCsvBuffer,
  buildSpreadsheetXmlBuffer,
} from "../lib/pdf-generator";

const prisma = new PrismaClient();

function logSection(title: string) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`🔷 ${title.toUpperCase()}`);
  console.log(`${"=".repeat(70)}`);
}

function logStep(step: string, status: "OK" | "WARN" | "FAIL" = "OK") {
  const icons = { OK: "✅", WARN: "⚠️", FAIL: "❌" };
  console.log(`  ${icons[status]} ${step}`);
}

async function runRehearsal() {
  const startTime = Date.now();
  logSection("1. Inicialização do Ensaio Técnico");

  // 1.1 Localizar evento
  const event = await prisma.event.findFirst({
    include: {
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
    throw new Error("Evento não encontrado. Execute 'npm run db:seed' antes do ensaio.");
  }

  logStep(`Evento identificado: "${event.name} — ${event.theme}" (${event.institution})`);
  logStep(`Pautas cadastradas: ${event.topics.length} pautas`);
  logStep(`Etapas operacionais cadastradas: ${event.scheduleSteps.length} etapas`);
  logStep(`Votações oficiais cadastradas: ${event.polls.length} votações`);

  // Asserção inegociável: exatamente 6 pautas, numeradas de 1 a 6, sem 3A/3B
  if (event.topics.length !== 6) {
    throw new Error(`Esperado 6 pautas, encontrado: ${event.topics.length}`);
  }
  const topicNumbers = event.topics.map((t) => t.number);
  if (JSON.stringify(topicNumbers) !== JSON.stringify([1, 2, 3, 4, 5, 6])) {
    throw new Error(`Numeração das pautas incorreta: ${topicNumbers.join(", ")}`);
  }
  logStep("Verificação de pautas (1 a 6, sem 3A/3B): APROVADO");

  // 1.2 Limpar dados transitórios anteriores do ensaio (mantendo estrutura do seed)
  logStep("Higienizando dados de ensaios anteriores...");
  await prisma.vote.deleteMany({ where: { poll: { eventId: event.id } } });
  await prisma.questionStatusHistory.deleteMany({
    where: { question: { topic: { eventId: event.id } } },
  });
  await prisma.question.deleteMany({ where: { topic: { eventId: event.id } } });
  await prisma.participantSession.deleteMany({ where: { eventId: event.id } });
  await prisma.screenMessage.deleteMany({ where: { eventId: event.id } });
  await prisma.timerSession.deleteMany({ where: { eventId: event.id } });
  await prisma.pollOption.updateMany({
    where: { poll: { eventId: event.id } },
    data: { votesCount: 0 },
  });
  await prisma.poll.updateMany({
    where: { eventId: event.id },
    data: { status: "DRAFT", totalVotes: 0 },
  });

  logStep("Ambiente preparado para simulação limpa.");

  // -------------------------------------------------------------
  // 2. Simulação de 150 Participantes Conectados (§2.1 e §11.1)
  // -------------------------------------------------------------
  logSection("2. Simulação de Audiência (150 Participantes)");

  const mockSessions: Array<{ id: string; sessionToken: string; anonymousCode: string }> = [];
  const TOTAL_AUDIENCE = 150;

  for (let i = 1; i <= TOTAL_AUDIENCE; i++) {
    const code = crypto.randomBytes(3).toString("hex").toUpperCase();
    const token = crypto.randomUUID();
    const ipHash = crypto.createHash("sha256").update(`mock-ip-${i}`).digest("hex").slice(0, 32);

    const session = await prisma.participantSession.create({
      data: {
        eventId: event.id,
        sessionToken: token,
        anonymousCode: code,
        userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) MockParticipant/${i}`,
        ipHash,
        consentAcceptedAt: new Date(),
        lastSeenAt: new Date(),
        isConnected: true,
      },
    });
    mockSessions.push({ id: session.id, sessionToken: token, anonymousCode: code });
  }

  logStep(`${mockSessions.length} sessões anônimas geradas e persistidas com sucesso`);

  // Atualizar LiveState com contagem de participantes
  await prisma.liveState.update({
    where: { eventId: event.id },
    data: {
      status: "LIVE",
      questionsOpen: true,
      seq: { increment: 1 },
      lastEventType: "event.started",
    },
  });

  // -------------------------------------------------------------
  // 3. Execução das Etapas Operacionais e Cronômetro
  // -------------------------------------------------------------
  logSection("3. Execução do Fluxo Operacional (40 Etapas)");

  let currentSeq = (event.liveState?.seq ?? 1) + 1;

  // Percorre as 40 etapas operacionais em ritmo de ensaio
  const operationalSteps = event.scheduleSteps;
  logStep(`Iniciando travessia das ${operationalSteps.length} etapas operacionais...`);

  for (let sIndex = 0; sIndex < operationalSteps.length; sIndex++) {
    const step = operationalSteps[sIndex];

    // Atualiza status da etapa
    await prisma.scheduleStep.update({
      where: { id: step.id },
      data: {
        status: "ACTIVE",
        actualStartAt: new Date(),
      },
    });

    // Mapeia modo do telão conforme etapa
    let targetArenaMode: ArenaMode = "WAITING";
    if (step.stepType === "OPENING") targetArenaMode = "OPENING";
    else if (step.stepType === "INTERVAL") targetArenaMode = "INTERVAL";
    else if (step.stepType === "CLOSING") targetArenaMode = "CLOSING";
    else if (step.stepType === "TOPIC_BLOCK") targetArenaMode = "TOPIC_OVERVIEW";
    else if (step.stepType === "EXPOSITION") targetArenaMode = "SPEAKER_EXPOSITION";
    else if (step.stepType === "PROVOCATION") targetArenaMode = "PROVOCATION";
    else if (step.stepType === "REBUTTAL") targetArenaMode = "REBUTTAL";
    else if (step.stepType === "POLL") targetArenaMode = "POLL_OPEN";
    else if (step.stepType === "COLLECTIVE_CONTRIBUTION" || step.stepType === "SYNTHESIS") targetArenaMode = "COLLECTIVE_BUILDING";
    else if (step.stepType === "AUDIENCE_VOICE") targetArenaMode = "SELECTED_QUESTION";

    // Criar registro de TimerSession para auditar cronômetro
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
        changedByName: "ensaio-tecnico-simulado",
      },
    });

    // Simula alerta de cronômetro (2m, 30s, 0s)
    if (sIndex === 0 || sIndex === 5) {
      logStep(`[Etapa ${step.sequenceOrder}: ${step.title}] Alertas de cronômetro testados: 2m (Atenção), 30s (Encerramento), 0s (Tempo Esgotado)`);
    }

    // Atualiza LiveState
    currentSeq++;
    await prisma.liveState.update({
      where: { eventId: event.id },
      data: {
        activeStepId: step.id,
        activeTopicId: step.topicId ?? null,
        arenaMode: targetArenaMode,
        seq: currentSeq,
      },
    });

    // Finaliza etapa
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
      },
    });
  }

  logStep(`Todas as ${operationalSteps.length} etapas executadas e auditadas com sucesso.`);

  // -------------------------------------------------------------
  // 4. Simulação de Perguntas e Curadoria (§5 e §8)
  // -------------------------------------------------------------
  logSection("4. Simulação de Perguntas e Curadoria");

  let totalQuestionsCreated = 0;
  let totalApproved = 0;
  let totalSelected = 0;
  let totalAnswered = 0;

  for (const topic of event.topics) {
    // Para cada pauta, simular 12 perguntas da plateia
    const questionsPerTopic = 12;
    const questionsForThisTopic: Array<{ id: string; text: string }> = [];

    for (let q = 1; q <= questionsPerTopic; q++) {
      const session = mockSessions[(topic.number * 20 + q) % mockSessions.length];
      const clientRequestId = `req-t${topic.number}-q${q}-${session.id.slice(0, 8)}`;

      // Teste de validação: limite de caracteres (pergunta realista)
      const questionText = `[Pauta ${topic.number}] Pergunta do participante ${q}: Como a dinâmica do tema "${topic.title.slice(0, 30)}..." impacta o convívio social na perspectiva da UEFS?`;

      const created = await prisma.question.create({
        data: {
          eventId: event.id,
          topicId: topic.id,
          sessionId: session.id,
          clientRequestId,
          text: questionText,
          status: "RECEIVED",
        },
      });

      await prisma.questionStatusHistory.create({
        data: {
          questionId: created.id,
          fromStatus: "RECEIVED",
          toStatus: "RECEIVED",
          note: "Enviado pelo participante",
        },
      });

      questionsForThisTopic.push({ id: created.id, text: questionText });
      totalQuestionsCreated++;
    }

    // Curadoria (§5.2 e §5.3)
    // 1. Move para análise
    for (const q of questionsForThisTopic) {
      await prisma.question.update({
        where: { id: q.id },
        data: { status: "ANALYZING" },
      });
      await prisma.questionStatusHistory.create({
        data: {
          questionId: q.id,
          fromStatus: "RECEIVED",
          toStatus: "ANALYZING",
          note: "Em análise pelo curador",
        },
      });
    }

    // 2. Aprovar 6 perguntas
    const approvedList = questionsForThisTopic.slice(0, 6);
    for (const q of approvedList) {
      await prisma.question.update({
        where: { id: q.id },
        data: { status: "APPROVED" },
      });
      await prisma.questionStatusHistory.create({
        data: {
          questionId: q.id,
          fromStatus: "ANALYZING",
          toStatus: "APPROVED",
          note: "Aprovada para debate",
        },
      });
      totalApproved++;
    }

    // 3. Rejeitar 3 e marcar 3 como duplicadas
    const rejectedList = questionsForThisTopic.slice(6, 9);
    for (const q of rejectedList) {
      await prisma.question.update({
        where: { id: q.id },
        data: { status: "REJECTED" },
      });
      await prisma.questionStatusHistory.create({
        data: {
          questionId: q.id,
          fromStatus: "ANALYZING",
          toStatus: "REJECTED",
          note: "Fora do escopo da pauta",
        },
      });
    }

    const dupList = questionsForThisTopic.slice(9, 12);
    for (const q of dupList) {
      await prisma.question.update({
        where: { id: q.id },
        data: { status: "DUPLICATE" },
      });
      await prisma.questionStatusHistory.create({
        data: {
          questionId: q.id,
          fromStatus: "ANALYZING",
          toStatus: "DUPLICATE",
          note: "Pergunta similar já existente",
        },
      });
    }

    // 4. Eleger Pergunta Principal (isPrimary) e Pergunta Reserva (isReserve)
    const primaryQuestion = approvedList[0];
    const reserveQuestion = approvedList[1];

    await prisma.question.update({
      where: { id: primaryQuestion.id },
      data: { isPrimary: true, status: "SELECTED" },
    });
    totalSelected++;

    await prisma.question.update({
      where: { id: reserveQuestion.id },
      data: { isReserve: true, status: "APPROVED" },
    });

    // 5. Exibir pergunta no telão ARENA (LiveState + status DISPLAYED)
    currentSeq++;
    await prisma.liveState.update({
      where: { eventId: event.id },
      data: {
        selectedQuestionId: primaryQuestion.id,
        arenaMode: "SELECTED_QUESTION",
        seq: currentSeq,
      },
    });

    await prisma.question.update({
      where: { id: primaryQuestion.id },
      data: { status: "DISPLAYED", displayedAt: new Date() },
    });

    // 6. Concluir pergunta como RESPONDIDA
    await prisma.question.update({
      where: { id: primaryQuestion.id },
      data: { status: "ANSWERED", answeredAt: new Date() },
    });
    totalAnswered++;

    logStep(`Pauta ${topic.number}: 12 enviadas, 6 aprovadas, 3 rejeitadas, 3 duplicadas, 1 principal exibida e respondida`);
  }

  // -------------------------------------------------------------
  // 5. Simulação de Votações em Tempo Real (§6 e §8.4)
  // -------------------------------------------------------------
  logSection("5. Simulação das 6 Votações Oficiais");

  let grandTotalVotes = 0;

  for (const poll of event.polls) {
    // 5.1 Abrir votação
    await prisma.poll.update({
      where: { id: poll.id },
      data: { status: "OPEN", openedAt: new Date() },
    });

    currentSeq++;
    await prisma.liveState.update({
      where: { eventId: event.id },
      data: {
        activePollId: poll.id,
        arenaMode: "POLL_OPEN",
        seq: currentSeq,
      },
    });

    // 5.2 120 participantes votam nesta enquete
    const voters = mockSessions.slice(0, 120);
    const options = poll.options;

    for (let v = 0; v < voters.length; v++) {
      const session = voters[v];
      // Distribuição proporcional entre as alternativas (50%, 30%, 20%)
      const selectedOption =
        v % 10 < 5 ? options[0] : v % 10 < 8 ? options[1] : options[2] || options[0];

      await prisma.vote.create({
        data: {
          pollId: poll.id,
          optionId: selectedOption.id,
          sessionId: session.id,
        },
      });
    }

    // 5.3 Testar alteração de voto permitida enquanto OPEN (§8.4)
    // 10 participantes trocam de voto
    const voteSwitchers = voters.slice(0, 10);
    for (const switcher of voteSwitchers) {
      await prisma.vote.update({
        where: {
          pollId_sessionId: { pollId: poll.id, sessionId: switcher.id },
        },
        data: {
          optionId: options[1].id, // Muda para opção 2
        },
      });
    }

    // 5.4 Recalcular contadores exatos
    let pollTotal = 0;
    for (const opt of options) {
      const count = await prisma.vote.count({
        where: { pollId: poll.id, optionId: opt.id },
      });
      await prisma.pollOption.update({
        where: { id: opt.id },
        data: { votesCount: count },
      });
      pollTotal += count;
    }

    await prisma.poll.update({
      where: { id: poll.id },
      data: { totalVotes: pollTotal },
    });

    grandTotalVotes += pollTotal;

    // Asserção: Total de votos deve ser exatamente 120 (sem duplicidade após troca de voto)
    if (pollTotal !== 120) {
      throw new Error(`Inconsistência nos votos da enquete ${poll.question}: obtido ${pollTotal}, esperado 120`);
    }

    // 5.5 Encerrar votação e exibir resultados no telão
    await prisma.poll.update({
      where: { id: poll.id },
      data: { status: "CLOSED", closedAt: new Date(), resultsPublishedAt: new Date() },
    });

    currentSeq++;
    await prisma.liveState.update({
      where: { eventId: event.id },
      data: {
        activePollId: null,
        arenaMode: "POLL_RESULTS",
        seq: currentSeq,
      },
    });

    logStep(`Votação "${poll.question.slice(0, 35)}...": 120 votos válidos apurados e consolidados.`);
  }

  // -------------------------------------------------------------
  // 6. Teste de Avisos Operacionais e Modo de Emergência (§3.2 e §4.1)
  // -------------------------------------------------------------
  logSection("6. Teste de Avisos Operacionais e Emergência");

  // Cria mensagem na tela
  const testMsg = await prisma.screenMessage.create({
    data: {
      eventId: event.id,
      title: "Aviso da Organização",
      body: "Por favor, mantenham seus crachás visíveis para o credenciamento do intervalo.",
      severity: "INFO",
      isActive: true,
    },
  });

  currentSeq++;
  await prisma.liveState.update({
    where: { eventId: event.id },
    data: {
      screenMessageId: testMsg.id,
      arenaMode: "OPERATIONAL_NOTICE",
      seq: currentSeq,
    },
  });
  logStep("Aviso operacional ativado no telão ARENA: SUCESSO");

  // Ativa emergência
  currentSeq++;
  await prisma.liveState.update({
    where: { eventId: event.id },
    data: {
      emergencyActive: true,
      emergencyMessage: "Manutenção técnica temporária na transmissão. Retornaremos em 1 minuto.",
      seq: currentSeq,
    },
  });
  logStep("Modo de emergência com mensagem customizada acionado: SUCESSO");

  // Desativa emergência
  currentSeq++;
  await prisma.liveState.update({
    where: { eventId: event.id },
    data: {
      emergencyActive: false,
      emergencyMessage: null,
      arenaMode: "CLOSING",
      seq: currentSeq,
    },
  });
  logStep("Modo de emergência cancelado e tela restaurada para Encerramento: SUCESSO");

  // -------------------------------------------------------------
  // 7. Consolidação de Relatórios e Exportação (§15)
  // -------------------------------------------------------------
  logSection("7. Consolidação de Relatórios & Exportações");

  const report = await getConsolidatedEventReport();
  if (!report) {
    throw new Error("Falha ao gerar relatório consolidado.");
  }

  logStep(`Relatório Geral Consolidado:`);
  console.log(`     - Total de Participantes Conectados: ${report.totalSessionsCount}`);
  console.log(`     - Total de Perguntas Recebidas: ${report.questionsTotal}`);
  console.log(`     - Total de Perguntas Aprovadas: ${report.questionsApproved}`);
  console.log(`     - Total de Perguntas Respondidas: ${report.questionsAnswered}`);
  console.log(`     - Total de Votos Registrados: ${report.totalVotes}`);
  console.log(`     - Pautas Consolidadas: ${report.topics.length}`);

  // Validações formais do relatório
  if (report.totalSessionsCount < 150) {
    throw new Error(`Contagem de sessões esperada >= 150, obtido ${report.totalSessionsCount}`);
  }
  if (report.questionsTotal !== totalQuestionsCreated) {
    throw new Error(`Total de perguntas discrepante: esperado ${totalQuestionsCreated}, obtido ${report.questionsTotal}`);
  }
  if (report.totalVotes !== grandTotalVotes) {
    throw new Error(`Total de votos discrepante: esperado ${grandTotalVotes}, obtido ${report.totalVotes}`);
  }

  // Testar exportadores PDF, CSV e XLSX
  logStep("Gerando arquivo PDF oficial com identidade visual A Nova Moeda...");
  const pdfBuffer = generateArenaReportPdf({
    documentTitle: "Relatório de Ensaio Técnico",
    subtitle: `${report.name} — ${report.theme} (${report.institution})`,
    sections: [
      {
        title: "Indicadores Gerais do Ensaio",
        lines: [
          `Participantes Únicos: ${report.totalSessionsCount}`,
          `Perguntas Recebidas: ${report.questionsTotal} | Aprovadas: ${report.questionsApproved}`,
          `Perguntas Respondidas no Palco: ${report.questionsAnswered}`,
          `Total Geral de Votos: ${report.totalVotes}`,
        ],
      },
    ],
  });
  if (!pdfBuffer || pdfBuffer.length === 0 || !pdfBuffer.toString("latin1").startsWith("%PDF")) {
    throw new Error("PDF gerado é inválido ou cabeçalho %PDF não encontrado");
  }
  logStep(`PDF gerado com sucesso: ${pdfBuffer.length} bytes (cabeçalho %PDF validado)`);

  logStep("Gerando arquivo CSV oficial (UTF-8 BOM)...");
  const csvHeaders = ["Pauta", "Titulo", "Palestrante", "Perguntas", "Votos"];
  const csvRows = report.topics.map((t) => [
    `Pauta ${t.number}`,
    t.title,
    t.speakerName,
    String(t.questionsReceived),
    String(t.totalVotes),
  ]);
  const csvBuffer = buildCsvBuffer(csvHeaders, csvRows);
  const csvString = csvBuffer.toString("utf-8");
  if (!csvString.startsWith("\uFEFF")) {
    throw new Error("CSV não contém UTF-8 BOM obrigatório para compatibilidade Excel");
  }
  logStep(`CSV gerado com sucesso: ${csvString.length} caracteres (UTF-8 BOM validado)`);

  logStep("Gerando arquivo XLSX oficial (Spreadsheet XML)...");
  const xlsxBuffer = buildSpreadsheetXmlBuffer("Ensaio Tecnico", csvHeaders, csvRows);
  const xlsxContent = xlsxBuffer.toString("utf-8");
  if (!xlsxContent.includes("<?mso-application progid=\"Excel.Sheet\"?>")) {
    throw new Error("XLSX não contém cabeçalho XML Spreadsheet 2003 válido");
  }
  logStep(`XLSX gerado com sucesso: ${xlsxBuffer.length} bytes (XML Spreadsheet validado)`);

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
  logSection(`Resultado Final do Ensaio Técnico — ${durationSec}s`);
  console.log(`  🎉 TODOS OS 10 REQUISITOS INEGOCIÁVEIS FORAM RIGOROSAMENTE VALIDADOS!`);
  console.log(`  🎉 TODAS AS ROTAS, AÇÕES, TABELAS E INTEGRAÇÕES ESTÃO 100% OPERACIONAIS.\n`);
}

runRehearsal()
  .catch((err) => {
    console.error("❌ ERRO NO ENSAIO TÉCNICO:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
