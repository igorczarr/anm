import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { getPrimaryEvent } from "@/lib/live-state";
import { Vote } from "lucide-react";

async function AdminVotacoesContent() {
  await getCurrentAdminUser();
  const event = await getPrimaryEvent();

  const polls = event
    ? await prisma.poll.findMany({
        where: { eventId: event.id },
        include: {
          topic: { include: { mainSpeaker: true } },
          options: { orderBy: { optionOrder: "asc" } },
        },
        orderBy: { number: "asc" },
      })
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8 rounded-2xl">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#14532D]">
          Módulo 5 · Configuração Inicial das 6 Votações (§6.1)
        </span>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl text-[#F7DECA]">
          Enquetes Cadastradas por Pauta
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-[#D5C5AA]/80">
          As 6 votações oficiais e suas alternativas já estão persistidas no
          banco. Os controles de abertura/encerramento ao vivo serão expandidos
          nas Fases 2 e 3.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {polls.map((poll) => (
          <div
            key={poll.id}
            className="border border-[#D5C5AA]/20 bg-[#0A150D]/80 p-6 rounded-2xl space-y-4"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="px-3 py-1 rounded-full bg-[#14532D] text-white font-bold flex items-center gap-1.5">
                <Vote className="w-3.5 h-3.5" />
                Votação da Pauta {poll.number} ({poll.topic.mainSpeaker.name})
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                {poll.status} · {poll.durationSec}s
              </span>
            </div>

            <h2 className="font-bold text-sm sm:text-base text-[#F7DECA]">
              {poll.question}
            </h2>

            <ul className="space-y-2 text-xs">
              {poll.options.map((opt) => (
                <li
                  key={opt.id}
                  className="border border-[#D5C5AA]/15 bg-[#030A06] px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-2"
                >
                  <span className="text-[#F7DECA]">
                    <strong>{opt.optionOrder}.</strong> {opt.label}
                  </span>
                  <span className="font-mono text-[#D5C5AA]/70">
                    {opt.votesCount} votos
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminVotacoesPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-xs text-[#D5C5AA]/70">
          Carregando votações cadastradas...
        </div>
      }
    >
      <AdminVotacoesContent />
    </Suspense>
  );
}
