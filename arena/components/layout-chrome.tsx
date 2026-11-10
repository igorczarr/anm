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

  if (isArenaScreen) {
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
