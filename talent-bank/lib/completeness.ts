export interface ProfileCompletenessInput {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  linkedinUrl?: string | null;
  professionalTitle?: string | null;
  summary?: string | null;
  interestArea?: string | null;
  careerObjective?: string | null;
  educationsCount: number;
  experiencesCount: number;
  skillsCount: number;
  languagesCount: number;
  preferredModality?: string | null;
  desiredRolesCount: number;
  hasResume: boolean;
}

/**
 * Calcula o percentual de preenchimento do perfil (0 a 100%).
 * Considera-se "Perfil Completo" nos indicadores quando >= 80%.
 */
export function calculateProfileCompleteness(input: ProfileCompletenessInput): {
  percent: number;
  isComplete: boolean;
  missingSteps: string[];
} {
  let score = 0;
  const missingSteps: string[] = [];

  // A. Dados pessoais (20%)
  if (input.fullName && input.email && input.phone && input.city && input.state) {
    score += 20;
  } else {
    missingSteps.push("Informações pessoais (telefone, cidade/UF)");
  }

  // B. Apresentação profissional (15%)
  if (input.professionalTitle && input.summary && input.interestArea) {
    score += 15;
  } else {
    missingSteps.push("Apresentação profissional (título, resumo e área)");
  }

  // C. Formação acadêmica (15%)
  if (input.educationsCount > 0) {
    score += 15;
  } else {
    missingSteps.push("Formação acadêmica");
  }

  // D. Experiência profissional (15%)
  if (input.experiencesCount > 0) {
    score += 15;
  } else {
    missingSteps.push("Experiência profissional");
  }

  // E. Competências (15%)
  if (input.skillsCount >= 3) {
    score += 15;
  } else {
    missingSteps.push("Competências (mínimo 3)");
  }

  // F. Idiomas (5%)
  if (input.languagesCount > 0) {
    score += 5;
  } else {
    missingSteps.push("Idiomas");
  }

  // G. Preferências profissionais (10%)
  if (input.preferredModality && input.desiredRolesCount > 0) {
    score += 10;
  } else {
    missingSteps.push("Preferências profissionais");
  }

  // H. Currículo anexado ou estruturado (5%)
  if (input.hasResume) {
    score += 5;
  } else {
    missingSteps.push("Currículo em PDF/DOCX");
  }

  return {
    percent: score,
    isComplete: score >= 80,
    missingSteps,
  };
}
