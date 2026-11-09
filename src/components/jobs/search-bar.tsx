"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SearchBar({ className, defaultQuery = "", defaultCity = "" }: { className?: string; defaultQuery?: string; defaultCity?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(defaultQuery);
  const [city, setCity] = useState(defaultCity);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (city.trim()) sp.set("city", city.trim());
    router.push(`/jobs${sp.size ? `?${sp}` : ""}`);
  }

  return (
    <form
      role="search"
      onSubmit={submit}
      className={cn("flex flex-col gap-2 rounded-2xl border border-border/80 bg-white p-2 shadow-[var(--shadow-lift)] ring-1 ring-primary/5 transition-shadow focus-within:ring-4 focus-within:ring-primary/15 sm:flex-row sm:items-center sm:rounded-full sm:pl-3", className)}
    >
      <label className="flex flex-1 items-center gap-2 px-3">
        <Search className="size-[18px] shrink-0 text-primary" aria-hidden />
        <span className="sr-only">Type de travail</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Plombier, ménage, site web…"
          className="h-11 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground/70"
          maxLength={100}
        />
      </label>
      <div className="hidden h-8 w-px bg-border sm:block" aria-hidden />
      <label className="flex flex-1 items-center gap-2 border-t px-3 sm:border-t-0">
        <MapPin className="size-[18px] shrink-0 text-primary" aria-hidden />
        <span className="sr-only">Ville ou quartier</span>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Ville ou quartier"
          className="h-11 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground/70"
          maxLength={120}
          list="jl-cities"
        />
      </label>
      <Button type="submit" size="lg" className="sm:rounded-full sm:px-7">
        Rechercher
      </Button>
    </form>
  );
}
