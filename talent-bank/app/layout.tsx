import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Navbar } from "@/components/navbar";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Talent Hub",
  description:
    "Seu próximo passo profissional pode começar com uma conexão. Cadastre seu perfil, apresente suas competências e encontre oportunidades.",
  icons: {
    icon: [{ url: "/talentos/icon.svg", type: "image/svg+xml" }],
    shortcut: "/talentos/icon.svg",
    apple: "/talentos/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const rawClerkKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    "pk_test_c3RpcnJlZC1qYWd1YXItMTgzNi5jbGVyay5hY2NvdW50cy5kZXYk";
  const clerkPublishableKey = rawClerkKey
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();

  return (
    <html lang="pt-BR" data-theme="light" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#030A06] text-[#D5C5AA]">
        <ClerkProvider
          publishableKey={clerkPublishableKey}
          signInUrl="/talentos/entrar"
          signUpUrl="/talentos/cadastro"
          signInFallbackRedirectUrl="/talentos/painel"
          signUpFallbackRedirectUrl="/talentos/painel"
        >
          <Navbar />
          <div className="flex-1">{children}</div>
          <footer className="border-t border-[#D5C5AA]/15 bg-[#0A150D] py-8 mt-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#D5C5AA]/70">
              <div className="flex items-center gap-2.5">
                <img
                  src="/talentos/icon.svg"
                  alt="A Nova Moeda"
                  className="w-6 h-6 rounded-md"
                />
                <span className="font-medium text-[#F7DECA]">
                  A Nova Moeda · Talent Hub
                </span>
                <span>© 2026</span>
              </div>
              <div className="flex items-center gap-6 font-medium">
                <a href="/talentos/privacidade" className="hover:text-[#F7DECA] transition">
                  Termos & Privacidade (LGPD)
                </a>
                <a href="/talentos/vagas" className="hover:text-[#F7DECA] transition">
                  Oportunidades
                </a>
                <a href="/talentos/admin" className="hover:text-[#F7DECA] transition">
                  Área de Recrutadores
                </a>
              </div>
            </div>
          </footer>
        </ClerkProvider>
      </body>
    </html>
  );
}
