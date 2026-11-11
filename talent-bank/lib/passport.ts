import type {
  AchievementCategory,
  EvidenceStatus,
  EvidenceType,
  ExperienceType,
  SkillLevel,
} from "@prisma/client";

export const EVIDENCE_BADGES: Record<
  EvidenceStatus,
  {
    label: string;
    shortLabel: string;
    className: string;
    dotColor: string;
    hint: string;
    rank: number;
  }
> = {
  DECLARADA: {
    label: "Declarada",
    shortLabel: "Declarada",
    className: "bg-slate-100 text-slate-700 border-slate-300",
    dotColor: "bg-slate-400",
    hint: "Informada pelo próprio candidato, aguardando documento ou desafio prático.",
    rank: 1,
  },
  DOCUMENTADA: {
    label: "Documentada",
    shortLabel: "Documentada",
    className: "bg-blue-50 text-blue-800 border-blue-300",
    dotColor: "bg-blue-600",
    hint: "Acompanhada de certificado, planilha, relatório, projeto ou registro.",
    rank: 2,
  },
  DEMONSTRADA: {
    label: "Demonstrada",
    shortLabel: "Demonstrada",
    className: "bg-amber-50 text-amber-800 border-amber-300",
    dotColor: "bg-amber-500",
    hint: "Comprovada por atividade ou desafio prático avaliado no Talent Hub.",
    rank: 3,
  },
  VALIDADA: {
    label: "Validada",
    shortLabel: "Validada",
    className: "bg-emerald-50 text-emerald-800 border-emerald-400",
    dotColor: "bg-emerald-600",
    hint: "Reconhecida por uma instituição, empresa parceira ou avaliador identificado.",
    rank: 4,
  },
};

export const LEVEL_LABELS: Record<SkillLevel, string> = {
  BASICO: "Básico",
  INTERMEDIARIO: "Intermediário",
  AVANCADO: "Avançado",
};

export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  LINK: "Link / Portfólio",
  CERTIFICADO: "Certificado / Curso",
  PROJETO: "Projeto Prático / Acadêmico",
  TRABALHO: "Planilha / Relatório / Entrega",
};

export const EXPERIENCE_TYPE_LABELS: Record<ExperienceType, string> = {
  EMPREGO: "Emprego Formal",
  ESTAGIO: "Estágio",
  APRENDIZAGEM: "Jovem Aprendiz",
  PROJETO_ACADEMICO: "Projeto Acadêmico / Extensão",
  VOLUNTARIADO: "Voluntariado / Liderança Estudantil",
  FREELANCE: "Freelance / Projeto Autônomo",
};

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
  PORTFOLIO_PLANILHA: "Planilha / Controle de Indicadores",
  PORTFOLIO_RELATORIO: "Relatório / Análise Técnica",
  PORTFOLIO_APRESENTACAO: "Apresentação / Estudo de Caso",
  PORTFOLIO_PROJETO: "Projeto Prático / Design / Sistema",
  CERTIFICACAO: "Certificação / Qualificação",
  PREMIACAO: "Premiação / Destaque",
  CONQUISTA_ACADEMICA: "Projeto Acadêmico / Artigo / TCC",
};

export const REGIONAL_SUGGESTED_SKILLS: { name: string; category: string }[] = [
  { name: "Excel", category: "Administração & Dados" },
  { name: "Atendimento ao Cliente", category: "Atendimento & Comercial" },
  { name: "Vendas e Negociação", category: "Comercial" },
  { name: "Rotinas Administrativas", category: "Administração" },
  { name: "Análise de Indicadores", category: "Gestão & Dados" },
  { name: "Power BI", category: "Dados & BI" },
  { name: "Fluxo de Caixa e Financeiro", category: "Financeiro" },
  { name: "Controle de Estoque e Logística", category: "Logística & Operações" },
  { name: "Comunicação Profissional", category: "Interpessoal" },
  { name: "Marketing Digital", category: "Marketing" },
  { name: "Gestão de Projetos", category: "Gestão" },
  { name: "Liderança e Organização", category: "Gestão" },
  { name: "Programação e Tecnologia", category: "Tecnologia" },
];
