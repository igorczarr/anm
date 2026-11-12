"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("anm_theme") as "dark" | "light" | null;
      if (saved) {
        setTheme(saved);
        applyTheme(saved);
      } else {
        // Padrão escuro institucional da Arena
        applyTheme("dark");
      }
    } catch {
      // Ignora erro de acesso a storage
    }
  }, []);

  function applyTheme(newTheme: "dark" | "light") {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.setAttribute("data-theme", newTheme);
    if (newTheme === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      root.classList.remove("light");
      root.classList.add("dark");
    }
  }

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    try {
      localStorage.setItem("anm_theme", nextTheme);
    } catch {
      // Silencia
    }
  }

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Alternar tema visual"
        className={`p-2 rounded-xl border border-white/10 bg-white/5 text-[#D5C5AA]/70 ${className}`}
      >
        <Moon className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "light" ? "Alternar para Tema Escuro (Arena)" : "Alternar para Tema Claro"}
      title={theme === "light" ? "Tema Claro ativo (clique para alternar para Escuro)" : "Tema Escuro ativo (clique para alternar para Claro)"}
      className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 select-none ${
        theme === "light"
          ? "border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-sm"
          : "border-white/10 bg-[#0A150D] text-[#D5C5AA] hover:text-[#F7DECA] hover:border-emerald-500/40"
      } ${className}`}
    >
      {theme === "light" ? (
        <>
          <Sun className="w-4 h-4 text-amber-500 shrink-0" />
          {!compact && <span className="text-xs font-semibold text-slate-800">Tema Claro</span>}
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-emerald-400 shrink-0" />
          {!compact && <span className="text-xs font-semibold text-[#D5C5AA]">Tema Escuro</span>}
        </>
      )}
    </button>
  );
}
