import Link from "next/link";
import { Suspense } from "react";
import { getAuthenticatedAdmin } from "@/lib/session";
import { logoutAdminAction } from "@/app/actions/admin-login";
import {
  LogOut,
  MonitorPlay,
  Radio,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

async function AuthControls() {
  const admin = await getAuthenticatedAdmin();

  // Modo cego: se não houver admin autenticado, não exibe atalhos para outras interfaces
  if (!admin) {
    return null;
  }

  return (
    <div className="flex items-center gap-2.5">
      <Link
        href="/arena"
        target="_blank"
        className="hidden sm:inline-flex px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition items-center gap-1.5"
      >
        <MonitorPlay className="w-3.5 h-3.5 text-[#14532D]" />
        <span>Abrir Telão</span>
      </Link>
      <Link
        href="/participar"
        target="_blank"
        className="hidden md:inline-flex px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition items-center gap-1.5"
      >
        <Smartphone className="w-3.5 h-3.5 text-[#14532D]" />
        <span>Visão Plateia</span>
      </Link>
      <Link
        href="/admin"
        className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 transition flex items-center gap-2"
      >
        <ShieldCheck className="w-4 h-4 text-[#14532D]" />
        <span>{admin.fullName.split(" ")[0]}</span>
        <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-50 text-emerald-700 font-semibold">
          {admin.roleCode}
        </span>
      </Link>
      <form action={logoutAdminAction}>
        <button
          type="submit"
          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 transition cursor-pointer"
          title="Encerrar sessão administrativa"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <img
            src="/icon.svg"
            alt="A Nova Moeda"
            className="w-9 h-9 rounded-xl shadow-sm transition-transform duration-300 group-hover:scale-105"
          />
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-slate-900 leading-none">
              A Nova Moeda
            </span>
            <span className="text-[11px] font-medium text-slate-500 mt-0.5 flex items-center gap-1">
              <Radio className="w-3 h-3 text-[#14532D]" />
              Arena UEFS
            </span>
          </div>
        </Link>

        <Suspense
          fallback={
            <div className="h-9 w-44 rounded-xl bg-slate-100 animate-pulse" />
          }
        >
          <AuthControls />
        </Suspense>
      </div>
    </header>
  );
}
