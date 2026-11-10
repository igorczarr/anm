import { Suspense } from "react";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { MessageSquareMore } from "lucide-react";

async function AdminPerguntasContent() {
  await getCurrentAdminUser();
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8 rounded-2xl space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#14532D] flex items-center gap-1.5">
          <MessageSquareMore className="w-4 h-4" />
          Módulo 4 · Perguntas e Curadoria (§5)
        </span>
        <h1 className="font-display text-2xl sm:text-3xl text-[#F7DECA]">
          Fila de Moderação e Seleção de Pergunta Principal / Reserva
        </h1>
        <p className="text-xs sm:text-sm text-[#D5C5AA]/80">
          As tabelas `Question` e `QuestionStatusHistory` já estão criadas no
          schema `arena`. O fluxo de recebimento e curadoria em tempo real será
          ativado na Fase 3.
        </p>
      </div>
    </div>
  );
}

export default function AdminPerguntasPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs">Carregando...</div>}>
      <AdminPerguntasContent />
    </Suspense>
  );
}
