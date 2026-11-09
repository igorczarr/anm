import Link from "next/link";
import { Suspense } from "react";
import { getOrCreateCurrentCandidate } from "@/lib/current-candidate";
import { ShieldCheck, KeyRound, Clock, FileCheck } from "lucide-react";

async function AccountSettingsContent() {
  const { user, profile, consentRecords } = await getOrCreateCurrentCandidate();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8">
        <span className="text-[11px] uppercase tracking-[0.24em] text-[#D5C5AA]/70">
          Conta, Segurança e Privacidade (LGPD)
        </span>
        <h1 className="mt-1 font-display text-3xl text-[#F7DECA]">
          Configurações da Conta & Consentimentos
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-[#D5C5AA]/80">
          Consulte seus dados de acesso, histórico auditável de consentimentos LGPD e gerencie suas preferências de privacidade.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 space-y-4">
          <div className="flex items-center gap-2 text-[#F7DECA]">
            <KeyRound className="w-4 h-4" />
            <h2 className="font-display text-lg">Dados de Acesso</h2>
          </div>
          <div className="space-y-2 text-xs text-[#D5C5AA]/85">
            <p>
              <strong>Nome:</strong> {user.fullName}
            </p>
            <p>
              <strong>E-mail autenticado:</strong> {user.email}
            </p>
            <p>
              <strong>Papel RBAC:</strong> {user.role}
            </p>
            <p>
              <strong>Status da Conta:</strong> {user.status}
            </p>
          </div>
          <div className="pt-3 border-t border-[#D5C5AA]/15 flex gap-3">
            <Link
              href="/perfil"
              className="px-4 py-2 border border-[#D5C5AA]/40 text-xs uppercase tracking-[0.16em] text-[#F7DECA] hover:border-[#F7DECA]"
            >
              Editar Perfil e Consentimentos
            </Link>
          </div>
        </div>

        <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 space-y-4">
          <div className="flex items-center gap-2 text-[#F7DECA]">
            <ShieldCheck className="w-4 h-4" />
            <h2 className="font-display text-lg">Status Atual de Privacidade</h2>
          </div>
          <div className="space-y-2 text-xs text-[#D5C5AA]/85">
            <p>
              <strong>1. Tratamento Operacional da Conta:</strong>{" "}
              <span className="text-emerald-300">Ativo (Termos v1.0-2026)</span>
            </p>
            <p>
              <strong>2. Integrar Base de Talentos para Oportunidades Futuras:</strong>{" "}
              <span className="text-[#F7DECA]">
                {profile.isPublicInPool ? "Autorizado" : "Não autorizado"}
              </span>
            </p>
            <p>
              <strong>3. Compartilhamento com Empresas Parceiras:</strong>{" "}
              <span className="text-[#F7DECA]">
                {profile.allowCompanySharing ? "Autorizado" : "Restrito"}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Registro auditável de consentimentos */}
      <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/60 p-6 space-y-4">
        <div className="flex items-center gap-2 text-[#F7DECA]">
          <FileCheck className="w-4 h-4" />
          <h2 className="font-display text-lg">
            Histórico de Aceite e Consentimentos (LGPD)
          </h2>
        </div>

        <div className="space-y-2">
          {consentRecords.map((rec) => (
            <div
              key={rec.id}
              className="border border-[#D5C5AA]/15 bg-[#030A06] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div>
                <span className="font-semibold text-[#F7DECA]">
                  {rec.purpose}
                </span>{" "}
                · Versão: {rec.termsVersion}
              </div>
              <div className="flex items-center gap-3 text-[#D5C5AA]/75">
                <span
                  className={
                    rec.granted ? "text-emerald-300" : "text-amber-300"
                  }
                >
                  {rec.granted ? "Concedido" : "Revogado"}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(rec.createdAt).toLocaleString("pt-BR")}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto px-4 py-12 text-sm text-[#D5C5AA]/70">
          Carregando configurações da conta...
        </div>
      }
    >
      <AccountSettingsContent />
    </Suspense>
  );
}
