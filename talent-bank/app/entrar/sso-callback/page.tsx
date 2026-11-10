"use client";

import { useEffect } from "react";
import { useClerk } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

export default function SSOCallbackPage() {
  const clerk = useClerk();

  useEffect(() => {
    if (!clerk.loaded) return;

    async function completeRedirect() {
      try {
        await clerk.handleRedirectCallback({
          signInForceRedirectUrl: "/talentos/entrar/sso-sync",
          signUpForceRedirectUrl: "/talentos/entrar/sso-sync",
        });
      } catch {
        window.location.href = "/talentos/entrar/sso-sync";
      }
    }

    completeRedirect();
  }, [clerk]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-[#14532D]" />
      <span className="text-xs font-medium text-slate-600">
        Concluindo autenticação social com segurança...
      </span>
    </div>
  );
}
