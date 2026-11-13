"use client";

import { useState } from "react";
import { loginAdminAction } from "@/app/actions/admin-login";
import { ThemeToggle } from "@/components/theme-toggle";
import { Lock, ShieldCheck, AlertTriangle, Loader2, ArrowRight } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("admin@anovamoeda.com.br");
  const [password, setPassword] = useState("ANM@Arena2026!");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        window.location.href = data.redirectTo || "/admin/operacao";
        return;
      }

      setErrorMessage(
        data?.error || "E-mail ou senha administrativa inválidos ou acesso revogado."
      );
      setLoading(false);
    } catch (err) {
      console.error("Falha ao autenticar via API:", err);
      // Fallback defensivo para submissão tradicional caso a rede local ou proxy intercepte fetch
      const form = e.currentTarget;
      form.submit();
    }
  }

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-8 relative">
      {/* Botão de Alternância de Tema no Canto Superior */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle className="text-xs" />
      </div>

      <div className="w-full max-w-md border border-[#D5C5AA]/30 bg-[#0A150D]/95 p-6 sm:p-8 space-y-6 rounded-2xl shadow-2xl backdrop-blur-sm">
        {/* Cabeçalho Institucional */}
        <div className="text-center space-y-2.5">
          <div className="w-14 h-14 mx-auto rounded-2xl border border-emerald-500/40 bg-[#030A06] flex items-center justify-center p-2 shadow-lg">
            <img
              src="/img/logo.png"
              alt="A Nova Moeda"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold tracking-wide">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Mesa Diretora · Central de Comando</span>
          </div>
          <h1 className="font-bold text-2xl sm:text-3xl text-[#F7DECA] tracking-tight">
            Acesso Administrativo
          </h1>
          <p className="text-xs text-[#D5C5AA]/75 leading-relaxed">
            Entre com as credenciais da Organização da Arena A Nova Moeda (UEFS).
          </p>
        </div>

        {/* Alerta de Erro Visual */}
        {errorMessage && (
          <div className="p-3.5 border border-red-500/40 bg-red-950/40 text-xs text-red-200 flex items-start gap-2.5 rounded-xl animate-shake">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Formulário com Autenticação Híbrida (REST API + Server Action Fallback) */}
        <form
          action={loginAdminAction}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-[#D5C5AA]/85 mb-1.5">
              E-mail Administrativo
            </label>
            <input
              type="email"
              name="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@anovamoeda.com.br"
              className="w-full bg-[#030A06] border border-[#D5C5AA]/35 rounded-xl px-3.5 py-2.5 text-sm text-[#F7DECA] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 outline-none transition"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#D5C5AA]/85 mb-1.5">
              Senha de Acesso
            </label>
            <input
              type="password"
              name="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#030A06] border border-[#D5C5AA]/35 rounded-xl px-3.5 py-2.5 text-sm text-[#F7DECA] focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/40 outline-none transition"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-[#D5C5AA] text-[#030A06] font-semibold text-xs hover:bg-[#c9b798] active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-800" />
                <span>Autenticando na Mesa Diretora...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Entrar na Central de Comando</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-60 ml-1" />
              </>
            )}
          </button>
        </form>

        {/* Rodapé de Segurança e Credenciais Padrão */}
        <div className="pt-2 border-t border-white/[0.08] text-center space-y-1">
          <div className="text-[11px] text-[#D5C5AA]/50">
            Ambiente Seguro · Sessão Criptografada AES/HMAC
          </div>
          <div className="text-[10px] text-[#D5C5AA]/40">
            A Nova Moeda: Economia da Solidão · UEFS 2026
          </div>
        </div>
      </div>
    </div>
  );
}
