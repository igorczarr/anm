import Link from "next/link";
import { Suspense } from "react";
import { submitLgpdDataRequestAction } from "@/app/actions/lgpd";
import {
  CheckCircle2,
  FileCheck,
  Lock,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

function PrivacyRequestForm() {
  return (
    <form
      action={submitLgpdDataRequestAction}
      className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8 space-y-5"
    >
      <div className="flex items-center gap-2 text-[#F7DECA]">
        <UserCheck className="w-5 h-5" />
        <h2 className="font-display text-2xl">
          Canal do Titular de Dados (Solicitação de Correção, Revogação ou Exclusão)
        </h2>
      </div>
      <p className="text-xs text-[#D5C5AA]/80">
        Em conformidade com o Art. 18 da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), utilize este canal para registrar solicitações formais sobre seus dados pessoais e currículos.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
            Tipo de Solicitação
          </label>
          <select
            name="requestType"
            className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3.5 py-2.5 text-xs text-[#F7DECA]"
          >
            <option value="CORRECTION">
              Correção / Atualização de dados incompletos ou inexatos
            </option>
            <option value="REVOKE_SHARING">
              Revogação imediata de compartilhamento com empresas e base geral
            </option>
            <option value="DELETION">
              Eliminação / Arquivamento de dados pessoais e currículo
            </option>
            <option value="PORTABILITY">
              Confirmação de tratamento e exportação de dados
            </option>
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-[0.16em] text-[#D5C5AA]/80 mb-1.5">
            Detalhes ou Observações Adicionais
          </label>
          <input
            type="text"
            name="details"
            placeholder="Descreva sua solicitação ao Encarregado de Dados (DPO)..."
            className="w-full bg-[#030A06] border border-[#D5C5AA]/30 px-3.5 py-2.5 text-xs text-[#F7DECA]"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <span className="text-[11px] text-[#D5C5AA]/70">
          Sua solicitação gera protocolo auditável imediato no painel de governança.
        </span>
        <button
          type="submit"
          className="px-6 py-3 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs uppercase tracking-[0.2em] hover:bg-[#F7DECA] transition cursor-pointer"
        >
          Registrar Solicitação LGPD
        </button>
      </div>
    </form>
  );
}

export default function PrivacidadePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      {/* Cabeçalho */}
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8 space-y-3">
        <span className="text-[11px] uppercase tracking-[0.26em] text-[#D5C5AA]/70">
          Governança, Termos de Uso e Adequação à LGPD
        </span>
        <h1 className="font-display text-3xl sm:text-4xl text-[#F7DECA]">
          Política de Privacidade, Termos de Uso e Direitos do Titular
        </h1>
        <p className="text-xs sm:text-sm text-[#D5C5AA]/80 leading-relaxed">
          Versão vigente: <strong className="text-[#F7DECA]">v1.0-2026</strong> · Aplicável ao Banco de Talentos oficial da iniciativa <strong>A Nova Moeda — Economia da Solidão</strong>.
        </p>
      </div>

      {/* Os 3 Consentimentos Independentes (Seção 9) */}
      <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2 text-[#F7DECA]">
          <ShieldCheck className="w-5 h-5" />
          <h2 className="font-display text-2xl">
            Estrutura de Consentimentos Separados e Finalidades Transparentes
          </h2>
        </div>

        <p className="text-xs text-[#D5C5AA]/85 leading-relaxed">
          O compartilhamento irrestrito de currículos <strong>não é uma condição automática</strong> para criar uma conta. Nossos tratamentos são divididos em três bases independentes:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
          <div className="border border-[#D5C5AA]/20 bg-[#030A06] p-5 space-y-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#F7DECA] font-semibold">
              1. Funcionamento do Cadastro e Candidaturas
            </span>
            <p className="text-[#D5C5AA]/80 leading-relaxed">
              Tratamento estritamente necessário para manter sua conta ativa, estruturar seu currículo e processar as candidaturas que você próprio realizar na plataforma.
            </p>
          </div>

          <div className="border border-[#D5C5AA]/20 bg-[#030A06] p-5 space-y-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#F7DECA] font-semibold">
              2. Base de Talentos e Oportunidades Futuras
            </span>
            <p className="text-[#D5C5AA]/80 leading-relaxed">
              Autorização específica e opcional para integrar a base ativa de talentos após o evento de 17/11, permitindo que novas vagas compatíveis sejam apresentadas a você.
            </p>
          </div>

          <div className="border border-[#D5C5AA]/20 bg-[#030A06] p-5 space-y-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#F7DECA] font-semibold">
              3. Compartilhamento com Empresas Parceiras
            </span>
            <p className="text-[#D5C5AA]/80 leading-relaxed">
              Autorização granular para que recrutadores e empresas patrocinadoras/parceiras responsáveis por vagas específicas visualizem seus dados de contato e currículo.
            </p>
          </div>
        </div>
      </div>

      {/* Política de Retenção, Descarte e Controle de Acesso */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#F7DECA]">
            <Lock className="w-4 h-4" />
            <h3 className="font-display text-xl">
              Controle de Acesso aos Currículos
            </h3>
          </div>
          <p className="text-[#D5C5AA]/80 leading-relaxed">
            Os arquivos PDF e DOCX enviados são validados por assinatura binária, armazenados fora das tabelas do banco relacional e servidos exclusivamente mediante validação de sessão e permissão RBAC.
          </p>
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#F7DECA]">
            <FileCheck className="w-4 h-4" />
            <h3 className="font-display text-xl">
              Política de Retenção e Descarte
            </h3>
          </div>
          <p className="text-[#D5C5AA]/80 leading-relaxed">
            Os perfis permanecem ativos pelo ciclo de 24 meses após a última interação ou até revogação expressa pelo titular. Registros arquivados têm seu acesso restrito exclusivamente para auditoria legal.
          </p>
        </div>
      </div>

      <Suspense fallback={null}>
        <PrivacyRequestForm />
      </Suspense>

      <div className="flex items-center justify-between pt-4 border-t border-[#D5C5AA]/15 text-xs">
        <Link href="/conta" className="text-[#F7DECA] underline">
          Acessar minhas preferências de consentimento →
        </Link>
        <Link href="/" className="text-[#D5C5AA] hover:text-[#F7DECA]">
          Voltar à página inicial
        </Link>
      </div>
    </div>
  );
}
