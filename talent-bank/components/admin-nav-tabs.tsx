"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Briefcase,
  ClipboardList,
  Columns3,
  FileSpreadsheet,
  ShieldAlert,
  Users,
} from "lucide-react";

const NAV_ITEMS = [
  {
    href: "/admin",
    label: "Visão Geral",
    icon: BarChart3,
    exact: true,
  },
  {
    href: "/admin/kanban",
    label: "Board Kanban",
    icon: Columns3,
  },
  {
    href: "/admin/candidaturas",
    label: "Candidaturas",
    icon: ClipboardList,
  },
  {
    href: "/admin/candidatos",
    label: "Talentos",
    icon: Users,
  },
  {
    href: "/admin/vagas",
    label: "Vagas",
    icon: Briefcase,
  },
  {
    href: "/admin/relatorios",
    label: "Relatórios & PDF",
    icon: FileSpreadsheet,
  },
  {
    href: "/admin/auditoria",
    label: "Convites & Acessos",
    icon: ShieldAlert,
  },
];

export function AdminNavTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <nav className="flex flex-wrap items-center gap-1.5 text-xs">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3.5 py-2 rounded-xl transition flex items-center gap-2 ${
                  isActive
                    ? "bg-[#14532D] text-white font-semibold shadow-sm"
                    : "text-slate-600 font-medium hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isActive ? "text-white" : "text-slate-400"
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
