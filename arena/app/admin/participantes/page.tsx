import { Suspense } from "react";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import { getPrimaryEvent } from "@/lib/live-state";
import {
  generateParticipantCredentialsBatchAction,
  toggleRequireCredentialAction,
} from "@/app/actions/foundation";
import { BadgeCheck, QrCode, Smartphone, Users, Wifi, Plus } from "lucide-react";

async function AdminParticipantesContent() {
  await getCurrentAdminUser();
  const event = await getPrimaryEvent();

  const participateUrl = process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL}/participar`
    : "http://localhost:3000/participar";

  const qrSvg = await QRCode.toString(participateUrl, {
    type: "svg",
    margin: 1,
    color: {
      dark: "#14532D",
      light: "#FFFFFF",
    },
  });

  const activeCutoff = new Date(Date.now() - 1000 * 60 * 3);

  const [sessions, activeCount, credentials, usedCredentialsCount] = event
    ? await Promise.all([
        prisma.participantSession.findMany({
          where: { eventId: event.id },
          include: {
            _count: {
              select: { questions: true, votes: true },
            },
          },
          orderBy: { lastSeenAt: "desc" },
          take: 60,
        }),
        prisma.participantSession.count({
          where: {
            eventId: event.id,
            lastSeenAt: { gte: activeCutoff },
          },
        }),
        prisma.participantCredential.findMany({
          where: { eventId: event.id },
          orderBy: { code: "asc" },
          take: 40,
        }),
        prisma.participantCredential.count({
          where: { eventId: event.id, isUsed: true },
        }),
      ])
    : [[], 0, [], 0];

  const totalCredentialsCount = event
    ? await prisma.participantCredential.count({ where: { eventId: event.id } })
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="border border-[#D5C5AA]/25 bg-[#0A150D]/90 p-6 sm:p-8 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#14532D] flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            Módulo 6 · Participantes, QR Code e Credenciais de Check-in (§4 e §7)
          </span>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl text-[#F7DECA]">
            QR Code Oficial, Credenciais Individuais (ANM-001..250) e Dispositivos
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#D5C5AA]/80">
            Para evitar duplicidade por troca de navegador ou aba anônima, cada
            participante pode validar o código único da sua credencial entregue
            no credenciamento (1 voto por participante validado).
          </p>
        </div>

        {event && (
          <form
            action={async () => {
              "use server";
              await toggleRequireCredentialAction(!event.requireCredential);
            }}
          >
            <button
              type="submit"
              className={`px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer ${
                event.requireCredential
                  ? "bg-emerald-700 text-white"
                  : "border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA]"
              }`}
            >
              {event.requireCredential
                ? "✓ Credencial Individual Obrigatória (Clique p/ Opcional)"
                : "Modo Sessão + Credencial Opcional (Clique p/ Exigir Credencial)"}
            </button>
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Card QR Code Oficial de Participação */}
        <div className="lg:col-span-4 border border-[#D5C5AA]/20 bg-[#0A150D]/85 p-6 rounded-2xl space-y-4 text-center">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#14532D]">
            <QrCode className="w-4 h-4" />
            <span>QR Code Oficial da Arena</span>
          </div>

          <div
            className="w-52 h-52 mx-auto p-3 bg-white rounded-2xl border border-slate-200 shadow-xs"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />

          <div className="space-y-1 text-xs">
            <div className="font-bold text-[#F7DECA]">
              Acesse pelo celular e participe do evento
            </div>
            <div className="font-mono text-[11px] text-[#D5C5AA]/75 break-all">
              {participateUrl}
            </div>
          </div>

          <a
            href="/participar"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 bg-[#D5C5AA] text-[#030A06] font-bold text-xs rounded-xl inline-flex items-center justify-center gap-1.5"
          >
            <Smartphone className="w-4 h-4" />
            <span>Abrir Interface do Participante ↗</span>
          </a>
        </div>

        {/* Gerenciador de Credenciais Individuais + Sessões Conectadas */}
        <div className="lg:col-span-8 space-y-6">
          {/* Lote de Credenciais Individuais */}
          <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/85 p-6 rounded-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg text-[#F7DECA] flex items-center gap-2">
                  <BadgeCheck className="w-5 h-5 text-[#14532D]" />
                  Credenciais Individuais de Check-in ({usedCredentialsCount} validadas de {totalCredentialsCount})
                </h2>
                <p className="text-xs text-[#D5C5AA]/75">
                  Códigos pré-gerados: <code>ANM-001</code> a{" "}
                  <code>ANM-{String(totalCredentialsCount).padStart(3, "0")}</code>
                </p>
              </div>

              <form
                action={generateParticipantCredentialsBatchAction}
                className="flex items-center gap-2 text-xs"
              >
                <input
                  type="number"
                  name="quantity"
                  defaultValue={50}
                  min={1}
                  max={500}
                  className="w-20 px-2.5 py-1.5 border border-[#D5C5AA]/30 bg-[#030A06] text-[#F7DECA] font-mono rounded-lg"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[#D5C5AA] text-[#030A06] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Gerar + Credenciais</span>
                </button>
              </form>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-44 overflow-y-auto p-1">
              {credentials.map((cred) => (
                <div
                  key={cred.id}
                  className={`px-3 py-2 rounded-lg border text-xs font-mono flex items-center justify-between ${
                    cred.isUsed
                      ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-300"
                      : "border-[#D5C5AA]/20 bg-[#030A06] text-[#F7DECA]"
                  }`}
                >
                  <strong>{cred.code}</strong>
                  <span className="text-[10px]">
                    {cred.isUsed ? "EM USO" : "LIVRE"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Lista de Sessões Conectadas */}
          <div className="border border-[#D5C5AA]/20 bg-[#0A150D]/85 p-6 rounded-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-lg text-[#F7DECA]">
                  Dispositivos Conectados ({sessions.length} exibidos)
                </h2>
                <p className="text-xs text-[#D5C5AA]/75">
                  Ativos nos últimos 3 minutos:{" "}
                  <strong className="text-emerald-400">{activeCount}</strong> ·
                  Pico registrado:{" "}
                  <strong>
                    {Math.max(event?.peakConnections ?? 0, activeCount)}
                  </strong>
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#D5C5AA]/20 bg-[#030A06] text-[10px] uppercase tracking-wider text-[#D5C5AA]/80">
                    <th className="p-3">Sessão / Credencial</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Perguntas</th>
                    <th className="p-3">Voto na Mesa</th>
                    <th className="p-3 text-right">Última Atividade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D5C5AA]/15">
                  {sessions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-6 text-center text-[#D5C5AA]/70"
                      >
                        Nenhum participante conectado ainda. Abra{" "}
                        <code>/participar</code> para testar.
                      </td>
                    </tr>
                  ) : (
                    sessions.map((s) => {
                      const isOnline =
                        new Date(s.lastSeenAt).getTime() >=
                        activeCutoff.getTime();
                      return (
                        <tr key={s.id}>
                          <td className="p-3 font-mono font-bold text-[#F7DECA]">
                            {s.credentialCode ? (
                              <span className="text-emerald-300">
                                {s.credentialCode} (#{s.anonymousCode})
                              </span>
                            ) : (
                              <span>#{s.anonymousCode}</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                isOnline
                                  ? "bg-emerald-950/30 text-emerald-300"
                                  : "bg-slate-800 text-[#D5C5AA]/60"
                              }`}
                            >
                              <Wifi className="w-3 h-3" />
                              {isOnline ? "Online" : "Inativo"}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[#F7DECA]">
                            {s._count.questions}
                          </td>
                          <td className="p-3 font-mono text-[#F7DECA]">
                            {s._count.votes > 0 ? "Registrado" : "—"}
                          </td>
                          <td className="p-3 text-right font-mono text-[#D5C5AA]/80">
                            {new Date(s.lastSeenAt).toLocaleTimeString("pt-BR")}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminParticipantesPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-xs text-[#D5C5AA]/70">
          Carregando participantes e credenciais...
        </div>
      }
    >
      <AdminParticipantesContent />
    </Suspense>
  );
}
