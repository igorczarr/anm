"use client";

import { useState, useCallback } from "react";
import { BrandLogo } from "@/components/brand-logo";
import {
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  RefreshCw,
  Share2,
  Sparkles,
  X,
} from "lucide-react";

const SIX_SPECIALISTS = [
  { id: "1", name: "Daniel", role: "Pauta 1", photoUrl: "/img/Daniel.png?v=3" },
  { id: "2", name: "Janaína", role: "Pauta 2", photoUrl: "/img/Janaina.jpeg" },
  { id: "3", name: "Denilson", role: "Pauta 3", photoUrl: "/img/Denilson.png" },
  { id: "4", name: "Sérgio", role: "Pauta 4", photoUrl: "/img/Sergio.png?v=3" },
  { id: "5", name: "Dulcila", role: "Pauta 5", photoUrl: "/img/Dulcila.jpeg" },
  { id: "6", name: "Paula", role: "Mediação", photoUrl: "/img/Paula.jpeg" },
];

export interface VoteReceiptProps {
  participantName?: string | null;
  credentialCode?: string | null;
  anonymousCode?: string | null;
  voteId?: string | null;
  votedAt?: string | null;
  isPollOpen?: boolean;
  onChangeVoteRequest?: () => void;
  onOpenStoryModal?: () => void;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Gera uma arte PNG 1080x1920 (proporção exata 9:16 do Instagram Stories)
 * com header unificado, limpo e elegante ("Eu faço parte da A Nova Moeda")
 * e confirmação de voto ("Já votou e escolheu o tema da Mesa-Redonda").
 */
export async function generateInstagramStoryBlob({
  participantName,
}: {
  participantName: string;
  credentialCode?: string;
}): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const isLight =
    typeof document !== "undefined" &&
    (document.documentElement.getAttribute("data-theme") === "light" ||
      document.documentElement.classList.contains("light"));

  // 1. Fundo Editorial 9:16 com iluminação atmosférica
  const bgGrad = ctx.createLinearGradient(0, 0, 1080, 1920);
  if (isLight) {
    bgGrad.addColorStop(0, "#F8FAFC");
    bgGrad.addColorStop(0.5, "#ECFDF5");
    bgGrad.addColorStop(1, "#F1F5F9");
  } else {
    bgGrad.addColorStop(0, "#020704");
    bgGrad.addColorStop(0.45, "#07170E");
    bgGrad.addColorStop(1, "#020604");
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1080, 1920);

  // Halo de luz radial centralizado no topo
  const radialTop = ctx.createRadialGradient(540, 340, 20, 540, 340, 640);
  radialTop.addColorStop(
    0,
    isLight ? "rgba(16, 185, 129, 0.16)" : "rgba(16, 185, 129, 0.28)"
  );
  radialTop.addColorStop(1, "rgba(16, 185, 129, 0)");
  ctx.fillStyle = radialTop;
  ctx.fillRect(0, 0, 1080, 1920);

  // 2. Moldura Editorial Principal
  const cardX = 76;
  const cardY = 110;
  const cardW = 1080 - 152;
  const cardH = 1920 - 220;

  drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 56);
  const cardGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  if (isLight) {
    cardGrad.addColorStop(0, "#FFFFFF");
    cardGrad.addColorStop(1, "#F8FAFC");
  } else {
    cardGrad.addColorStop(0, "#0B1B11");
    cardGrad.addColorStop(0.5, "#07120B");
    cardGrad.addColorStop(1, "#050D08");
  }
  ctx.fillStyle = cardGrad;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = isLight ? "#CBD5E1" : "rgba(213, 197, 170, 0.28)";
  ctx.stroke();

  // 3. Header Editorial Unificado e Centralizado (Logo + Eu faço parte da A Nova Moeda)
  const logoSrc = isLight ? "/img/logo.png" : "/img/Ativo 1.png";
  try {
    const logoImg = await loadImage(logoSrc);
    const logoSize = 110;
    ctx.drawImage(logoImg, 540 - logoSize / 2, cardY + 64, logoSize, logoSize);
  } catch {
    // ignore
  }

  ctx.textAlign = "center";

  // "Eu faço parte da" com filetes ornamentais
  ctx.fillStyle = isLight ? "#047857" : "#D5C5AA";
  ctx.font = "italic 600 34px Georgia, PlayfairDisplay, serif";
  ctx.fillText("Eu faço parte da", 540, cardY + 232);

  // Linha ornamental esquerda e direita
  ctx.strokeStyle = isLight ? "rgba(4, 120, 87, 0.3)" : "rgba(213, 197, 170, 0.35)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(540 - 260, cardY + 221);
  ctx.lineTo(540 - 155, cardY + 221);
  ctx.moveTo(540 + 155, cardY + 221);
  ctx.lineTo(540 + 260, cardY + 221);
  ctx.stroke();

  // Título Principal Monumental
  ctx.fillStyle = isLight ? "#0F172A" : "#F7DECA";
  ctx.font = "800 84px Montserrat, system-ui, sans-serif";
  ctx.fillText("A Nova Moeda", 540, cardY + 322);

  // Subtítulo Editorial
  ctx.fillStyle = isLight ? "#047857" : "#34D399";
  ctx.font = "bold 26px Montserrat, system-ui, sans-serif";
  ctx.fillText("ECONOMIA DA SOLIDÃO", 540, cardY + 370);

  // Data e Local sutis
  ctx.fillStyle = isLight ? "#64748B" : "rgba(213, 197, 170, 0.65)";
  ctx.font = "600 20px Montserrat, system-ui, sans-serif";
  ctx.fillText("17 DE NOVEMBRO · 18H30 · UEFS", 540, cardY + 408);

  // 4. Card Central de Protagonismo do Participante & Voto Confirmado
  const spotX = cardX + 64;
  const spotY = cardY + 455;
  const spotW = cardW - 128;
  const spotH = 270;

  drawRoundedRect(ctx, spotX, spotY, spotW, spotH, 40);
  const spotGrad = ctx.createLinearGradient(spotX, spotY, spotX, spotY + spotH);
  if (isLight) {
    spotGrad.addColorStop(0, "#ECFDF5");
    spotGrad.addColorStop(1, "#FFFFFF");
  } else {
    spotGrad.addColorStop(0, "rgba(20, 83, 45, 0.42)");
    spotGrad.addColorStop(1, "rgba(3, 10, 6, 0.85)");
  }
  ctx.fillStyle = spotGrad;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = isLight ? "#10B981" : "rgba(52, 211, 153, 0.45)";
  ctx.stroke();

  // Pílula de Status: VOTO CONFIRMADO
  const statusW = 360;
  const statusH = 48;
  drawRoundedRect(ctx, 540 - statusW / 2, spotY + 32, statusW, statusH, 24);
  ctx.fillStyle = isLight ? "#047857" : "#10B981";
  ctx.fill();

  ctx.fillStyle = isLight ? "#FFFFFF" : "#030A06";
  ctx.font = "800 20px Montserrat, system-ui, sans-serif";
  ctx.fillText("✓ VOTO CONFIRMADO NA PAUTA", 540, spotY + 63);

  // Nome do Participante em Destaque
  ctx.fillStyle = isLight ? "#0F172A" : "#F7DECA";
  ctx.font = "800 50px Montserrat, system-ui, sans-serif";
  ctx.fillText(participantName.slice(0, 24), 540, spotY + 148);

  // Frase clara demonstrando que já votou e escolheu o tema
  ctx.fillStyle = isLight ? "#047857" : "#6EE7B7";
  ctx.font = "bold 27px Montserrat, system-ui, sans-serif";
  ctx.fillText(
    "Já votou e escolheu o tema da Mesa-Redonda",
    540,
    spotY + 200
  );

  ctx.fillStyle = isLight ? "#64748B" : "rgba(213, 197, 170, 0.78)";
  ctx.font = "500 21px Montserrat, system-ui, sans-serif";
  ctx.fillText(
    "Participação registrada na escolha da questão central do debate",
    540,
    spotY + 238
  );

  // 5. Galeria dos 6 Especialistas da Mesa-Redonda
  ctx.fillStyle = isLight ? "#475569" : "#D5C5AA";
  ctx.font = "bold 21px Montserrat, system-ui, sans-serif";
  ctx.fillText("ESPECIALISTAS DA MESA-REDONDA", 540, cardY + 795);

  const avatarRadius = 54;
  const gap = 132;
  const startX = 540 - 2.5 * gap;
  const avatarY = cardY + 882;

  for (let i = 0; i < SIX_SPECIALISTS.length; i++) {
    const sp = SIX_SPECIALISTS[i];
    const cx = startX + i * gap;
    try {
      const spImg = await loadImage(sp.photoUrl);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, avatarY, avatarRadius, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(
        spImg,
        cx - avatarRadius,
        avatarY - avatarRadius,
        avatarRadius * 2,
        avatarRadius * 2
      );
      ctx.restore();
    } catch {
      // ignore
    }
    ctx.beginPath();
    ctx.arc(cx, avatarY, avatarRadius, 0, Math.PI * 2);
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = isLight ? "#059669" : "#D5C5AA";
    ctx.stroke();

    ctx.fillStyle = isLight ? "#0F172A" : "#F7DECA";
    ctx.font = "bold 21px Montserrat, system-ui, sans-serif";
    ctx.fillText(sp.name, cx, avatarY + avatarRadius + 32);

    ctx.fillStyle = isLight ? "#047857" : "#34D399";
    ctx.font = "600 16px Montserrat, system-ui, sans-serif";
    ctx.fillText(sp.role, cx, avatarY + avatarRadius + 54);
  }

  // 6. Rodapé Magnético com QR Code (Convite para votar e postar)
  const ctaBoxY = cardY + 1040;
  const ctaBoxH = 560;
  drawRoundedRect(ctx, spotX, ctaBoxY, spotW, ctaBoxH, 40);
  ctx.fillStyle = isLight ? "#F1F5F9" : "rgba(255, 255, 255, 0.03)";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = isLight ? "#CBD5E1" : "rgba(213, 197, 170, 0.22)";
  ctx.stroke();

  try {
    const qrImg = await loadImage("/api/qr");
    const qrSize = 260;
    const qrX = 540 - qrSize / 2;
    const qrY = ctaBoxY + 44;
    drawRoundedRect(ctx, qrX, qrY, qrSize, qrSize, 28);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.drawImage(qrImg, qrX + 16, qrY + 16, qrSize - 32, qrSize - 32);
  } catch {
    // ignore
  }

  ctx.textAlign = "center";
  ctx.fillStyle = isLight ? "#0F172A" : "#F7DECA";
  ctx.font = "800 38px Montserrat, system-ui, sans-serif";
  ctx.fillText("E você, já votou e escolheu o tema?", 540, ctaBoxY + 370);

  ctx.fillStyle = isLight ? "#334155" : "#D5C5AA";
  ctx.font = "500 24px Montserrat, system-ui, sans-serif";
  ctx.fillText(
    "Aponte a câmera para o QR Code, vote na pauta",
    540,
    ctaBoxY + 420
  );
  ctx.fillText(
    "da Mesa-Redonda e compartilhe nos seus Stories!",
    540,
    ctaBoxY + 455
  );

  ctx.fillStyle = isLight ? "#047857" : "#34D399";
  ctx.font = "bold 25px Montserrat, system-ui, sans-serif";
  ctx.fillText("#ANovaMoeda · UEFS", 540, ctaBoxY + 515);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png", 1.0);
  });
}

