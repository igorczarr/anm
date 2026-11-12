import { Suspense } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminStatusStrip } from "@/components/admin-status-strip";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-root min-h-screen bg-[#030A06] text-[#F7DECA] flex flex-col md:flex-row antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
      <Suspense fallback={<div className="w-60 bg-[#050B07] border-r border-white/[0.06] h-screen hidden md:block animate-pulse" />}>
        <AdminSidebar />
      </Suspense>

      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-[#030A06]">
        <Suspense fallback={<div className="h-12 bg-[#050B07] border-b border-white/[0.06] animate-pulse" />}>
          <AdminStatusStrip />
        </Suspense>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
