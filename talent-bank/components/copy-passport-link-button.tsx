"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

export function CopyPassportLinkButton({
  candidateId,
}: {
  candidateId: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://anm.vrtice.com.br";
    const fullUrl = `${origin}/talentos/passaporte/${candidateId}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="px-4 py-2.5 rounded-xl border border-[#14532D]/30 bg-[#ECFDF5] text-[#14532D] font-semibold text-xs hover:bg-[#D1FAE5] transition inline-flex items-center gap-2 cursor-pointer"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-700" />
          <span>Link do Passaporte Copiado!</span>
        </>
      ) : (
        <>
          <Share2 className="w-3.5 h-3.5" />
          <span>Copiar Link do Passaporte</span>
          <Copy className="w-3 h-3 opacity-70" />
        </>
      )}
    </button>
  );
}
