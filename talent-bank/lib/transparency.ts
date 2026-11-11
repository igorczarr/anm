export interface TransparentJobInput {
  title: string;
  companyName: string;
  companyIdentifier?: string | null;
  companyVerified?: boolean;
  companyVerifiedByName?: string | null;
  professionalArea: string;
  location: string;
  modality: string;
  contractType: string;
  salaryRange?: string | null;
  workSchedule?: string | null;
  description: string;
  responsibilities: string;
  requirements: string;
  differentials?: string | null;
  benefits?: string | null;
  growthPossibility?: string | null;
  desiredSkills: string[];
  selectionStages?: string[];
  feedbackSlaDays?: number | null;
  feedbackEstimate?: string | null;
  applicationDeadline?: Date | string | null;
}

export interface TransparencyCriterion {
  key: string;
  label: string;
  met: boolean;
  mandatoryForPublish: boolean;
}

export interface JobTransparencyReport {
  score: number; // 0 a 10
  maxScore: number; // 10
  percent: number; // 0 a 100
  isTransparentStandard: boolean; // Atende a todos os requisitos obrigatórios de publicação
  isGoldSeal: boolean; // Empresa verificada + >= 8 critérios atendidos
  badgeLabel: string;
  badgeClass: string;
  criteria: TransparencyCriterion[];
  missingMandatory: string[];
  isExpired: boolean;
}

export const DEFAULT_SELECTION_STAGES: string[] = [
  "1. Triagem do Passaporte de Talentos e Evidências",
  "2. Atividade ou Desafio Prático da Área",
  "3. Entrevista com Gestor / RH da Empresa",
  "4. Proposta e Retorno Final ao Candidato",
];

export function evaluateJobTransparency(
  job: TransparentJobInput
): JobTransparencyReport {
  const hasCompanyId = Boolean(
    job.companyName?.trim() &&
      (job.companyIdentifier?.trim() || job.companyVerified)
  );
  const isVerified = Boolean(job.companyVerified);
  const hasRealActivities = Boolean(
    job.title?.trim() &&
      job.description?.trim() &&
      job.responsibilities?.trim()
  );
  const hasSalary = Boolean(job.salaryRange?.trim());
  const hasWorkConditions = Boolean(
    job.contractType?.trim() && job.location?.trim() && job.modality?.trim()
  );
  const hasSchedule = Boolean(job.workSchedule?.trim());
  const hasRequirements = Boolean(
    job.requirements?.trim() &&
      Array.isArray(job.desiredSkills) &&
      job.desiredSkills.length > 0
  );
  const hasBenefitsOrGrowth = Boolean(
    job.benefits?.trim() || job.growthPossibility?.trim()
  );
  const hasStages = Boolean(
    Array.isArray(job.selectionStages) && job.selectionStages.length > 0
  );
  const hasFeedbackSla = Boolean(
    job.feedbackEstimate?.trim() ||
      (typeof job.feedbackSlaDays === "number" && job.feedbackSlaDays > 0)
  );

  const criteria: TransparencyCriterion[] = [
    {
      key: "companyIdentified",
      label: "Empresa responsável e identificação verificável",
      met: hasCompanyId,
      mandatoryForPublish: true,
    },
    {
      key: "companyVerified",
      label: "Empresa verificada pela curadoria do Talent Hub",
      met: isVerified,
      mandatoryForPublish: false,
    },
    {
      key: "realActivities",
      label: "Cargo e atividades reais detalhados",
      met: hasRealActivities,
      mandatoryForPublish: true,
    },
    {
      key: "remunerationTransparent",
      label: "Faixa salarial ou bolsa divulgada",
      met: hasSalary,
      mandatoryForPublish: false,
    },
    {
      key: "workConditionsClear",
      label: "Tipo de contratação, localização e modalidade claros",
      met: hasWorkConditions,
      mandatoryForPublish: true,
    },
    {
      key: "scheduleDefined",
      label: "Jornada e disponibilidade exigida informadas",
      met: hasSchedule,
      mandatoryForPublish: true,
    },
    {
      key: "requirementsAndSkills",
      label: "Requisitos obrigatórios e competências desejadas",
      met: hasRequirements,
      mandatoryForPublish: true,
    },
    {
      key: "benefitsAndGrowth",
      label: "Benefícios e possibilidade de desenvolvimento",
      met: hasBenefitsOrGrowth,
      mandatoryForPublish: false,
    },
    {
      key: "selectionStagesClear",
      label: "Etapas do processo seletivo definidas",
      met: hasStages,
      mandatoryForPublish: true,
    },
    {
      key: "feedbackSlaDefined",
      label: "Prazo ou previsão de retorno ao candidato",
      met: hasFeedbackSla,
      mandatoryForPublish: true,
    },
  ];

  const score = criteria.filter((c) => c.met).length;
  const maxScore = criteria.length;
  const percent = Math.round((score / maxScore) * 100);

  const missingMandatory = criteria
    .filter((c) => c.mandatoryForPublish && !c.met)
    .map((c) => c.label);

  const isTransparentStandard = missingMandatory.length === 0;
  const isGoldSeal = isVerified && isTransparentStandard && score >= 8;

  let badgeLabel = "Em adequação";
  let badgeClass = "bg-amber-50 text-amber-900 border-amber-300";

  if (isGoldSeal) {
    badgeLabel = "Oportunidade Verificada & Transparente";
    badgeClass = "bg-emerald-50 text-emerald-900 border-emerald-400";
  } else if (isTransparentStandard) {
    badgeLabel = "Padrão Transparente Completo";
    badgeClass = "bg-sky-50 text-sky-900 border-sky-300";
  }

  let isExpired = false;
  if (job.applicationDeadline) {
    const deadlineDate = new Date(job.applicationDeadline);
    const endOfDeadlineDay = new Date(
      deadlineDate.getFullYear(),
      deadlineDate.getMonth(),
      deadlineDate.getDate(),
      23,
      59,
      59
    );
    if (endOfDeadlineDay.getTime() < Date.now()) {
      isExpired = true;
    }
  }

  return {
    score,
    maxScore,
    percent,
    isTransparentStandard,
    isGoldSeal,
    badgeLabel,
    badgeClass,
    criteria,
    missingMandatory,
    isExpired,
  };
}
