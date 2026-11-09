"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  CalendarClock,
  FileBarChart2,
  KeyRound,
  MessageSquareMore,
  PlayCircle,
  Settings,
  Users,
  Vote,
} from "lucide-react";

/**
 * Arquitetura de Navegação ADMIN conforme seção 3.1 do Briefing (9 módulos)
 */
const NAV_ITEMS = [
  {
    href: "/admin",
    label: "1. Dashboard",
    icon: BarChart3,
    exact: true,
  },
  {
    href: "/admin/operacao",
    label: "2. Operação ao Vivo",
    icon: PlayCircle,
  },
  {
    href: "/admin/cronograma",
    label: "3. Cronograma",
    icon: CalendarClock,
  },
  {
    href: "/admin/perguntas",
    label: "4. Perguntas & Curadoria",
    icon: MessageSquareMore,
  },
  {
    href: "/admin/votacoes",
    label: "5. Votações",
    icon: Vote,
  },
  {
    href: "/admin/participantes",
    label: "6. Participantes & Conexões",
    icon: Users,
  },
  {
    href: "/admin/relatorios",
    label: "7. Relatórios",
    icon: FileBarChart2,
  },
  {
    href: "/admin/configuracoes",
    label: "8. Configurações",
    icon: Settings,
  },
  {
    href: "/admin/acessos",
    label: "9. Gerenciamento de Acessos",
    icon: KeyRound,
  },
];

export function AdminNavTabs() {
  const pathname = usePathname();

  if (pathname?.startsWith("/admin/login")) {
    return null;
  }

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
                className={`px-3 py-2 rounded-xl transition flex items-center gap-1.5 ${
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
