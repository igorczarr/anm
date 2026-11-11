"use client";

import { usePathname } from "next/navigation";

export function LayoutChrome({
  navbar,
  footer,
  children,
}: {
  navbar: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isArenaScreen = pathname?.startsWith("/arena");
  const isParticiparScreen = pathname?.startsWith("/participar");

  // O Telão ARENA e a tela do Participante rodam em modo imersivo e cego (sem header global nem rodapé de navegação cruzada)
  if (isArenaScreen || isParticiparScreen) {
    return <div className="min-h-screen w-full bg-[#030A06]">{children}</div>;
  }

  return (
    <>
      {navbar}
      <div className="flex-1">{children}</div>
      {footer}
    </>
  );
}
