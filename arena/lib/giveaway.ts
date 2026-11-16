import fs from "fs";
import path from "path";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export interface GiveawayWinner {
  participantId: string;
  name: string;
  credentialCode: string;
  emailMasked: string;
  drawnAt: string;
}

export interface GiveawayPrize {
  id: string;
  title: string;
  description: string;
  sponsor?: string;
  photoUrl?: string;
  quantity: number;
  order: number;
  status: "PENDING" | "DRAWING" | "DRAWN";
  drawnAt?: string | null;
  winner?: GiveawayWinner | null;
  createdAt: string;
  updatedAt: string;
}

export interface GiveawaySnapshot {
  prizes: GiveawayPrize[];
  totalEligibleCount: number;
  lastDrawnPrizeId?: string | null;
  updatedAt: string;
}

const DEFAULT_PRIZES: GiveawayPrize[] = [
  {
    id: "prize_livro_anm_autografado",
    title: 'Livro "A Nova Moeda: Economia da Solidão"',
    description: "Exemplar impresso oficial autografado pelos autores e especialistas da Mesa-Redonda.",
    sponsor: "Coordenação Geral A Nova Moeda",
    quantity: 1,
    order: 1,
    status: "PENDING",
    drawnAt: null,
    winner: null,
    createdAt: new Date("2026-11-15T18:00:00Z").toISOString(),
    updatedAt: new Date("2026-11-15T18:00:00Z").toISOString(),
  },
  {
    id: "prize_kit_oficial_uefs_anm",
    title: "Kit Oficial Exclusivo A Nova Moeda",
    description: "Ecobag institucional em algodão cru, caderno comemorativo de anotações e credencial de honra.",
    sponsor: "UEFS & Vértice",
    quantity: 1,
    order: 2,
    status: "PENDING",
    drawnAt: null,
    winner: null,
    createdAt: new Date("2026-11-15T18:00:00Z").toISOString(),
    updatedAt: new Date("2026-11-15T18:00:00Z").toISOString(),
  },
  {
    id: "prize_mentoria_pos_evento",
    title: "Acesso VIP à Mentoria com Especialistas",
    description: "Sessão online exclusiva pós-evento para aprofundamento das temáticas de Economia da Solidão.",
    sponsor: "Mesa de Especialistas",
    quantity: 1,
    order: 3,
    status: "PENDING",
    drawnAt: null,
    winner: null,
    createdAt: new Date("2026-11-15T18:00:00Z").toISOString(),
    updatedAt: new Date("2026-11-15T18:00:00Z").toISOString(),
  },
];

let inMemoryPrizes: GiveawayPrize[] = [...DEFAULT_PRIZES];
let lastDrawnId: string | null = null;

function getDataFilePath(): string {
  return path.join(process.cwd(), "data", "giveaways.json");
}

function ensureDataLoaded() {
  try {
    const filePath = getDataFilePath();
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryPrizes = parsed;
      }
    } else {
      saveDataToDisk();
    }
  } catch (err) {
    // fallback em memória
  }
}

function saveDataToDisk() {
  try {
    const dirPath = path.join(process.cwd(), "data");
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    const filePath = getDataFilePath();
    fs.writeFileSync(filePath, JSON.stringify(inMemoryPrizes, null, 2), "utf-8");
  } catch {
    // ignore filesystem write errors (ex: read-only serverless environment)
  }
}

