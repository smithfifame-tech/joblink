"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, House, Map as MapIcon, Plus, UserRound } from "lucide-react";
import { useHasSession } from "@/hooks/use-has-session";
import { cn } from "@/lib/utils";

/** Barre d'onglets fixe en bas de l'écran sur téléphone : les 5 destinations principales à portée de pouce. */
export function MobileTabBar() {
  const pathname = usePathname();
  const hasSession = useHasSession();
  const items = [
    { href: "/", label: "Accueil", icon: House, active: pathname === "/" },
    { href: "/jobs", label: "Missions", icon: Briefcase, active: pathname.startsWith("/jobs") },
    { href: "/client/jobs/new", label: "Publier", icon: Plus, active: false, primary: true },
    { href: "/map", label: "Carte", icon: MapIcon, active: pathname.startsWith("/map") },
    { href: hasSession ? "/account" : "/login", label: hasSession ? "Mon espace" : "Connexion", icon: UserRound, active: false },
  ];
  return (
    <nav
      aria-label="Navigation rapide"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-8px_30px_-12px_rgb(17_24_39/0.18)] backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map((it) => (
          <li key={it.label}>
            <Link
              href={it.href}
              prefetch={it.primary ? false : undefined}
              aria-current={it.active ? "page" : undefined}
              className={cn(
                "flex h-[58px] flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold transition-colors",
                it.active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {it.primary ? (
                <span className="-mt-6 grid size-12 place-items-center rounded-full bg-primary text-white shadow-[0_10px_22px_-8px_rgb(22_163_74/0.9)] ring-4 ring-background transition-transform active:scale-95">
                  <it.icon className="size-6" />
                </span>
              ) : (
                <it.icon className={cn("size-5 transition-transform", it.active && "scale-110")} />
              )}
              <span className={cn(it.primary && "text-primary-strong")}>{it.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
