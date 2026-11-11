import { Suspense } from "react";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { PollsDesk } from "@/components/polls-desk";
import { Vote } from "lucide-react";

async function AdminVotacoesContent() {
  await getCurrentAdminUser();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8 rounded-2xl">
        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
          <Vote className="w-4 h-4" />
          Módulo 5 · Votação da Mesa-Redonda &amp; Protocolo de Desempate
        </span>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl text-[#F7DECA]">
          Escolha da Questão Vencedora (Aberta na Pauta 5 · 3 Questões Candidatas)
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#D5C5AA]/80">
          O sistema garante 1 voto por participante (com permissão de alteração
          enquanto aberta), oculta parciais no telão até o encerramento e
          suporta rodada de desempate de 2 minutos ou decisão justificada da
          mediação.
        </p>
      </div>

      <PollsDesk />
    </div>
  );
}

export default function AdminVotacoesPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-xs text-[#D5C5AA]/70">
          Carregando painel de votações...
        </div>
      }
    >
      <AdminVotacoesContent />
    </Suspense>
  );
}
