import Link from "next/link";
import { Suspense } from "react";
import { getOrCreateCurrentCandidate } from "@/lib/current-candidate";
import { prisma } from "@/lib/prisma";
import {
  updateProfileMainAction,
  addEducationAction,
  deleteEducationAction,
  addExperienceAction,
  deleteExperienceAction,
  addSkillAction,
  removeSkillAction,
  addLanguageAction,
  deleteLanguageAction,
} from "@/app/actions/candidate";
import {
  Award,
  Briefcase,
  Camera,
  CheckCircle2,
  FileDown,
  GraduationCap,
  Languages,
  Plus,
  Save,
  Trash2,
  Upload,
  User,
} from "lucide-react";

const SAVE_MESSAGES: Record<string, string> = {
  dados: "Suas informações principais, foto de perfil e preferências foram salvas com sucesso!",
  formacao: "Formação acadêmica adicionada ao seu perfil com sucesso!",
  formacao_removida: "Formação acadêmica removida do perfil.",
  experiencia: "Experiência profissional adicionada ao seu perfil com sucesso!",
  experiencia_removida: "Experiência profissional removida do perfil.",
  competencia: "Competência vinculada ao seu perfil com sucesso!",
  competencia_removida: "Competência removida do seu perfil.",
  idioma: "Idioma adicionado ao seu perfil com sucesso!",
  idioma_removido: "Idioma removido do seu perfil.",
};

