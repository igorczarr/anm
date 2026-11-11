import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import {
  saveJobAdminAction,
  updateJobStatusAdminAction,
  toggleVerifyJobCompanyAdminAction,
} from "@/app/actions/admin";
import {
  DEFAULT_SELECTION_STAGES,
  evaluateJobTransparency,
} from "@/lib/transparency";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  FileDown,
  PauseCircle,
  PlayCircle,
  Plus,
  Save,
  ShieldCheck,
  XCircle,
  Archive,
} from "lucide-react";

async function AdminJobsContent({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{
    edit?: string;
    aviso?: string;
    salvo?: string;
  }>;
}) {
  const { edit, aviso, salvo } = await searchParamsPromise;

  const [jobs, editingJob] = await Promise.all([
    prisma.job.findMany({
      include: {
        _count: { select: { applications: true, views: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    edit ? prisma.job.findUnique({ where: { id: edit } }) : null,
  ]);

  const editingTransparency = editingJob
    ? evaluateJobTransparency(editingJob)
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Cabeçalho */}
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-[0.26em] text-[#D5C5AA]/70">
            Gestão de Oportunidades · Fase 2: Oportunidades Transparentes
          </span>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl text-[#F7DECA]">
            Publicação e Curadoria de Oportunidades
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#D5C5AA]/80">
            Padrão obrigatório de qualidade: toda vaga publicada exige empresa
            identificada, atividades reais, jornada, etapas claras e prazo de
            retorno ao candidato.
          </p>
        </div>

        {editingJob && (
          <Link
            href="/admin/vagas"
            className="px-4 py-2.5 border border-[#D5C5AA]/40 text-xs uppercase tracking-[0.18em] text-[#F7DECA]"
          >
            + Nova Vaga em Branco
          </Link>
        )}
      </div>

      {/* Aviso de bloqueio de publicação por falta de transparência */}
      {aviso === "incompleta" && editingTransparency && (
        <div className="border border-amber-300 bg-amber-50 p-5 rounded-xl space-y-2 text-amber-950">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertCircle className="w-4 h-4 text-amber-700" />
            <span>
              Publicação bloqueada: a vaga foi mantida em Rascunho (DRAFT) por
              não cumprir o Padrão Obrigatório de Oportunidade Transparente.
            </span>
          </div>
          <p className="text-xs text-amber-900">
            Para publicar a vaga no mural, preencha os seguintes itens
            obrigatórios:
          </p>
          <ul className="list-disc list-inside text-xs font-semibold space-y-1">
            {editingTransparency.missingMandatory.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {salvo && (
        <div className="border border-emerald-300 bg-[#ECFDF5] p-4 rounded-xl flex items-center justify-between text-xs text-emerald-950">
          <span className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-[#14532D]" />
            {salvo === "publicada"
              ? "Oportunidade verificada e publicada com sucesso no Padrão Transparente!"
              : "Rascunho / alterações da oportunidade salvos com sucesso."}
          </span>
        </div>
      )}

      {/* Formulário Completo de Criação / Edição de Vaga Transparente */}
      <form
        action={saveJobAdminAction}
        className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 sm:p-8 space-y-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D5C5AA]/15 pb-3">
          <h2 className="font-display text-xl text-[#F7DECA] flex items-center gap-2">
            {editingJob ? (
              <>Editando Vaga: {editingJob.title}</>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Cadastrar Nova Oportunidade Transparente
              </>
            )}
          </h2>
          {editingTransparency && (
            <span
              className={`px-3 py-1 rounded-full border text-xs font-semibold ${editingTransparency.badgeClass}`}
            >
              Índice de Transparência: {editingTransparency.score}/
              {editingTransparency.maxScore} · {editingTransparency.badgeLabel}
            </span>
          )}
          {editingJob && (
            <input type="hidden" name="jobId" value={editingJob.id} />
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Título da Vaga / Função *
            </label>
            <input
              type="text"
              name="title"
              required
              defaultValue={editingJob?.title || ""}
              placeholder="Ex: Assistente Administrativo & Financeiro"
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Empresa / Organização Responsável *
            </label>
            <input
              type="text"
              name="companyName"
              required
              defaultValue={editingJob?.companyName || ""}
              placeholder="Ex: Grupo Comercial Feirense"
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Identificação Verificável (CNPJ ou Site) *
            </label>
            <input
              type="text"
              name="companyIdentifier"
              required
              defaultValue={editingJob?.companyIdentifier || ""}
              placeholder="Ex: CNPJ 12.345.678/0001-90 · empresa.com.br"
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Área Profissional *
            </label>
            <input
              type="text"
              name="professionalArea"
              required
              defaultValue={
                editingJob?.professionalArea || "Administração & Gestão"
              }
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Localização *
            </label>
            <input
              type="text"
              name="location"
              required
              defaultValue={editingJob?.location || "Feira de Santana, BA"}
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Modalidade *
            </label>
            <select
              name="modality"
              defaultValue={editingJob?.modality || "PRESENCIAL"}
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            >
              <option value="PRESENCIAL">Presencial</option>
              <option value="HIBRIDO">Híbrido</option>
              <option value="REMOTO">Remoto</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Tipo de Contratação *
            </label>
            <select
              name="contractType"
              defaultValue={editingJob?.contractType || "CLT"}
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            >
              <option value="CLT">CLT</option>
              <option value="ESTAGIO">Estágio</option>
              <option value="JOVEM_APRENDIZ">Jovem Aprendiz</option>
              <option value="PJ">PJ</option>
              <option value="TEMPORARIO">Temporário</option>
              <option value="FREELANCER">Freelancer / Microprojeto</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Nível de Experiência
            </label>
            <select
              name="experienceLevel"
              defaultValue={editingJob?.experienceLevel || "JUNIOR"}
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            >
              <option value="SEM_EXPERIENCIA">
                Sem experiência (Primeiro Emprego)
              </option>
              <option value="ESTAGIO">Estágio</option>
              <option value="JUNIOR">Júnior</option>
              <option value="PLENO">Pleno</option>
              <option value="SENIOR">Sênior</option>
              <option value="ESPECIALISTA">Especialista</option>
              <option value="LIDERANCA">Liderança</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Formação Exigida
            </label>
            <select
              name="requiredEducation"
              defaultValue={editingJob?.requiredEducation || "GRADUACAO"}
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            >
              <option value="">Não exigida</option>
              <option value="MEDIO">Ensino Médio</option>
              <option value="TECNICO">Técnico</option>
              <option value="GRADUACAO">Graduação (em curso ou concluída)</option>
              <option value="POS_GRADUACAO">Pós-graduação</option>
              <option value="MESTRADO">Mestrado</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Remuneração / Faixa Salarial ou Bolsa
            </label>
            <input
              type="text"
              name="salaryRange"
              defaultValue={editingJob?.salaryRange || ""}
              placeholder="Ex: R$ 2.200 - R$ 2.800 (ou Bolsa R$ 1.200)"
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Jornada e Disponibilidade Exigida *
            </label>
            <input
              type="text"
              name="workSchedule"
              required
              defaultValue={
                editingJob?.workSchedule ||
                "Segunda a sexta, 8h às 18h (44h semanais)"
              }
              placeholder="Ex: 6h diárias (matutino ou vespertino)"
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Quantidade de Vagas
            </label>
            <input
              type="number"
              name="vacanciesCount"
              min={1}
              defaultValue={editingJob?.vacanciesCount || 1}
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Prazo de Inscrição
            </label>
            <input
              type="date"
              name="applicationDeadline"
              defaultValue={
                editingJob?.applicationDeadline
                  ? new Date(editingJob.applicationDeadline)
                      .toISOString()
                      .slice(0, 10)
                  : ""
              }
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Prazo Máximo de Retorno (Dias) *
            </label>
            <input
              type="number"
              name="feedbackSlaDays"
              min={1}
              max={60}
              required
              defaultValue={editingJob?.feedbackSlaDays || 7}
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Previsão de Retorno ao Candidato *
            </label>
            <input
              type="text"
              name="feedbackEstimate"
              required
              defaultValue={
                editingJob?.feedbackEstimate ||
                "Retorno garantido em até 7 dias úteis após cada etapa"
              }
              placeholder="Ex: Retorno em até 5 dias úteis"
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Competências Desejadas no Passaporte (separadas por vírgula) *
            </label>
            <input
              type="text"
              name="desiredSkills"
              required
              defaultValue={editingJob?.desiredSkills.join(", ") || ""}
              placeholder="Excel, Atendimento ao Cliente, Rotinas Administrativas, Comunicação Profissional"
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Status de Publicação
            </label>
            <select
              name="status"
              defaultValue={editingJob?.status || "PUBLISHED"}
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            >
              <option value="PUBLISHED">Publicada (Exige Padrão Transparente)</option>
              <option value="DRAFT">Rascunho</option>
              <option value="PAUSED">Pausada</option>
              <option value="CLOSED">Encerrada</option>
            </select>
          </div>

          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2.5 text-xs font-semibold text-[#14532D] bg-[#ECFDF5] border border-emerald-300 px-3.5 py-2 rounded-lg w-full cursor-pointer">
              <input
                type="checkbox"
                name="companyVerified"
                defaultChecked={editingJob ? editingJob.companyVerified : true}
                className="accent-[#14532D] w-4 h-4"
              />
              <span>Empresa Verificada pelo Talent Hub</span>
            </label>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Descrição da Oportunidade *
            </label>
            <textarea
              name="description"
              required
              rows={3}
              defaultValue={editingJob?.description || ""}
              placeholder="Explique o contexto real da vaga e como essa função contribui para a empresa..."
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Atividades Reais & Responsabilidades *
            </label>
            <textarea
              name="responsibilities"
              required
              rows={3}
              defaultValue={editingJob?.responsibilities || ""}
              placeholder="Liste as atividades práticas do dia a dia que a pessoa irá executar..."
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Requisitos Obrigatórios *
            </label>
            <textarea
              name="requirements"
              required
              rows={2}
              defaultValue={editingJob?.requirements || ""}
              placeholder="O que é realmente indispensável para assumir a oportunidade..."
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Diferenciais Desejáveis (Não eliminatórios)
            </label>
            <textarea
              name="differentials"
              rows={2}
              defaultValue={editingJob?.differentials || ""}
              placeholder="Evidências ou projetos práticos que contam pontos extras no Passaporte..."
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Benefícios Oferecidos
            </label>
            <textarea
              name="benefits"
              rows={2}
              defaultValue={editingJob?.benefits || ""}
              placeholder="Ex: Vale-transporte, auxílio-alimentação, seguro de vida, bolsa de cursos..."
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Possibilidade de Desenvolvimento & Plano de Carreira
            </label>
            <textarea
              name="growthPossibility"
              rows={2}
              defaultValue={editingJob?.growthPossibility || ""}
              placeholder="Ex: Acompanhamento quinzenal com gestor e possibilidade de efetivação/promoção em 6 a 12 meses."
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Etapas do Processo Seletivo (1 etapa por linha) *
            </label>
            <textarea
              name="selectionStages"
              required
              rows={4}
              defaultValue={
                editingJob?.selectionStages &&
                editingJob.selectionStages.length > 0
                  ? editingJob.selectionStages.join("\n")
                  : DEFAULT_SELECTION_STAGES.join("\n")
              }
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[11px] uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
              Perguntas Adicionais ao Candidato (1 por linha - Opcional)
            </label>
            <textarea
              name="customQuestions"
              rows={4}
              defaultValue={
                Array.isArray(editingJob?.customQuestions)
                  ? (editingJob.customQuestions as string[]).join("\n")
                  : ""
              }
              placeholder="Ex: Qual sua disponibilidade para início imediato em Feira de Santana?"
              className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3 py-2 text-xs text-[#F7DECA]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#D5C5AA]/15">
          <span className="text-[11px] text-slate-600">
            * A oportunidade só pode ser publicada quando todos os itens
            obrigatórios de transparência estão preenchidos.
          </span>
          <button
            type="submit"
            className="px-6 py-3 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs uppercase tracking-[0.2em] hover:bg-[#F7DECA] transition flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {editingJob
              ? "Salvar Alterações da Oportunidade"
              : "Criar e Publicar Oportunidade Transparente"}
          </button>
        </div>
      </form>

      {/* Tabela de Vagas Cadastradas */}
      <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/70 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#D5C5AA]/20 bg-[#030A06] text-[10px] uppercase tracking-[0.2em] text-[#D5C5AA]/80">
              <th className="p-4">Oportunidade / Empresa</th>
              <th className="p-4">Área / Jornada</th>
              <th className="p-4">Padrão Transparente</th>
              <th className="p-4">Status</th>
              <th className="p-4">Views / Inscritos</th>
              <th className="p-4 text-right">Ações de Ciclo de Vida</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D5C5AA]/15">
            {jobs.map((job) => {
              const views = Math.max(job.viewsCount, job._count.views);
              const apps = job._count.applications;
              const conversion =
                views > 0 ? `${Math.round((apps / views) * 100)}%` : "—";
              const transparency = evaluateJobTransparency(job);

              return (
                <tr key={job.id} className="hover:bg-[#030A06]/60 transition">
                  <td className="p-4">
                    <div className="font-semibold text-[#F7DECA] flex items-center gap-1.5">
                      <span>{job.title}</span>
                      {job.companyVerified && (
                        <span
                          className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-900 border border-emerald-300"
                          title={`Empresa verificada por ${
                            job.companyVerifiedByName || "Curadoria Talent Hub"
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3" />
                          Verificada
                        </span>
                      )}
                    </div>
                    <div className="text-[#D5C5AA]/75">
                      {job.companyName} · {job.location}
                    </div>
                    {job.companyIdentifier && (
                      <div className="text-[11px] text-slate-500">
                        ID: {job.companyIdentifier}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div>{job.professionalArea}</div>
                    <div className="text-[#D5C5AA]/65">
                      {job.modality} · {job.contractType}
                    </div>
                    {job.workSchedule && (
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {job.workSchedule}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-semibold ${transparency.badgeClass}`}
                    >
                      {transparency.score}/{transparency.maxScore} ·{" "}
                      {transparency.badgeLabel}
                    </span>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Retorno: até {job.feedbackSlaDays}d ·{" "}
                      {job.selectionStages.length} etapa(s)
                    </div>
                    {transparency.isExpired && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded bg-red-50 text-red-800 border border-red-200 text-[10px] font-semibold">
                        Prazo de inscrição vencido
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 border border-[#57552E] bg-[#030A06] text-[#F7DECA] uppercase text-[10px] tracking-[0.16em]">
                      {job.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div>
                      <strong>{apps}</strong> candidaturas ·{" "}
                      <strong>{views}</strong> views
                    </div>
                    <div className="text-[#D5C5AA]/65">
                      Conversão: {conversion}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <form action={toggleVerifyJobCompanyAdminAction}>
                        <input type="hidden" name="jobId" value={job.id} />
                        <button
                          type="submit"
                          className={`px-2.5 py-1 border text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                            job.companyVerified
                              ? "border-emerald-300 bg-[#ECFDF5] text-[#14532D]"
                              : "border-slate-300 bg-white text-slate-700"
                          }`}
                          title={
                            job.companyVerified
                              ? "Remover selo de empresa verificada"
                              : "Verificar empresa responsável"
                          }
                        >
                          <ShieldCheck className="w-3 h-3" />
                          {job.companyVerified ? "Verificada" : "Verificar"}
                        </button>
                      </form>

                      <Link
                        href={`/admin/vagas?edit=${job.id}`}
                        className="px-2.5 py-1 border border-[#D5C5AA]/35 text-[#F7DECA]"
                      >
                        Editar
                      </Link>
                      <Link
                        href={`/vagas/${job.slug}`}
                        className="px-2.5 py-1 border border-[#D5C5AA]/25 text-[#D5C5AA] flex items-center gap-1"
                        title="Abrir página pública"
                      >
                        <Eye className="w-3 h-3" />
                      </Link>
                      <a
                        href={`/talentos/api/admin/reports/job-pdf?jobId=${job.id}`}
                        className="px-2.5 py-1 border border-[#57552E] bg-[#030A06] text-[#F7DECA] flex items-center gap-1"
                        title="Gerar PDF da Vaga"
                      >
                        <FileDown className="w-3 h-3" />
                        PDF
                      </a>

                      {/* Publicar / Reabrir */}
                      {job.status !== "PUBLISHED" && (
                        <form action={updateJobStatusAdminAction}>
                          <input type="hidden" name="jobId" value={job.id} />
                          <input
                            type="hidden"
                            name="status"
                            value="PUBLISHED"
                          />
                          <button
                            type="submit"
                            className="px-2.5 py-1 border border-emerald-500/40 text-emerald-300 flex items-center gap-1 cursor-pointer"
                            title="Publicar / Reabrir vaga (exige Padrão Transparente)"
                          >
                            <PlayCircle className="w-3 h-3" />
                            Publicar
                          </button>
                        </form>
                      )}

                      {/* Pausar */}
                      {job.status === "PUBLISHED" && (
                        <form action={updateJobStatusAdminAction}>
                          <input type="hidden" name="jobId" value={job.id} />
                          <input type="hidden" name="status" value="PAUSED" />
                          <button
                            type="submit"
                            className="px-2.5 py-1 border border-amber-500/40 text-amber-200 flex items-center gap-1 cursor-pointer"
                            title="Pausar candidaturas"
                          >
                            <PauseCircle className="w-3 h-3" />
                            Pausar
                          </button>
                        </form>
                      )}

                      {/* Encerrar */}
                      {job.status !== "CLOSED" && (
                        <form action={updateJobStatusAdminAction}>
                          <input type="hidden" name="jobId" value={job.id} />
                          <input type="hidden" name="status" value="CLOSED" />
                          <button
                            type="submit"
                            className="px-2.5 py-1 border border-red-500/40 text-red-300 flex items-center gap-1 cursor-pointer"
                            title="Encerrar oportunidade"
                          >
                            <XCircle className="w-3 h-3" />
                            Encerrar
                          </button>
                        </form>
                      )}

                      {/* Arquivar */}
                      {job.status !== "ARCHIVED" && (
                        <form action={updateJobStatusAdminAction}>
                          <input type="hidden" name="jobId" value={job.id} />
                          <input type="hidden" name="status" value="ARCHIVED" />
                          <button
                            type="submit"
                            className="p-1 border border-[#D5C5AA]/20 text-[#D5C5AA]/70 cursor-pointer"
                            title="Arquivar vaga"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; aviso?: string; salvo?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-sm text-[#D5C5AA]/70">
          Carregando gestão de oportunidades transparentes...
        </div>
      }
    >
      <AdminJobsContent searchParamsPromise={searchParams} />
    </Suspense>
  );
}
