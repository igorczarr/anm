"use client";

import { useEffect, useRef } from "react";

/**
 * ARENA GENERATIVE PARTICLE ENGINE — SILICON VALLEY / QUANT EDITION
 * - 1.800 partículas em fluxo contínuo 3D (nunca trava em pose estática).
 * - Transição contínua (quintic smoothstep) entre variedades paramétricas 3D vivas
 *   (Harmônicos Esféricos estilo Gemini, Fita de Möbius, Nó Toroidal, Horizonte Quant,
 *   Espiral Filotática Áurea, Aurora Seda e Vórtice Duplo).
 * - Ocupa 100% da largura widescreen (16:9) com profundidade óptica (bokeh + estrelas finas).
 */

type Vec3 = { x: number; y: number; z: number };

const COUNT = 1800;
const CYCLE_MS = 9500; // ciclo contínuo e fluido entre variedades

function quintic(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

// Avalia a variedade paramétrica `mode` no instante `t` para a partícula `i` (u, v in [0,1])
function sampleManifold(
  mode: number,
  i: number,
  u: number,
  v: number,
  t: number
): Vec3 {
  const tau = Math.PI * 2;
  switch (mode % 7) {
    // 0) Harmônicos Esféricos (estilo Gemini Live — lóbulos orgânicos que respiram no tempo)
    case 0: {
      const phi = Math.acos(1 - 2 * u);
      const theta = tau * i * 0.61803398875 + t * 0.22;
      const harmonic =
        1 +
        0.26 * Math.sin(3 * phi + t * 0.9) * Math.cos(3 * theta - t * 0.6) +
        0.14 * Math.cos(5 * phi - t * 0.7) * Math.sin(2 * theta + t * 0.5);
      const r = (0.72 + (v - 0.5) * 0.22) * harmonic;
      return {
        x: Math.sin(phi) * Math.cos(theta) * r * 1.25,
        y: Math.cos(phi) * r * 0.88,
        z: Math.sin(phi) * Math.sin(theta) * r,
      };
    }

    // 1) Seda Aurora Widescreen (fitas ondulantes que cruzam toda a tela)
    case 1: {
      const ribbon = i % 5;
      const x = (u * 2 - 1) * 1.55;
      const wave1 = Math.sin(x * 2.4 + t * 0.65 + ribbon * 0.7) * 0.32;
      const wave2 = Math.cos(x * 1.5 - t * 0.45 + v * 2.2) * 0.18;
      const yOffset = (ribbon - 2) * 0.21 + (v - 0.5) * 0.12;
      const y = wave1 + wave2 + yOffset;
      const z = Math.sin(x * 1.9 + t * 0.5 + ribbon) * 0.45;
      return { x, y, z };
    }

    // 2) Nó Toroidal (2,3)-Trefoil em fluxo contínuo
    case 2: {
      const a = u * tau + t * 0.28 + (i % 3) * 0.04;
      const p = 2;
      const q = 3;
      const r = 0.52 + 0.24 * Math.cos(q * a + t * 0.4);
      const spread = (v - 0.5) * 0.18;
      return {
        x: (r * Math.cos(p * a) + spread * Math.cos(a * 5)) * 1.35,
        y: (r * Math.sin(p * a) + spread * Math.sin(a * 5)) * 0.95,
        z: 0.38 * Math.sin(q * a + t * 0.4) + (v - 0.5) * 0.15,
      };
    }

    // 3) Horizonte Topográfico Quant (superfície em perspectiva estilo Wall Street / Fundos Asiáticos)
    case 3: {
      const cols = 60;
      const rows = Math.ceil(COUNT / cols);
      const col = i % cols;
      const row = Math.floor(i / cols);
      const nx = (col / (cols - 1)) * 2 - 1;
      const nz = (row / Math.max(1, rows - 1)) * 2 - 1;
      const elev =
        Math.sin(nx * 3.4 + t * 0.7) * Math.cos(nz * 2.6 - t * 0.5) * 0.28 +
        Math.sin((nx + nz) * 2.2 + t * 0.4) * 0.14;
      return {
        x: nx * 1.55,
        y: elev + nz * 0.42,
        z: nz * 0.75,
      };
    }

    // 4) Fita de Möbius Escultural com torção viva
    case 4: {
      const a = u * tau + t * 0.32;
      const s = (v - 0.5) * 0.55;
      const half = a * 0.5 + Math.sin(t * 0.3) * 0.4;
      const R = 0.78 + s * Math.cos(half);
      return {
        x: R * Math.cos(a) * 1.35,
        y: R * Math.sin(a) * 0.85,
        z: s * Math.sin(half) * 1.2,
      };
    }

    // 5) Galáxia Filotática Áurea (espiral de Fibonacci inclinada com pulso radial)
    case 5: {
      const r = Math.sqrt(u) * 1.15;
      const angle = i * 2.399963229728653 + t * 0.25 - r * 1.4;
      const waveZ = Math.sin(r * 4.5 - t * 0.9) * 0.26;
      const tilt = 0.52;
      const rawY = Math.sin(angle) * r;
      return {
        x: Math.cos(angle) * r * 1.32,
        y: rawY * Math.cos(tilt) - waveZ * Math.sin(tilt),
        z: rawY * Math.sin(tilt) + waveZ * Math.cos(tilt),
      };
    }

    // 6) Vórtice Duplo Assimétrico (fluxo entre dois polos conectados)
    default: {
      const a = u * tau * 2 + t * 0.45;
      const d = 1 + Math.sin(a) * Math.sin(a);
      const lx = (Math.cos(a) / d) * 1.38;
      const ly = ((Math.sin(a) * Math.cos(a)) / d) * 1.15;
      const swirl = (v - 0.5) * 0.28;
      return {
        x: lx + Math.cos(a * 3 + t) * swirl,
        y: ly + Math.sin(a * 2 - t) * swirl,
        z: Math.sin(a + t * 0.6) * 0.42 + (v - 0.5) * 0.2,
      };
    }
  }
}

export function ArenaParticleField({
  accent = "emerald",
}: {
  accent?: "emerald" | "amber";
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const accentRef = useRef(accent);
  accentRef.current = accent;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduceMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let running = true;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = canvas!.clientWidth;
      height = canvas!.clientHeight;
      canvas!.width = Math.max(1, Math.floor(width * dpr));
      canvas!.height = Math.max(1, Math.floor(height * dpr));
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    // Parâmetros intrínsecos de cada partícula
    const paramU = new Float32Array(COUNT);
    const paramV = new Float32Array(COUNT);
    const px = new Float32Array(COUNT);
    const py = new Float32Array(COUNT);
    const pz = new Float32Array(COUNT);
    const vx = new Float32Array(COUNT);
    const vy = new Float32Array(COUNT);
    const vz = new Float32Array(COUNT);
    const baseSize = new Float32Array(COUNT);
    const phase = new Float32Array(COUNT);
    const tier = new Uint8Array(COUNT); // 0: emerald star, 1: champagne gold, 2: hero bokeh

    for (let i = 0; i < COUNT; i++) {
      // Halton / estratificado para distribuição uniforme sem aglomerados artificiais
      paramU[i] = (i + 0.5) / COUNT;
      paramV[i] = ((i * 0.61803398875) % 1 + 1) % 1;
      const init = sampleManifold(0, i, paramU[i], paramV[i], 0);
      px[i] = init.x;
      py[i] = init.y;
      pz[i] = init.z;
      phase[i] = Math.random() * Math.PI * 2;

      const r = Math.random();
      if (r < 0.032) {
        tier[i] = 2; // hero bokeh suave
        baseSize[i] = 2.2 + Math.random() * 1.4;
      } else if (r < 0.2) {
        tier[i] = 1; // champagne / gold
        baseSize[i] = 0.8 + Math.random() * 1.1;
      } else {
        tier[i] = 0; // emerald precision
        baseSize[i] = 0.65 + Math.random() * 1.05;
      }
    }

    const startTime = performance.now();

    function frame(now: number) {
      if (!running) return;
      raf = requestAnimationFrame(frame);

      const elapsed = now - startTime;
      const t = elapsed * 0.001;

      // Índice contínuo de variedade: nunca para, mistura suavemente A -> B
      const cyclePos = elapsed / CYCLE_MS;
      const modeA = Math.floor(cyclePos);
      const modeB = modeA + 1;
      const rawBlend = cyclePos - modeA;
      const blend = quintic(rawBlend);

      const cx = width * 0.54; // leve deslocamento para equilibrar composição editorial
      const cy = height * 0.5;
      const scaleX = width * 0.44;
      const scaleY = height * 0.44;
      const scaleZ = Math.min(width, height) * 0.42;

      // Rotação 3D global ultra-suave
      const rotY = Math.sin(t * 0.14) * 0.35 + t * 0.08;
      const rotX = Math.cos(t * 0.11) * 0.22;
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      ctx!.clearRect(0, 0, width, height);

      const isAmber = accentRef.current === "amber";
      const light =
        document.documentElement.getAttribute("data-theme") === "light" ||
        document.documentElement.classList.contains("light");

      const primaryRGB = light
        ? isAmber
          ? "180,110,10"
          : "6,95,70"
        : isAmber
          ? "251,191,36"
          : "52,211,153";
      const secondaryRGB = light ? "146,100,20" : "247,222,202";
      const bokehRGB = light
        ? "16,185,129"
        : isAmber
          ? "245,158,11"
          : "16,185,129";

      for (let i = 0; i < COUNT; i++) {
        const a = sampleManifold(modeA, i, paramU[i], paramV[i], t);
        const b = sampleManifold(modeB, i, paramU[i], paramV[i], t);

        const tx = a.x + (b.x - a.x) * blend;
        const ty = a.y + (b.y - a.y) * blend;
        const tz = a.z + (b.z - a.z) * blend;

        // Turbulência curl-like contínua para fluidez líquida
        const ph = phase[i];
        const curlX = Math.sin(py[i] * 2.6 + t * 0.55 + ph) * 0.0018;
        const curlY = Math.cos(px[i] * 2.4 - t * 0.48 + ph) * 0.0018;
        const curlZ = Math.sin((px[i] + py[i]) * 2.0 + t * 0.42) * 0.0014;

        vx[i] = (vx[i] + (tx - px[i]) * 0.045 + curlX) * 0.86;
        vy[i] = (vy[i] + (ty - py[i]) * 0.045 + curlY) * 0.86;
        vz[i] = (vz[i] + (tz - pz[i]) * 0.045 + curlZ) * 0.86;

        px[i] += vx[i];
        py[i] += vy[i];
        pz[i] += vz[i];

        // Transformação 3D + perspectiva
        const x1 = px[i] * cosY + pz[i] * sinY;
        const z1 = -px[i] * sinY + pz[i] * cosY;
        const y1 = py[i] * cosX - z1 * sinX;
        const z2 = py[i] * sinX + z1 * cosX;

        const persp = 1 / Math.max(0.55, 1.65 - z2 * 0.55);
        const sx = cx + x1 * scaleX * persp;
        const sy = cy + y1 * scaleY * persp;

        if (sx < -24 || sx > width + 24 || sy < -24 || sy > height + 24) {
          continue;
        }

        const twinkle = 0.62 + 0.38 * Math.sin(t * 1.6 + ph * 2.5);
        const depthFactor = Math.max(0.25, Math.min(1.25, 0.65 + (z2 * scaleZ) / (scaleZ * 1.8)));
        const r = baseSize[i] * persp * (0.85 + twinkle * 0.25);

        if (tier[i] === 2) {
          // Partícula bokeh difusa de profundidade
          const alpha = Math.max(0.03, Math.min(0.22, twinkle * depthFactor * (light ? 0.14 : 0.2)));
          ctx!.fillStyle = `rgba(${bokehRGB},${alpha.toFixed(3)})`;
          ctx!.beginPath();
          ctx!.arc(sx, sy, r * 2.4, 0, Math.PI * 2);
          ctx!.fill();
        } else {
          const alpha = Math.max(
            0.08,
            Math.min(light ? 0.5 : 0.82, twinkle * depthFactor * (light ? 0.45 : 0.68))
          );
          const rgb = tier[i] === 1 ? secondaryRGB : primaryRGB;
          ctx!.fillStyle = `rgba(${rgb},${alpha.toFixed(3)})`;
          ctx!.beginPath();
          ctx!.arc(sx, sy, r, 0, Math.PI * 2);
          ctx!.fill();
        }
      }
    }

    if (reduceMotion) {
      frame(performance.now());
      running = false;
      cancelAnimationFrame(raf);
    } else {
      raf = requestAnimationFrame(frame);
    }

    function onVisibility() {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!reduceMotion && !running) {
        running = true;
        raf = requestAnimationFrame(frame);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-95"
    />
  );
}
