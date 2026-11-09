import { Suspense } from "react";
import { AdminNavTabs } from "@/components/admin-nav-tabs";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#030A06]">
      <Suspense
        fallback={
          <div className="h-14 border-b border-slate-200 bg-white animate-pulse" />
        }
      >
        <AdminNavTabs />
      </Suspense>
      <div>{children}</div>
    </div>
  );
}
