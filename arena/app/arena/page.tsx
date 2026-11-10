import { Suspense } from "react";
import { ArenaScreen } from "@/components/arena-screen";

export const dynamic = "force-dynamic";

export default function ArenaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-[#030A06] flex items-center justify-center text-sm text-[#D5C5AA]">
          Carregando projeção pública ARENA...
        </div>
      }
    >
      <ArenaScreen />
    </Suspense>
  );
}
