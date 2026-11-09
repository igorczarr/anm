import { NextRequest } from "next/server";
import { getArenaSyncSnapshot } from "@/lib/live-state";
import { getAuthenticatedAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const wantAdmin = searchParams.get("admin") === "1";
  const admin = wantAdmin ? await getAuthenticatedAdmin() : null;
  const includeAdminStats = Boolean(admin);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let lastSeq = 0;
      let closed = false;

      req.signal.addEventListener("abort", () => {
        closed = true;
        try {
          controller.close();
        } catch {
          // ignore
        }
      });

      const sendSnapshot = async (forceFull = false) => {
        if (closed) return;
        try {
          const snapshot = await getArenaSyncSnapshot({
            sinceSeq: forceFull ? undefined : lastSeq,
            includeAdminStats,
          });
          if (snapshot.seq && snapshot.seq > lastSeq) {
            lastSeq = snapshot.seq;
          }
          const payload = `event: sync\ndata: ${JSON.stringify(snapshot)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch (err) {
          const errPayload = `event: error\ndata: ${JSON.stringify({
            message: err instanceof Error ? err.message : "sync_error",
          })}\n\n`;
          controller.enqueue(encoder.encode(errPayload));
        }
      };

      // Envia snapshot inicial imediatamente ao conectar
      await sendSnapshot(true);

      // Ciclo compatível com Vercel Serverless (mantém stream por ~24s e cliente reconecta suavemente)
      const maxTicks = 12;
      for (let i = 0; i < maxTicks; i++) {
        if (closed) break;
        await new Promise((r) => setTimeout(r, 2000));
        if (closed) break;
        await sendSnapshot(false);
      }

      if (!closed) {
        try {
          controller.close();
        } catch {
          // ignore
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
