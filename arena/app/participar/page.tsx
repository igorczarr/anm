"use client";

import { useArenaSync } from "@/hooks/use-arena-sync";
import { MessageSquarePlus, Radio, Smartphone, Vote } from "lucide-react";

export default function ParticiparPage() {
  const { snapshot, connected } = useArenaSync();

  return (
    <div className="max-w-md mx-auto px-4 py-8 space-y-6">
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/95 p-6 rounded-2xl space-y-4 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/30 text-emerald-300 text-xs font-semibold">
          <Smartphone className="w-3.5 h-3.5" />
          Interface 03 · Participante Mobile
        </span>
        <h1 className="font-display text-2xl text-[#F7DECA]">
          {snapshot?.event.name || "A Nova Moeda"} —{" "}
          {snapshot?.event.theme || "Economia da Solidão"}
        </h1>
        <p className="text-xs text-[#D5C5AA]/80 leading-relaxed">
          Você faz parte da Arena. Envie perguntas, participe das votações e
          ajude a construir essa discussão.
        </p>

        <div className="border border-[#D5C5AA]/20 bg-[#030A06] p-4 rounded-xl text-left text-xs space-y-1">
          <div className="flex items-center justify-between text-[#D5C5AA]/70">
            <span>Momento atual na Arena:</span>
            <span className="font-mono text-[11px]">
              {connected ? `Ao vivo · seq #${snapshot?.seq ?? 1}` : "Reconectando..."}
            </span>
          </div>
          <div className="font-bold text-sm text-[#F7DECA] flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-[#14532D]" />
            {snapshot?.activeStep?.title || "Aguardando início do evento"}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
          <div className="border border-[#D5C5AA]/20 bg-[#030A06] p-3.5 rounded-xl flex flex-col items-center gap-1.5 text-[#F7DECA]">
            <MessageSquarePlus className="w-5 h-5 text-[#14532D]" />
            <span className="font-semibold">Enviar Pergunta</span>
            <span className="text-[11px] text-[#D5C5AA]/70">
              Até {snapshot?.event.questionCharLimit ?? 400} caracteres
            </span>
          </div>
          <div className="border border-[#D5C5AA]/20 bg-[#030A06] p-3.5 rounded-xl flex flex-col items-center gap-1.5 text-[#F7DECA]">
            <Vote className="w-5 h-5 text-[#14532D]" />
            <span className="font-semibold">Votação Ativa</span>
            <span className="text-[11px] text-[#D5C5AA]/70">
              6 rodadas de debate
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
