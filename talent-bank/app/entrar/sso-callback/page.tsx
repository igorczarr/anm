"use client";

import { useEffect, useRef } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

function extractIdentityFromClerk(clerk: ReturnType<typeof useClerk>) {
  const activeUser =
    clerk.user ||
    (
      clerk.client as unknown as {
        activeSessions?: {
          user?: {
            id?: string;
            firstName?: string | null;
            lastName?: string | null;
            primaryEmailAddress?: { emailAddress?: string };
            emailAddresses?: { emailAddress?: string }[];
          };
        }[];
      }
    )?.activeSessions?.[0]?.user;

  if (activeUser) {
    const email =
      activeUser.primaryEmailAddress?.emailAddress ||
      activeUser.emailAddresses?.[0]?.emailAddress ||
      "";
    const fullName =
      [activeUser.firstName, activeUser.lastName].filter(Boolean).join(" ") ||
      email.split("@")[0];
    if (email) {
      return { email, fullName, clerkId: activeUser.id || "" };
    }
  }

  const signUp = clerk.client?.signUp as unknown as {
    id?: string;
    createdUserId?: string | null;
    emailAddress?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;

  if (signUp?.emailAddress) {
    const email = signUp.emailAddress;
    const fullName =
      [signUp.firstName, signUp.lastName].filter(Boolean).join(" ") ||
      email.split("@")[0];
    return {
      email,
      fullName,
      clerkId: signUp.createdUserId || signUp.id || "",
    };
  }

  const signIn = clerk.client?.signIn as unknown as {
    id?: string;
    identifier?: string | null;
    userData?: { firstName?: string | null; lastName?: string | null };
  } | null;

  if (signIn?.identifier && signIn.identifier.includes("@")) {
    const email = signIn.identifier;
    const fullName =
      [signIn.userData?.firstName, signIn.userData?.lastName]
        .filter(Boolean)
        .join(" ") || email.split("@")[0];
    return { email, fullName, clerkId: signIn.id || "" };
  }

  return null;
}

export default function SSOCallbackPage() {
  const clerk = useClerk();
  const { isLoaded, user } = useUser();
  const handledRef = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    async function tryComplete() {
      if (handledRef.current) return;
      if (!clerk.loaded && !isLoaded) return;

      handledRef.current = true;
      if (timer) clearInterval(timer);

      let convite = "";
      try {
        const sp = new URLSearchParams(window.location.search);
        convite =
          sp.get("convite") ||
          sessionStorage.getItem("anm_invite_token") ||
          "";
      } catch {
        // Ignora
      }

      // 1. Se o usuário já está carregado no Clerk, sincroniza imediatamente
      const immediate = extractIdentityFromClerk(clerk);
      if (immediate?.email) {
        window.location.replace(
          `/talentos/api/auth/post-login?email=${encodeURIComponent(
            immediate.email
          )}&name=${encodeURIComponent(
            immediate.fullName
          )}&clerkId=${encodeURIComponent(immediate.clerkId)}${
            convite ? `&convite=${encodeURIComponent(convite)}` : ""
          }`
        );
        return;
      }

      // 2. Processa o callback OAuth do Clerk sem depender do router interno
      try {
        await clerk.handleRedirectCallback(
          {
            signInForceRedirectUrl: "/talentos/entrar/sso-sync",
            signUpForceRedirectUrl: "/talentos/entrar/sso-sync",
            continueSignUpUrl: "/talentos/entrar/sso-sync",
          },
          async (to: string) => {
            const afterNav = extractIdentityFromClerk(clerk);
            if (afterNav?.email) {
              window.location.replace(
                `/talentos/api/auth/post-login?email=${encodeURIComponent(
                  afterNav.email
                )}&name=${encodeURIComponent(
                  afterNav.fullName
                )}&clerkId=${encodeURIComponent(afterNav.clerkId)}${
                  convite ? `&convite=${encodeURIComponent(convite)}` : ""
                }`
              );
              return;
            }
            const target =
              to.startsWith("/talentos") || to.startsWith("http")
                ? to
                : `/talentos${to.startsWith("/") ? "" : "/"}${to}`;
            window.location.replace(target);
          }
        );
      } catch {
        // Continua para extração direta
      }

      // 3. Fallback imediato caso handleRedirectCallback resolva sem navegar
      const postCallback = extractIdentityFromClerk(clerk);
      if (postCallback?.email) {
        window.location.replace(
          `/talentos/api/auth/post-login?email=${encodeURIComponent(
            postCallback.email
          )}&name=${encodeURIComponent(
            postCallback.fullName
          )}&clerkId=${encodeURIComponent(postCallback.clerkId)}${
            convite ? `&convite=${encodeURIComponent(convite)}` : ""
          }`
        );
        return;
      }

      window.location.replace(
        `/talentos/entrar/sso-sync${
          convite ? `?convite=${encodeURIComponent(convite)}` : ""
        }`
      );
    }

    tryComplete();
    timer = setInterval(tryComplete, 200);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [clerk, isLoaded, user]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-[#14532D]" />
      <span className="text-xs font-medium text-slate-600">
        Concluindo autenticação social com segurança...
      </span>
    </div>
  );
}
