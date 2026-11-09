export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { homeForRole, requireUser } from "@/lib/auth/session";

/** Aiguillage après connexion selon le rôle stocké en base. */
export default async function AccountPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const { welcome } = await searchParams;
  const suffix = welcome === "1" ? "?welcome=1" : "";
  const user = await requireUser(`/account${suffix}`);
  redirect(`${homeForRole(user.primaryRole)}${suffix}`);
}