async function ProfileBuilderContent({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ salvo?: string }>;
}) {
  const [{ profile, completeness }, catalogSkills, params] = await Promise.all([
    getOrCreateCurrentCandidate(),
    prisma.skill.findMany({
      orderBy: { name: "asc" },
    }),
    searchParamsPromise,
  ]);

  const savedKey = params?.salvo || "";
  const savedMessage = SAVE_MESSAGES[savedKey] || null;
  const existingSkillIds = new Set(profile.skills.map((s) => s.skillId));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Alerta de confirmação de salvamento */}
      {savedMessage && (
        <div
          role="status"
          className="border border-emerald-600/30 bg-emerald-950/30 text-emerald-300 px-5 py-4 rounded-xl flex items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider">
                Alterações salvas com sucesso
              </p>
              <p className="text-xs mt-0.5">{savedMessage}</p>
            </div>
          </div>
          <Link
            href="/perfil"
            className="text-xs font-semibold underline hover:opacity-80 shrink-0"
          >
            Fechar aviso
          </Link>
        </div>
      )}

      {/* Topo do Perfil */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8">
        <div>
          <span className="text-[11px] uppercase tracking-[0.24em] text-[#D5C5AA]/70">
            Construção de Perfil Profissional
          </span>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl text-[#F7DECA]">
            Meu Perfil Profissional
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#D5C5AA]/80">
            Preencha suas informações para estruturar automaticamente seu currículo e habilitar candidaturas rápidas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right mr-2">
            <span className="block text-[10px] uppercase tracking-[0.2em] text-[#D5C5AA]/70">
              Completude
            </span>
            <span className="font-display text-2xl text-[#F7DECA]">
              {completeness.percent}%
            </span>
          </div>
          <a
            href="/api/resumes/pdf"
            className="px-4 py-3 border border-[#D5C5AA]/40 text-xs uppercase tracking-[0.18em] text-[#F7DECA] hover:border-[#F7DECA] transition flex items-center gap-2"
          >
            <FileDown className="w-4 h-4" />
            Gerar Currículo PDF
          </a>
        </div>
      </div>

      {/* Formulário Principal: A. Dados Pessoais, B. Apresentação, G. Preferências e Consentimentos */}
      <form
        action={updateProfileMainAction}
        className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 sm:p-8 space-y-8"
      >
        {/* A. Informações Pessoais */}
        <div>
          <div className="flex items-center gap-2 pb-3 border-b border-[#D5C5AA]/15">
            <User className="w-4 h-4 text-[#F7DECA]" />
            <h2 className="font-display text-xl text-[#F7DECA]">
              A. Informações Pessoais
            </h2>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-2">
                Nome Completo *
              </label>
              <input
                type="text"
                name="fullName"
                required
                defaultValue={profile.fullName}
                className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3.5 py-2.5 text-sm text-[#F7DECA] focus:border-[#F7DECA] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-2">
                E-mail *
              </label>
              <input
                type="email"
                name="email"
                required
                defaultValue={profile.email}
                className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3.5 py-2.5 text-sm text-[#F7DECA] focus:border-[#F7DECA] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-2">
                Telefone / WhatsApp *
              </label>
              <input
                type="text"
                name="phone"
                placeholder="(11) 99999-9999"
                defaultValue={profile.phone || ""}
                className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3.5 py-2.5 text-sm text-[#F7DECA] focus:border-[#F7DECA] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-2">
                Cidade *
              </label>
              <input
                type="text"
                name="city"
                placeholder="Ex: São Paulo"
                defaultValue={profile.city || ""}
                className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3.5 py-2.5 text-sm text-[#F7DECA] focus:border-[#F7DECA] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-2">
                Estado (UF) *
              </label>
              <input
                type="text"
                name="state"
                maxLength={2}
                placeholder="SP"
                defaultValue={profile.state || ""}
                className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3.5 py-2.5 text-sm text-[#F7DECA] uppercase focus:border-[#F7DECA] outline-none"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-xs uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-2">
                Foto de Perfil (Anexo · JPG, PNG ou WEBP)
              </label>
              <div className="flex items-center gap-3 p-2.5 rounded-xl border border-[#CBD5E1] bg-white">
                {profile.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.photoUrl}
                    alt={profile.fullName}
                    className="w-11 h-11 rounded-full object-cover border border-[#14532D]/30 shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-[#ECFDF5] text-[#14532D] flex items-center justify-center shrink-0">
                    <Camera className="w-5 h-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <input
                    type="file"
                    name="photoFile"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="block w-full text-xs text-slate-600 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#14532D] file:text-white hover:file:bg-[#166534] cursor-pointer"
                  />
                  {profile.photoUrl && (
                    <label className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        name="removePhoto"
                        className="accent-[#14532D]"
                      />
                      <span>Remover foto atual</span>
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-2">
                LinkedIn
              </label>
              <input
                type="url"
                name="linkedinUrl"
                placeholder="https://linkedin.com/in/seu-perfil"
                defaultValue={profile.linkedinUrl || ""}
                className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3.5 py-2.5 text-sm text-[#F7DECA] focus:border-[#F7DECA] outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-2">
                Portfólio ou Site Pessoal
              </label>
              <input
                type="url"
                name="portfolioUrl"
                placeholder="https://seuportfolio.com.br"
                defaultValue={profile.portfolioUrl || ""}
                className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3.5 py-2.5 text-sm text-[#F7DECA] focus:border-[#F7DECA] outline-none"
              />
            </div>
          </div>
        </div>

        {/* B. Apresentação Profissional */}
        <div>
          <div className="flex items-center gap-2 pb-3 border-b border-[#D5C5AA]/15">
            <Briefcase className="w-4 h-4 text-[#F7DECA]" />
            <h2 className="font-display text-xl text-[#F7DECA]">
              B. Apresentação Profissional
            </h2>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-2">
                Título Profissional *
              </label>
              <input
                type="text"
                name="professionalTitle"
                placeholder="Ex: Especialista em Estratégia & Dados"
                defaultValue={profile.professionalTitle || ""}
                className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3.5 py-2.5 text-sm text-[#F7DECA] focus:border-[#F7DECA] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-2">
                Área de Interesse Principal *
              </label>
              <select
                name="interestArea"
                defaultValue={profile.interestArea || "Dados & Estratégia"}
                className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3.5 py-2.5 text-sm text-[#F7DECA] focus:border-[#F7DECA] outline-none"
              >
                <option value="Dados & Estratégia">Dados & Estratégia</option>
                <option value="Comercial & Relacionamento">Comercial & Relacionamento</option>
                <option value="Gestão & Projetos">Gestão & Projetos</option>
                <option value="Marketing & Growth">Marketing & Growth</option>
                <option value="Tecnologia & Produto">Tecnologia & Produto</option>
                <option value="Finanças & Operações">Finanças & Operações</option>
                <option value="Recursos Humanos">Recursos Humanos</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-2">
                Resumo ou Apresentação Pessoal *
              </label>
              <textarea
                name="summary"
                rows={3}
                placeholder="Apresente sua trajetória, principais realizações e diferencial profissional..."
                defaultValue={profile.summary || ""}
                className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3.5 py-2.5 text-sm text-[#F7DECA] focus:border-[#F7DECA] outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-2">
                Objetivo Profissional
              </label>
              <textarea
                name="careerObjective"
                rows={2}
                placeholder="Qual o seu próximo passo de carreira desejado?"
                defaultValue={profile.careerObjective || ""}
                className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3.5 py-2.5 text-sm text-[#F7DECA] focus:border-[#F7DECA] outline-none"
              />
            </div>
          </div>
        </div>

        {/* G. Preferências Profissionais + Consentimentos LGPD */}
        <div>
          <div className="flex items-center gap-2 pb-3 border-b border-[#D5C5AA]/15">
            <Award className="w-4 h-4 text-[#F7DECA]" />
            <h2 className="font-display text-xl text-[#F7DECA]">
              G. Preferências Profissionais & Privacidade (LGPD)
            </h2>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="sm:col-span-2">
              <label className="block text-xs uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-2">
                Cargos Desejados (separados por vírgula)
              </label>
              <input
                type="text"
                name="desiredRoles"
                placeholder="Analista de BI, Gestor de Projetos, Consultor"
                defaultValue={profile.desiredRoles.join(", ")}
                className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3.5 py-2.5 text-sm text-[#F7DECA] focus:border-[#F7DECA] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-2">
                Modalidade Preferida
              </label>
              <select
                name="preferredModality"
                defaultValue={profile.preferredModality || "HIBRIDO"}
                className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3.5 py-2.5 text-sm text-[#F7DECA] focus:border-[#F7DECA] outline-none"
              >
                <option value="PRESENCIAL">Presencial</option>
                <option value="HIBRIDO">Híbrido</option>
                <option value="REMOTO">Remoto</option>
              </select>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-2">
                Pretensão Salarial Mensal (R$ - Opcional)
              </label>
              <input
                type="number"
                step="100"
                name="salaryExpectation"
                placeholder="Ex: 7500"
                defaultValue={
                  profile.salaryExpectation
                    ? Number(profile.salaryExpectation)
                    : ""
                }
                className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3.5 py-2.5 text-sm text-[#F7DECA] focus:border-[#F7DECA] outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-2">
                Disponibilidade
              </label>
              <input
                type="text"
                name="availability"
                placeholder="Ex: Imediata, 15 dias, Meio período"
                defaultValue={profile.availability || ""}
                className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3.5 py-2.5 text-sm text-[#F7DECA] focus:border-[#F7DECA] outline-none"
              />
            </div>
          </div>

          {/* Consentimentos independentes LGPD (Seção 9) */}
          <div className="mt-6 space-y-3 border border-[#57552E] bg-[#030A06] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[#F7DECA] font-semibold">
              Controle de Consentimentos Independentes (LGPD)
            </p>
            <label className="flex items-start gap-3 text-xs text-[#D5C5AA]/90 cursor-pointer">
              <input
                type="checkbox"
                name="isPublicInPool"
                defaultChecked={profile.isPublicInPool}
                className="mt-0.5 accent-[#D5C5AA]"
              />
              <span>
                <strong>Autorização para Base de Talentos:</strong> Autorizo integrar a base geral de talentos A Nova Moeda para que oportunidades futuras compatíveis com meu perfil me sejam apresentadas.
              </span>
            </label>
            <label className="flex items-start gap-3 text-xs text-[#D5C5AA]/90 cursor-pointer">
              <input
                type="checkbox"
                name="allowCompanySharing"
                defaultChecked={profile.allowCompanySharing}
                className="mt-0.5 accent-[#D5C5AA]"
              />
              <span>
                <strong>Compartilhamento com Empresas Parceiras:</strong> Autorizo o compartilhamento dos meus dados de contato e currículo com empresas ou recrutadores responsáveis pelas oportunidades.
              </span>
            </label>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-7 py-3.5 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs uppercase tracking-[0.2em] hover:bg-[#F7DECA] transition flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Salvar Dados Principais
          </button>
        </div>
      </form>

      {/* C. Formação Acadêmica & D. Experiência Profissional */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* C. Formação Acadêmica */}
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-[#D5C5AA]/15">
            <GraduationCap className="w-4 h-4 text-[#F7DECA]" />
            <h2 className="font-display text-xl text-[#F7DECA]">
              C. Formação Acadêmica
            </h2>
          </div>

          <div className="space-y-3">
            {profile.educations.map((edu) => (
              <div
                key={edu.id}
                className="border border-[#D5C5AA]/20 bg-[#030A06] p-4 flex items-start justify-between gap-3"
              >
                <div>
                  <h3 className="text-sm font-semibold text-[#F7DECA]">
                    {edu.course} · {edu.level}
                  </h3>
                  <p className="text-xs text-[#D5C5AA]/80">{edu.institution}</p>
                  <p className="text-[11px] text-[#D5C5AA]/60 mt-1">
                    {edu.status} · Início:{" "}
                    {new Date(edu.startDate).toLocaleDateString("pt-BR")}
                    {edu.endDate
                      ? ` · Conclusão: ${new Date(
                          edu.endDate
                        ).toLocaleDateString("pt-BR")}`
                      : ""}
                  </p>
                </div>
                <form action={deleteEducationAction}>
                  <input type="hidden" name="id" value={edu.id} />
                  <button
                    type="submit"
                    className="p-1.5 text-[#D5C5AA]/60 hover:text-red-400 transition cursor-pointer"
                    title="Remover formação"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ))}
          </div>

          <form
            action={addEducationAction}
            className="border-t border-[#D5C5AA]/15 pt-5 space-y-4"
          >
            <span className="text-xs uppercase tracking-[0.18em] text-[#F7DECA] block">
              + Adicionar Formação
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                name="institution"
                required
                placeholder="Instituição de ensino *"
                className="bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
              />
              <input
                type="text"
                name="course"
                required
                placeholder="Curso *"
                className="bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
              />
              <select
                name="level"
                className="bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
              >
                <option value="GRADUACAO">Graduação</option>
                <option value="POS_GRADUACAO">Pós-graduação / MBA</option>
                <option value="TECNICO">Ensino Técnico</option>
                <option value="MEDIO">Ensino Médio</option>
                <option value="MESTRADO">Mestrado</option>
                <option value="DOUTORADO">Doutorado</option>
                <option value="LIVRE">Curso Livre / Extensão</option>
              </select>
              <select
                name="status"
                className="bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
              >
                <option value="CONCLUIDO">Concluído</option>
                <option value="CURSANDO">Cursando</option>
                <option value="INTERROMPIDO">Interrompido</option>
              </select>
              <div>
                <label className="block text-[10px] uppercase text-[#D5C5AA]/70 mb-1">
                  Data de Início *
                </label>
                <input
                  type="date"
                  name="startDate"
                  required
                  className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-[#D5C5AA]/70 mb-1">
                  Conclusão ou Previsão
                </label>
                <input
                  type="date"
                  name="endDate"
                  className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
                />
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 border border-[#D5C5AA]/40 text-xs uppercase tracking-[0.18em] text-[#F7DECA] hover:border-[#F7DECA] transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Formação
            </button>
          </form>
        </div>

        {/* D. Experiência Profissional */}
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-[#D5C5AA]/15">
            <Briefcase className="w-4 h-4 text-[#F7DECA]" />
            <h2 className="font-display text-xl text-[#F7DECA]">
              D. Experiência Profissional
            </h2>
          </div>

          <div className="space-y-3">
            {profile.experiences.map((exp) => (
              <div
                key={exp.id}
                className="border border-[#D5C5AA]/20 bg-[#030A06] p-4 flex items-start justify-between gap-3"
              >
                <div>
                  <h3 className="text-sm font-semibold text-[#F7DECA]">
                    {exp.role} · {exp.company}
                  </h3>
                  <p className="text-[11px] text-[#D5C5AA]/65 mt-0.5">
                    {exp.modality || "PRESENCIAL"} · Início:{" "}
                    {new Date(exp.startDate).toLocaleDateString("pt-BR")} ·{" "}
                    {exp.isCurrent
                      ? "Emprego Atual"
                      : exp.endDate
                      ? `Até ${new Date(exp.endDate).toLocaleDateString("pt-BR")}`
                      : ""}
                  </p>
                  {exp.description && (
                    <p className="text-xs text-[#D5C5AA]/85 mt-2">
                      {exp.description}
                    </p>
                  )}
                </div>
                <form action={deleteExperienceAction}>
                  <input type="hidden" name="id" value={exp.id} />
                  <button
                    type="submit"
                    className="p-1.5 text-[#D5C5AA]/60 hover:text-red-400 transition cursor-pointer"
                    title="Remover experiência"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ))}
          </div>

          <form
            action={addExperienceAction}
            className="border-t border-[#D5C5AA]/15 pt-5 space-y-4"
          >
            <span className="text-xs uppercase tracking-[0.18em] text-[#F7DECA] block">
              + Adicionar Experiência
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                name="company"
                required
                placeholder="Empresa *"
                className="bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
              />
              <input
                type="text"
                name="role"
                required
                placeholder="Cargo *"
                className="bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
              />
              <select
                name="modality"
                className="bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
              >
                <option value="PRESENCIAL">Presencial</option>
                <option value="HIBRIDO">Híbrido</option>
                <option value="REMOTO">Remoto</option>
              </select>
              <label className="flex items-center gap-2 text-xs text-[#D5C5AA]/90 px-2">
                <input
                  type="checkbox"
                  name="isCurrent"
                  className="accent-[#D5C5AA]"
                />
                <span>Trabalho atualmente aqui</span>
              </label>
              <div>
                <label className="block text-[10px] uppercase text-[#D5C5AA]/70 mb-1">
                  Data de Início *
                </label>
                <input
                  type="date"
                  name="startDate"
                  required
                  className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase text-[#D5C5AA]/70 mb-1">
                  Encerramento (se aplicável)
                </label>
                <input
                  type="date"
                  name="endDate"
                  className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
                />
              </div>
              <textarea
                name="description"
                rows={2}
                placeholder="Principais atividades, responsabilidades e resultados alcançados..."
                className="sm:col-span-2 bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 border border-[#D5C5AA]/40 text-xs uppercase tracking-[0.18em] text-[#F7DECA] hover:border-[#F7DECA] transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Experiência
            </button>
          </form>
        </div>
      </div>

      {/* E. Competências & F. Idiomas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* E. Competências */}
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-[#D5C5AA]/15">
            <Award className="w-4 h-4 text-[#F7DECA]" />
            <h2 className="font-display text-xl text-[#F7DECA]">
              E. Competências
            </h2>
          </div>

          {/* Competências atuais do candidato */}
          <div className="flex flex-wrap gap-2">
            {profile.skills.length === 0 ? (
              <p className="text-xs text-slate-600">
                Nenhuma competência adicionada ainda.
              </p>
            ) : (
              profile.skills.map((cs) => (
                <form
                  key={cs.id}
                  action={removeSkillAction}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#14532D]/30 bg-[#ECFDF5] text-xs font-semibold text-[#14532D]"
                >
                  <input
                    type="hidden"
                    name="candidateSkillId"
                    value={cs.id}
                  />
                  <span>{cs.skill.name}</span>
                  <button
                    type="submit"
                    className="text-[#14532D]/70 hover:text-red-600 font-bold cursor-pointer"
                    title="Remover competência"
                  >
                    ×
                  </button>
                </form>
              ))
            )}
          </div>

          {/* Sugestões rápidas do Briefing */}
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 block mb-2.5">
              Adicionar em 1 clique:
            </span>
            <div className="flex flex-wrap gap-2">
              {catalogSkills
                .filter((s) => !existingSkillIds.has(s.id))
                .map((skill) => (
                  <form key={skill.id} action={addSkillAction}>
                    <input type="hidden" name="skillName" value={skill.name} />
                    <input
                      type="hidden"
                      name="category"
                      value={skill.category || "Geral"}
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:border-[#14532D] hover:bg-[#ECFDF5] hover:text-[#14532D] shadow-xs transition cursor-pointer"
                    >
                      + {skill.name}
                    </button>
                  </form>
                ))}
            </div>
          </div>

          {/* Campo livre para qualquer competência personalizada */}
          <form
            action={addSkillAction}
            className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row gap-3"
          >
            <input
              type="text"
              name="skillName"
              required
              placeholder="Ou digite qualquer competência personalizada..."
              className="flex-1 bg-white border border-slate-300 px-3.5 py-2.5 text-xs text-slate-900"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#14532D] text-white font-semibold text-xs uppercase tracking-[0.18em] hover:bg-[#166534] transition cursor-pointer shrink-0"
            >
              + Adicionar
            </button>
          </form>
        </div>

        {/* F. Idiomas */}
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-[#D5C5AA]/15">
            <Languages className="w-4 h-4 text-[#F7DECA]" />
            <h2 className="font-display text-xl text-[#F7DECA]">
              F. Idiomas
            </h2>
          </div>

          <div className="space-y-2.5">
            {profile.languages.map((lang) => (
              <div
                key={lang.id}
                className="border border-[#D5C5AA]/20 bg-[#030A06] px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <span className="text-sm font-semibold text-[#F7DECA]">
                    {lang.language}
                  </span>
                  <span className="ml-3 text-xs uppercase tracking-[0.16em] text-[#D5C5AA]/75">
                    {lang.proficiency}
                  </span>
                </div>
                <form action={deleteLanguageAction}>
                  <input type="hidden" name="id" value={lang.id} />
                  <button
                    type="submit"
                    className="p-1 text-[#D5C5AA]/60 hover:text-red-400 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ))}
          </div>

          <form
            action={addLanguageAction}
            className="border-t border-[#D5C5AA]/15 pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            <input
              type="text"
              name="language"
              required
              placeholder="Idioma (ex: Inglês, Espanhol)"
              className="bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
            <select
              name="proficiency"
              className="bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            >
              <option value="BASICO">Básico</option>
              <option value="INTERMEDIARIO">Intermediário</option>
              <option value="AVANCADO">Avançado</option>
              <option value="FLUENTE">Fluente</option>
              <option value="NATIVO">Nativo</option>
            </select>
            <button
              type="submit"
              className="px-4 py-2 border border-[#D5C5AA]/40 text-xs uppercase tracking-[0.18em] text-[#F7DECA] hover:border-[#F7DECA] transition cursor-pointer"
            >
              + Adicionar Idioma
            </button>
          </form>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[#D5C5AA]/15 pt-6">
        <Link
          href="/painel"
          className="text-xs uppercase tracking-[0.18em] text-[#D5C5AA] hover:text-[#F7DECA]"
        >
          ← Voltar ao Painel do Candidato
        </Link>
        <Link
          href="/curriculo"
          className="px-5 py-3 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs uppercase tracking-[0.18em] hover:bg-[#F7DECA] transition"
        >
          Avançar para Gestão de Currículo →
        </Link>
      </div>
    </div>
  );
}

export default function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ salvo?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-sm text-[#D5C5AA]/70">
          Carregando perfil profissional...
        </div>
      }
    >
      <ProfileBuilderContent searchParamsPromise={searchParams} />
    </Suspense>
  );
}
