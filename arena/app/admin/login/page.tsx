import { Suspense } from "react";
import { loginAdminAction } from "@/app/actions/admin-login";
import { Lock, ShieldCheck, AlertTriangle } from "lucide-react";

async function AdminLoginForm({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ error?: string }>;
}) {
  const { error } = await searchParamsPromise;

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md border border-[#D5C5AA]/30 bg-[#0A150D]/95 p-8 space-y-6 rounded-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl border border-[#57552E] bg-[#030A06] flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <span className="block text-xs font-semibold text-emerald-600">
            Ambiente Restrito · Central de Comando RBAC
          </span>
          <h1 className="font-bold text-2xl sm:text-3xl text-[#F7DECA]">
            Acesso Administrativo
          </h1>
          <p className="text-xs text-[#D5C5AA]/75">
            Entre com as credenciais da Organização da Arena A Nova Moeda (UEFS).
          </p>
        </div>

        {error && (
          <div className="p-3 border border-red-500/40 bg-red-950/30 text-xs text-red-200 flex items-center gap-2 rounded-xl">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>E-mail ou senha administrativa inválidos ou acesso revogado.</span>
          </div>
        )}

        <form action={loginAdminAction} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#D5C5AA]/80 mb-1.5">
              E-mail Administrativo
            </label>
            <input
              type="email"
              name="email"
              required
              defaultValue="admin@anovamoeda.com.br"
              placeholder="admin@anovamoeda.com.br"
              className="w-full bg-[#030A06] border border-[#D5C5AA]/35 px-3.5 py-2.5 text-sm text-[#F7DECA] focus:border-[#F7DECA] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#D5C5AA]/80 mb-1.5">
              Senha de Acesso
            </label>
            <input
              type="password"
              name="password"
              required
              defaultValue="ANM@Arena2026!"
              placeholder="••••••••"
              className="w-full bg-[#030A06] border border-[#D5C5AA]/35 px-3.5 py-2.5 text-sm text-[#F7DECA] focus:border-[#F7DECA] outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-[#D5C5AA] text-[#030A06] font-semibold text-xs hover:opacity-95 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            Entrar na Central de Comando
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[75vh] flex items-center justify-center text-xs text-[#D5C5AA]/70">
          Carregando autenticação administrativa...
        </div>
      }
    >
      <AdminLoginForm searchParamsPromise={searchParams} />
    </Suspense>
  );
}
