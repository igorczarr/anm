import Link from "next/link";
import { Suspense } from "react";
import { getAuthenticatedUser, getDestinationForRole } from "@/lib/session";
import { unifiedLogoutAction } from "@/app/actions/auth";
import { CandidateNavTabs } from "@/components/candidate-nav-tabs";
import { LogOut, Search, UserCircle } from "lucide-react";

async function HeaderCenterSection() {
  const user = await getAuthenticatedUser();

  // Quando o usuário está logado dentro do portal, oculta os links institucionais
  // e exibe uma barra de pesquisa limpa e corporativa (estilo LinkedIn / Monday)
  if (user) {
    const searchAction =
      user.role === "CANDIDATE" ? "/talentos/vagas" : "/talentos/admin/candidatos";
    const placeholder =
      user.role === "CANDIDATE"
        ? "Pesquisar oportunidades, cargos, empresas ou competências..."
        : "Pesquisar talentos, e-mails, cargos ou competências na base...";

    return (
      <form
        method="GET"
        action={searchAction}
        className="flex-1 max-w-xl mx-4"
      >
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            name="q"
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-100/80 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-[#14532D] outline-none transition"
          />
        </div>
      </form>
    );
  }

  // Quando deslogado (visitante), mantém apenas acesso rápido discreto
  return (
    <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
      <Link href="/vagas" className="hover:text-slate-900 transition">
        Oportunidades
      </Link>
      <Link href="/privacidade" className="hover:text-slate-900 transition">
        Privacidade & LGPD
      </Link>
    </nav>
  );
}

async function AuthControls() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return (
      <div className="flex items-center gap-2.5">
        <Link
          href="/entrar"
          className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
        >
          Entrar
        </Link>
        <Link
          href="/cadastro"
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#14532D] text-white hover:bg-[#166534] transition shadow-sm"
        >
          Criar perfil
        </Link>
      </div>
    );
  }

  const destination = getDestinationForRole(user.role);
  const roleBadge =
    user.role === "ADMIN"
      ? "Admin"
      : user.role === "RECRUITER"
      ? "Recrutador"
      : "Candidato";

  return (
    <div className="flex items-center gap-2.5">
      <Link
        href={destination}
        className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 transition flex items-center gap-2"
      >
        <UserCircle className="w-4 h-4 text-[#14532D]" />
        <span>{user.fullName.split(" ")[0]}</span>
        <span className="px-2 py-0.5 text-[10px] rounded-full bg-emerald-50 text-emerald-700 font-semibold">
          {roleBadge}
        </span>
      </Link>
      <form action={unifiedLogoutAction}>
        <button
          type="submit"
          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 transition cursor-pointer"
          title="Sair da conta"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

async function CandidateTopTabsWrapper() {
  const user = await getAuthenticatedUser();
  if (!user || user.role !== "CANDIDATE") {
    return null;
  }
  return <CandidateNavTabs />;
}

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <img
            src="/talentos/icon.svg"
            alt="A Nova Moeda"
            className="w-9 h-9 rounded-xl shadow-sm transition-transform duration-300 group-hover:scale-105"
          />
          <div className="flex flex-col">
            <span className="font-bold text-sm tracking-tight text-slate-900 leading-none">
              A Nova Moeda
            </span>
            <span className="text-[11px] font-medium text-slate-500 mt-0.5">
              Talent Hub
            </span>
          </div>
        </Link>

        <Suspense
          fallback={
            <div className="h-9 flex-1 max-w-md rounded-xl bg-slate-100 animate-pulse" />
          }
        >
          <HeaderCenterSection />
        </Suspense>

        <Suspense
          fallback={
            <div className="h-9 w-36 rounded-xl bg-slate-100 animate-pulse" />
          }
        >
          <AuthControls />
        </Suspense>
      </div>

      {/* Barra de abas de navegação sempre visível para o Candidato logado */}
      <Suspense fallback={null}>
        <CandidateTopTabsWrapper />
      </Suspense>
    </header>
  );
}
