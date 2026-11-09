"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronDown, LayoutDashboard, LogOut, Menu, UserRound } from "lucide-react";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useHasSession } from "@/hooks/use-has-session";
import { LogoutButton, useLogout } from "@/components/auth/logout";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
  const { logout } = useLogout();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-[background-color,box-shadow,border-color] duration-500 ease-out",
        scrolled
          ? "border-border/70 bg-background/80 shadow-[0_8px_30px_-12px_rgb(17_24_39/0.15)] backdrop-blur-xl"
          : "border-transparent bg-background/0",
      )}
    >
      <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-3 focus:py-2 focus:text-background">
        Aller au contenu
      </a>
      <div className={cn("mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 transition-[height] duration-500 ease-out sm:px-6", scrolled ? "h-16" : "h-[76px]")}>
        <Logo />
        <nav aria-label="Navigation principale" className="hidden items-center gap-0.5 rounded-full border border-border/80 bg-muted/60 p-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition-all duration-300 hover:text-foreground",
                isActive(item.href) && "bg-background text-primary-strong shadow-[0_1px_3px_rgb(17_24_39/0.1)]",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {dashboardHref ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-full pl-1.5" aria-label="Menu du compte">
                  <span className="grid size-7 place-items-center rounded-full bg-accent text-primary"><UserRound className="size-4" /></span>
                  Mon compte <ChevronDown className="size-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem asChild>
                  <Link href={dashboardHref}><LayoutDashboard /> Mon espace</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => logout()} className="text-destructive focus:text-destructive">
                  <LogOut className="!text-destructive" /> Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button asChild variant="ghost" className="rounded-full">
                <Link href="/login">Connexion</Link>
              </Button>
              <Button asChild variant="ghost" className="rounded-full text-primary-strong hover:bg-accent">
                <Link href="/register?type=worker">Devenir travailleur</Link>
              </Button>
            </>
          )}
          <Button asChild className="rounded-full px-5 shadow-[0_6px_16px_-4px_rgb(22_163_74/0.5)]">
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
              {NAV.map((item, i) => (
                <SheetClose asChild key={item.href}>
                  <Link
                    href={item.href}
                    style={{ animationDelay: `${120 + i * 60}ms` }}
                    className={cn("animate-[slide-in-x_.5s_cubic-bezier(.22,1,.36,1)_both] rounded-lg px-3 py-3 text-base", isActive(item.href) ? "bg-accent font-medium text-accent-foreground" : "hover:bg-muted")}
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
                <>
                  <SheetClose asChild>
                    <Button asChild variant="outline" size="lg">
                      <Link href={dashboardHref}><LayoutDashboard /> Mon espace</Link>
                    </Button>
                  </SheetClose>
                  <LogoutButton className="h-12 w-full justify-center rounded-xl text-base font-semibold text-destructive transition-colors hover:bg-red-50" />
                </>
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
