import Link from "next/link";
import { Suspense } from "react";
import { unifiedLoginAction } from "@/app/actions/auth";
import { SocialOAuthButtons } from "@/components/social-oauth-buttons";
import { AlertTriangle, ArrowRight, Lock } from "lucide-react";

async function UnifiedLoginForm({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ error?: string }>;
}) {
  const { error } = await searchParamsPromise;

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md border border-[#D5C5AA]/30 bg-[#0A150D]/95 p-8 space-y-6 rounded-2xl">
        <div className="text-center space-y-2">
          <span className="text-xs font-semibold text-emerald-600">
            Banco de Talentos · A Nova Moeda
          </span>
          <h1 className="font-bold text-2xl sm:text-3xl text-[#F7DECA]">
            Acessar minha conta
          </h1>
          <p className="text-xs text-[#D5C5AA]/80">
            Continue com sua conta Google, Microsoft ou Apple, ou entre com seu e-mail e senha.
          </p>
        </div>

        {/* Botões OAuth do Clerk: Gmail (Google), Microsoft e Apple */}
        <SocialOAuthButtons />

        <div className="relative flex items-center justify-center">
          <div className="border-t border-[#D5C5AA]/20 w-full" />
          <span className="bg-[#0A150D] px-3 text-[11px] font-medium text-[#D5C5AA]/70">
            ou com e-mail
          </span>
          <div className="border-t border-[#D5C5AA]/20 w-full" />
        </div>

        {error && (
          <div className="p-3.5 border border-red-500/40 bg-red-950/30 text-xs text-red-200 flex items-center gap-2 rounded-xl">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {error === "credenciais_invalidas"
                ? "E-mail ou senha inválidos. Verifique os dados informados."
                : "Preencha seu e-mail e senha para entrar."}
            </span>
          </div>
        )}

        <form action={unifiedLoginAction} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#D5C5AA]/85 mb-1.5">
              E-mail
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="seu@email.com.br"
              className="w-full bg-[#030A06] border border-[#D5C5AA]/35 px-3.5 py-2.5 text-sm text-[#F7DECA] focus:border-[#F7DECA] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#D5C5AA]/85 mb-1.5">
              Senha
            </label>
            <input
              type="password"
              name="password"
              required
              placeholder="••••••••"
              className="w-full bg-[#030A06] border border-[#D5C5AA]/35 px-3.5 py-2.5 text-sm text-[#F7DECA] focus:border-[#F7DECA] outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs hover:opacity-95 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            Entrar na Plataforma
          </button>
        </form>

        <div className="border-t border-[#D5C5AA]/15 pt-4 text-center">
          <Link
            href="/cadastro"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#F7DECA] hover:underline"
          >
            Ainda não tem conta? Criar meu perfil <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center text-sm text-[#D5C5AA]/70">
          Carregando autenticação...
        </div>
      }
    >
      <UnifiedLoginForm searchParamsPromise={searchParams} />
    </Suspense>
  );
}
