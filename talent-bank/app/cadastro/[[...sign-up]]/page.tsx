import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { unifiedRegisterAction } from "@/app/actions/auth";
import { SocialOAuthButtons } from "@/components/social-oauth-buttons";
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  ShieldCheck,
  UserPlus,
} from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  campos_obrigatorios: "Preencha seu nome completo, e-mail e senha.",
  senhas_diferentes: "A confirmação de senha não confere com a senha digitada.",
  termos_obrigatorios:
    "É necessário aceitar os Termos de Uso e Política de Privacidade para criar sua conta.",
  email_ja_cadastrado: "Este e-mail já possui cadastro. Acesse sua conta pelo login.",
  convite_invalido_ou_expirado:
    "O link de convite de recrutador é inválido, já foi utilizado ou expirou.",
  erro_interno:
    "Não foi possível concluir o cadastro agora. Verifique os dados e tente novamente em instantes.",
};

async function UnifiedSignUpForm({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ convite?: string; error?: string }>;
}) {
  const resolvedParams = (await searchParamsPromise) || {};
  const convite = resolvedParams.convite;
  const error = resolvedParams.error;
  const inviteToken = (convite || "").trim();

  let invite = null;
  if (inviteToken) {
    try {
      invite = await prisma.recruiterInvite.findUnique({
        where: { token: inviteToken },
      });
    } catch {
      invite = null;
    }
  }

  const isValidRecruiterInvite = Boolean(
    invite && !invite.usedAt && new Date(invite.expiresAt) >= new Date()
  );

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg border border-[#D5C5AA]/30 bg-[#0A150D]/95 p-8 space-y-6 rounded-2xl">
        <div className="text-center space-y-2">
          <span className="text-xs font-semibold text-emerald-600">
            Banco de Talentos · A Nova Moeda
          </span>
          <h1 className="font-bold text-2xl sm:text-3xl text-[#F7DECA]">
            {isValidRecruiterInvite
              ? "Cadastro Oficial de Recrutador"
              : "Criar meu perfil"}
          </h1>
          <p className="text-xs text-[#D5C5AA]/80">
            {isValidRecruiterInvite
              ? "Você recebeu um convite oficial da administração. Ao concluir seu cadastro, sua conta entrará imediatamente com acesso de Recrutador."
              : "Conecte-se em 1 clique com Google, Microsoft ou Apple, ou cadastre seu e-mail."}
          </p>
        </div>

        {isValidRecruiterInvite && (
          <div className="p-4 border border-emerald-500/40 bg-emerald-950/30 text-xs text-emerald-200 flex items-start gap-2.5 rounded-xl">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-300" />
            <div>
              <strong>Convite Verificado · Acesso de Recrutador</strong>
              {invite?.companyName && (
                <p className="mt-0.5">
                  Organização: <strong>{invite.companyName}</strong>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Botões OAuth do Clerk: Google (Gmail), Microsoft e Apple */}
        <SocialOAuthButtons inviteToken={inviteToken || undefined} />

        <div className="relative flex items-center justify-center">
          <div className="border-t border-[#D5C5AA]/20 w-full" />
          <span className="bg-[#0A150D] px-3 text-[11px] font-medium text-[#D5C5AA]/70">
            ou preencha seus dados
          </span>
          <div className="border-t border-[#D5C5AA]/20 w-full" />
        </div>

        {error && (
          <div className="p-3.5 border border-red-500/40 bg-red-950/30 text-xs text-red-200 flex items-center gap-2 rounded-xl">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{ERROR_MESSAGES[error] || "Erro ao realizar cadastro."}</span>
          </div>
        )}

        <form action={unifiedRegisterAction} className="space-y-4">
          {isValidRecruiterInvite && (
            <input type="hidden" name="inviteToken" value={inviteToken} />
          )}

          <div>
            <label className="block text-xs font-semibold text-[#D5C5AA]/85 mb-1.5">
              Nome Completo *
            </label>
            <input
              type="text"
              name="fullName"
              required
              placeholder="Seu nome completo"
              className="w-full bg-[#030A06] border border-[#D5C5AA]/35 px-3.5 py-2.5 text-sm text-[#F7DECA] focus:border-[#F7DECA] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#D5C5AA]/85 mb-1.5">
              E-mail *
            </label>
            <input
              type="email"
              name="email"
              required
              defaultValue={invite?.email || ""}
              placeholder="seu@email.com.br"
              className="w-full bg-[#030A06] border border-[#D5C5AA]/35 px-3.5 py-2.5 text-sm text-[#F7DECA] focus:border-[#F7DECA] outline-none"
            />
          </div>

          {isValidRecruiterInvite && (
            <div>
              <label className="block text-xs font-semibold text-[#D5C5AA]/85 mb-1.5">
                Empresa ou Organização Recrutadora
              </label>
              <input
                type="text"
                name="companyName"
                defaultValue={invite?.companyName || ""}
                placeholder="Nome da empresa parceira"
                className="w-full bg-[#030A06] border border-[#D5C5AA]/35 px-3.5 py-2.5 text-sm text-[#F7DECA] focus:border-[#F7DECA] outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#D5C5AA]/85 mb-1.5">
                Senha *
              </label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                className="w-full bg-[#030A06] border border-[#D5C5AA]/35 px-3.5 py-2.5 text-sm text-[#F7DECA] focus:border-[#F7DECA] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#D5C5AA]/85 mb-1.5">
                Confirmar Senha *
              </label>
              <input
                type="password"
                name="confirmPassword"
                required
                minLength={6}
                placeholder="Repita a senha"
                className="w-full bg-[#030A06] border border-[#D5C5AA]/35 px-3.5 py-2.5 text-sm text-[#F7DECA] focus:border-[#F7DECA] outline-none"
              />
            </div>
          </div>

          <div className="border border-[#57552E] bg-[#030A06] p-4 space-y-2.5 text-xs rounded-xl">
            <div className="flex items-center gap-1.5 text-[#F7DECA] font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Termos e Consentimentos LGPD</span>
            </div>

            <label className="flex items-start gap-2.5 text-[#D5C5AA]/90 cursor-pointer">
              <input
                type="checkbox"
                name="acceptTerms"
                required
                defaultChecked
                className="mt-0.5 accent-[#14532D]"
              />
              <span>
                Li e aceito os{" "}
                <Link href="/privacidade" className="text-[#F7DECA] underline">
                  Termos de Uso e Política de Privacidade
                </Link>{" "}
                (Obrigatório). *
              </span>
            </label>

            {!isValidRecruiterInvite && (
              <>
                <label className="flex items-start gap-2.5 text-[#D5C5AA]/85 cursor-pointer">
                  <input
                    type="checkbox"
                    name="allowPool"
                    defaultChecked
                    className="mt-0.5 accent-[#14532D]"
                  />
                  <span>
                    Autorizo integrar a base geral de talentos A Nova Moeda para receber oportunidades futuras (Opcional).
                  </span>
                </label>

                <label className="flex items-start gap-2.5 text-[#D5C5AA]/85 cursor-pointer">
                  <input
                    type="checkbox"
                    name="allowSharing"
                    defaultChecked
                    className="mt-0.5 accent-[#14532D]"
                  />
                  <span>
                    Autorizo o compartilhamento do meu perfil e currículo com empresas e recrutadores parceiros (Opcional).
                  </span>
                </label>
              </>
            )}
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs hover:opacity-95 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            {isValidRecruiterInvite ? (
              <>
                <Briefcase className="w-4 h-4" />
                Concluir Cadastro como Recrutador
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Criar Conta e Construir Perfil
              </>
            )}
          </button>
        </form>

        <div className="border-t border-[#D5C5AA]/15 pt-4 text-center">
          <Link
            href="/entrar"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F7DECA] hover:underline"
          >
            Já possui uma conta? Acessar agora <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ convite?: string; error?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center text-sm text-[#D5C5AA]/70">
          Carregando cadastro...
        </div>
      }
    >
      <UnifiedSignUpForm searchParamsPromise={searchParams} />
    </Suspense>
  );
}
