"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Download, Eye, EyeOff, Loader2, Save } from "lucide-react";
import { setAnnouncementAction } from "@/app/admin/joblink/actions";
import { AnnouncementView, type AnnouncementTone } from "@/components/layout/announcement-view";
import type { OwnerAnnouncement, OwnerUser } from "@/lib/owner-panel/server";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import { SuspendToggle } from "./owner-actions";

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

/* ───────────── Missions : libellés partagés (export CSV) ───────────── */

export const JOB_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon", published: "Publiée", reviewing: "Candidatures en cours", assigned: "Attribuée", in_progress: "En cours",
  completed: "Terminée", cancelled: "Annulée", disputed: "En litige",
};

/* ───────────── Utilisateurs : filtres, tri et export ───────────── */

const ROLE_LABELS: Record<string, string> = { client: "Client", worker: "Travailleur", admin: "Admin" };
type UserFilter = "all" | "client" | "worker" | "suspended" | "inactive";
type UserSort = "recent" | "active" | "name";

export function UsersExplorer({ users, detailQuery = "" }: { users: OwnerUser[]; detailQuery?: string }) {
  const [filter, setFilter] = useState<UserFilter>("all");
  const [sort, setSort] = useState<UserSort>("recent");

  const activity = (u: OwnerUser) => u.jobs_count + u.applications_count;
  const match = (u: OwnerUser, f: UserFilter) =>
    f === "all" ? true : f === "suspended" ? u.is_suspended : f === "inactive" ? activity(u) === 0 : u.roles.includes(f);
  const shown = useMemo(() => {
    const list = users.filter((u) => match(u, filter));
    return list.sort((a, b) =>
      sort === "name"
        ? `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, "fr")
        : sort === "active"
          ? activity(b) - activity(a)
          : b.created_at.localeCompare(a.created_at),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, filter, sort]);

  const chips: { key: UserFilter; label: string }[] = [
    { key: "all", label: "Tous" },
    { key: "client", label: "Clients" },
    { key: "worker", label: "Travailleurs" },
    { key: "inactive", label: "Sans activité" },
    { key: "suspended", label: "Suspendus" },
  ];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
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
            <span className={cn("rounded-full px-1.5 text-[10px]", filter === c.key ? "bg-white/20" : "bg-muted")}>{users.filter((u) => match(u, c.key)).length}</span>
          </button>
        ))}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Trier par
            <select value={sort} onChange={(e) => setSort(e.target.value as UserSort)} className="h-9 rounded-full border bg-white px-3 text-xs font-semibold text-foreground outline-none focus:border-primary/50">
              <option value="recent">Inscription récente</option>
              <option value="active">Les plus actifs</option>
              <option value="name">Nom (A → Z)</option>
            </select>
          </label>
          <ExportCsv
            filename="joblink-utilisateurs"
            headers={["Prénom", "Nom", "E-mail", "Téléphone", "Rôles", "Ville", "Quartier", "Missions", "Candidatures", "Suspendu", "Inscription"]}
            rows={shown.map((u) => [u.first_name, u.last_name, u.email, u.phone, u.roles.map((r) => ROLE_LABELS[r] ?? r).join(", "), u.city, u.neighborhood, u.jobs_count, u.applications_count, u.is_suspended ? "Oui" : "Non", u.created_at.slice(0, 10)])}
          />
        </div>
      </div>

      {shown.length ? (
        <div className="-mx-5 overflow-x-auto border-t sm:-mx-6">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-semibold">Membre</th>
                <th className="px-5 py-3 font-semibold">Rôles</th>
                <th className="px-5 py-3 font-semibold">Ville</th>
                <th className="px-5 py-3 font-semibold">Activité</th>
                <th className="px-5 py-3 font-semibold">Inscription</th>
                <th className="px-5 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {shown.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-accent/30">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className={cn("grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold", u.is_suspended ? "bg-red-50 text-red-700" : "bg-gradient-to-br from-accent to-green-100 text-primary-strong")}>
                        {u.first_name.charAt(0)}{u.last_name.charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <Link href={`/admin/joblink?tab=users${detailQuery}&user=${u.id}`} scroll={false} className="font-semibold hover:text-primary-strong hover:underline">
                          {u.first_name} {u.last_name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{u.email}{u.phone ? ` · ${u.phone}` : ""}</p>
                        {u.is_suspended && <p className="mt-1 text-xs font-medium text-red-600">Suspendu{u.suspended_reason ? ` — ${u.suspended_reason}` : ""}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r) => (
                        <span key={r} className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", r === "admin" ? "bg-primary-strong text-white" : "bg-accent text-primary-strong")}>
                          {ROLE_LABELS[r] ?? r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground">{[u.neighborhood, u.city].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground">{u.jobs_count} mission{u.jobs_count > 1 ? "s" : ""} · {u.applications_count} candidature{u.applications_count > 1 ? "s" : ""}</td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground">{formatDate(u.created_at)}</td>
                  <td className="px-5 py-3.5 text-right">
                    {u.roles.includes("admin") ? <span className="text-xs text-muted-foreground">—</span> : <SuspendToggle userId={u.id} suspended={u.is_suspended} name={u.first_name} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">Aucun utilisateur ne correspond à ces critères.</p>
      )}
    </div>
  );
}

/* ───────────── Annonce du site ───────────── */

const LINKS = [
  { value: "", label: "Aucun lien" },
  { value: "/jobs", label: "Les missions" },
  { value: "/map", label: "La carte" },
  { value: "/client/jobs/new", label: "Publier une mission" },
  { value: "/register?type=worker", label: "Devenir travailleur" },
  { value: "/how-it-works", label: "Comment ça marche" },
  { value: "/faq", label: "Questions fréquentes" },
  { value: "/contact", label: "Contact" },
];
const DURATIONS = [
  { value: "", label: "Jusqu'à ce que je la retire" },
  { value: "24", label: "24 heures" },
  { value: "72", label: "3 jours" },
  { value: "168", label: "7 jours" },
  { value: "720", label: "30 jours" },
];
const TONE_CHOICES: { value: AnnouncementTone; label: string; swatch: string }[] = [
  { value: "info", label: "Information", swatch: "bg-primary-strong" },
  { value: "success", label: "Bonne nouvelle", swatch: "bg-primary" },
  { value: "warning", label: "Attention", swatch: "bg-amber-300" },
];
const field = "h-11 w-full rounded-xl border bg-white px-3.5 text-sm outline-none transition-shadow focus:border-primary/50 focus:ring-4 focus:ring-primary/10";

export function AnnouncementForm({ initial }: { initial: OwnerAnnouncement }) {
  const [message, setMessage] = useState(initial.message);
  const [tone, setTone] = useState<AnnouncementTone>(initial.tone);
  const [linkUrl, setLinkUrl] = useState(LINKS.some((l) => l.value === initial.link_url) ? (initial.link_url ?? "") : "");
  const [linkLabel, setLinkLabel] = useState(initial.link_label ?? "");
  const [hours, setHours] = useState("");
  const [pending, start] = useTransition();

  const save = (active: boolean) =>
    start(async () => {
      const r = await setAnnouncementAction({ message, tone, linkUrl, linkLabel, active, hours: hours ? Number(hours) : null });
      if (r.ok) toast.success(active ? "Annonce publiée : elle apparaît sur le site d'ici une minute." : "Annonce retirée du site.");
      else toast.error(r.error ?? "Action impossible.");
    });

  const preview = message.trim();
  return (
    <div className="grid gap-6">
      <p className={cn("flex flex-wrap items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium", initial.visible ? "bg-accent text-primary-strong" : "bg-muted text-muted-foreground")}>
        {initial.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
        {initial.visible
          ? `En ligne sur le site${initial.expires_at ? ` jusqu'au ${formatDateTime(initial.expires_at)}` : ""}.`
          : initial.active && initial.expires_at
            ? "L'annonce a expiré : elle n'est plus affichée."
            : "Aucune annonce n'est affichée sur le site pour le moment."}
      </p>

      <div className="grid gap-5 lg:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-semibold lg:col-span-2">
          Message
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 240))}
            rows={3}
            placeholder="Ex. : Bienvenue sur JOBLINK ! Publiez votre première mission gratuitement."
            className={cn(field, "h-auto py-3 font-normal")}
          />
          <span className="text-xs font-normal text-muted-foreground">{message.length} / 240 caractères · affiché en haut de toutes les pages publiques</span>
        </label>

        <fieldset className="grid gap-1.5 text-sm font-semibold">
          <legend className="mb-1.5">Style</legend>
          <div className="flex flex-wrap gap-2">
            {TONE_CHOICES.map((t) => (
              <button
                key={t.value}
                type="button"
                aria-pressed={tone === t.value}
                onClick={() => setTone(t.value)}
                className={cn("inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors", tone === t.value ? "border-primary bg-accent text-primary-strong" : "bg-white text-muted-foreground hover:border-primary/40")}
              >
                <span className={cn("size-3 rounded-full", t.swatch)} /> {t.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="grid gap-1.5 text-sm font-semibold">
          Durée d&apos;affichage
          <select value={hours} onChange={(e) => setHours(e.target.value)} className={cn(field, "font-normal")}>
            {DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </label>

        <label className="grid gap-1.5 text-sm font-semibold">
          Lien (page du site)
          <select value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className={cn(field, "font-normal")}>
            {LINKS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </label>

        <label className="grid gap-1.5 text-sm font-semibold">
          Texte du lien
          <input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value.slice(0, 40))} disabled={!linkUrl} placeholder="En savoir plus" className={cn(field, "font-normal disabled:bg-muted")} />
        </label>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aperçu</p>
        <div className="overflow-hidden rounded-2xl border">
          {preview ? (
            <AnnouncementView a={{ message: preview, tone, link_url: linkUrl || null, link_label: linkLabel || null }} onClose={() => {}} />
          ) : (
            <p className="p-5 text-center text-sm text-muted-foreground">Écrivez un message pour voir l&apos;aperçu.</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={pending || !preview}
          onClick={() => save(true)}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white shadow-[0_12px_24px_-10px_rgb(22_163_74/0.9)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} {initial.visible ? "Mettre à jour l'annonce" : "Publier sur le site"}
        </button>
        {initial.active && (
          <button type="button" disabled={pending} onClick={() => save(false)} className="inline-flex h-11 items-center gap-2 rounded-full border bg-white px-5 text-sm font-semibold text-muted-foreground transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-60">
            <EyeOff className="size-4" /> Retirer du site
          </button>
        )}
        <p className="text-xs text-muted-foreground">Dernière modification : {formatDateTime(initial.updated_at)}</p>
      </div>
    </div>
  );
}
