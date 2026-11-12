"use client";

import { useEffect } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

export default function SSOSyncPage() {
  const clerk = useClerk();
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    if (!isLoaded && !clerk.loaded) return;

    const signUp = clerk.client?.signUp as unknown as {
      id?: string;
      createdUserId?: string | null;
      emailAddress?: string | null;
      firstName?: string | null;
      lastName?: string | null;
    } | null;

    const signIn = clerk.client?.signIn as unknown as {
      id?: string;
      identifier?: string | null;
      userData?: { firstName?: string | null; lastName?: string | null };
    } | null;

    const email =
      user?.primaryEmailAddress?.emailAddress ||
      user?.emailAddresses?.[0]?.emailAddress ||
      signUp?.emailAddress ||
      (signIn?.identifier?.includes("@") ? signIn.identifier : "") ||
      "";

    if (!email) {
      if (isLoaded && !isSignedIn) {
        window.location.replace("/talentos/entrar");
      }
      return;
    }

    const fullName =
      [
        user?.firstName || signUp?.firstName || signIn?.userData?.firstName,
        user?.lastName || signUp?.lastName || signIn?.userData?.lastName,
      ]
        .filter(Boolean)
        .join(" ") || email.split("@")[0];

    const clerkId =
      user?.id || signUp?.createdUserId || signUp?.id || signIn?.id || "";

    const params = new URLSearchParams(window.location.search);
    let convite = params.get("convite") || "";
    if (!convite) {
      try {
        convite = sessionStorage.getItem("anm_invite_token") || "";
      } catch {
        // Ignora
      }
    }

    window.location.replace(
      `/talentos/api/auth/post-login?email=${encodeURIComponent(
        email
      )}&name=${encodeURIComponent(fullName)}&clerkId=${encodeURIComponent(
        clerkId
      )}${convite ? `&convite=${encodeURIComponent(convite)}` : ""}`
    );
  }, [clerk, isLoaded, isSignedIn, user]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-[#14532D]" />
      <span className="text-xs font-medium text-slate-600">
        Sincronizando seu perfil no Banco de Talentos...
      </span>
    </div>
  );
}
