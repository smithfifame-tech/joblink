"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Menu } from "lucide-react";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useHasSession } from "@/hooks/use-has-session";

const NAV = [
  { href: "/", label: "Accueil" },
  { href: "/jobs", label: "Trouver une mission" },
  { href: "/map", label: "Carte" },
  { href: "/how-it-works", label: "Comment ça marche" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const dashboardHref = useHasSession() ? "/account" : null;
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-3 focus:py-2 focus:text-background">
        Aller au contenu
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Logo />
        <nav aria-label="Navigation principale" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
                isActive(item.href) && "font-medium text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {dashboardHref ? (
            <Button asChild variant="outline">
              <Link href={dashboardHref}>
                <LayoutDashboard /> Mon espace
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Connexion</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/register?type=worker">Devenir travailleur</Link>
              </Button>
            </>
          )}
          <Button asChild>
            <Link href={dashboardHref ? "/client/jobs/new" : "/register?type=client"}>Publier une mission</Link>
          </Button>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Ouvrir le menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="p-0">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <div className="border-b px-5 py-4">
              <Logo />
            </div>
            <nav aria-label="Navigation mobile" className="grid gap-1 p-3">
              {NAV.map((item) => (
                <SheetClose asChild key={item.href}>
                  <Link
                    href={item.href}
                    className={cn("rounded-lg px-3 py-3 text-base", isActive(item.href) ? "bg-accent font-medium text-accent-foreground" : "hover:bg-muted")}
                  >
                    {item.label}
                  </Link>
                </SheetClose>
              ))}
            </nav>
            <div className="mt-auto grid gap-2 border-t p-4">
              <SheetClose asChild>
                <Button asChild size="lg">
                  <Link href={dashboardHref ? "/client/jobs/new" : "/register?type=client"}>Publier une mission</Link>
                </Button>
              </SheetClose>
              {dashboardHref ? (
                <SheetClose asChild>
                  <Button asChild variant="outline" size="lg">
                    <Link href={dashboardHref}>Mon espace</Link>
                  </Button>
                </SheetClose>
              ) : (
                <>
                  <SheetClose asChild>
                    <Button asChild variant="outline" size="lg">
                      <Link href="/register?type=worker">Devenir travailleur</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button asChild variant="ghost" size="lg">
                      <Link href="/login">Connexion</Link>
                    </Button>
                  </SheetClose>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
