import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentAdminUser } from "@/lib/admin-auth";
import {
  createOrUpdateAdminUserAction,
  updateAdminUserStatusRoleAction,
} from "@/app/actions/foundation";
import { TeamAccessManager } from "@/components/team-access-manager";

async function AdminAcessosContent() {
  await getCurrentAdminUser();

  const [users, roles, logs] = await Promise.all([
    prisma.adminUser.findMany({
      include: { role: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.adminRole.findMany({
      where: {
        code: { in: ["ADMIN", "PRODUCER", "MODERATOR", "AUDIOVISUAL"] },
      },
      orderBy: { code: "asc" },
    }),
    prisma.auditLog.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-6">
      <TeamAccessManager
        users={users.map((u) => ({
          id: u.id,
          fullName: u.fullName,
          email: u.email,
          roleCode: u.roleCode,
          status: u.status,
          createdAt: u.createdAt.toISOString(),
        }))}
        roles={roles.map((r) => ({
          id: r.id,
          name: r.name,
          code: r.code,
          description: r.description,
        }))}
        logs={logs.map((l) => ({
          id: l.id,
          action: l.action,
          entityType: l.entityType,
          createdAt: l.createdAt.toISOString(),
          userName: l.user?.fullName || "Sistema ANM",
          justification: l.justification,
        }))}
        onCreateOrUpdateUser={createOrUpdateAdminUserAction}
        onUpdateUserStatusRole={updateAdminUserStatusRoleAction}
      />
    </div>
  );
}

export default function AdminAcessosPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-12 text-xs text-[#D5C5AA]/70">
          Carregando equipe e permissões...
        </div>
      }
    >
      <AdminAcessosContent />
    </Suspense>
  );
}
