"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/** Message de bienvenue après la confirmation de l'e-mail ou la connexion Google (?welcome=1). */
export function WelcomeToast() {
  const sp = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (sp.get("welcome") !== "1") return;
    toast.success("Bienvenue sur JOBLINK !", { description: "Votre compte est actif, vous êtes connecté." });
    const params = new URLSearchParams(sp.toString());
    params.delete("welcome");
    router.replace(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false });
  }, [sp, pathname, router]);
  return null;
}
