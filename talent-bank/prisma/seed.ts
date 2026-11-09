import {
  PrismaClient,
  UserRole,
  JobStatus,
  WorkModality,
  ContractType,
  ExperienceLevel,
  EducationLevel,
  EducationStatus,
  LanguageProficiency,
  ApplicationStatus,
  ConsentPurpose,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed do Banco de Talentos — A Nova Moeda...");

  // 1. Competências iniciais
  const initialSkills = [
    { name: "Excel", slug: "excel", category: "Dados & Finanças" },
    { name: "Power BI", slug: "power-bi", category: "Dados & Finanças" },
    { name: "Gestão de Projetos", slug: "gestao-de-projetos", category: "Gestão" },
    { name: "Atendimento ao Cliente", slug: "atendimento-ao-cliente", category: "Comercial & CX" },
    { name: "Comunicação", slug: "comunicacao", category: "Soft Skills" },
    { name: "Liderança", slug: "lideranca", category: "Gestão" },
    { name: "Análise de Dados", slug: "analise-de-dados", category: "Dados & Finanças" },
    { name: "Marketing", slug: "marketing", category: "Marketing & Growth" },
    { name: "Programação", slug: "programacao", category: "Tecnologia" },
  ];

  for (const s of initialSkills) {
    await prisma.skill.upsert({
      where: { slug: s.slug },
      update: { name: s.name, category: s.category },
      create: s,
    });
  }

  // 2. Usuário Admin inicial
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@anovamoeda.com.br" },
    update: { role: UserRole.ADMIN },
    create: {
      email: "admin@anovamoeda.com.br",
      fullName: "Equipe Gestora · A Nova Moeda",
      role: UserRole.ADMIN,
    },
  });

  // 2b. Convite de Recrutador padrão pronto para uso
  await prisma.recruiterInvite.upsert({
    where: { token: "rec_anovamoeda_parceiro_2026" },
    update: {},
    create: {
      token: "rec_anovamoeda_parceiro_2026",
      companyName: "Empresa Parceira · A Nova Moeda",
      role: UserRole.RECRUITER,
      createdById: adminUser.id,
      expiresAt: new Date("2026-12-31T23:59:59Z"),
    },
  });

  // 3. Oportunidades reais iniciais para demonstração e catálogo
  const jobsData = [
    {
      slug: "analista-de-inteligencia-de-mercado-pleno",
      title: "Analista de Inteligência de Mercado & Dados",
      companyName: "Grupo Vanguarda Capital",
      professionalArea: "Dados & Estratégia",
      location: "São Paulo, SP",
      modality: WorkModality.HIBRIDO,
      contractType: ContractType.CLT,
      experienceLevel: ExperienceLevel.PLENO,
      requiredEducation: EducationLevel.GRADUACAO,
      salaryRange: "R$ 6.500 - R$ 8.500",
      description:
        "Atuação estratégica na leitura de comportamento de consumo, modelagem de indicadores executivos e apoio direto à tomada de decisão das unidades de negócio.",
      responsibilities:
        "Construir dashboards executivos em Power BI; estruturar análises de coorte e retenção; traduzir tendências de mercado em recomendações acionáveis.",
      requirements:
        "Domínio de Excel avançado e Power BI; experiência com análise de dados comerciais; comunicação executiva clara.",
      differentials:
        "Conhecimento em SQL ou Python; vivência em consultoria ou mercado financeiro.",
      benefits:
        "Vale-refeição flexível, Plano de saúde e odontológico premium, Bônus anual por performance, Auxílio educação.",
      desiredSkills: ["Power BI", "Análise de Dados", "Excel", "Comunicação"],
      vacanciesCount: 2,
      status: JobStatus.PUBLISHED,
      publishedAt: new Date(),
      applicationDeadline: new Date("2026-12-15T23:59:59Z"),
      ownerId: adminUser.id,
    },
    {
      slug: "gestor-de-relacionamento-e-experiencia-do-cliente",
      title: "Especialista em Experiência & Relacionamento (CX)",
      companyName: "Maison Aurum Private",
      professionalArea: "Comercial & Relacionamento",
      location: "São Paulo, SP",
      modality: WorkModality.PRESENCIAL,
      contractType: ContractType.CLT,
      experienceLevel: ExperienceLevel.PLENO,
      requiredEducation: EducationLevel.GRADUACAO,
      salaryRange: "R$ 5.800 - R$ 7.500",
      description:
        "Responsável por conduzir a jornada de relacionamento de clientes de alto valor na Economia da Atenção e Confiança, garantindo excelência em cada ponto de contato.",
      responsibilities:
        "Gerir carteira de clientes estratégicos; desenhar rituais de relacionamento e fidelização; liderar indicadores de NPS e retenção.",
      requirements:
        "Sólida vivência em atendimento consultivo ou hospitalidade executiva; escuta ativa e comunicação impecável.",
      differentials:
        "Inglês avançado; experiência com CRM (HubSpot ou Salesforce).",
      benefits:
        "Plano de saúde executivo, Vale-refeição, Comissão sobre retenção, Day-off no aniversário.",
      desiredSkills: ["Atendimento ao Cliente", "Comunicação", "Liderança"],
      vacanciesCount: 1,
      status: JobStatus.PUBLISHED,
      publishedAt: new Date(),
      applicationDeadline: new Date("2026-12-10T23:59:59Z"),
      ownerId: adminUser.id,
    },
    {
      slug: "coordenador-de-projetos-e-comunidade-remoto",
      title: "Coordenador(a) de Projetos & Ecossistema",
      companyName: "Instituto A Nova Moeda",
      professionalArea: "Gestão & Projetos",
      location: "Brasil (Remoto)",
      modality: WorkModality.REMOTO,
      contractType: ContractType.PJ,
      experienceLevel: ExperienceLevel.SENIOR,
      requiredEducation: EducationLevel.POS_GRADUACAO,
      salaryRange: "R$ 9.000 - R$ 11.500",
      description:
        "Liderar frentes de educação executiva, parcerias institucionais e projetos de impacto ligados ao evento A Nova Moeda.",
      responsibilities:
        "Planejar cronogramas, orçamentos e entregáveis; articular patrocinadores e parceiros; acompanhar KPIs de impacto.",
      requirements:
        "Experiência comprovada em Gestão de Projetos e liderança de equipes multidisciplinares.",
      differentials:
        "Certificação PMP/Scrum; atuação prévia em eventos corporativos de grande porte.",
      benefits:
        "Horário flexível, Bônus por entrega de projeto, Acesso integral à rede de mentores A Nova Moeda.",
      desiredSkills: ["Gestão de Projetos", "Liderança", "Marketing", "Comunicação"],
      vacanciesCount: 1,
      status: JobStatus.PUBLISHED,
      publishedAt: new Date(),
      applicationDeadline: new Date("2026-12-20T23:59:59Z"),
      ownerId: adminUser.id,
    },
  ];

  for (const job of jobsData) {
    await prisma.job.upsert({
      where: { slug: job.slug },
      update: job,
      create: job,
    });
  }

  // 4. Candidato demonstrativo completo para validação imediata de Analytics e Perfil
  const demoCandidateUser = await prisma.user.upsert({
    where: { email: "helena.monteiro@exemplo.com.br" },
    update: {},
    create: {
      email: "helena.monteiro@exemplo.com.br",
      fullName: "Helena Monteiro",
      role: UserRole.CANDIDATE,
      consentRecords: {
        create: [
          { purpose: ConsentPurpose.CORE_PLATFORM, termsVersion: "v1.0-2026", granted: true },
          { purpose: ConsentPurpose.TALENT_POOL_OPPORTUNITIES, termsVersion: "v1.0-2026", granted: true },
          { purpose: ConsentPurpose.COMPANY_DATA_SHARING, termsVersion: "v1.0-2026", granted: true },
        ],
      },
    },
  });

  const profile = await prisma.candidateProfile.upsert({
    where: { userId: demoCandidateUser.id },
    update: {},
    create: {
      userId: demoCandidateUser.id,
      fullName: "Helena Monteiro",
      email: "helena.monteiro@exemplo.com.br",
      phone: "(11) 99812-4400",
      city: "São Paulo",
      state: "SP",
      linkedinUrl: "https://linkedin.com/in/helena-monteiro",
      professionalTitle: "Especialista em Estratégia de Negócios & BI",
      summary:
        "Profissional com 6 anos de atuação na interseção entre análise de dados, comportamento humano e estratégia comercial.",
      interestArea: "Dados & Estratégia",
      careerObjective:
        "Atuar em projetos estratégicos que conectem inteligência analítica e geração de valor humano.",
      desiredRoles: ["Analista de Inteligência de Mercado", "Gestora de Projetos"],
      preferredModality: WorkModality.HIBRIDO,
      availability: "Imediata",
      salaryExpectation: 8000,
      isPublicInPool: true,
      allowCompanySharing: true,
      completionPercent: 95,
      educations: {
        create: [
          {
            institution: "FGV - Fundação Getulio Vargas",
            course: "Administração de Empresas",
            level: EducationLevel.GRADUACAO,
            status: EducationStatus.CONCLUIDO,
            startDate: new Date("2018-02-01"),
            endDate: new Date("2021-12-15"),
          },
        ],
      },
      experiences: {
        create: [
          {
            company: "Aura Consultoria Estratégica",
            role: "Analista Sênior de Inteligência",
            modality: WorkModality.HIBRIDO,
            startDate: new Date("2023-03-01"),
            isCurrent: true,
            description:
              "Desenvolvimento de painéis executivos, estudos de mercado e modelagem preditiva de retenção.",
          },
        ],
      },
      languages: {
        create: [
          { language: "Português", proficiency: LanguageProficiency.NATIVO },
          { language: "Inglês", proficiency: LanguageProficiency.AVANCADO },
        ],
      },
    },
  });

  const firstJob = await prisma.job.findUnique({
    where: { slug: "analista-de-inteligencia-de-mercado-pleno" },
  });

  if (firstJob) {
    await prisma.application.upsert({
      where: {
        candidateId_jobId: {
          candidateId: profile.id,
          jobId: firstJob.id,
        },
      },
      update: {},
      create: {
        candidateId: profile.id,
        jobId: firstJob.id,
        status: ApplicationStatus.EM_ANALISE,
        history: {
          create: [
            {
              fromStatus: null,
              toStatus: ApplicationStatus.RECEBIDA,
              note: "Candidatura realizada via Portal A Nova Moeda.",
            },
            {
              fromStatus: ApplicationStatus.RECEBIDA,
              toStatus: ApplicationStatus.EM_ANALISE,
              actorId: adminUser.id,
              note: "Perfil alinhado com os requisitos de BI e comunicação executiva.",
            },
          ],
        },
      },
    });
  }

  console.log("✅ Seed concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
