"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Download, Search, X } from "lucide-react";
import { categoryPhotoByName } from "@/lib/media/category-photos";
import { JobStatusBadge } from "@/components/jobs/status-badge";
import { formatRelative, formatXOF } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { JobStatus } from "@/types/db";
import { JobVisibilityToggle } from "./owner-actions";

/* ───────────── État du site en direct + actualisation automatique ───────────── */

type Health = { state: "loading" } | { state: "ok"; latency: number; at: Date } | { state: "down"; reason: string; at: Date };

const AUTO_KEY = "jl_owner_auto_refresh";
const PERIOD_MS = 60_000;

/**
 * Interroge /api/health chaque minute (onglet visible uniquement) et, si l'option est activée,
 * recharge les données du tableau de bord au même rythme. `variant` choisit l'habillage ;
 * une seule des deux instances (barre latérale / mobile) est active selon la largeur d'écran.
 */
export function LivePanel({ variant }: { variant: "sidebar" | "bar" }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [health, setHealth] = useState<Health>({ state: "loading" });
  const [auto, setAuto] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setEnabled(variant === "sidebar" ? mq.matches : !mq.matches);
    sync();
    mq.addEventListener("change", sync);
    try {
      setAuto(window.localStorage.getItem(AUTO_KEY) === "1");
    } catch {
      /* stockage indisponible : option désactivée */
    }
    return () => mq.removeEventListener("change", sync);
  }, [variant]);

  useEffect(() => {
    if (!enabled) return;
    let stop = false;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch("/api/health", { cache: "no-store" });
        const j = (await r.json()) as { status?: string; latency_ms?: number; checks?: { database?: string } };
        if (stop) return;
        if (r.ok && j.status === "ok") setHealth({ state: "ok", latency: j.latency_ms ?? 0, at: new Date() });
        else setHealth({ state: "down", reason: j.checks?.database === "erreur" ? "Base de données injoignable" : "Service dégradé", at: new Date() });
      } catch {
        if (!stop) setHealth({ state: "down", reason: "Le site ne répond pas", at: new Date() });
      }
    };
    check();
    const id = window.setInterval(() => {
      check();
      if (auto && document.visibilityState === "visible") router.refresh();
    }, PERIOD_MS);
    return () => {
      stop = true;
      window.clearInterval(id);
    };
  }, [enabled, auto, router]);

  const toggle = () => {
    const next = !auto;
    setAuto(next);
    try {
      window.localStorage.setItem(AUTO_KEY, next ? "1" : "0");
    } catch {
      /* ignoré */
    }
  };

  const dark = variant === "sidebar";
  const time = health.state === "loading" ? null : health.at.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const dot = health.state === "ok" ? "bg-green-400" : health.state === "down" ? "bg-red-500" : "bg-amber-400";

  return (
    <div className={cn(dark ? "rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10" : "mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-3 lg:hidden")}>
      <div aria-live="polite">
        <p className={cn("flex items-center gap-2 text-xs font-semibold", dark ? (health.state === "down" ? "text-red-200" : "text-green-200") : health.state === "down" ? "text-red-700" : "text-primary-strong")}>
          <span className="relative flex size-2">
            {health.state !== "loading" && <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-70", dot)} />}
            <span className={cn("relative inline-flex size-2 rounded-full", dot)} />
          </span>
          {health.state === "loading" ? "Vérification du site…" : health.state === "ok" ? "Site en ligne" : "Problème détecté"}
        </p>
        <p className={cn("mt-1 text-xs leading-relaxed", dark ? "text-white/60" : "text-muted-foreground")}>
          {health.state === "loading"
            ? "Contrôle en cours."
            : health.state === "ok"
              ? `Base de données OK · réponse en ${health.latency} ms · vérifié à ${time}`
              : `${health.reason} · vérifié à ${time}`}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={auto}
        onClick={toggle}
        className={cn("flex items-center gap-2.5 text-left text-xs font-medium", dark ? "mt-3 w-full border-t border-white/10 pt-3 text-white/80" : "text-foreground")}
      >
        <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", auto ? "bg-green-400" : dark ? "bg-white/20" : "bg-border")}>
          <span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow transition-all", auto ? "left-[18px]" : "left-0.5")} />
        </span>
        Actualiser les données chaque minute
      </button>
    </div>
  );
}

/* ───────────── Export CSV ───────────── */

