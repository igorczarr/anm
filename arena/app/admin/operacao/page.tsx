import { getCurrentAdminUser } from "@/lib/admin-auth";
import { LiveControlDesk } from "@/components/live-control-desk";

export default async function AdminOperacaoPage() {
  await getCurrentAdminUser();

  return (
    <div className="max-w-7xl mx-auto">
      <LiveControlDesk />
    </div>
  );
}
