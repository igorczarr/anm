import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import { LayoutChrome } from "@/components/layout-chrome";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "A Nova Moeda · Sistema de Gestão e Interação da Arena (UEFS)",
  description:
    "Plataforma de comando operacional, telão ARENA e interação em tempo real do evento A Nova Moeda — Economia da Solidão (UEFS).",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const footer = (
    <footer className="border-t border-[#D5C5AA]/15 bg-[#0A150D] py-6 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#D5C5AA]/70">
        <div className="flex items-center gap-2.5">
          <img
            src="/icon.svg"
            alt="A Nova Moeda"
            className="w-6 h-6 rounded-md"
          />
          <span className="font-semibold text-[#F7DECA]">
            A Nova Moeda
          </span>
          <span>· UEFS · Arena Operacional</span>
        </div>
        <div className="flex items-center gap-6 font-medium text-[11px] text-[#D5C5AA]/50">
          <span>Ambiente Oficial de Transmissão e Interação</span>
        </div>
      </div>
    </footer>
  );

  return (
    <html lang="pt-BR" data-theme="light" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#030A06] text-[#D5C5AA]">
        <LayoutChrome navbar={<Navbar />} footer={footer}>
          {children}
        </LayoutChrome>
      </body>
    </html>
  );
}
