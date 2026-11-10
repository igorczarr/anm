import { Suspense } from "react";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { Users } from "lucide-react";

async function AdminParticipantesContent() {
  await getCurrentAdminUser();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8 rounded-2xl space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#14532D] flex items-center gap-1.5">
          <Users className="w-4 h-4" />
          Módulo 6 · Participantes e Conexões
        </span>
        <h1 className="font-display text-2xl sm:text-3xl text-[#F7DECA]">
          Monitoramento de Sessões Anônimas e QR Code da Plateia
        </h1>
        <p className="text-xs sm:text-sm text-[#D5C5AA]/80">
          Estrutura de `ParticipantSession` configurada no banco de dados.
        </p>
      </div>
    </div>
  );
}

export default function AdminParticipantesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs">Carregando...</div>}>
      <AdminParticipantesContent />
    </Suspense>
  );
}
