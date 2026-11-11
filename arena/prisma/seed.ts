import {
  PrismaClient,
  AdminRoleType,
  ArenaMode,
  StepType,
  StepStatus,
  QuestionStatus,
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
  console.log("🌱 Iniciando seed v2.0 da Arena A Nova Moeda — Economia da Solidão (UEFS)...");

  // 1. Perfis de permissão administrativa (RBAC v2.0 + aliases de compatibilidade)
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
      name: "Administrador",
      description:
        "Configura o evento, cadastra especialistas, pautas, programação e questões da votação; gerencia perfis de acesso e credenciais; autoriza ações excepcionais com justificativa registrada.",
      canOperateTimer: true,
      canModerateQuestions: true,
      canManagePolls: true,
      canEditSchedule: true,
      canManageAccess: true,
      canExportReports: true,
    },
    {
      code: "PRODUCER",
      name: "Produtor",
      description:
        "Inicia, pausa, retoma e encerra etapas; controla o cronômetro de exposição (15m) e de pergunta e resposta (5m); abre e encerra a votação da mesa-redonda.",
      canOperateTimer: true,
      canModerateQuestions: false,
      canManagePolls: true,
      canEditSchedule: false,
      canManageAccess: false,
      canExportReports: true,
    },
    {
      code: "MODERATOR",
      name: "Moderador",
      description:
        "Analisa as perguntas enviadas pela plateia; seleciona 1 pergunta principal por pauta; aciona pergunta de reserva da mediação quando necessário.",
      canOperateTimer: false,
      canModerateQuestions: true,
      canManagePolls: false,
      canEditSchedule: false,
      canManageAccess: false,
      canExportReports: true,
    },
    {
      code: "AUDIOVISUAL",
      name: "Operador Audiovisual",
      description:
        "Acompanha a exibição da Arena; controla o modo tela cheia e a tela de contingência técnica.",
      canOperateTimer: false,
      canModerateQuestions: false,
      canManagePolls: false,
      canEditSchedule: false,
      canManageAccess: false,
      canExportReports: true,
    },
    {
      code: "OPERATOR",
      name: "Operador (Legado / Produtor)",
      description: "Perfil equivalente ao Produtor para compatibilidade.",
      canOperateTimer: true,
      canModerateQuestions: true,
      canManagePolls: true,
      canEditSchedule: false,
      canManageAccess: false,
      canExportReports: true,
    },
    {
      code: "CURATOR",
      name: "Curador (Legado / Moderador)",
      description: "Perfil equivalente ao Moderador para compatibilidade.",
      canOperateTimer: false,
      canModerateQuestions: true,
      canManagePolls: false,
      canEditSchedule: false,
      canManageAccess: false,
      canExportReports: true,
    },
    {
      code: "OBSERVER",
      name: "Observador (Legado / Audiovisual)",
      description: "Perfil equivalente ao Operador Audiovisual para compatibilidade.",
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

  // 2. Usuários Administrativos iniciais (4 perfis oficiais)
  const defaultPassword = process.env.ADMIN_MASTER_PASSWORD || "ANM@Arena2026!";
  const defaultHash = hashPassword(defaultPassword);

  const adminUsers = [
    {
      email: "admin@anovamoeda.com.br",
      fullName: "Coordenação Geral · Administrador",
      roleCode: AdminRoleType.ADMIN,
    },
    {
      email: "produtor@anovamoeda.com.br",
      fullName: "Produção de Palco · Produtor",
      roleCode: AdminRoleType.PRODUCER,
    },
    {
      email: "moderador@anovamoeda.com.br",
      fullName: "Mediação & Curadoria · Moderador",
      roleCode: AdminRoleType.MODERATOR,
    },
    {
      email: "audiovisual@anovamoeda.com.br",
      fullName: "Equipe de Projeção · Operador Audiovisual",
      roleCode: AdminRoleType.AUDIOVISUAL,
    },
    {
      email: "operacao@anovamoeda.com.br",
      fullName: "Mesa de Operação · Arena UEFS",
      roleCode: AdminRoleType.PRODUCER,
    },
    {
      email: "curadoria@anovamoeda.com.br",
      fullName: "Curadoria de Perguntas · Arena UEFS",
      roleCode: AdminRoleType.MODERATOR,
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

  // 3. Configuração Inicial do Evento v2.0 (145 min / 2h25 · 4h certificadas)
  const event = await prisma.event.upsert({
    where: { slug: "a-nova-moeda-2026" },
    update: {
      name: "A Nova Moeda",
      theme: "Economia da Solidão",
      institution: "Universidade Estadual de Feira de Santana (UEFS)",
      estimatedAudience: 250,
      programmedDurationMin: 145,
      certifiedHours: 4,
      scheduleLocked: false,
      maxQuestionsPerTopic: 1,
      minQuestionIntervalSec: 10,
      formatDescription:
        "Introdução contextual, cinco exposições individuais (15 min + 5 min P&R), votação do público e mesa-redonda definida por votação",
    },
    create: {
      slug: "a-nova-moeda-2026",
      name: "A Nova Moeda",
      theme: "Economia da Solidão",
      institution: "Universidade Estadual de Feira de Santana (UEFS)",
      estimatedAudience: 250,
      programmedDurationMin: 145,
      certifiedHours: 4,
      scheduleLocked: false,
      formatDescription:
        "Introdução contextual, cinco exposições individuais (15 min + 5 min P&R), votação do público e mesa-redonda definida por votação",
      status: "WAITING",
      questionCharLimit: 400,
      maxQuestionsPerTopic: 1,
      minQuestionIntervalSec: 10,
      requireAccessCode: false,
      requireCredential: false,
      soundAlertsEnabled: true,
      showTimerOnArena: true,
    },
  });

  // Limpa dados antigos de cronograma/pautas/votações para garantir fidelidade 100% ao formato v2.0
  await prisma.timerSession.deleteMany({ where: { eventId: event.id } });
  await prisma.scheduleStep.deleteMany({ where: { eventId: event.id } });
  await prisma.voteHistory.deleteMany({
    where: { poll: { eventId: event.id } },
  });
  await prisma.vote.deleteMany({
    where: { poll: { eventId: event.id } },
  });
  await prisma.poll.deleteMany({ where: { eventId: event.id } });
  await prisma.question.deleteMany({ where: { eventId: event.id } });
  await prisma.topic.deleteMany({ where: { eventId: event.id } });

  // 4. Cadastro dos 5 Especialistas Oficiais (Paula, Daniel, Janaína, Denilson Carneiro, Sérgio Passos)
  const speakersInput = [
    {
      slug: "paula",
      name: "Paula",
      roleTitle: "Especialista · Introdução & Mesa-Redonda",
      bio: "Contextualiza a economia da solidão, apresenta o problema central do encontro e integra a mesa-redonda final.",
      photoUrl: "/img/Dulcila.jpeg",
      displayOrder: 1,
    },
    {
      slug: "daniel",
      name: "Daniel",
      roleTitle: "Especialista · Pauta 1 & Mesa-Redonda",
      bio: "Conduz a Pauta 1 sobre a solidão na era da hiperconexão e participa da mesa-redonda.",
      photoUrl: "/img/Daniel.jpeg",
      displayOrder: 2,
    },
    {
      slug: "janaina",
      name: "Janaína",
      roleTitle: "Especialista · Pautas 2 e 5 & Mesa-Redonda",
      bio: "Conduz a Pauta 2 sobre quando a solidão vira mercado, a Pauta 5 sobre a construção de uma economia da conexão e integra a mesa-redonda.",
      photoUrl: "/img/Janaina.jpeg",
      displayOrder: 3,
    },
    {
      slug: "denilson-carneiro",
      name: "Denilson Carneiro",
      roleTitle: "Especialista · Pauta 3 & Mesa-Redonda",
      bio: "Explora por que podemos estar cercados de pessoas e ainda não pertencer a lugar nenhum na Pauta 3 e participa da mesa-redonda.",
      photoUrl: "/img/Denilson.png",
      displayOrder: 4,
    },
    {
      slug: "sergio-passos",
      name: "Sérgio Passos",
      roleTitle: "Especialista · Pauta 4 & Mesa-Redonda",
      bio: "Analisa o futuro do trabalho entre aproximação e isolamento profissional na Pauta 4 e participa da mesa-redonda.",
      photoUrl: "/img/Sergio.jpeg",
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

  // 5. Cadastro das 5 Pautas Oficiais (20 min cada = 15 min Exposição + 5 min Pergunta e Resposta)
  const topicsInput = [
    {
      number: 1,
      title: "A solidão na era da hiperconexão",
      description: "15 minutos de exposição + 5 minutos de pergunta e resposta.",
      durationSec: 20 * 60, // 1200s
      mainSpeakerSlug: "daniel",
      mediationReserveQuestion:
        "De que maneira a arquitetura das redes digitais transforma a busca por vínculo humano em consumo contínuo de atenção?",
    },
    {
      number: 2,
      title: "Quando a solidão vira mercado",
      description: "15 minutos de exposição + 5 minutos de pergunta e resposta.",
      durationSec: 20 * 60,
      mainSpeakerSlug: "janaina",
      mediationReserveQuestion:
        "Onde está a fronteira ética entre oferecer serviços de acolhimento legítimos e lucrar com a manutenção da vulnerabilidade emocional?",
    },
    {
      number: 3,
      title:
        "Por que podemos estar cercados de pessoas e ainda não pertencer a lugar nenhum?",
      description: "15 minutos de exposição + 5 minutos de pergunta e resposta.",
      durationSec: 20 * 60,
      mainSpeakerSlug: "denilson-carneiro",
      mediationReserveQuestion:
        "Quais práticas cotidianas nas instituições e universidades destroem silenciosamente o senso de pertencimento mesmo em ambientes cheios?",
    },
    {
      number: 4,
      title:
        "O futuro do trabalho vai nos aproximar ou nos tornar profissionais cada vez mais isolados?",
      description: "15 minutos de exposição + 5 minutos de pergunta e resposta.",
      durationSec: 20 * 60,
      mainSpeakerSlug: "sergio-passos",
      mediationReserveQuestion:
        "Como conciliar a flexibilidade e autonomia das novas formas de trabalho com a construção de comunidades profissionais solidárias?",
    },
    {
      number: 5,
      title: "Podemos construir uma economia da conexão?",
      description:
        "15 minutos de exposição + 5 minutos de pergunta e resposta. A votação da mesa-redonda ocorre durante esta pauta.",
      durationSec: 20 * 60,
      mainSpeakerSlug: "janaina",
      mediationReserveQuestion:
        "Qual é o primeiro passo concreto para que organizações e comunidades locais substituam a lógica da transação isolada por uma economia da conexão?",
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
      durationSec: number;
    }
  > = {};

  for (const t of topicsInput) {
    const mainSp = speakerMap[t.mainSpeakerSlug];
    const saved = await prisma.topic.create({
      data: {
        eventId: event.id,
        number: t.number,
        title: t.title,
        description: t.description,
        durationSec: t.durationSec,
        mainSpeakerId: mainSp.id,
        provokerId: null,
        provokerLabel: "Pergunta da Plateia (5 min)",
        status: StepStatus.PENDING,
      },
    });

    // Cria a Pergunta de Reserva da Mediação pré-cadastrada para cada pauta
    const reserveQ = await prisma.question.create({
      data: {
        eventId: event.id,
        topicId: saved.id,
        sessionId: null,
        clientRequestId: `mediation-reserve-topic-${t.number}`,
        text: t.mediationReserveQuestion,
        status: QuestionStatus.APPROVED,
        isPrimary: false,
        isReserve: true,
        isMediationReserve: true,
      },
    });

    await prisma.topic.update({
      where: { id: saved.id },
      data: { reserveQuestionId: reserveQ.id },
    });

    topicMap[t.number] = {
      id: saved.id,
      number: saved.number,
      title: saved.title,
      mainSpeakerId: mainSp.id,
      mainSpeakerName: mainSp.name,
      durationSec: saved.durationSec,
    };
  }

  // 6. Programação Oficial v2.0 — 10 Blocos Macro (totalizando 145 minutos = 2h25)
  const macroBlocks = [
    {
      code: "MACRO_1",
      macroOrder: 1,
      title: "1. Abertura",
      stepType: StepType.OPENING,
      arenaMode: ArenaMode.OPENING,
      durationSec: 5 * 60, // 5 min
      topicId: null,
      speakerId: null,
      responsibleName: "Organização",
    },
    {
      code: "MACRO_2",
      macroOrder: 2,
      title: "2. Introdução e contexto",
      stepType: StepType.INTRODUCTION,
      arenaMode: ArenaMode.INTRODUCTION,
      durationSec: 10 * 60, // 10 min
      topicId: null,
      speakerId: speakerMap["paula"].id,
      responsibleName: "Paula",
    },
    {
      code: "MACRO_3",
      macroOrder: 3,
      title: "3. Pauta 1 — A solidão na era da hiperconexão",
      stepType: StepType.TOPIC_BLOCK,
      arenaMode: ArenaMode.SPEAKER_EXPOSITION,
      durationSec: 20 * 60, // 15m exposição + 5m P&R
      topicId: topicMap[1].id,
      speakerId: speakerMap["daniel"].id,
      responsibleName: "Daniel (15m Exposição + 5m P&R)",
    },
    {
      code: "MACRO_4",
      macroOrder: 4,
      title: "4. Pauta 2 — Quando a solidão vira mercado",
      stepType: StepType.TOPIC_BLOCK,
      arenaMode: ArenaMode.SPEAKER_EXPOSITION,
      durationSec: 20 * 60, // 15m exposição + 5m P&R
      topicId: topicMap[2].id,
      speakerId: speakerMap["janaina"].id,
      responsibleName: "Janaína (15m Exposição + 5m P&R)",
    },
    {
      code: "MACRO_5",
      macroOrder: 5,
      title:
        "5. Pauta 3 — Por que podemos estar cercados de pessoas e ainda não pertencer a lugar nenhum?",
      stepType: StepType.TOPIC_BLOCK,
      arenaMode: ArenaMode.SPEAKER_EXPOSITION,
      durationSec: 20 * 60, // 15m exposição + 5m P&R
      topicId: topicMap[3].id,
      speakerId: speakerMap["denilson-carneiro"].id,
      responsibleName: "Denilson Carneiro (15m Exposição + 5m P&R)",
    },
    {
      code: "MACRO_6",
      macroOrder: 6,
      title:
        "6. Pauta 4 — O futuro do trabalho vai nos aproximar ou nos tornar profissionais cada vez mais isolados?",
      stepType: StepType.TOPIC_BLOCK,
      arenaMode: ArenaMode.SPEAKER_EXPOSITION,
      durationSec: 20 * 60, // 15m exposição + 5m P&R
      topicId: topicMap[4].id,
      speakerId: speakerMap["sergio-passos"].id,
      responsibleName: "Sérgio Passos (15m Exposição + 5m P&R)",
    },
    {
      code: "MACRO_7",
      macroOrder: 7,
      title: "7. Pauta 5 — Podemos construir uma economia da conexão?",
      stepType: StepType.TOPIC_BLOCK,
      arenaMode: ArenaMode.SPEAKER_EXPOSITION,
      durationSec: 20 * 60, // 15m exposição + 5m P&R (Votação ocorre durante a Pauta 5)
      topicId: topicMap[5].id,
      speakerId: speakerMap["janaina"].id,
      responsibleName: "Janaína (15m Exposição + 5m P&R · Votação aberta)",
    },
    {
      code: "MACRO_8",
      macroOrder: 8,
      title: "8. Transição e anúncio do resultado da votação",
      stepType: StepType.TRANSITION,
      arenaMode: ArenaMode.POLL_RESULTS,
      durationSec: 5 * 60, // 5 min
      topicId: null,
      speakerId: null,
      responsibleName: "Organização / Mediação",
    },
    {
      code: "MACRO_9",
      macroOrder: 9,
      title: "9. Mesa-redonda",
      stepType: StepType.ROUNDTABLE,
      arenaMode: ArenaMode.ROUNDTABLE,
      durationSec: 20 * 60, // 20 min
      topicId: null,
      speakerId: null,
      responsibleName: "Paula, Daniel, Janaína, Denilson e Sérgio · Mediação",
    },
    {
      code: "MACRO_10",
      macroOrder: 10,
      title: "10. Encerramento",
      stepType: StepType.CLOSING,
      arenaMode: ArenaMode.CLOSING,
      durationSec: 5 * 60, // 5 min
      topicId: null,
      speakerId: null,
      responsibleName: "Organização",
    },
  ];

  for (const mb of macroBlocks) {
    await prisma.scheduleStep.create({
      data: {
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
        speakerId: mb.speakerId,
        responsibleName: mb.responsibleName,
      },
    });
  }

  // 7. Etapas Operacionais Detalhadas (15 etapas operacionais = 145 min)
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

  const operationalSteps: OperationalStepInput[] = [
    {
      code: "OP_01_ABERTURA",
      title: "Abertura — Apresentação do evento e orientações ao público",
      stepType: StepType.OPENING,
      arenaMode: ArenaMode.OPENING,
      durationSec: 5 * 60, // 05:00
      topicId: null,
      speakerId: null,
      responsibleName: "Organização",
      macroOrder: 1,
    },
    {
      code: "OP_02_INTRODUCAO_PAULA",
      title: "Introdução e contexto — A economia da solidão",
      stepType: StepType.INTRODUCTION,
      arenaMode: ArenaMode.INTRODUCTION,
      durationSec: 10 * 60, // 10:00
      topicId: null,
      speakerId: speakerMap["paula"].id,
      responsibleName: "Paula",
      macroOrder: 2,
    },
  ];

  // Pautas 1 a 5: cada uma possui exatamente 2 fases operacionais (Exposição 15:00 + Pergunta e Resposta 05:00)
  for (let topicNum = 1; topicNum <= 5; topicNum++) {
    const t = topicMap[topicNum];
    const macroOrd = topicNum + 2; // Macro 3..7
    operationalSteps.push(
      {
        code: `T${topicNum}_EXPOSICAO`,
        title: `Pauta ${topicNum} · Exposição — ${t.title}`,
        stepType: StepType.EXPOSITION,
        arenaMode: ArenaMode.SPEAKER_EXPOSITION,
        durationSec: 15 * 60, // 15:00
        topicId: t.id,
        speakerId: t.mainSpeakerId,
        responsibleName: t.mainSpeakerName,
        macroOrder: macroOrd,
      },
      {
        code: `T${topicNum}_PERGUNTA_RESPOSTA`,
        title: `Pauta ${topicNum} · Pergunta e Resposta — ${t.title}`,
        stepType: StepType.AUDIENCE_VOICE,
        arenaMode: ArenaMode.SELECTED_QUESTION,
        durationSec: 5 * 60, // 05:00
        topicId: t.id,
        speakerId: t.mainSpeakerId,
        responsibleName: `${t.mainSpeakerName} & Mediação`,
        macroOrder: macroOrd,
      }
    );
  }

  // Transição e Resultado da Votação (5 min), Mesa-Redonda (20 min) e Encerramento (5 min)
  operationalSteps.push(
    {
      code: "OP_08_TRANSICAO_RESULTADO",
      title: "Transição e anúncio do resultado da votação",
      stepType: StepType.TRANSITION,
      arenaMode: ArenaMode.POLL_RESULTS,
      durationSec: 5 * 60, // 05:00
      topicId: null,
      speakerId: null,
      responsibleName: "Organização / Mediação",
      macroOrder: 8,
    },
    {
      code: "OP_09_MESA_REDONDA",
      title: "Mesa-redonda — Debate da questão escolhida pelo público",
      stepType: StepType.ROUNDTABLE,
      arenaMode: ArenaMode.ROUNDTABLE,
      durationSec: 20 * 60, // 20:00
      topicId: null,
      speakerId: null,
      responsibleName: "Paula, Daniel, Janaína, Denilson e Sérgio · Mediação",
      macroOrder: 9,
    },
    {
      code: "OP_10_ENCERRAMENTO",
      title: "Encerramento — Síntese, agradecimentos e orientações finais",
      stepType: StepType.CLOSING,
      arenaMode: ArenaMode.CLOSING,
      durationSec: 5 * 60, // 05:00
      topicId: null,
      speakerId: null,
      responsibleName: "Organização",
      macroOrder: 10,
    }
  );

  for (let idx = 0; idx < operationalSteps.length; idx++) {
    const st = operationalSteps[idx];
    await prisma.scheduleStep.create({
      data: {
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

  // 8. Votação Única Oficial da Mesa-Redonda (vinculada à Pauta 5, aberta durante a Pauta 5)
  const roundtablePoll = await prisma.poll.create({
    data: {
      eventId: event.id,
      topicId: topicMap[5].id,
      number: 1,
      question: "Qual questão deve orientar a mesa-redonda?",
      durationSec: 15 * 60,
      status: "DRAFT",
    },
  });

  const pollOptions = [
    {
      optionOrder: 1,
      themeLabel: "Questão 1 — Tecnologia e responsabilidade",
      label:
        "Se as plataformas digitais lucram com o tempo de atenção, como criar soluções tecnológicas que combatam a solidão sem repetir o mesmo modelo de dependência?",
    },
    {
      optionOrder: 2,
      themeLabel: "Questão 2 — Mercado e relações humanas",
      label:
        "Quando experiências de convivência, acolhimento e pertencimento passam a ser vendidas, o mercado está resolvendo a solidão ou transformando vínculos humanos em produto?",
    },
    {
      optionOrder: 3,
      themeLabel: "Questão 3 — Trabalho e sociedade",
      label:
        "Diante da hiperconexão e das novas formas de trabalho, o isolamento contemporâneo é uma escolha individual ou o resultado de como organizamos a vida econômica e profissional?",
    },
  ];

  for (const opt of pollOptions) {
    await prisma.pollOption.create({
      data: {
        pollId: roundtablePoll.id,
        optionOrder: opt.optionOrder,
        themeLabel: opt.themeLabel,
        label: opt.label,
        votesCount: 0,
      },
    });
  }

  // 9. Lote inicial de 250 Credenciais Individuais para Check-in (ANM-001 a ANM-250)
  const existingCredentialsCount = await prisma.participantCredential.count({
    where: { eventId: event.id },
  });
  if (existingCredentialsCount < 250) {
    const credentialsBatch = [];
    for (let i = 1; i <= 250; i++) {
      const code = `ANM-${String(i).padStart(3, "0")}`;
      credentialsBatch.push({
        eventId: event.id,
        code,
        label: `Credencial Participante #${String(i).padStart(3, "0")}`,
        isUsed: false,
      });
    }
    await prisma.participantCredential.createMany({
      data: credentialsBatch,
      skipDuplicates: true,
    });
  }

  // 10. Estado ao vivo inicial (LiveState singleton)
  const firstStep = await prisma.scheduleStep.findUnique({
    where: {
      eventId_code: {
        eventId: event.id,
        code: "OP_01_ABERTURA",
      },
    },
  });

  await prisma.liveState.upsert({
    where: { eventId: event.id },
    update: {
      status: "WAITING",
      arenaMode: "WAITING",
      activeStepId: firstStep?.id ?? null,
      activeTopicId: null,
      activePollId: roundtablePoll.id,
      selectedQuestionId: null,
      questionsOpen: false,
      timerStatus: "IDLE",
      timerDurationMs: (firstStep?.durationSec ?? 300) * 1000,
      timerStartedAt: null,
      timerPausedAt: null,
      timerAccumulatedPauseMs: 0,
      timerAdjustmentMs: 0,
      emergencyActive: false,
      emergencyMessage: null,
    },
    create: {
      eventId: event.id,
      seq: 1,
      lastEventType: "system.initialized",
      status: "WAITING",
      arenaMode: "WAITING",
      activeStepId: firstStep?.id ?? null,
      activePollId: roundtablePoll.id,
      timerStatus: "IDLE",
      timerDurationMs: (firstStep?.durationSec ?? 300) * 1000,
      showTimerOnArena: true,
      soundAlertsEnabled: true,
    },
  });

  console.log(
    "✅ Seed v2.0 concluído! Evento (145 min / 4h certificadas), 5 especialistas (Paula, Daniel, Janaína, Denilson, Sérgio), 5 pautas (15m + 5m), 10 blocos macro, 15 etapas operacionais, 1 votação oficial da mesa-redonda e 250 credenciais prontos."
  );
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
