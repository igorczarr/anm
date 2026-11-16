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

  // O Telão ARENA e o App do Participante operam em modo 100% no-scroll (100dvh)
  if (isArenaScreen || isParticiparScreen) {
    return (
      <div className="h-dvh max-h-dvh w-full overflow-hidden bg-[var(--bg-page,#030A06)] text-[var(--text-main,#D5C5AA)] transition-colors duration-200">
        {children}
      </div>
    );
  }

  if (isAdminScreen) {
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
