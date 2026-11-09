import { PrismaClient, UserRole } from "@prisma/client";
import { hashPassword, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD } from "../lib/session";

const prisma = new PrismaClient();

async function cleanDatabaseForRealTest() {
  console.log("🧹 Limpando vagas e candidatos placeholders para teste real...");

  // Remove todas as candidaturas, visualizações, vagas e perfis de demonstração
  await prisma.applicationNote.deleteMany({});
  await prisma.applicationHistory.deleteMany({});
  await prisma.application.deleteMany({});
  await prisma.jobView.deleteMany({});
  await prisma.job.deleteMany({});
  await prisma.resume.deleteMany({});
  await prisma.candidateSkill.deleteMany({});
  await prisma.education.deleteMany({});
  await prisma.experience.deleteMany({});
  await prisma.language.deleteMany({});
  await prisma.candidateProfile.deleteMany({});
  await prisma.consentRecord.deleteMany({});
  await prisma.auditLog.deleteMany({});

  // Remove usuários que não sejam o admin oficial
  await prisma.user.deleteMany({
    where: {
      email: { not: DEFAULT_ADMIN_EMAIL },
    },
  });

  // Garante o usuário Admin oficial pronto para login real
  await prisma.user.upsert({
    where: { email: DEFAULT_ADMIN_EMAIL },
    update: {
      role: UserRole.ADMIN,
      status: "ACTIVE",
      passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
    },
    create: {
      email: DEFAULT_ADMIN_EMAIL,
      fullName: "Administrador A Nova Moeda",
      role: UserRole.ADMIN,
      status: "ACTIVE",
      passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD),
    },
  });

  console.log("✅ Banco limpo! Apenas o Administrador e o catálogo base de competências foram mantidos.");
}

cleanDatabaseForRealTest()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