/** Neutralise les formules (=, +, -, @) et échappe les guillemets : fichier sûr à ouvrir dans un tableur. */
function csvCell(v: string | number | null | undefined): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function ExportCsv({ filename, headers, rows, label = "Exporter (CSV)" }: { filename: string; headers: string[]; rows: (string | number | null | undefined)[][]; label?: string }) {
  const download = () => {
    const csv = "﻿" + [headers, ...rows].map((r) => r.map(csvCell).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <button
      type="button"
      onClick={download}
      disabled={!rows.length}
      className="inline-flex h-9 items-center gap-1.5 rounded-full border bg-white px-3.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-primary-strong disabled:opacity-50"
    >
      <Download className="size-3.5" /> {label}
    </button>
  );
}

/* ───────────── Missions : recherche et filtres ───────────── */

export type OwnerJobRow = {
  id: string; title: string; city: string; neighborhood: string; budget_amount: number; status: string;
  is_hidden: boolean; created_at: string; applications_count: number; category: string;
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon", published: "Publiée", reviewing: "Candidatures en cours", assigned: "Attribuée", in_progress: "En cours",
  completed: "Terminée", cancelled: "Annulée", disputed: "En litige",
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function JobsExplorer({ jobs }: { jobs: OwnerJobRow[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const statuses = useMemo(() => Array.from(new Set(jobs.map((j) => j.status))), [jobs]);
  const hiddenCount = useMemo(() => jobs.filter((j) => j.is_hidden).length, [jobs]);
  const shown = useMemo(() => {
    const needle = norm(q.trim());
    return jobs.filter((j) => {
      if (filter === "hidden" ? !j.is_hidden : filter !== "all" && j.status !== filter) return false;
      return !needle || norm(`${j.title} ${j.category} ${j.city} ${j.neighborhood}`).includes(needle);
    });
  }, [jobs, q, filter]);

  const total = shown.reduce((s, j) => s + j.budget_amount, 0);
  const chips = [
    { key: "all", label: "Toutes", count: jobs.length },
    ...statuses.map((s) => ({ key: s, label: STATUS_LABELS[s] ?? s, count: jobs.filter((j) => j.status === s).length })),
    ...(hiddenCount ? [{ key: "hidden", label: "Masquées", count: hiddenCount }] : []),
  ];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-[220px] flex-1">
          <span className="sr-only">Rechercher une mission</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Titre, catégorie, ville ou quartier…"
            className="h-10 w-full rounded-full border bg-white pl-10 pr-9 text-sm outline-none transition-shadow focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
          />
          {q && (
            <button type="button" aria-label="Effacer la recherche" onClick={() => setQ("")} className="absolute right-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-muted">
              <X className="size-3.5" />
            </button>
          )}
        </label>
        <ExportCsv
          filename="joblink-missions"
          headers={["Titre", "Catégorie", "Ville", "Quartier", "Budget (FCFA)", "Statut", "Masquée", "Candidatures", "Publiée le"]}
          rows={shown.map((j) => [j.title, j.category, j.city, j.neighborhood, j.budget_amount, STATUS_LABELS[j.status] ?? j.status, j.is_hidden ? "Oui" : "Non", j.applications_count, j.created_at.slice(0, 10)])}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            aria-pressed={filter === c.key}
            onClick={() => setFilter(c.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              filter === c.key ? "border-primary bg-primary text-white" : "border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {c.label}
            <span className={cn("rounded-full px-1.5 text-[10px]", filter === c.key ? "bg-white/20" : "bg-muted")}>{c.count}</span>
          </button>
        ))}
        <p className="ml-auto self-center text-xs text-muted-foreground">
          {shown.length} mission{shown.length > 1 ? "s" : ""} · budgets cumulés <strong className="text-foreground">{formatXOF(total)}</strong>
        </p>
      </div>

      {shown.length ? (
        <ul className="grid gap-3">
          {shown.map((j) => (
            <li
              key={j.id}
              className={cn("flex flex-wrap items-center gap-4 rounded-2xl border p-4 transition-all duration-300 hover:border-primary/30 hover:shadow-[var(--shadow-soft)]", j.is_hidden && "bg-muted/50 opacity-80")}
            >
              <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                <Image src={categoryPhotoByName(j.category).src} alt="" fill sizes="56px" className="object-cover" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/jobs/${j.id}`} target="_blank" className="truncate font-semibold hover:text-primary-strong">{j.title}</Link>
                  <JobStatusBadge status={j.status as JobStatus} />
                  {j.is_hidden && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Masquée</span>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {j.category} · {j.neighborhood}, {j.city} · {j.applications_count} candidature{j.applications_count > 1 ? "s" : ""} · {formatRelative(j.created_at)}
                </p>
              </div>
              <p className="font-bold tabular-nums text-primary-strong">{formatXOF(j.budget_amount)}</p>
              <JobVisibilityToggle jobId={j.id} hidden={j.is_hidden} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Aucune mission ne correspond à ces critères.</p>
      )}
    </div>
  );
}
