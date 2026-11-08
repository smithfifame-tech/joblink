export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { homeForRole, requireUser } from "@/lib/auth/session";

/** Aiguillage après connexion selon le rôle stocké en base. */
export default async function AccountPage() {
  const user = await requireUser("/account");
  redirect(homeForRole(user.primaryRole));
}
