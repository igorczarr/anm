import { Suspense } from "react";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { PollsDesk } from "@/components/polls-desk";
import { PageHeader } from "@/components/admin-ui";

async function AdminVotacoesContent() {
  await getCurrentAdminUser();

  return (
    <div className="space-y-6">
      <PageHeader title="Votação da Mesa-Redonda" subtitle="Um voto por participante" />

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
