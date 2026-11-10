import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EVIDENCE_BADGES, LEVEL_LABELS } from "@/lib/passport";

export const dynamic = "force-dynamic";

export default async function PassportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const candidate = await prisma.candidateProfile.findUnique({
    where: { id },
    include: {
      skills: {
        include: { skill: true, evidences: { orderBy: { createdAt: "desc" } } },
      },
      educations: { orderBy: { startDate: "desc" }, take: 5 },
    },
  });

  // Privacidade (LGPD): somente perfis que autorizaram divulgação
  if (!candidate || candidate.archivedAt || !candidate.isPublicInPool) notFound();

  const skills = [...candidate.skills].sort(
    (a, b) =>
      EVIDENCE_BADGES[b.evidenceStatus].rank -
      EVIDENCE_BADGES[a.evidenceStatus].rank
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div className="border border-slate-300 bg-white p-6 space-y-1 rounded-lg">
        <span className="text-[11px] font-semibold text-emerald-700">
          Passaporte de Talentos
        </span>
        <h1 className="text-3xl font-bold text-slate-900">{candidate.fullName}</h1>
        <p className="text-sm text-slate-700">
          {candidate.professionalTitle || candidate.interestArea}
        </p>
        <p className="text-xs text-slate-500">
          {[candidate.city, candidate.state].filter(Boolean).join("/")}
          {candidate.availability ? ` · ${candidate.availability}` : ""}
        </p>
        {candidate.summary && (
          <p className="pt-3 text-sm text-slate-800 whitespace-pre-line">
            {candidate.summary}
          </p>
        )}
      </div>

      <div className="border border-slate-300 bg-white p-6 space-y-4 rounded-lg">
        <h2 className="text-xl font-bold text-slate-900">
          Competências e evidências
        </h2>
        {skills.length === 0 && (
          <p className="text-sm text-slate-600">Nenhuma competência registrada.</p>
        )}
        {skills.map((cs) => {
          const badge = EVIDENCE_BADGES[cs.evidenceStatus];
          return (
            <div key={cs.id} className="border border-slate-200 p-3 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="text-sm text-slate-900">{cs.skill.name}</strong>
                <span className="text-xs text-slate-600">{LEVEL_LABELS[cs.level]}</span>
                <span
                  className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${badge.className}`}
                  title={badge.hint}
                >
                  {badge.label}
                </span>
              </div>
              {cs.evidences.map((ev) => (
                <div key={ev.id} className="text-xs text-slate-700">
                  • {ev.title}
                  {ev.url && (
                    <>
                      {" "}
                      <a
                        href={ev.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="text-[#14532D] underline"
                      >
                        ver evidência
                      </a>
                    </>
                  )}
                </div>
              ))}
            </div>
          );
        })}
        <p className="text-[11px] text-slate-500">
          Declarada: informada pelo candidato · Documentada: com evidência · Demonstrada: comprovada em desafio · Validada: reconhecida por avaliador identificado.
        </p>
      </div>
    </div>
  );
}
