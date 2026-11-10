import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const targetUrl =
    searchParams.get("url") ||
    (process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/participar`
      : `${origin}/participar`);

  const svg = await QRCode.toString(targetUrl, {
    type: "svg",
    margin: 1,
    color: {
      dark: "#0F172A",
      light: "#FFFFFF",
    },
  });

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
