import {
  PrismaClient,
  AdminRoleType,
  ArenaMode,
  StepType,
  StepStatus,
} from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ||
  "anm-arena-secret-key-2026-economia-da-solidao-uefs";

function hashPassword(password: string): string {
  return crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(password)
    .digest("hex");
}

async function main() {
  console.log("🌱 Iniciando seed da Arena A Nova Moeda — Economia da Solidão (UEFS)...");

  // 1. Perfis de permissão administrativa (RBAC)
  const rolesData: Array<{
    code: AdminRoleType;
    name: string;
    description: string;
    canOperateTimer: boolean;
    canModerateQuestions: boolean;
    canManagePolls: boolean;
    canEditSchedule: boolean;
    canManageAccess: boolean;
    canExportReports: boolean;
  }> = [
    {
      code: "ADMIN",
      name: "Administrador Geral",
      description: "Controle total sobre configuração, operação ao vivo, curadoria, votações, relatórios e acessos.",
      canOperateTimer: true,
      canModerateQuestions: true,
      canManagePolls: true,
      canEditSchedule: true,
      canManageAccess: true,
      canExportReports: true,
    },
    {
      code: "OPERATOR",
      name: "Operador de Palco & Cronômetro",
      description: "Controla o motor de fluxo, cronômetros, transições de etapa, telão ARENA e abertura/fechamento de votações.",
      canOperateTimer: true,
      canModerateQuestions: true,
      canManagePolls: true,
      canEditSchedule: true,
      canExportReports: true,
      canManageAccess: false,
    },
    {
      code: "CURATOR",
      name: "Equipe de Curadoria",
      description: "Recebe, analisa, aprova, rejeita e seleciona perguntas principais e reservas para cada pauta.",
      canOperateTimer: false,
      canModerateQuestions: true,
      canManagePolls: false,
      canEditSchedule: false,
      canManageAccess: false,
      canExportReports: true,
    },
    {
      code: "MODERATOR",
      name: "Mediador de Debate",
      description: "Visualiza perguntas selecionadas e reservas, acompanha cronômetro e resultados de votações.",
      canOperateTimer: false,
      canModerateQuestions: true,
      canManagePolls: true,
      canEditSchedule: false,
      canManageAccess: false,
      canExportReports: true,
    },
    {
      code: "OBSERVER",
      name: "Observador / Apoio",
      description: "Acompanha o dashboard em tempo real e exporta relatórios pós-evento sem alterar o estado ao vivo.",
      canOperateTimer: false,
      canModerateQuestions: false,
      canManagePolls: false,
      canEditSchedule: false,
      canManageAccess: false,
      canExportReports: true,
    },
  ];

  const roleMap: Record<string, string> = {};
  for (const r of rolesData) {
    const saved = await prisma.adminRole.upsert({
      where: { code: r.code },
      update: r,
      create: r,
    });
    roleMap[r.code] = saved.id;
  }

  // 2. Usuários Administrativos iniciais
  const defaultPassword = process.env.ADMIN_MASTER_PASSWORD || "ANM@Arena2026!";
  const defaultHash = hashPassword(defaultPassword);

  const adminUsers = [
    {
      email: "admin@anovamoeda.com.br",
      fullName: "Direção Operacional · A Nova Moeda",
      roleCode: AdminRoleType.ADMIN,
    },
    {
      email: "operacao@anovamoeda.com.br",
      fullName: "Mesa de Operação · Arena UEFS",
      roleCode: AdminRoleType.OPERATOR,
    },
    {
      email: "curadoria@anovamoeda.com.br",
      fullName: "Curadoria de Perguntas · Arena UEFS",
      roleCode: AdminRoleType.CURATOR,
    },
  ];

  for (const u of adminUsers) {
    await prisma.adminUser.upsert({
      where: { email: u.email },
      update: {
        fullName: u.fullName,
        roleCode: u.roleCode,
        roleId: roleMap[u.roleCode],
        status: "ACTIVE",
      },
      create: {
        email: u.email,
        fullName: u.fullName,
        passwordHash: defaultHash,
        roleCode: u.roleCode,
        roleId: roleMap[u.roleCode],
        status: "ACTIVE",
      },
    });
  }

  // 3. Configuração Inicial do Evento (§2.1)
  const event = await prisma.event.upsert({
    where: { slug: "a-nova-moeda-2026" },
    update: {
      name: "A Nova Moeda",
      theme: "Economia da Solidão",
      institution: "Universidade Estadual de Feira de Santana (UEFS)",
      estimatedAudience: 150,
      programmedDurationMin: 131,
      formatDescription:
        "Apresentação, provocação, réplica, votação e participação da plateia",
    },
    create: {
      slug: "a-nova-moeda-2026",
      name: "A Nova Moeda",
      theme: "Economia da Solidão",
      institution: "Universidade Estadual de Feira de Santana (UEFS)",
      estimatedAudience: 150,
      programmedDurationMin: 131,
      formatDescription:
        "Apresentação, provocação, réplica, votação e participação da plateia",
      status: "WAITING",
      questionCharLimit: 400,
      maxQuestionsPerTopic: 2,
      minQuestionIntervalSec: 15,
      soundAlertsEnabled: true,
      showTimerOnArena: true,
    },
  });

  // 4. Cadastro dos 5 Palestrantes Recorrentes (§2.1 e §2.2)
  const speakersInput = [
    {
      slug: "daniel",
      name: "Daniel",
      roleTitle: "Palestrante · Pautas 1 e 6",
      bio: "Responsável pela abertura temática sobre hiperconexão e pela síntese de transformação em uma economia da conexão.",
      photoUrl: "/img/Daniel.jpeg",
      displayOrder: 1,
    },
    {
      slug: "janaina",
      name: "Janaína",
      roleTitle: "Palestrante · Pauta 2",
      bio: "Conduz a reflexão sobre a mercantilização das relações humanas quando a solidão vira mercado.",
      photoUrl: "/img/Janaina.jpeg",
      displayOrder: 2,
    },
    {
      slug: "denilson-carneiro",
      name: "Denilson Carneiro",
      roleTitle: "Palestrante · Pauta 3",
      bio: "Explora o paradoxo do pertencimento nas organizações e comunidades contemporâneas.",
      photoUrl: "/img/Denilson.png",
      displayOrder: 3,
    },
    {
      slug: "sergio-passos",
      name: "Sérgio Passos",
      roleTitle: "Palestrante · Pauta 4",
      bio: "Analisa o futuro do trabalho entre a promessa de autonomia e o risco do isolamento profissional.",
      photoUrl: "/img/Sergio.jpeg",
      displayOrder: 4,
    },
    {
      slug: "dulcila",
      name: "Dulcila",
      roleTitle: "Palestrante · Pauta 5",
      bio: "Debate os fundamentos éticos e práticos para construir uma verdadeira economia da conexão.",
      photoUrl: "/img/Dulcila.jpeg",
      displayOrder: 5,
    },
  ];

  const speakerMap: Record<string, { id: string; name: string }> = {};
  for (const sp of speakersInput) {
    const saved = await prisma.speaker.upsert({
      where: {
        eventId_slug: {
          eventId: event.id,
          slug: sp.slug,
        },
      },
      update: sp,
      create: {
        ...sp,
        eventId: event.id,
      },
    });
    speakerMap[sp.slug] = { id: saved.id, name: saved.name };
  }

  // 5. Cadastro das 6 Pautas (§2.2 — numeradas estritamente de 1 a 6, sem 3A ou 3B)
  const topicsInput = [
    {
      number: 1,
      title: "A solidão na era da hiperconexão",
      durationSec: 19 * 60, // 19:00
      mainSpeakerSlug: "daniel",
      provokerSlug: "janaina",
      provokerLabel: "Janaína",
    },
    {
      number: 2,
      title: "Quando a solidão vira mercado",
      durationSec: 19 * 60, // 19:00
      mainSpeakerSlug: "janaina",
      provokerSlug: "dulcila",
      provokerLabel: "Dulcila",
    },
    {
      number: 3,
      title:
        "Por que podemos estar cercados de pessoas e ainda não pertencer a lugar nenhum?",
      durationSec: 19 * 60, // 19:00
      mainSpeakerSlug: "denilson-carneiro",
      provokerSlug: "sergio-passos",
      provokerLabel: "Sérgio Passos",
    },
    {
      number: 4,
      title:
        "O futuro do trabalho vai nos aproximar ou nos tornar profissionais cada vez mais isolados?",
      durationSec: 19 * 60, // 19:00
      mainSpeakerSlug: "sergio-passos",
      provokerSlug: "denilson-carneiro",
      provokerLabel: "Denilson Carneiro",
    },
    {
      number: 5,
      title: "Podemos construir uma economia da conexão?",
      durationSec: 19 * 60, // 19:00
      mainSpeakerSlug: "dulcila",
      provokerSlug: "daniel",
      provokerLabel: "Daniel",
    },
    {
      number: 6,
      title:
        "Como transformar a economia da solidão em uma economia da conexão?",
      durationSec: 18 * 60, // 18:00
      mainSpeakerSlug: "daniel",
      provokerSlug: null,
      provokerLabel: "Participação coletiva",
    },
  ];

  const topicMap: Record<
    number,
    {
      id: string;
      number: number;
      title: string;
      mainSpeakerId: string;
      mainSpeakerName: string;
      provokerId: string | null;
      provokerLabel: string;
      durationSec: number;
    }
  > = {};

  for (const t of topicsInput) {
    const mainSp = speakerMap[t.mainSpeakerSlug];
    const provSp = t.provokerSlug ? speakerMap[t.provokerSlug] : null;
    const saved = await prisma.topic.upsert({
      where: {
        eventId_number: {
          eventId: event.id,
          number: t.number,
        },
      },
      update: {
        title: t.title,
        durationSec: t.durationSec,
        mainSpeakerId: mainSp.id,
        provokerId: provSp?.id ?? null,
        provokerLabel: t.provokerLabel,
      },
      create: {
        eventId: event.id,
        number: t.number,
        title: t.title,
        durationSec: t.durationSec,
        mainSpeakerId: mainSp.id,
        provokerId: provSp?.id ?? null,
        provokerLabel: t.provokerLabel,
        status: StepStatus.PENDING,
      },
    });

    topicMap[t.number] = {
      id: saved.id,
      number: saved.number,
      title: saved.title,
      mainSpeakerId: mainSp.id,
      mainSpeakerName: mainSp.name,
      provokerId: provSp?.id ?? null,
      provokerLabel: t.provokerLabel,
      durationSec: saved.durationSec,
    };
  }

  // 6. Cronograma-base (§2.3 — 9 blocos macro totalizando 131:00) e Etapas Operacionais (§9.1 e §9.2)
  const macroBlocks = [
    {
      code: "MACRO_1",
      macroOrder: 1,
      title: "Abertura e explicação da dinâmica",
      stepType: StepType.OPENING,
      arenaMode: ArenaMode.OPENING,
      durationSec: 8 * 60,
      topicId: null,
      responsibleName: "Mediação & Organização",
    },
    {
      code: "MACRO_2",
      macroOrder: 2,
      title: "Pauta 1 — A solidão na era da hiperconexão",
      stepType: StepType.TOPIC_BLOCK,
      arenaMode: ArenaMode.TOPIC_OVERVIEW,
      durationSec: 19 * 60,
      topicId: topicMap[1].id,
      responsibleName: "Daniel (Provocação: Janaína)",
    },
    {
      code: "MACRO_3",
      macroOrder: 3,
      title: "Pauta 2 — Quando a solidão vira mercado",
      stepType: StepType.TOPIC_BLOCK,
      arenaMode: ArenaMode.TOPIC_OVERVIEW,
      durationSec: 19 * 60,
      topicId: topicMap[2].id,
      responsibleName: "Janaína (Provocação: Dulcila)",
    },
    {
      code: "MACRO_4",
      macroOrder: 4,
      title:
        "Pauta 3 — Por que podemos estar cercados de pessoas e ainda não pertencer a lugar nenhum?",
      stepType: StepType.TOPIC_BLOCK,
      arenaMode: ArenaMode.TOPIC_OVERVIEW,
      durationSec: 19 * 60,
      topicId: topicMap[3].id,
      responsibleName: "Denilson Carneiro (Provocação: Sérgio Passos)",
    },
    {
      code: "MACRO_5",
      macroOrder: 5,
      title: "Intervalo",
      stepType: StepType.INTERVAL,
      arenaMode: ArenaMode.INTERVAL,
      durationSec: 5 * 60,
      topicId: null,
      responsibleName: "Organização",
    },
    {
      code: "MACRO_6",
      macroOrder: 6,
      title:
        "Pauta 4 — O futuro do trabalho vai nos aproximar ou nos tornar profissionais cada vez mais isolados?",
      stepType: StepType.TOPIC_BLOCK,
      arenaMode: ArenaMode.TOPIC_OVERVIEW,
      durationSec: 19 * 60,
      topicId: topicMap[4].id,
      responsibleName: "Sérgio Passos (Provocação: Denilson Carneiro)",
    },
    {
      code: "MACRO_7",
      macroOrder: 7,
      title: "Pauta 5 — Podemos construir uma economia da conexão?",
      stepType: StepType.TOPIC_BLOCK,
      arenaMode: ArenaMode.TOPIC_OVERVIEW,
      durationSec: 19 * 60,
      topicId: topicMap[5].id,
      responsibleName: "Dulcila (Provocação: Daniel)",
    },
    {
      code: "MACRO_8",
      macroOrder: 8,
      title:
        "Pauta 6 — Como transformar a economia da solidão em uma economia da conexão?",
      stepType: StepType.TOPIC_BLOCK,
      arenaMode: ArenaMode.COLLECTIVE_BUILDING,
      durationSec: 18 * 60,
      topicId: topicMap[6].id,
      responsibleName: "Daniel & Participação Coletiva",
    },
    {
      code: "MACRO_9",
      macroOrder: 9,
      title: "Encerramento",
      stepType: StepType.CLOSING,
      arenaMode: ArenaMode.CLOSING,
      durationSec: 5 * 60,
      topicId: null,
      responsibleName: "Mediação & Organização",
    },
  ];

  for (const mb of macroBlocks) {
    await prisma.scheduleStep.upsert({
      where: {
        eventId_code: {
          eventId: event.id,
          code: mb.code,
        },
      },
      update: {
        title: mb.title,
        stepType: mb.stepType,
        arenaMode: mb.arenaMode,
        sequenceOrder: mb.macroOrder,
        macroOrder: mb.macroOrder,
        isMacroBlock: true,
        durationSec: mb.durationSec,
        topicId: mb.topicId,
        responsibleName: mb.responsibleName,
      },
      create: {
        eventId: event.id,
        code: mb.code,
        title: mb.title,
        stepType: mb.stepType,
        arenaMode: mb.arenaMode,
        sequenceOrder: mb.macroOrder,
        macroOrder: mb.macroOrder,
        isMacroBlock: true,
        durationSec: mb.durationSec,
        topicId: mb.topicId,
        responsibleName: mb.responsibleName,
      },
    });
  }

  // Etapas operacionais detalhadas (Motor de Fluxo §9.1 e §9.2)
  interface OperationalStepInput {
    code: string;
    title: string;
    stepType: StepType;
    arenaMode: ArenaMode;
    durationSec: number;
    topicId: string | null;
    speakerId: string | null;
    responsibleName: string;
    macroOrder: number;
  }

  const operationalSteps: OperationalStepInput[] = [];

  // Ordem 1: Abertura (08:00)
  operationalSteps.push({
    code: "OP_OPENING",
    title: "Abertura e explicação da dinâmica",
    stepType: StepType.OPENING,
    arenaMode: ArenaMode.OPENING,
    durationSec: 8 * 60,
    topicId: null,
    speakerId: null,
    responsibleName: "Mediação & Organização",
    macroOrder: 1,
  });

  // Helper para adicionar as 6 etapas das Pautas 1 a 5 (§9.1)
  function addStandardTopicStages(topicNum: number, macroOrd: number) {
    const t = topicMap[topicNum];
    operationalSteps.push(
      {
        code: `T${topicNum}_1_EXPOSICAO`,
        title: `Pauta ${topicNum} · Exposição`,
        stepType: StepType.EXPOSITION,
        arenaMode: ArenaMode.SPEAKER_EXPOSITION,
        durationSec: 10 * 60,
        topicId: t.id,
        speakerId: t.mainSpeakerId,
        responsibleName: t.mainSpeakerName,
        macroOrder: macroOrd,
      },
      {
        code: `T${topicNum}_2_PROVOCACAO`,
        title: `Pauta ${topicNum} · Provocação`,
        stepType: StepType.PROVOCATION,
        arenaMode: ArenaMode.PROVOCATION,
        durationSec: 2 * 60,
        topicId: t.id,
        speakerId: t.provokerId,
        responsibleName: t.provokerLabel,
        macroOrder: macroOrd,
      },
      {
        code: `T${topicNum}_3_REPLICA`,
        title: `Pauta ${topicNum} · Réplica`,
        stepType: StepType.REBUTTAL,
        arenaMode: ArenaMode.REBUTTAL,
        durationSec: 2 * 60,
        topicId: t.id,
        speakerId: t.mainSpeakerId,
        responsibleName: t.mainSpeakerName,
        macroOrder: macroOrd,
      },
      {
        code: `T${topicNum}_4_VOTACAO`,
        title: `Pauta ${topicNum} · Votação`,
        stepType: StepType.POLL,
        arenaMode: ArenaMode.POLL_OPEN,
        durationSec: 1 * 60,
        topicId: t.id,
        speakerId: null,
        responsibleName: "Plateia & Mediação",
        macroOrder: macroOrd,
      },
      {
        code: `T${topicNum}_5_VOZ_PLATEIA`,
        title: `Pauta ${topicNum} · Voz da plateia`,
        stepType: StepType.AUDIENCE_VOICE,
        arenaMode: ArenaMode.SELECTED_QUESTION,
        durationSec: 3 * 60,
        topicId: t.id,
        speakerId: t.mainSpeakerId,
        responsibleName: `${t.mainSpeakerName} & Mediação`,
        macroOrder: macroOrd,
      },
      {
        code: `T${topicNum}_6_TRANSICAO`,
        title: `Pauta ${topicNum} · Transição`,
        stepType: StepType.TRANSITION,
        arenaMode: ArenaMode.TOPIC_OVERVIEW,
        durationSec: 1 * 60,
        topicId: t.id,
        speakerId: null,
        responsibleName: "Organização",
        macroOrder: macroOrd,
      }
    );
  }

  addStandardTopicStages(1, 2);
  addStandardTopicStages(2, 3);
  addStandardTopicStages(3, 4);

  // Ordem 5: Intervalo (05:00)
  operationalSteps.push({
    code: "OP_INTERVAL",
    title: "Intervalo",
    stepType: StepType.INTERVAL,
    arenaMode: ArenaMode.INTERVAL,
    durationSec: 5 * 60,
    topicId: null,
    speakerId: null,
    responsibleName: "Organização",
    macroOrder: 5,
  });

  addStandardTopicStages(4, 6);
  addStandardTopicStages(5, 7);

  // Ordem 8: Pauta 6 — Fluxo específico de 7 etapas (§9.2, total 18:00)
  const t6 = topicMap[6];
  operationalSteps.push(
    {
      code: "T6_1_EXPOSICAO_DANIEL",
      title: "Pauta 6 · Exposição de Daniel",
      stepType: StepType.EXPOSITION,
      arenaMode: ArenaMode.SPEAKER_EXPOSITION,
      durationSec: 10 * 60,
      topicId: t6.id,
      speakerId: speakerMap["daniel"].id,
      responsibleName: "Daniel",
      macroOrder: 8,
    },
    {
      code: "T6_2_JANAINA",
      title: "Pauta 6 · Contribuição: Janaína",
      stepType: StepType.COLLECTIVE_CONTRIBUTION,
      arenaMode: ArenaMode.COLLECTIVE_BUILDING,
      durationSec: 45,
      topicId: t6.id,
      speakerId: speakerMap["janaina"].id,
      responsibleName: "Janaína",
      macroOrder: 8,
    },
    {
      code: "T6_3_DENILSON",
      title: "Pauta 6 · Contribuição: Denilson Carneiro",
      stepType: StepType.COLLECTIVE_CONTRIBUTION,
      arenaMode: ArenaMode.COLLECTIVE_BUILDING,
      durationSec: 45,
      topicId: t6.id,
      speakerId: speakerMap["denilson-carneiro"].id,
      responsibleName: "Denilson Carneiro",
      macroOrder: 8,
    },
    {
      code: "T6_4_SERGIO",
      title: "Pauta 6 · Contribuição: Sérgio Passos",
      stepType: StepType.COLLECTIVE_CONTRIBUTION,
      arenaMode: ArenaMode.COLLECTIVE_BUILDING,
      durationSec: 45,
      topicId: t6.id,
      speakerId: speakerMap["sergio-passos"].id,
      responsibleName: "Sérgio Passos",
      macroOrder: 8,
    },
    {
      code: "T6_5_DULCILA",
      title: "Pauta 6 · Contribuição: Dulcila",
      stepType: StepType.COLLECTIVE_CONTRIBUTION,
      arenaMode: ArenaMode.COLLECTIVE_BUILDING,
      durationSec: 45,
      topicId: t6.id,
      speakerId: speakerMap["dulcila"].id,
      responsibleName: "Dulcila",
      macroOrder: 8,
    },
    {
      code: "T6_6_VOTACAO_FINAL",
      title: "Pauta 6 · Votação final",
      stepType: StepType.POLL,
      arenaMode: ArenaMode.POLL_OPEN,
      durationSec: 2 * 60,
      topicId: t6.id,
      speakerId: null,
      responsibleName: "Plateia & Mediação",
      macroOrder: 8,
    },
    {
      code: "T6_7_SINTESE_DANIEL",
      title: "Pauta 6 · Síntese de Daniel",
      stepType: StepType.SYNTHESIS,
      arenaMode: ArenaMode.COLLECTIVE_BUILDING,
      durationSec: 3 * 60,
      topicId: t6.id,
      speakerId: speakerMap["daniel"].id,
      responsibleName: "Daniel",
      macroOrder: 8,
    }
  );

  // Ordem 9: Encerramento (05:00)
  operationalSteps.push({
    code: "OP_CLOSING",
    title: "Encerramento",
    stepType: StepType.CLOSING,
    arenaMode: ArenaMode.CLOSING,
    durationSec: 5 * 60,
    topicId: null,
    speakerId: null,
    responsibleName: "Mediação & Organização",
    macroOrder: 9,
  });

  for (let idx = 0; idx < operationalSteps.length; idx++) {
    const st = operationalSteps[idx];
    await prisma.scheduleStep.upsert({
      where: {
        eventId_code: {
          eventId: event.id,
          code: st.code,
        },
      },
      update: {
        title: st.title,
        stepType: st.stepType,
        arenaMode: st.arenaMode,
        sequenceOrder: idx + 1,
        macroOrder: st.macroOrder,
        isMacroBlock: false,
        durationSec: st.durationSec,
        topicId: st.topicId,
        speakerId: st.speakerId,
        responsibleName: st.responsibleName,
      },
      create: {
        eventId: event.id,
        code: st.code,
        title: st.title,
        stepType: st.stepType,
        arenaMode: st.arenaMode,
        sequenceOrder: idx + 1,
        macroOrder: st.macroOrder,
        isMacroBlock: false,
        durationSec: st.durationSec,
        topicId: st.topicId,
        speakerId: st.speakerId,
        responsibleName: st.responsibleName,
      },
    });
  }

  // 7. Cadastro das 6 Votações e Alternativas (§6.1)
  const pollsInput = [
    {
      number: 1,
      durationSec: 60,
      question:
        "As conexões digitais estão diminuindo a solidão ou apenas ampliando a sensação de estarmos conectados?",
      options: [
        "Estão diminuindo a solidão.",
        "Estão ampliando a sensação de conexão, mas não necessariamente os vínculos.",
        "Depende da qualidade das relações construídas.",
      ],
    },
    {
      number: 2,
      durationSec: 60,
      question:
        "É possível construir negócios rentáveis oferecendo conexões humanas genuínas sem explorar a solidão?",
      options: [
        "Sim, é possível.",
        "Não, existe uma contradição inevitável.",
        "Depende de como o negócio é estruturado.",
      ],
    },
    {
      number: 3,
      durationSec: 60,
      question:
        "O que mais contribui para que uma pessoa se sinta parte de uma organização?",
      options: [
        "Reconhecimento e valorização.",
        "Relações interpessoais e convivência.",
        "Propósito e objetivos compartilhados.",
        "Confiança e segurança nas relações.",
      ],
    },
    {
      number: 4,
      durationSec: 60,
      question:
        "As novas formas de trabalho tendem a produzir mais autonomia ou mais isolamento profissional?",
      options: [
        "Mais autonomia.",
        "Mais isolamento.",
        "Os dois ao mesmo tempo.",
        "Depende da estrutura e da cultura de cada organização.",
      ],
    },
    {
      number: 5,
      durationSec: 60,
      question:
        "Qual deveria ser o principal compromisso de uma economia da conexão?",
      options: [
        "Promover relações humanas mais significativas.",
        "Desenvolver negócios com responsabilidade social.",
        "Valorizar o pertencimento e a confiança.",
        "Criar inovação sem explorar vulnerabilidades humanas.",
      ],
    },
    {
      number: 6,
      durationSec: 120,
      question:
        "Qual transformação deveria ser prioridade para construir uma economia da conexão?",
      options: [
        "Relações humanas mais significativas.",
        "Organizações com maior pertencimento e reconhecimento.",
        "Modelos de negócio mais responsáveis.",
        "Novas formas de trabalho que conciliem autonomia e conexão.",
        "Uso da tecnologia que valorize relações, e não apenas atenção.",
      ],
    },
  ];

  for (const p of pollsInput) {
    const topic = topicMap[p.number];
    const savedPoll = await prisma.poll.upsert({
      where: {
        eventId_number: {
          eventId: event.id,
          number: p.number,
        },
      },
      update: {
        question: p.question,
        durationSec: p.durationSec,
        topicId: topic.id,
      },
      create: {
        eventId: event.id,
        topicId: topic.id,
        number: p.number,
        question: p.question,
        durationSec: p.durationSec,
        status: "DRAFT",
      },
    });

    for (let i = 0; i < p.options.length; i++) {
      await prisma.pollOption.upsert({
        where: {
          pollId_optionOrder: {
            pollId: savedPoll.id,
            optionOrder: i + 1,
          },
        },
        update: {
          label: p.options[i],
        },
        create: {
          pollId: savedPoll.id,
          optionOrder: i + 1,
          label: p.options[i],
          votesCount: 0,
        },
      });
    }
  }

  // 8. Estado ao vivo inicial (LiveState singleton)
  const firstStep = await prisma.scheduleStep.findUnique({
    where: {
      eventId_code: {
        eventId: event.id,
        code: "OP_OPENING",
      },
    },
  });

  await prisma.liveState.upsert({
    where: { eventId: event.id },
    update: {},
    create: {
      eventId: event.id,
      seq: 1,
      lastEventType: "system.initialized",
      status: "WAITING",
      arenaMode: "WAITING",
      activeStepId: firstStep?.id ?? null,
      timerStatus: "IDLE",
      timerDurationMs: (firstStep?.durationSec ?? 480) * 1000,
      showTimerOnArena: true,
      soundAlertsEnabled: true,
    },
  });

  console.log("✅ Seed concluído! Evento, 5 palestrantes, 6 pautas, 9 blocos macro (131:00), 40 etapas operacionais e 6 votações prontos.");
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
