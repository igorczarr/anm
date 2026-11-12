import { Suspense } from "react";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { LiveControlDesk } from "@/components/live-control-desk";

async function AdminOperacaoContent() {
  await getCurrentAdminUser();

  return (
    <div className="max-w-7xl mx-auto">
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
