import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { calculateProfileCompleteness } from "@/lib/completeness";
import { getAuthenticatedUser } from "@/lib/session";

export async function getOrCreateCurrentCandidate() {
  const sessionUser = await getAuthenticatedUser();

  if (!sessionUser) {
    redirect("/entrar");
  }

  const user = sessionUser;

  let profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
    include: {
      educations: { orderBy: { startDate: "desc" } },
      experiences: { orderBy: { startDate: "desc" } },
      skills: { include: { skill: true } },
      languages: { orderBy: { createdAt: "asc" } },
      resumes: { orderBy: { updatedAt: "desc" } },
      applications: {
        include: {
          job: true,
          history: { orderBy: { createdAt: "desc" } },
        },
        orderBy: { appliedAt: "desc" },
      },
    },
  });

  if (!profile) {
    profile = await prisma.candidateProfile.create({
      data: {
        userId: user.id,
        fullName: user.fullName,
        email: user.email,
        photoUrl: user.avatarUrl,
        completionPercent: 20,
      },
      include: {
        educations: { orderBy: { startDate: "desc" } },
        experiences: { orderBy: { startDate: "desc" } },
        skills: { include: { skill: true } },
        languages: { orderBy: { createdAt: "asc" } },
        resumes: { orderBy: { updatedAt: "desc" } },
        applications: {
          include: {
            job: true,
            history: { orderBy: { createdAt: "desc" } },
          },
          orderBy: { appliedAt: "desc" },
        },
      },
    });
  }

  const completeness = calculateProfileCompleteness({
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    city: profile.city,
    state: profile.state,
    linkedinUrl: profile.linkedinUrl,
    professionalTitle: profile.professionalTitle,
    summary: profile.summary,
    interestArea: profile.interestArea,
    careerObjective: profile.careerObjective,
    educationsCount: profile.educations.length,
    experiencesCount: profile.experiences.length,
    skillsCount: profile.skills.length,
    languagesCount: profile.languages.length,
    preferredModality: profile.preferredModality,
    desiredRolesCount: profile.desiredRoles.length,
    hasResume:
      profile.resumes.some((r) => r.isActive) ||
      (profile.educations.length > 0 && profile.experiences.length > 0),
  });

  if (completeness.percent !== profile.completionPercent) {
    await prisma.candidateProfile.update({
      where: { id: profile.id },
      data: { completionPercent: completeness.percent },
    });
    profile.completionPercent = completeness.percent;
  }

  const consentRecords = await prisma.consentRecord.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return {
    user,
    profile,
    completeness,
    consentRecords,
  };
}
