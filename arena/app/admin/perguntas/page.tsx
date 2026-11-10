import { Suspense } from "react";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { CurationDesk } from "@/components/curation-desk";
import { MessageSquareMore } from "lucide-react";

async function AdminPerguntasContent() {
  const admin = await getCurrentAdminUser();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8 rounded-2xl">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#14532D] flex items-center gap-1.5">
          <MessageSquareMore className="w-4 h-4" />
          Módulo 4 · Painel de Curadoria e Seleção de Perguntas (§5)
        </span>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl text-[#F7DECA]">
          Moderação em Tempo Real, Pergunta Principal e Reserva
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#D5C5AA]/80">
          Curador(a): <strong>{admin.fullName}</strong>. Nenhuma pergunta enviada
          pelo público aparece no telão sem aprovação explícita.
        </p>
      </div>

      <CurationDesk />
    </div>
  );
}

export default function AdminPerguntasPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-xs text-[#D5C5AA]/70">
          Carregando painel de curadoria...
        </div>
      }
    >
      <AdminPerguntasContent />
    </Suspense>
  );
}
