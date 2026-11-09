"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";

export default function SSOSyncPage() {
  const { isLoaded, isSignedIn, user } = useUser();

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !user) {
      window.location.href = "/entrar";
      return;
    }

    const email =
      user.primaryEmailAddress?.emailAddress ||
      user.emailAddresses?.[0]?.emailAddress ||
      "";
    const fullName =
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      email.split("@")[0];

    const params = new URLSearchParams(window.location.search);
    const convite = params.get("convite") || "";

    window.location.href = `/api/auth/post-login?email=${encodeURIComponent(
      email
    )}&name=${encodeURIComponent(fullName)}&clerkId=${encodeURIComponent(
      user.id
    )}${convite ? `&convite=${encodeURIComponent(convite)}` : ""}`;
  }, [isLoaded, isSignedIn, user]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-[#14532D]" />
      <span className="text-xs font-medium text-slate-600">
        Sincronizando seu perfil no Banco de Talentos...
      </span>
    </div>
  );
}
