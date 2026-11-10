import { Suspense } from "react";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { LiveControlDesk } from "@/components/live-control-desk";

async function AdminOperacaoContent() {
  const admin = await getCurrentAdminUser();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#14532D]">
            Módulo 2 · Mesa de Operação ao Vivo & Motor de Fluxo (§4.2 e §9)
          </span>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl text-[#F7DECA]">
            Controle de Cronômetros, Transições de Pautas e Telão ARENA
          </h1>
          <p className="mt-1 text-xs text-[#D5C5AA]/80">
            Operador autenticado: <strong>{admin.fullName}</strong> ({admin.roleCode}).
            Referência temporal centralizada no servidor — imune a recarregamentos de página.
          </p>
        </div>
      </div>

      <LiveControlDesk />
    </div>
  );
}

export default function AdminOperacaoPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-xs text-[#D5C5AA]/70">
          Carregando Mesa de Operação ao Vivo...
        </div>
      }
    >
      <AdminOperacaoContent />
    </Suspense>
  );
}
