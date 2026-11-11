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
  evidencesCount?: number;
  achievementsCount?: number;
  languagesCount: number;
  preferredModality?: string | null;
  desiredRolesCount: number;
  hasResume: boolean;
}

/**
 * Calcula o percentual de preenchimento do Passaporte de Talentos (0 a 100%).
 * Valoriza tanto experiências formais quanto evidências práticas, projetos acadêmicos e portfólio,
 * permitindo que jovens talentos em início de carreira atinjam 100% de completude.
 */
export function calculateProfileCompleteness(input: ProfileCompletenessInput): {
  percent: number;
  isComplete: boolean;
  missingSteps: string[];
} {
  let score = 0;
  const missingSteps: string[] = [];

  const totalEvidences =
    (input.evidencesCount || 0) + (input.achievementsCount || 0);

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

  // D. Experiência (emprego, estágio, voluntariado ou projeto acadêmico) OU Portfólio (15%)
  if (input.experiencesCount > 0 || (input.achievementsCount || 0) > 0) {
    score += 15;
  } else {
    missingSteps.push("Experiência, estágio, projeto acadêmico ou conquista");
  }

  // E. Competências no Passaporte (15%)
  if (input.skillsCount >= 3) {
    score += 15;
  } else {
    missingSteps.push("Competências no Passaporte (mínimo 3)");
  }

  // F. Evidências práticas documentadas (10%)
  if (totalEvidences >= 1) {
    score += 10;
  } else {
    missingSteps.push("Apresentar pelo menos 1 evidência ou portfólio no Passaporte");
  }

  // G. Preferências profissionais (5%)
  if (input.preferredModality && input.desiredRolesCount > 0) {
    score += 5;
  } else {
    missingSteps.push("Preferências profissionais e disponibilidade");
  }

  // H. Idiomas ou Currículo (5%)
  if (input.languagesCount > 0 || input.hasResume) {
    score += 5;
  } else {
    missingSteps.push("Idioma ou currículo em PDF");
  }

  return {
    percent: Math.min(100, score),
    isComplete: score >= 80,
    missingSteps,
  };
}
