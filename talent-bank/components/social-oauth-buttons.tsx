"use client";

import { useClerk } from "@clerk/nextjs";
import { useState } from "react";
import { Loader2 } from "lucide-react";

type SocialStrategy = "oauth_google" | "oauth_microsoft" | "oauth_apple";

export function SocialOAuthButtons({
  inviteToken,
}: {
  inviteToken?: string;
}) {
  const clerk = useClerk();
  const [loadingProvider, setLoadingProvider] = useState<SocialStrategy | null>(
    null
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleOAuth(strategy: SocialStrategy) {
    setErrorMsg(null);
    setLoadingProvider(strategy);

    try {
      const origin = window.location.origin;
      const basePath = "/talentos";
      if (inviteToken) {
        try {
          sessionStorage.setItem("anm_invite_token", inviteToken);
        } catch {
          // Ignora se sessionStorage indisponível
        }
      }
      const redirectUrl = `${origin}${basePath}/entrar/sso-callback`;
      const redirectUrlComplete = inviteToken
        ? `${origin}${basePath}/entrar/sso-sync?convite=${encodeURIComponent(
            inviteToken
          )}`
        : `${origin}${basePath}/entrar/sso-sync`;

      if (!clerk.loaded || !clerk.client) {
        setErrorMsg("Aguarde 1 segundo enquanto o Clerk inicializa e tente novamente.");
        setLoadingProvider(null);
        return;
      }

      // Se o usuário já estiver autenticado no Clerk no navegador, sincroniza direto
      if (clerk.user) {
        const primaryEmail =
          clerk.user.primaryEmailAddress?.emailAddress ||
          clerk.user.emailAddresses?.[0]?.emailAddress ||
          "";
        const fullName =
          [clerk.user.firstName, clerk.user.lastName]
            .filter(Boolean)
            .join(" ") || primaryEmail.split("@")[0];

        window.location.href = `${basePath}/api/auth/post-login?email=${encodeURIComponent(
          primaryEmail
        )}&name=${encodeURIComponent(fullName)}&clerkId=${encodeURIComponent(
          clerk.user.id
        )}${inviteToken ? `&convite=${encodeURIComponent(inviteToken)}` : ""}`;
        return;
      }

      await clerk.client.signIn.authenticateWithRedirect({
        strategy,
        redirectUrl,
        redirectUrlComplete,
      });
    } catch (err: unknown) {
      const clerkErr = err as {
        errors?: { longMessage?: string; message?: string; code?: string }[];
        message?: string;
      };
      const firstError = clerkErr?.errors?.[0];
      const code = firstError?.code || "";
      const detail =
        firstError?.longMessage ||
        firstError?.message ||
        clerkErr?.message ||
        "";

      if (code === "session_exists") {
        window.location.href = "/talentos/api/auth/post-login";
        return;
      }

      setErrorMsg(
        detail
          ? `Clerk OAuth: ${detail}`
          : "Não foi possível iniciar o login social neste momento."
      );
      setLoadingProvider(null);
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Google / Gmail */}
        <button
          type="button"
          onClick={() => handleOAuth("oauth_google")}
          disabled={loadingProvider !== null}
          className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#D5C5AA]/30 bg-[#030A06] text-xs font-semibold text-[#F7DECA] hover:opacity-90 transition cursor-pointer"
        >
          {loadingProvider === "oauth_google" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"
              />
            </svg>
          )}
          <span>Google</span>
        </button>

        {/* Microsoft */}
        <button
          type="button"
          onClick={() => handleOAuth("oauth_microsoft")}
          disabled={loadingProvider !== null}
          className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#D5C5AA]/30 bg-[#030A06] text-xs font-semibold text-[#F7DECA] hover:opacity-90 transition cursor-pointer"
        >
          {loadingProvider === "oauth_microsoft" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 23 23">
              <path fill="#f35325" d="M1 1h10v10H1z" />
              <path fill="#81bc06" d="M12 1h10v10H12z" />
              <path fill="#05a6f0" d="M1 12h10v10H1z" />
              <path fill="#ffba08" d="M12 12h10v10H12z" />
            </svg>
          )}
          <span>Microsoft</span>
        </button>

        {/* Apple */}
        <button
          type="button"
          onClick={() => handleOAuth("oauth_apple")}
          disabled={loadingProvider !== null}
          className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-[#D5C5AA]/30 bg-[#030A06] text-xs font-semibold text-[#F7DECA] hover:opacity-90 transition cursor-pointer"
        >
          {loadingProvider === "oauth_apple" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
            </svg>
          )}
          <span>Apple</span>
        </button>
      </div>

      {errorMsg && (
        <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
