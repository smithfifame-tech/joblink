"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DashboardNav } from "./dashboard-nav";
import { Logo } from "./logo";
import type { NavItem } from "./nav-config";

export function MobileDashboardNav({ items, title, unread }: { items: NavItem[]; title: string; unread: number }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Ouvrir le menu">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0">
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <div className="border-b px-5 py-4"><Logo /></div>
        <p className="px-6 pb-1 pt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
        <div className="overflow-y-auto px-3 pb-6"><DashboardNav items={items} unread={unread} onNavigate={() => setOpen(false)} /></div>
      </SheetContent>
    </Sheet>
  );
}
