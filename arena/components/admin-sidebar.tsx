"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAdminAction } from "@/app/actions/admin-login";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  CalendarClock,
  ChevronRight,
  ExternalLink,
  FileBarChart2,
  KeyRound,
  LogOut,
  Menu,
  MessageSquareMore,
  MonitorPlay,
  PlayCircle,
  Radio,
  Settings,
  Smartphone,
  Users,
  Vote,
  X,
} from "lucide-react";

interface SubItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  subItems: SubItem[];
  matchPaths: string[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    key: "aovivo",
    label: "Ao Vivo",
    href: "/admin/operacao",
    icon: PlayCircle,
    matchPaths: ["/admin", "/admin/operacao", "/admin/perguntas", "/admin/votacoes"],
    subItems: [
      { href: "/admin/operacao", label: "Mesa de Palco", icon: Radio },
      { href: "/admin/perguntas", label: "Curadoria", icon: MessageSquareMore },
      { href: "/admin/votacoes", label: "Votações", icon: Vote },
    ],
  },
  {
    key: "evento",
    label: "Evento",
    href: "/admin/cronograma",
    icon: CalendarClock,
    matchPaths: ["/admin/cronograma", "/admin/configuracoes"],
    subItems: [
      { href: "/admin/cronograma", label: "Cronograma", icon: CalendarClock },
      { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
  {
    key: "pessoas",
    label: "Pessoas",
    href: "/admin/participantes",
    icon: Users,
    matchPaths: ["/admin/participantes", "/admin/acessos"],
    subItems: [
      { href: "/admin/participantes", label: "Participantes", icon: Users },
      { href: "/admin/acessos", label: "Equipe", icon: KeyRound },
    ],
  },
  {
    key: "relatorios",
    label: "Relatórios",
    href: "/admin/relatorios",
    icon: FileBarChart2,
    matchPaths: ["/admin/relatorios"],
    subItems: [
      { href: "/admin/relatorios", label: "Métricas & Arquivos", icon: FileBarChart2 },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (pathname?.startsWith("/admin/login")) {
    return null;
  }

  const navContent = (
    <aside className="w-60 bg-[#050C07] border-r border-white/[0.06] flex flex-col justify-between h-full select-none">
      <div>
        {/* Topo / Logo */}
        <div className="p-4 sm:p-5 border-b border-white/[0.06] flex items-center justify-between">
          <Link href="/admin/operacao" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-xl bg-[#0A120D] border border-emerald-500/40 p-1 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform overflow-hidden">
              <img
                src="/img/logo.png"
                alt="A Nova Moeda"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <div className="font-display font-bold text-sm text-[#F7DECA] leading-tight">
                A Nova Moeda
              </div>
              <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-medium">
                Mesa Diretora
              </div>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-[#D5C5AA] hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Módulos Centrais */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-1.5 text-[9px] uppercase tracking-widest text-[#D5C5AA]/40 font-bold">
            Módulos
          </div>
          {NAV_SECTIONS.map((section) => {
            const SectionIcon = section.icon;
            const isSectionActive = section.matchPaths.some((p) =>
              p === "/admin" ? pathname === "/admin" : pathname?.startsWith(p)
            );

            return (
              <div key={section.key} className="space-y-0.5">
                <Link
                  href={section.href}
                  onClick={() => setMobileOpen(false)}
                  className={`w-full px-3 py-2 rounded-xl text-xs flex items-center justify-between transition group cursor-pointer ${
                    isSectionActive
                      ? "bg-emerald-950/60 text-white font-semibold border border-emerald-500/30 shadow-xs"
                      : "text-[#D5C5AA]/70 hover:bg-white/[0.03] hover:text-[#F7DECA]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <SectionIcon
                      className={`w-4 h-4 ${
                        isSectionActive ? "text-emerald-400" : "text-[#D5C5AA]/50 group-hover:text-emerald-400"
                      }`}
                    />
                    <span>{section.label}</span>
                  </div>
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-transform ${
                      isSectionActive
                        ? "text-emerald-400 rotate-90"
                        : "text-[#D5C5AA]/30 group-hover:translate-x-0.5"
                    }`}
                  />
                </Link>

                {/* Sub-itens quando ativo */}
                {isSectionActive && section.subItems.length > 1 && (
                  <div className="pl-6 pr-2 py-0.5 space-y-0.5 border-l border-emerald-500/30 ml-4 my-1">
                    {section.subItems.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive = pathname === sub.href;
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setMobileOpen(false)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] flex items-center gap-2 transition cursor-pointer ${
                            isSubActive
                              ? "bg-emerald-500/20 text-emerald-200 font-semibold"
                              : "text-[#D5C5AA]/60 hover:text-[#F7DECA] hover:bg-white/[0.03]"
                          }`}
                        >
                          <SubIcon className="w-3 h-3 text-emerald-400" />
                          <span>{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Rodapé: Links do Telão/App e Sair */}
      <div className="p-3 border-t border-white/[0.06] space-y-2 bg-[#030805]">
        <div className="grid grid-cols-2 gap-1.5">
          <a
            href="/arena"
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-2 rounded-xl bg-[#0A120D] border border-white/[0.08] text-[11px] font-medium text-[#D5C5AA]/80 hover:text-[#F7DECA] hover:border-emerald-500/30 flex items-center justify-center gap-1.5 transition"
            title="Abrir Telão ARENA em nova aba"
          >
            <MonitorPlay className="w-3.5 h-3.5 text-emerald-400" />
            <span>Telão</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-40" />
          </a>
          <a
            href="/participar"
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-2 rounded-xl bg-[#0A120D] border border-white/[0.08] text-[11px] font-medium text-[#D5C5AA]/80 hover:text-[#F7DECA] hover:border-emerald-500/30 flex items-center justify-center gap-1.5 transition"
            title="Abrir aplicativo do Participante em nova aba"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span>App</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-40" />
          </a>
        </div>

        <div className="pt-1">
          <ThemeToggle className="w-full text-xs" />
        </div>

        <form action={logoutAdminAction}>
          <button
            type="submit"
            className="w-full px-3 py-1.5 rounded-xl border border-white/[0.06] text-[#D5C5AA]/60 hover:text-red-300 hover:border-red-500/30 hover:bg-red-950/20 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Encerrar Sessão</span>
          </button>
        </form>
      </div>
    </aside>
  );

  return (
    <>
      <div className="md:hidden bg-[#050C07] border-b border-white/[0.08] p-3 flex items-center justify-between">
        <Link href="/admin/operacao" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#0A120D] border border-emerald-500/30 p-0.5 flex items-center justify-center overflow-hidden">
            <img
              src="/img/logo.png"
              alt="A Nova Moeda"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-display font-bold text-sm text-[#F7DECA]">
            A Nova Moeda
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg bg-[#0A120D] border border-white/[0.08] text-[#D5C5AA]"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10">{navContent}</div>
        </div>
      )}

      <div className="hidden md:block shrink-0 min-h-screen">
        {navContent}
      </div>
    </>
  );
}
