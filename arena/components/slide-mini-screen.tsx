"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface SlideDeckInfo {
  title: string;
  count: number;
  aspect: number;
  slides: Array<{ src: string; width: number; height: number }>;
}

export type SlideManifest = Record<string, SlideDeckInfo>;

/** Carrega o manifesto dos slides (gerado por scripts/export_slides.py) uma única vez. */
let manifestPromise: Promise<SlideManifest> | null = null;
export function loadSlideManifest(): Promise<SlideManifest> {
  if (!manifestPromise) {
    manifestPromise = fetch("/slides/manifest.json", { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
  }
  return manifestPromise;
}

export function useSlideManifest() {
  const [manifest, setManifest] = useState<SlideManifest>({});
  useEffect(() => {
    let alive = true;
    loadSlideManifest().then((m) => alive && setManifest(m));
    return () => {
      alive = false;
    };
  }, []);
  return manifest;
}

/**
 * Miniscreen cinematográfico: exibe o slide atual com crossfade, pré-carrega os vizinhos
 * e mostra apenas um contador discreto — sem molduras pesadas.
 */
export function SlideMiniScreen({
  deck,
  index,
  className = "",
}: {
  deck: string;
  index: number;
  className?: string;
}) {
  const manifest = useSlideManifest();
  const info = manifest[deck];
  const total = info?.count ?? 0;
  const safeIndex = Math.max(0, Math.min(total - 1, index));

  const [shown, setShown] = useState(safeIndex);
  const [prev, setPrev] = useState<number | null>(null);
  const lastRef = useRef(safeIndex);

  // Pré-carrega slide atual, anterior e próximos 2
  useEffect(() => {
    if (!info) return;
    [safeIndex - 1, safeIndex, safeIndex + 1, safeIndex + 2].forEach((i) => {
      if (i >= 0 && i < total) {
        const img = new Image();
        img.src = info.slides[i].src;
      }
    });
  }, [info, safeIndex, total]);

  useEffect(() => {
    if (!info) return;
    if (safeIndex !== lastRef.current) {
      setPrev(lastRef.current);
      setShown(safeIndex);
      lastRef.current = safeIndex;
      const t = setTimeout(() => setPrev(null), 650);
      return () => clearTimeout(t);
    }
  }, [safeIndex, info]);

  const aspect = info?.aspect ?? 16 / 9;
  const progress = useMemo(() => (total > 1 ? ((safeIndex + 1) / total) * 100 : 100), [safeIndex, total]);

  const authorLabel = useMemo(() => {
    if (deck === "sergio") return "Slides · Dr. Sérgio Passos (Pauta 4)";
    if (deck === "closing") return "Slides · Paula Melo (Encerramento)";
    if (deck === "intro") return "Slides · Paula Melo (Introdução)";
    return "Slides da Apresentação";
  }, [deck]);

  if (!info || total === 0) return null;

  return (
    <div className={`relative w-full select-none ${className}`}>
      {/* Halo atmosférico atrás da tela */}
      <div className="absolute -inset-8 rounded-[32px] bg-emerald-400/10 blur-3xl pointer-events-none" />

      <div
        className="relative w-full overflow-hidden rounded-2xl bg-black ring-1 ring-white/20 shadow-[0_35px_100px_-20px_rgba(0,0,0,0.95)]"
        style={{ aspectRatio: String(aspect) }}
      >
        {prev !== null && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={info.slides[prev].src}
            alt=""
            className="absolute inset-0 w-full h-full object-contain"
            draggable={false}
          />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={shown}
          src={info.slides[shown].src}
          alt={`Slide ${shown + 1} de ${total}`}
          className="absolute inset-0 w-full h-full object-contain animate-[slideFade_0.6s_ease-out]"
          draggable={false}
        />

        {/* Barra de progresso capilar com brilho */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10">
          <div
            className="h-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,1)] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.22em] text-[#D5C5AA]/75 font-semibold px-1">
        <span className="text-emerald-400 font-bold flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
          {authorLabel}
        </span>
        <span className="font-mono tabular-nums text-sm text-[#F7DECA] font-bold tracking-normal">
          {String(safeIndex + 1).padStart(2, "0")} <span className="text-white/30 font-normal">/</span> {String(total).padStart(2, "0")}
        </span>
      </div>

      <style jsx global>{`
        @keyframes slideFade {
          from {
            opacity: 0;
            transform: scale(1.015);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
