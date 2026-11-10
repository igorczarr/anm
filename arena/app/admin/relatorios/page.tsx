import { Suspense } from "react";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { FileBarChart2 } from "lucide-react";

async function AdminRelatoriosContent() {
  await getCurrentAdminUser();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8 rounded-2xl space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#14532D] flex items-center gap-1.5">
          <FileBarChart2 className="w-4 h-4" />
          Módulo 7 · Relatórios e Indicadores Pós-Evento (§15)
        </span>
        <h1 className="font-display text-2xl sm:text-3xl text-[#F7DECA]">
          Consolidação Pós-Evento e Exportação (PDF, CSV, XLSX)
        </h1>
        <p className="text-xs sm:text-sm text-[#D5C5AA]/80">
          Todos os registros de tempo (`TimerSession`), votos (`Vote`),
          perguntas (`Question`) e auditoria (`AuditLog`) já estão estruturados
          para consolidação na Fase 5.
        </p>
      </div>
    </div>
  );
}

export default function AdminRelatoriosPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs">Carregando...</div>}>
      <AdminRelatoriosContent />
    </Suspense>
  );
}
