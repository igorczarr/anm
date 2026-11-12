"use client";

import { CheckCircle2, AlertCircle, X, Search } from "lucide-react";
import { useEffect } from "react";

/** Cabeçalho de página executivo e refinado: Título + Métricas compactas + Ações */
export function PageHeader({
  title,
  subtitle,
  stats,
  actions,
}: {
  title: string;
  subtitle?: string;
  stats?: { label: string; value: React.ReactNode; tone?: "ok" | "warn" | "neutral" }[];
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-5 border-b border-white/[0.08]">
      <div className="min-w-0">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#F7DECA] leading-tight tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-xs text-[#D5C5AA]/70">{subtitle}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {stats?.map((s) => (
          <div key={s.label} className="leading-tight px-3 py-1.5 rounded-xl bg-[#050C07] border border-white/[0.06]">
            <div
              className={`font-mono text-base font-bold tabular-nums ${
                s.tone === "ok"
                  ? "text-emerald-400"
                  : s.tone === "warn"
                    ? "text-amber-400"
                    : "text-[#F7DECA]"
              }`}
            >
              {s.value}
            </div>
            <div className="text-[9px] uppercase tracking-wider text-[#D5C5AA]/50 font-medium mt-0.5">
              {s.label}
            </div>
          </div>
        ))}
        {actions}
      </div>
    </header>
  );
}

/** Abas com estilo Segmented Control macOS / Linear */
export function Tabs<T extends string>({
  value,
  onChange,
  items,
  right,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { key: T; label: string; count?: number }[];
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
      <div className="inline-flex items-center gap-1 bg-[#050C07] p-1 rounded-xl border border-white/[0.06] overflow-x-auto max-w-full">
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer whitespace-nowrap ${
              value === it.key
                ? "bg-[#14532D] text-white font-semibold shadow-xs"
                : "text-[#D5C5AA]/70 hover:text-[#F7DECA] hover:bg-white/[0.03]"
            }`}
          >
            <span>{it.label}</span>
            {it.count !== undefined && (
              <span
                className={`ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  value === it.key
                    ? "bg-emerald-500/30 text-emerald-200"
                    : "bg-white/[0.06] text-[#D5C5AA]/60"
                }`}
              >
                {it.count}
              </span>
            )}
          </button>
        ))}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

/** Chips de filtro compactos e elegantes */
export function Chips<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { key: T; label: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={() => onChange(it.key)}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
            value === it.key
              ? "bg-[#14532D] text-white border border-emerald-500/40 font-semibold"
              : "bg-[#050C07] text-[#D5C5AA]/70 border border-white/[0.06] hover:text-[#F7DECA] hover:border-white/[0.15]"
          }`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

/** Campo de busca com design escuro e ícone discreto */
export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full sm:w-64">
      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#D5C5AA]/40" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-[#050C07] border border-white/[0.08] text-[#F7DECA] placeholder-[#D5C5AA]/40 focus:outline-none focus:border-emerald-500/60"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#D5C5AA]/40 hover:text-white"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

/** Notificação flutuante de sucesso/erro */
export function Toast({
  toast,
  onClose,
}: {
  toast: { message: string; type: "success" | "error" } | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;
  const ok = toast.type === "success";

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999999] px-4 py-2.5 rounded-xl flex items-center gap-2.5 text-xs font-semibold shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 ${
        ok
          ? "bg-emerald-950/90 border border-emerald-500/50 text-emerald-200"
          : "bg-red-950/90 border border-red-500/50 text-red-200"
      }`}
    >
      {ok ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      ) : (
        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
      )}
      <span>{toast.message}</span>
      <button
        type="button"
        onClick={onClose}
        className="ml-2 text-white/50 hover:text-white"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/** Estado vazio sutil */
export function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-14 text-center text-xs text-[#D5C5AA]/50 border border-dashed border-white/[0.08] rounded-2xl bg-[#050C07]">
      {text}
    </div>
  );
}
