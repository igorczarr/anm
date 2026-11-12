import { Suspense } from "react";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { CurationDesk } from "@/components/curation-desk";
import { PageHeader } from "@/components/admin-ui";

async function AdminPerguntasContent() {
  const admin = await getCurrentAdminUser();

  return (
    <div className="space-y-6">
      <PageHeader title="Perguntas" subtitle={"Curadoria · " + admin.fullName} />

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
