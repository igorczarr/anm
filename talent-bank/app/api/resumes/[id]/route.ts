import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateCurrentCandidate } from "@/lib/current-candidate";
import path from "path";
import fs from "fs/promises";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { profile, user } = await getOrCreateCurrentCandidate();

    const resume = await prisma.resume.findUnique({
      where: { id },
    });

    if (!resume) {
      return NextResponse.json(
        { error: "Currículo não encontrado." },
        { status: 404 }
      );
    }

    const isOwner = resume.candidateId === profile.id;
    const isAdmin =
      user.role === "ADMIN" ||
      user.role === "RECRUITER" ||
      user.role === "JOB_MANAGER" ||
      user.role === "ANALYST";

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Acesso negado a este documento." },
        { status: 403 }
      );
    }

    const storagePath = path.join(
      process.cwd(),
      ".storage",
      "resumes",
      path.basename(resume.fileUrl)
    );

    const fileBuffer = await fs.readFile(storagePath);

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": resume.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(
          resume.fileName
        )}"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Arquivo não encontrado no armazenamento seguro." },
      { status: 404 }
    );
  }
}
