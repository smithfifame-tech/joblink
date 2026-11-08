"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Bell, Briefcase, CheckSquare, FileText, Folder, Inbox, LayoutDashboard, Map, MessageSquare, Percent, Plus, Receipt,
  Scale, ScrollText, Search, Settings, ShieldCheck, Star, User, Users, Wallet, Flag, type LucideIcon,
} from "lucide-react";
import type { NavIcon, NavItem } from "./nav-config";
import { cn } from "@/lib/utils";

const ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboard, plus: Plus, briefcase: Briefcase, inbox: Inbox, users: Users, messages: MessageSquare,
  wallet: Wallet, star: Star, bell: Bell, user: User, settings: Settings, search: Search, map: Map, file: FileText,
  check: CheckSquare, folder: Folder, receipt: Receipt, percent: Percent, scale: Scale, flag: Flag, scroll: ScrollText, shield: ShieldCheck,
};

export function DashboardNav({ items, onNavigate, unread = 0 }: { items: NavItem[]; onNavigate?: () => void; unread?: number }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = `${pathname}${sp.size ? `?${sp}` : ""}`;
  // L'élément actif est le plus long préfixe correspondant (ex. /client/jobs/new plutôt que /client/jobs)
  const active = items
    .filter((i) => current === i.href || (!i.href.includes("?") && pathname.startsWith(`${i.href}/`)) || pathname === i.href)
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav aria-label="Navigation de l'espace" className="grid gap-0.5">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const isActive = item.href === active;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              isActive ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className={cn("size-4", isActive && "text-primary")} aria-hidden />
            <span className="flex-1">{item.label}</span>
            {item.icon === "bell" && unread > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold text-white tabular-nums">{unread > 99 ? "99+" : unread}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
