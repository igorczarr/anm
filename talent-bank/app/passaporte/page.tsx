import { redirect } from "next/navigation";
import { getOrCreateCurrentCandidate } from "@/lib/current-candidate";

export const dynamic = "force-dynamic";

export default async function MyPassportRedirectPage() {
  const { profile } = await getOrCreateCurrentCandidate();
  redirect(`/passaporte/${profile.id}`);
}