function maskEmail(email?: string | null): string {
  if (!email || !email.includes("@")) return "participante@arena.anm";
  const [user, domain] = email.split("@");
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user.slice(0, 2)}***${user.slice(-1)}@${domain}`;
}

export async function getEligibleParticipants(): Promise<Array<{
  id: string;
  name: string;
  email: string | null;
  credentialCode: string;
}>> {
  try {
    const votes = await prisma.vote.findMany({
      include: {
        session: {
          select: {
            id: true,
            name: true,
            email: true,
            credentialCode: true,
            anonymousCode: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const uniqueMap = new Map<string, {
      id: string;
      name: string;
      email: string | null;
      credentialCode: string;
    }>();

    for (const v of votes) {
      if (v.session && v.session.name && v.session.name.trim()) {
        uniqueMap.set(v.session.id, {
          id: v.session.id,
          name: v.session.name.trim(),
          email: v.session.email ?? null,
          credentialCode: v.session.credentialCode || v.session.anonymousCode || "ANM-2026",
        });
      }
    }

    return Array.from(uniqueMap.values());
  } catch (err) {
    console.warn("getEligibleParticipants: erro ao consultar votos do banco:", err);
    return [];
  }
}

export async function getGiveawaysSnapshot(): Promise<GiveawaySnapshot> {
  ensureDataLoaded();
  const eligible = await getEligibleParticipants();

  return {
    prizes: [...inMemoryPrizes].sort((a, b) => a.order - b.order),
    totalEligibleCount: eligible.length,
    lastDrawnPrizeId: lastDrawnId,
    updatedAt: new Date().toISOString(),
  };
}

export async function addGiveawayPrize(input: {
  title: string;
  description: string;
  sponsor?: string;
  quantity?: number;
}): Promise<GiveawayPrize> {
  ensureDataLoaded();
  const newPrize: GiveawayPrize = {
    id: `prize_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    title: input.title.trim(),
    description: input.description.trim(),
    sponsor: input.sponsor?.trim() || "A Nova Moeda",
    quantity: Math.max(1, input.quantity || 1),
    order: inMemoryPrizes.length + 1,
    status: "PENDING",
    drawnAt: null,
    winner: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  inMemoryPrizes.push(newPrize);
  saveDataToDisk();
  return newPrize;
}

export async function updateGiveawayPrize(
  id: string,
  input: Partial<{
    title: string;
    description: string;
    sponsor: string;
    order: number;
    quantity: number;
  }>
): Promise<GiveawayPrize | null> {
  ensureDataLoaded();
  const index = inMemoryPrizes.findIndex((p) => p.id === id);
  if (index === -1) return null;

  const current = inMemoryPrizes[index];
  inMemoryPrizes[index] = {
    ...current,
    ...input,
    updatedAt: new Date().toISOString(),
  };

  saveDataToDisk();
  return inMemoryPrizes[index];
}

export async function deleteGiveawayPrize(id: string): Promise<boolean> {
  ensureDataLoaded();
  const before = inMemoryPrizes.length;
  inMemoryPrizes = inMemoryPrizes.filter((p) => p.id !== id);
  if (inMemoryPrizes.length !== before) {
    saveDataToDisk();
    return true;
  }
  return false;
}

export async function drawGiveawayWinner(prizeId: string): Promise<{
  success: boolean;
  prize?: GiveawayPrize;
  winner?: GiveawayWinner;
  error?: string;
}> {
  ensureDataLoaded();
  const prize = inMemoryPrizes.find((p) => p.id === prizeId);
  if (!prize) {
    return { success: false, error: "Brinde não encontrado." };
  }

  const eligible = await getEligibleParticipants();
  if (!eligible.length) {
    return {
      success: false,
      error: "Nenhum participante elegível encontrado. Os participantes precisam votar na Mesa-Redonda para se habilitar ao sorteio.",
    };
  }

  // Tenta selecionar um participante que ainda não ganhou outro brinde
  const previousWinnerIds = new Set(
    inMemoryPrizes
      .filter((p) => p.id !== prizeId && p.winner?.participantId)
      .map((p) => p.winner!.participantId)
  );

  let candidates = eligible.filter((p) => !previousWinnerIds.has(p.id));
  if (!candidates.length) {
    // Se todos os participantes elegíveis já ganharam, permite repetir entre os elegíveis
    candidates = eligible;
  }

  const randomIndex = crypto.randomInt(0, candidates.length);
  const chosen = candidates[randomIndex];

  const nowIso = new Date().toISOString();
  const winner: GiveawayWinner = {
    participantId: chosen.id,
    name: chosen.name,
    credentialCode: chosen.credentialCode,
    emailMasked: maskEmail(chosen.email),
    drawnAt: nowIso,
  };

  prize.status = "DRAWN";
  prize.drawnAt = nowIso;
  prize.winner = winner;
  prize.updatedAt = nowIso;
  lastDrawnId = prize.id;

  saveDataToDisk();
  return { success: true, prize, winner };
}

export async function resetGiveawayDraw(prizeId: string): Promise<GiveawayPrize | null> {
  ensureDataLoaded();
  const prize = inMemoryPrizes.find((p) => p.id === prizeId);
  if (!prize) return null;

  prize.status = "PENDING";
  prize.drawnAt = null;
  prize.winner = null;
  prize.updatedAt = new Date().toISOString();

  if (lastDrawnId === prizeId) {
    lastDrawnId = null;
  }

  saveDataToDisk();
  return prize;
}
