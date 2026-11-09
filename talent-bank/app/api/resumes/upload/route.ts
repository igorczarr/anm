import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateCurrentCandidate } from "@/lib/current-candidate";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8 MB configurável
const ALLOWED_MIME_TYPES: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

function validateMagicBytes(buffer: Buffer, ext: string): boolean {
  if (buffer.length < 4) return false;
  // PDF começa com %PDF (0x25 0x50 0x44 0x46)
  if (ext === ".pdf") {
    return (
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    );
  }
  // DOCX é um container ZIP que começa com PK\x03\x04 (0x50 0x4B 0x03 0x04)
  if (ext === ".docx") {
    return (
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    );
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const { profile } = await getOrCreateCurrentCandidate();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Nenhum arquivo enviado." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "O arquivo excede o limite máximo de 8 MB." },
        { status: 400 }
      );
    }

    const ext = ALLOWED_MIME_TYPES[file.type];
    if (!ext) {
      return NextResponse.json(
        { error: "Formato inválido. Envie apenas arquivos PDF ou DOCX." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!validateMagicBytes(buffer, ext)) {
      return NextResponse.json(
        { error: "Assinatura do arquivo inválida para o formato informado." },
        { status: 400 }
      );
    }

    const storageDir = path.join(process.cwd(), ".storage", "resumes");
    await fs.mkdir(storageDir, { recursive: true });

    const safeToken = crypto.randomBytes(12).toString("hex");
    const storedFileName = `${profile.id}-${Date.now()}-${safeToken}${ext}`;
    const storedPath = path.join(storageDir, storedFileName);

    await fs.writeFile(storedPath, buffer);

    const lastResume = await prisma.resume.findFirst({
      where: { candidateId: profile.id },
      orderBy: { version: "desc" },
    });

    const nextVersion = (lastResume?.version || 0) + 1;

    await prisma.resume.updateMany({
      where: { candidateId: profile.id, isActive: true },
      data: { isActive: false },
    });

    const created = await prisma.resume.create({
      data: {
        candidateId: profile.id,
        fileName: file.name,
        fileUrl: storedFileName,
        mimeType: file.type,
        fileSize: file.size,
        version: nextVersion,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      resume: created,
    });
  } catch (err) {
    console.error("Erro no upload de currículo:", err);
    return NextResponse.json(
      { error: "Falha interna ao processar o envio do currículo." },
      { status: 500 }
    );
  }
}