/**
 * Componente Visual do Cartão Editorial "Eu faço parte da A Nova Moeda"
 * Com Header unificado, limpo e simétrico (sem barras divididas ou códigos técnicos).
 */
function EditorialPassArtwork({
  displayName,
  compact = false,
}: {
  displayName: string;
  displayCredential?: string;
  compact?: boolean;
}) {
  return (
    <div
      style={{ borderRadius: "28px" }}
      className="anm-editorial-pass relative overflow-hidden bg-gradient-to-b from-[#0C1D13] via-[#07120C] to-[#040A06] border border-[#D5C5AA]/30 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.85)] text-center"
    >
      {/* Luzes atmosféricas de fundo (Esmeralda + Champagne) */}
      <div
        style={{ borderRadius: "9999px" }}
        className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-56 bg-emerald-500/20 blur-3xl"
      />
      <div
        style={{ borderRadius: "9999px" }}
        className="pointer-events-none absolute top-1/3 -right-20 w-56 h-56 bg-[#D5C5AA]/10 blur-3xl"
      />

      <div className={compact ? "p-5 space-y-4" : "p-6 sm:p-7 space-y-5"}>
        {/* 1. Header Editorial Unificado, Limpo e Centralizado */}
        <div className="relative z-10 flex flex-col items-center pt-1 space-y-2">
          {/* Emblema Oficial Flutuante com Halo Suave */}
          <div className="relative flex items-center justify-center mb-0.5">
            <div
              style={{ borderRadius: "9999px" }}
              className="absolute inset-0 bg-emerald-400/20 blur-xl scale-125 pointer-events-none"
            />
            <BrandLogo className="relative w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-md" />
          </div>

          {/* Lockup "Eu faço parte da A Nova Moeda" */}
          <div className="space-y-0.5">
            <div className="flex items-center justify-center gap-2.5">
              <span className="h-[1px] w-8 bg-gradient-to-r from-transparent to-[#D5C5AA]/60" />
              <span className="font-editorial italic text-base sm:text-lg text-[#D5C5AA] tracking-wide">
                Eu faço parte da
              </span>
              <span className="h-[1px] w-8 bg-gradient-to-l from-transparent to-[#D5C5AA]/60" />
            </div>

            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F7DECA] leading-none pt-0.5">
              A Nova Moeda
            </h2>

            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-400 pt-1">
              Economia da Solidão
            </p>

            <p className="text-[10px] font-medium text-[#D5C5AA]/65 tracking-wider pt-0.5">
              17 de Novembro · 18h30 · UEFS
            </p>
          </div>
        </div>

        {/* 2. Card de Protagonismo: Participante + Confirmação de Voto e Escolha do Tema */}
        <div
          style={{ borderRadius: "22px" }}
          className="anm-editorial-spotlight relative z-10 bg-gradient-to-b from-emerald-950/55 via-[#06130C] to-[#030A06] border border-emerald-400/40 p-4 sm:p-5 shadow-inner space-y-2"
        >
          <div className="flex justify-center">
            <span
              style={{ borderRadius: "9999px" }}
              className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-emerald-500 text-[#030A06] text-[10px] font-extrabold uppercase tracking-wider shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
              <span>Voto Confirmado na Pauta</span>
            </span>
          </div>

          <div className="pt-0.5">
            <strong className="font-display text-xl sm:text-2xl font-extrabold text-[#F7DECA] tracking-tight block truncate">
              {displayName}
            </strong>
          </div>

          <p className="text-xs sm:text-sm font-bold text-emerald-300 leading-snug">
            Já votou e escolheu o tema da Mesa-Redonda
          </p>

          <p className="text-[10px] text-[#D5C5AA]/70 leading-tight">
            Participação registrada na escolha da questão central do debate
          </p>
        </div>

        {/* 3. Galeria dos 6 Especialistas da Mesa-Redonda */}
        <div className="relative z-10 space-y-2.5 pt-0.5">
          <div className="flex items-center justify-center gap-2">
            <span className="h-[1px] flex-1 bg-[#D5C5AA]/15" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#D5C5AA]/85">
              Especialistas da Mesa-Redonda
            </span>
            <span className="h-[1px] flex-1 bg-[#D5C5AA]/15" />
          </div>

          <div className="grid grid-cols-6 gap-1.5">
            {SIX_SPECIALISTS.map((sp) => (
              <div key={sp.id} className="flex flex-col items-center gap-1">
                <div
                  style={{ borderRadius: "9999px" }}
                  className="p-[1.5px] bg-gradient-to-b from-[#D5C5AA] to-emerald-500 shadow-md"
                >
                  <img
                    src={sp.photoUrl}
                    alt={sp.name}
                    style={{ borderRadius: "9999px" }}
                    className="w-10 h-10 sm:w-11 sm:h-11 object-cover object-top bg-[#030A06]"
                  />
                </div>
                <span className="text-[9px] text-[#F7DECA] font-bold truncate w-full leading-tight">
                  {sp.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Rodapé de Convite Social com QR Code */}
        <div
          style={{ borderRadius: "20px" }}
          className="relative z-10 bg-[#030A06]/90 border border-[#D5C5AA]/20 p-3.5 flex items-center gap-3.5 text-left"
        >
          <div
            style={{ borderRadius: "14px" }}
            className="w-16 h-16 bg-white p-1.5 shrink-0 shadow-md flex items-center justify-center"
          >
            <img
              src="/api/qr"
              alt="QR Code de Votação"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="space-y-0.5 min-w-0">
            <div className="text-xs sm:text-sm font-extrabold text-[#F7DECA] leading-tight">
              E você, já votou e escolheu o tema?
            </div>
            <p className="text-[10px] sm:text-[11px] text-[#D5C5AA]/85 leading-snug">
              Aponte a câmera para o QR Code, vote na pauta da Mesa-Redonda e
              poste nos seus Stories!
            </p>
            <span className="text-[10px] font-bold text-emerald-400 block pt-0.5">
              #ANovaMoeda · UEFS
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Cartão Inline na Sala de Espera do Participante
 */
export function InstagramVoteReceiptCard({
  participantName,
  credentialCode,
  anonymousCode,
  isPollOpen = true,
  onChangeVoteRequest,
  onOpenStoryModal,
}: VoteReceiptProps) {
  const [sharing, setSharing] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const displayName = participantName?.trim() || "Membro da Arena";
  const displayCredential = credentialCode || anonymousCode || "ANM-2026";

  const handleShareOrDownloadStory = useCallback(async () => {
    setSharing(true);
    setShareFeedback(null);
    try {
      const blob = await generateInstagramStoryBlob({
        participantName: displayName,
        credentialCode: displayCredential,
      });

      if (!blob) {
        setShareFeedback("Abra o Modo Stories para capturar e postar.");
        return;
      }

      const file = new File([blob], "a-nova-moeda-stories.png", {
        type: "image/png",
      });

      if (
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: "Eu faço parte da A Nova Moeda · UEFS",
          text: "Já votei e escolhi o tema da nossa Mesa-Redonda na A Nova Moeda! E você, já votou?",
          files: [file],
        });
        setShareFeedback("Pronto para publicar nos seus Stories!");
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "a-nova-moeda-stories.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShareFeedback(
        "Arte 9:16 baixada! Publique nos seus Stories e convide seus amigos a votar."
      );
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setShareFeedback("Use o Modo Stories (Tela Cheia) para tirar print.");
      }
    } finally {
      setSharing(false);
    }
  }, [displayName, displayCredential]);

  return (
    <div className="space-y-3">
      <EditorialPassArtwork
        displayName={displayName}
        displayCredential={displayCredential}
      />

      {shareFeedback && (
        <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/40 text-xs text-emerald-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{shareFeedback}</span>
        </div>
      )}

      {/* Botões de Compartilhamento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={handleShareOrDownloadStory}
          disabled={sharing}
          className="w-full py-3.5 px-4 rounded-xl bg-[#14532D] hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer transition"
        >
          <Share2 className="w-4 h-4 shrink-0" />
          <span>
            {sharing ? "Gerando Story..." : "Compartilhar nos Stories"}
          </span>
        </button>

        {onOpenStoryModal && (
          <button
            type="button"
            onClick={onOpenStoryModal}
            className="w-full py-3.5 px-4 rounded-xl border border-[#D5C5AA]/35 bg-[#030A06] text-[#F7DECA] font-bold text-xs flex items-center justify-center gap-2 cursor-pointer hover:border-emerald-400 transition"
          >
            <Eye className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Modo Stories (Tela Cheia p/ Print)</span>
          </button>
        )}
      </div>

      {isPollOpen && onChangeVoteRequest && (
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={onChangeVoteRequest}
            className="inline-flex items-center gap-1.5 text-[11px] text-[#D5C5AA]/70 hover:text-emerald-400 underline underline-offset-4 cursor-pointer transition"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Alterar minha escolha na votação</span>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Modal 9:16 em Tela Cheia para Print Limpo ou Postagem nos Stories
 */
export function InstagramStoryModal({
  open,
  onClose,
  participantName,
  credentialCode,
  anonymousCode,
}: VoteReceiptProps & { open: boolean; onClose: () => void }) {
  const [cleanPrintMode, setCleanPrintMode] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!open) return null;

  const displayName = participantName?.trim() || "Membro da Arena";
  const displayCredential = credentialCode || anonymousCode || "ANM-2026";

  async function handleShareStory() {
    setSharing(true);
    setFeedback(null);
    try {
      const blob = await generateInstagramStoryBlob({
        participantName: displayName,
        credentialCode: displayCredential,
      });

      if (!blob) return;

      const file = new File([blob], "a-nova-moeda-stories.png", {
        type: "image/png",
      });

      if (
        typeof navigator !== "undefined" &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({
          title: "Eu faço parte da A Nova Moeda · UEFS",
          text: "Já votei e escolhi o tema da nossa Mesa-Redonda na A Nova Moeda! E você, já votou?",
          files: [file],
        });
        setFeedback("Compartilhado com sucesso!");
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "a-nova-moeda-stories.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setFeedback("Arte 9:16 baixada! Publique nos seus Stories do Instagram.");
    } catch {
      // ignore
    } finally {
      setSharing(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-5 overflow-y-auto select-none"
      onClick={() => {
        if (cleanPrintMode) setCleanPrintMode(false);
      }}
    >
      {!cleanPrintMode ? (
        <div className="w-full max-w-sm flex items-center justify-between gap-2 pb-2 shrink-0">
          <button
            type="button"
            onClick={() => setCleanPrintMode(true)}
            className="px-3 py-1.5 rounded-full bg-[#0A150D] border border-emerald-500/40 text-emerald-300 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>Ocultar botões p/ tirar Print</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-[#0A150D] border border-white/15 text-[#F7DECA] hover:border-emerald-400 cursor-pointer"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="text-[10px] text-white/40 py-1">
          Toque em qualquer lugar da tela para reexibir os botões
        </div>
      )}

      <div className="w-full max-w-sm my-auto">
        <EditorialPassArtwork
          displayName={displayName}
          displayCredential={displayCredential}
          compact
        />
      </div>

      {!cleanPrintMode && (
        <div className="w-full max-w-sm space-y-2 pt-3 shrink-0">
          {feedback && (
            <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs text-center font-medium">
              {feedback}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleShareStory}
              disabled={sharing}
              className="py-3.5 px-3 rounded-xl bg-[#14532D] hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg cursor-pointer transition"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>{sharing ? "Gerando..." : "Postar nos Stories"}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="py-3.5 px-3 rounded-xl bg-[#D5C5AA] text-[#030A06] font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer hover:opacity-95 transition"
            >
              <span>Continuar na Arena</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
