import Link from "next/link";
import { Suspense } from "react";
import { getOrCreateCurrentCandidate } from "@/lib/current-candidate";
import { ResumeUploader } from "@/components/resume-uploader";
import {
  FileDown,
  FileText,
  ExternalLink,
  CheckCircle2,
  Clock,
} from "lucide-react";

async function ResumeManagerContent() {
  const { profile, completeness } = await getOrCreateCurrentCandidate();
  const activeResume = profile.resumes.find((r) => r.isActive);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8">
        <div>
          <span className="text-[11px] uppercase tracking-[0.24em] text-[#D5C5AA]/70">
            Gestão de Currículo
          </span>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl text-[#F7DECA]">
            Meu Currículo Profissional
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#D5C5AA]/80">
            Utilize o currículo estruturado automaticamente pelo portal ou anexe seu documento em PDF/DOCX.
          </p>
        </div>

        <a
          href="/talentos/api/resumes/pdf"
          className="px-5 py-3.5 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs uppercase tracking-[0.2em] hover:bg-[#F7DECA] transition flex items-center gap-2 self-start md:self-auto"
        >
          <FileDown className="w-4 h-4" />
          Baixar Currículo Oficial em PDF
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Opção 1 — Currículo construído no portal */}
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/70 p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 text-[10px] uppercase tracking-[0.2em] border border-[#57552E] bg-[#030A06] text-[#F7DECA]">
                Opção 1 · Estruturado no Portal
              </span>
              <span className="text-xs text-[#D5C5AA]/75">
                Completude: <strong className="text-[#F7DECA]">{completeness.percent}%</strong>
              </span>
            </div>

            <h2 className="mt-4 font-display text-2xl text-[#F7DECA]">
              Currículo Estruturado A Nova Moeda
            </h2>
            <p className="mt-2 text-xs text-[#D5C5AA]/80 leading-relaxed">
              O sistema organiza automaticamente suas informações pessoais, resumo, formação acadêmica, experiências, competências e idiomas em um documento PDF com padrão executivo.
            </p>

            {/* Prévia estruturada do Currículo */}
            <div className="mt-6 border border-[#D5C5AA]/20 bg-[#030A06] p-5 space-y-4">
              <div className="border-b border-[#D5C5AA]/15 pb-3">
                <h3 className="font-display text-lg text-[#F7DECA]">
                  {profile.fullName}
                </h3>
                <p className="text-xs text-[#D5C5AA]/85">
                  {profile.professionalTitle || "Título profissional não informado"}
                </p>
                <p className="text-[11px] text-[#D5C5AA]/65 mt-1">
                  {[profile.email, profile.phone, profile.city, profile.state]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>

              {profile.summary && (
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#F7DECA] block">
                    Apresentação
                  </span>
                  <p className="text-xs text-[#D5C5AA]/80 mt-1 line-clamp-3">
                    {profile.summary}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#D5C5AA]/15 text-center">
                <div className="p-2 bg-[#0A150D]">
                  <span className="block font-display text-lg text-[#F7DECA]">
                    {profile.educations.length}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-[#D5C5AA]/70">
                    Formações
                  </span>
                </div>
                <div className="p-2 bg-[#0A150D]">
                  <span className="block font-display text-lg text-[#F7DECA]">
                    {profile.experiences.length}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-[#D5C5AA]/70">
                    Experiências
                  </span>
                </div>
                <div className="p-2 bg-[#0A150D]">
                  <span className="block font-display text-lg text-[#F7DECA]">
                    {profile.skills.length}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.14em] text-[#D5C5AA]/70">
                    Competências
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[#D5C5AA]/15">
            <a
              href="/talentos/api/resumes/pdf"
              className="px-4 py-2.5 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs uppercase tracking-[0.18em] hover:bg-[#F7DECA] transition flex items-center gap-1.5"
            >
              <FileDown className="w-3.5 h-3.5" />
              Gerar PDF Agora
            </a>
            <Link
              href="/perfil"
              className="px-4 py-2.5 border border-[#D5C5AA]/40 text-xs uppercase tracking-[0.18em] text-[#F7DECA] hover:border-[#F7DECA] transition"
            >
              Atualizar Dados do Perfil
            </Link>
          </div>
        </div>

        {/* Opção 2 — Upload de currículo PDF/DOCX */}
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/70 p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 text-[10px] uppercase tracking-[0.2em] border border-[#57552E] bg-[#030A06] text-[#F7DECA]">
                Opção 2 · Upload de Arquivo (PDF / DOCX)
              </span>
              {activeResume && (
                <span className="text-xs text-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Versão {activeResume.version} Ativa
                </span>
              )}
            </div>

            <h2 className="font-display text-2xl text-[#F7DECA]">
              Anexar ou Substituir Documento
            </h2>
            <p className="text-xs text-[#D5C5AA]/80 leading-relaxed">
              Envie seu currículo em formato PDF ou DOCX. O arquivo é validado e salvo fora do banco relacional com controle estrito de acesso e histórico de versões.
            </p>

            <ResumeUploader />

            {/* Documento ativo e histórico de atualizações */}
            {profile.resumes.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-[#D5C5AA]/15">
                <span className="text-xs uppercase tracking-[0.18em] text-[#F7DECA] block">
                  Arquivos Enviados e Registro de Atualização
                </span>
                {profile.resumes.map((r) => (
                  <div
                    key={r.id}
                    className="border border-[#D5C5AA]/20 bg-[#030A06] p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-[#F7DECA] shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-[#F7DECA]">
                          {r.fileName}{" "}
                          <span className="text-[10px] px-2 py-0.5 ml-1 border border-[#57552E] bg-[#0A150D]">
                            v{r.version} {r.isActive ? "· Atual" : "· Histórico"}
                          </span>
                        </p>
                        <p className="text-[11px] text-[#D5C5AA]/65 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          Atualizado em{" "}
                          {new Date(r.updatedAt).toLocaleString("pt-BR")} ·{" "}
                          {(r.fileSize / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>

                    <a
                      href={`/talentos/api/resumes/${r.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 border border-[#D5C5AA]/40 text-[11px] uppercase tracking-[0.16em] text-[#F7DECA] hover:border-[#F7DECA] flex items-center gap-1 shrink-0"
                    >
                      Visualizar <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResumePage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-sm text-[#D5C5AA]/70">
          Carregando módulo de currículo...
        </div>
      }
    >
      <ResumeManagerContent />
    </Suspense>
  );
}
