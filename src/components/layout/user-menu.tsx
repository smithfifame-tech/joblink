"use client";

import Link from "next/link";
import { ChevronDown, Home, LogOut, Settings, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLogout } from "@/components/auth/logout";

export function UserMenu({ name, email, avatar, profileHref, settingsHref }: { name: string; email: string; avatar: string | null; profileHref: string; settingsHref: string }) {
  const { logout } = useLogout();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg p-1 pr-2 transition-colors hover:bg-muted" aria-label="Menu du compte">
        <Avatar className="size-8">
          {avatar && <AvatarImage src={avatar} alt="" />}
          <AvatarFallback>{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-32 truncate text-sm font-medium sm:block">{name}</span>
        <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <p className="font-medium">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link href={profileHref}><User /> Mon profil</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href={settingsHref}><Settings /> Paramètres</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href="/"><Home /> Site public</Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => logout()} className="text-destructive focus:text-destructive">
          <LogOut className="!text-destructive" /> Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
