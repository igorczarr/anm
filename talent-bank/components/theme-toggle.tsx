"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("anm-theme") as "light" | "dark" | null;
    const initial = saved || "light";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("anm-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#D5C5AA]/30 bg-[#0A150D] text-xs font-medium text-[#F7DECA] hover:opacity-90 transition cursor-pointer"
      title={
        theme === "light"
          ? "Alternar para Tema Escuro"
          : "Alternar para Tema Claro"
      }
    >
      {theme === "light" ? (
        <>
          <Moon className="w-3.5 h-3.5 text-slate-700" />
          <span className="hidden sm:inline text-slate-700">Escuro</span>
        </>
      ) : (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-300" />
          <span className="hidden sm:inline">Claro</span>
        </>
      )}
    </button>
  );
}
