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
  const isAdminScreen = pathname?.startsWith("/admin");

  // O Telão ARENA, o App do Participante e todas as telas do ADMIN operam de forma isolada,
  // sem o navbar institucional nem o rodapé público que geravam poluição e redundância.
  if (isArenaScreen) {
    return (
      <div className="h-screen max-h-screen w-full overflow-hidden bg-[var(--bg-page,#030A06)] text-[var(--text-main,#D5C5AA)]">
        {children}
      </div>
    );
  }

  if (isParticiparScreen || isAdminScreen) {
    return (
      <div className="min-h-screen w-full bg-[var(--bg-page,#030A06)] text-[var(--text-main,#D5C5AA)] transition-colors duration-200">
        {children}
      </div>
    );
  }

  return (
    <>
      {navbar}
      <div className="flex-1">{children}</div>
      {footer}
    </>
  );
}
