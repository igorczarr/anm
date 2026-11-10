import type { EvidenceStatus, SkillLevel } from "@prisma/client";

export const EVIDENCE_BADGES: Record<
  EvidenceStatus,
  { label: string; className: string; hint: string; rank: number }
> = {
  DECLARADA: {
    label: "Declarada",
    className: "bg-slate-100 text-slate-700 border-slate-300",
    hint: "Informada pelo próprio candidato, sem comprovação.",
    rank: 1,
  },
  DOCUMENTADA: {
    label: "Documentada",
    className: "bg-blue-50 text-blue-800 border-blue-300",
    hint: "Acompanhada de certificado, arquivo, link ou registro.",
    rank: 2,
  },
  DEMONSTRADA: {
    label: "Demonstrada",
    className: "bg-amber-50 text-amber-800 border-amber-300",
    hint: "Comprovada por atividade ou desafio prático.",
    rank: 3,
  },
  VALIDADA: {
    label: "Validada",
    className: "bg-emerald-50 text-emerald-800 border-emerald-400",
    hint: "Reconhecida por instituição, empresa ou avaliador identificado.",
    rank: 4,
  },
};

export const LEVEL_LABELS: Record<SkillLevel, string> = {
  BASICO: "Básico",
  INTERMEDIARIO: "Intermediário",
  AVANCADO: "Avançado",
};
