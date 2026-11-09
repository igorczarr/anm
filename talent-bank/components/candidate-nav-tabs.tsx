"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  CheckCircle2,
  FileDown,
  FileText,
  LayoutDashboard,
  Settings,
  UserCheck,
} from "lucide-react";

const CANDIDATE_NAV_ITEMS = [
  {
    href: "/painel",
    label: "Meu Painel",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/perfil",
    label: "Meu Perfil",
    icon: UserCheck,
  },
  {
    href: "/curriculo",
    label: "Meu Currículo",
    icon: FileText,
  },
  {
    href: "/vagas",
    label: "Mural de Vagas",
    icon: Briefcase,
  },
  {
    href: "/candidaturas",
    label: "Minhas Candidaturas",
    icon: CheckCircle2,
  },
  {
    href: "/conta",
    label: "Conta & Privacidade",
    icon: Settings,
  },
];

export function CandidateNavTabs() {
  const pathname = usePathname();

  // Não exibe a sub-barra de candidato dentro do módulo administrativo
  // ou nas telas de autenticação
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/entrar") ||
    pathname.startsWith("/cadastro") ||
    pathname.startsWith("/recuperar-senha")
  ) {
    return null;
  }

  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2">
        <nav className="flex flex-wrap items-center gap-1.5 text-xs">
          {CANDIDATE_NAV_ITEMS.map((item) => {
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

        <a
          href="/api/resumes/pdf"
          className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 hover:border-[#14532D] hover:text-[#14532D] transition"
        >
          <FileDown className="w-3.5 h-3.5 text-[#14532D]" />
          <span>Baixar Currículo PDF</span>
        </a>
      </div>
    </div>
  );
}
