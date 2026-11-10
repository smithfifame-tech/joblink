import Image from "next/image";
import Link from "next/link";
import {
  Activity, AlertTriangle, ArrowUpRight, Banknote, Briefcase, CheckCircle2, CircleDashed, ClipboardList, CreditCard,
  ExternalLink, Gavel, Globe, Inbox, LayoutDashboard, LogOut, Mail, MailCheck, RefreshCw, Rocket, ShieldCheck,
  ShieldAlert, Megaphone, Sparkles, TrendingUp, UserCheck, Users, Wallet, Bot, Siren, Wrench, Zap,
} from "lucide-react";
import { PHOTOS } from "@/lib/media/photos";
import { categoryPhotoByName } from "@/lib/media/category-photos";
import type { OwnerAnnouncement, OwnerIncident, OwnerIncidents, OwnerOverview, OwnerUser } from "@/lib/owner-panel/server";
import { ownerLogoutAction } from "@/app/admin/joblink/actions";
import { LogoMark } from "@/components/layout/logo";
import { CountUp } from "@/components/motion/count-up";
import { JobStatusBadge, PaymentStatusBadge } from "@/components/jobs/status-badge";
import { formatDate, formatDateTime, formatRelative, formatXOF } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { JobStatus, PaymentStatus } from "@/types/db";
import { BarList, Sparkline, TrendChart } from "./trend-chart";
import { ContactHandled, IncidentActions, ReportActions, UserSearch } from "./owner-actions";
import { AnnouncementForm, ExportCsv, JobsExplorer, LivePanel, UsersExplorer } from "./owner-tools";

export type OwnerTab = "overview" | "users" | "jobs" | "moderation" | "incidents" | "site" | "security";

/** Statuts de mise en service (calculés côté serveur, sans aucune valeur secrète). */
export type OwnerHealth = {
  payments: "off" | "sandbox" | "fedapay_test" | "live";
  google: boolean;
  emailConfirm: boolean | null;
  production: boolean;
};

const NAV: { tab: OwnerTab; label: string; icon: typeof LayoutDashboard }[] = [
  { tab: "overview", label: "Vue d'ensemble", icon: LayoutDashboard },
  { tab: "users", label: "Utilisateurs", icon: Users },
  { tab: "jobs", label: "Missions", icon: Briefcase },
  { tab: "moderation", label: "Signalements & messages", icon: ShieldAlert },
  { tab: "incidents", label: "Incidents & IA", icon: Bot },
  { tab: "site", label: "Annonce du site", icon: Megaphone },
  { tab: "security", label: "Sécurité", icon: ShieldCheck },
];

const REASONS: Record<string, string> = {
  spam: "Spam", fraud: "Fraude", abuse: "Abus", inappropriate: "Contenu inapproprié", safety: "Sécurité", other: "Autre",
};
const TARGETS: Record<string, string> = { user: "Utilisateur", job: "Mission", message: "Message", review: "Avis" };
const ROLES: Record<string, string> = { client: "Client", worker: "Travailleur", admin: "Admin" };

function Card({ className, children, delay = 0 }: { className?: string; children: React.ReactNode; delay?: number }) {
  return (
    <section
      className={cn("jl-rise rounded-[1.5rem] border border-border/70 bg-white p-5 shadow-[var(--shadow-soft)] sm:p-6", className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </section>
  );
}

function CardTitle({ icon: Icon, children, action }: { icon: typeof Users; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-[15px] font-bold">
        <span className="grid size-8 place-items-center rounded-xl bg-accent text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
        {children}
      </h2>
      {action}
    </div>
  );
}

function Kpi({ label, value, hint, icon: Icon, delay, spark }: { label: string; value: number; hint?: string; icon: typeof Users; delay: number; spark?: number[] }) {
  return (
    <Card delay={delay} className="group relative overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
      <div aria-hidden className="absolute -right-8 -top-8 size-28 rounded-full bg-accent/70 transition-transform duration-700 group-hover:scale-125" />
      <div className="relative">
        <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden />
        </span>
        <p className="mt-4 text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-extrabold tabular-nums tracking-tight">
          <CountUp value={value} />
        </p>
        {hint && <p className="mt-1 text-xs font-medium text-primary">{hint}</p>}
        {spark && <Sparkline values={spark} className="mt-3 h-9 w-full" />}
      </div>
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

function todoCount(k: OwnerOverview["kpis"]) {
  return k.reports_open + k.disputes_open + k.verifications_pending + k.payments_pending + k.payouts_pending + k.contact_new;
}

function Shell({ tab, data, incidents, children }: { tab: OwnerTab; data: OwnerOverview; incidents: OwnerIncidents | null; children: React.ReactNode }) {
  const badge: Partial<Record<OwnerTab, number>> = {
    moderation: data.kpis.reports_open + data.kpis.contact_new,
    incidents: incidents ? incidents.counts.open + incidents.counts.critical : 0,
  };
  const now = new Date();
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: "Africa/Porto-Novo" })
      .formatToParts(now)
      .find((p) => p.type === "hour")?.value ?? "12",
  );
  const greet = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  return (
    <div className="min-h-dvh bg-[#f5f7f6]">
      <div className="mx-auto flex max-w-[1500px] gap-5 p-3 sm:p-5">
        {/* Barre latérale */}
        <aside className="sticky top-5 hidden h-[calc(100dvh-2.5rem)] w-72 shrink-0 flex-col rounded-[1.75rem] bg-primary-strong p-5 text-white shadow-[var(--shadow-lift)] lg:flex">
          <div className="flex items-center gap-2.5">
            <span className="grid size-11 place-items-center rounded-2xl bg-white shadow-lg">
              <LogoMark className="size-8" />
            </span>
            <div>
              <p className="font-logo text-lg font-extrabold leading-none tracking-tight">
                JOB<span className="text-green-300">LINK</span>
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/50">Centre de contrôle</p>
            </div>
          </div>
          <nav aria-label="Tableau de bord" className="mt-9 grid gap-1">
            {NAV.map((n, i) => {
              const active = n.tab === tab;
              return (
                <Link
                  key={n.tab}
                  href={n.tab === "overview" ? "/admin/joblink" : `/admin/joblink?tab=${n.tab}`}
                  className={cn(
                    "jl-rise group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-all duration-300",
                    active ? "bg-white text-primary-strong shadow-lg" : "text-white/70 hover:bg-white/10 hover:text-white",
                  )}
                  style={{ animationDelay: `${80 + i * 50}ms` }}
                  aria-current={active ? "page" : undefined}
                >
                  <n.icon className={cn("size-[18px] transition-transform duration-300 group-hover:scale-110", active ? "text-primary" : "")} />
                  <span className="flex-1">{n.label}</span>
                  {badge[n.tab] ? (
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", active ? "bg-primary text-white" : "bg-green-400/20 text-green-200")}>
                      {badge[n.tab]}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto grid gap-3">
            <LivePanel variant="sidebar" />
            <div className="rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
              <p className="flex items-center gap-2 text-xs font-semibold text-green-200">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-70" />
                  <span className="relative inline-flex size-2 rounded-full bg-green-400" />
                </span>
                Session sécurisée
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-white/60">Expire automatiquement après 8 h. Chaque action est journalisée.</p>
            </div>
            <Link href="/" target="_blank" className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white">
              <ExternalLink className="size-4" /> Voir le site
            </Link>
            <form action={ownerLogoutAction}>
              <button type="submit" className="flex w-full items-center gap-2 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/15 hover:text-white">
                <LogOut className="size-4" /> Se déconnecter
              </button>
            </form>
          </div>
        </aside>

        {/* Contenu */}
        <div className="min-w-0 flex-1">
          {/* En-tête mobile */}
          <div className="mb-4 flex items-center justify-between rounded-[1.5rem] bg-primary-strong px-4 py-3 text-white lg:hidden">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-white"><LogoMark className="size-6" /></span>
              <span className="font-logo font-extrabold">JOB<span className="text-green-300">LINK</span></span>
            </div>
            <form action={ownerLogoutAction}>
              <button type="submit" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
                <LogOut className="size-3.5" /> Déconnexion
              </button>
            </form>
          </div>
          <nav aria-label="Sections" className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1 lg:hidden">
            {NAV.map((n) => (
              <Link
                key={n.tab}
                href={n.tab === "overview" ? "/admin/joblink" : `/admin/joblink?tab=${n.tab}`}
                className={cn("shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium", n.tab === tab ? "border-primary bg-primary text-white" : "border-border bg-white text-muted-foreground")}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <LivePanel variant="bar" />

          {tab === "overview" ? (
            <WelcomeHero greet={greet} now={now} data={data} incidents={incidents} />
          ) : (
          <header className="jl-rise mb-5 flex flex-wrap items-end justify-between gap-4 px-1">
              <div>
                <p className="text-sm text-muted-foreground">
                  {greet} · {formatDate(now, "EEEE d MMMM yyyy")}
                </p>
                <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.02em] sm:text-4xl">
                  {NAV.find((n) => n.tab === tab)?.label}
                </h1>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Données du {formatDateTime(data.generated_at)}</span>
                <Link
                  href={`/admin/joblink?tab=${tab}`}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 font-semibold text-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-primary-strong"
                  prefetch={false}
                >
                  <RefreshCw className="size-3.5" /> Actualiser
                </Link>
              </div>
            </header>
          )}

          {children}
        </div>
      </div>
    </div>
  );
}

function WelcomeHero({ greet, now, data, incidents }: { greet: string; now: Date; data: OwnerOverview; incidents: OwnerIncidents | null }) {
  const k = data.kpis;
  const todo = todoCount(k) + (incidents?.counts.open ?? 0);
  const photo = PHOTOS.market;
  const actions = [
    { href: "/", label: "Voir le site", icon: Globe, external: true },
    { href: "/admin/joblink?tab=users", label: "Utilisateurs", icon: Users },
    { href: "/admin/joblink?tab=jobs", label: "Missions", icon: Briefcase },
    { href: "/admin/joblink?tab=moderation", label: "Signalements", icon: ShieldAlert },
  ];
  return (
    <section className="jl-rise relative isolate mb-5 overflow-hidden rounded-[1.75rem] text-white shadow-[var(--shadow-lift)]">
      <Image src={photo.src} alt="" fill priority sizes="(min-width: 1024px) 1100px, 100vw" className="-z-20 object-cover object-[50%_60%] animate-[kenburns_16s_ease-out_both]" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(105deg,rgb(11_46_26/0.96)_0%,rgb(20_83_45/0.85)_45%,rgb(11_46_26/0.45)_100%)]" />
      <div aria-hidden className="jl-dots absolute inset-0 -z-10 opacity-[0.12] [mask-image:linear-gradient(to_right,#000,transparent_70%)]" />
      <div className="grid gap-6 p-6 sm:p-8 xl:grid-cols-[1.3fr_1fr] xl:items-end">
        <div>
          <p className="text-sm font-medium text-green-100/90">{greet} · {formatDate(now, "EEEE d MMMM yyyy")}</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.02em] text-white sm:text-4xl">Vue d&apos;ensemble</h1>
          <p className="mt-2 max-w-xl text-[15px] text-white/85">
            {todo > 0 ? (
              <>
                <strong className="text-amber-300">{todo} élément{todo > 1 ? "s" : ""}</strong> demande{todo > 1 ? "nt" : ""} votre attention. Le reste de la plateforme tourne normalement.
              </>
            ) : (
              <>Tout est à jour : <strong className="text-green-300">rien à traiter</strong> pour le moment.</>
            )}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {actions.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                target={a.external ? "_blank" : undefined}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3.5 py-2 text-sm font-semibold ring-1 ring-white/25 backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white hover:text-primary-strong"
              >
                <a.icon className="size-4" /> {a.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: "Missions ouvertes", value: k.jobs_open.toLocaleString("fr-FR") },
            { label: "Inscrits (7 j)", value: `+${k.users_7d.toLocaleString("fr-FR")}` },
            { label: "Commissions (30 j)", value: formatXOF(k.commissions_30d) },
          ].map((m) => (
            <div key={m.label} className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur">
              <p className="text-[11px] font-medium text-white/70">{m.label}</p>
              <p className="mt-1 truncate text-sm font-extrabold tabular-nums sm:text-lg">{m.value}</p>
            </div>
          ))}
          <div className="col-span-3 flex items-center justify-between gap-2 text-xs text-white/70">
            <span>Données du {formatDateTime(data.generated_at)} · photo {photo.author} / Unsplash</span>
            <Link href="/admin/joblink" prefetch={false} className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 font-semibold text-white hover:bg-white/20">
              <RefreshCw className="size-3" /> Actualiser
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function LaunchChecklist({ health }: { health: OwnerHealth }) {
  const items: { icon: typeof Users; label: string; ok: boolean; status: string; hint?: string }[] = [
    {
      icon: CreditCard,
      label: "Paiements Mobile Money",
      ok: health.payments === "live",
      status: { off: "Non configurés", sandbox: "Mode test (simulateur)", fedapay_test: "FedaPay en mode test", live: "FedaPay actif" }[health.payments],
      hint: health.payments === "live" ? undefined : "Créez votre compte marchand FedaPay et ajoutez les clés dans Vercel.",
    },
    {
      icon: Globe,
      label: "Connexion avec Google",
      ok: health.google,
      status: health.google ? "Activée" : "À configurer",
      hint: health.google ? undefined : "Identifiant OAuth Google Cloud à coller dans Supabase.",
    },
    {
      icon: MailCheck,
      label: "Confirmation des e-mails",
      ok: health.emailConfirm === true,
      status: health.emailConfirm === null ? "Inconnu" : health.emailConfirm ? "Activée" : "Désactivée",
      hint: health.emailConfirm ? undefined : "Configurez l'envoi d'e-mails (Resend) puis réactivez la confirmation.",
    },
    {
      icon: Rocket,
      label: "Mode production",
      ok: health.production,
      status: health.production ? "Activé" : "Site en mode test",
      hint: health.production ? undefined : "À activer une fois les paiements réels configurés.",
    },
  ];
  const done = items.filter((i) => i.ok).length;
  return (
    <Card delay={380}>
      <CardTitle icon={Rocket} action={<span className="rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-primary-strong">{done}/{items.length}</span>}>
        Mise en service
      </CardTitle>
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full origin-left rounded-full bg-primary animate-[bar-grow_1s_cubic-bezier(.22,1,.36,1)_both]" style={{ width: `${(done / items.length) * 100}%` }} />
      </div>
      <ul className="grid gap-3">
        {items.map((it) => (
          <li key={it.label} className="flex gap-3">
            <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", it.ok ? "bg-accent text-primary" : "bg-amber-50 text-amber-600")}>
              <it.icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 text-sm font-semibold">
                {it.label}
                <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", it.ok ? "text-primary" : "text-amber-700")}>
                  {it.ok ? <CheckCircle2 className="size-3.5" /> : <CircleDashed className="size-3.5" />} {it.status}
                </span>
              </p>
              {it.hint && <p className="mt-0.5 text-xs text-muted-foreground">{it.hint}</p>}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Funnel({ k }: { k: OwnerOverview["kpis"] }) {
  const steps = [
    { label: "Comptes créés", value: k.users },
    { label: "Missions publiées", value: k.jobs_total },
    { label: "Candidatures reçues", value: k.applications },
    { label: "Missions terminées", value: k.jobs_completed },
  ];
  const max = Math.max(1, ...steps.map((s) => s.value));
  const perJob = k.jobs_total > 0 ? (k.applications / k.jobs_total).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) : "—";
  return (
    <Card delay={440}>
      <CardTitle icon={TrendingUp}>Parcours sur la plateforme</CardTitle>
      <ul className="grid gap-3.5">
        {steps.map((s, i) => (
          <li key={s.label}>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-muted-foreground">{s.label}</span>
              <span className="font-bold tabular-nums">{s.value.toLocaleString("fr-FR")}</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full origin-left rounded-full bg-gradient-to-r from-primary to-primary-strong animate-[bar-grow_1s_cubic-bezier(.22,1,.36,1)_both]"
                style={{ width: `${Math.max(3, (s.value / max) * 100)}%`, animationDelay: `${i * 120}ms` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 rounded-xl bg-accent/60 px-3 py-2 text-xs text-accent-foreground">
        En moyenne <strong>{perJob}</strong> candidature{perJob === "1" ? "" : "s"} par mission publiée.
      </p>
    </Card>
  );
}

function Overview({ data, health, incidents }: { data: OwnerOverview; health: OwnerHealth; incidents: OwnerIncidents | null }) {
  const k = data.kpis;
  const todo = [
    { label: "Signalements ouverts", value: k.reports_open, icon: AlertTriangle, href: "/admin/joblink?tab=moderation" },
    { label: "Litiges en cours", value: k.disputes_open, icon: Gavel, href: "/admin/disputes" },
    { label: "Vérifications d'identité", value: k.verifications_pending, icon: UserCheck, href: "/admin/workers" },
    { label: "Paiements en attente", value: k.payments_pending, icon: Wallet, href: "/admin/transactions" },
    { label: "Versements à effectuer", value: k.payouts_pending, icon: Banknote, href: "/admin/transactions" },
    { label: "Messages de contact", value: k.contact_new, icon: Mail, href: "/admin/joblink?tab=moderation" },
    { label: "Incidents techniques", value: incidents?.counts.open ?? 0, icon: Siren, href: "/admin/joblink?tab=incidents" },
  ];
  const roleTotal = Math.max(1, k.clients + k.workers);
  return (
    <div className="grid gap-5">
      {/* Bandeau revenus + KPI */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-[1.25fr_1fr_1fr_1fr]">
        <section className="jl-rise relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-primary via-[#15803d] to-primary-strong p-6 text-white shadow-[var(--shadow-lift)] sm:col-span-2 xl:col-span-1">
          <div aria-hidden className="absolute -right-16 -top-16 size-56 rounded-full bg-white/10" />
          <div aria-hidden className="absolute -bottom-20 right-10 size-44 rounded-full bg-black/10" />
          <div className="relative">
            <p className="flex items-center gap-2 text-sm font-medium text-green-100">
              <Sparkles className="size-4" /> Commissions encaissées
            </p>
            <p className="mt-3 text-4xl font-extrabold tabular-nums tracking-tight">{formatXOF(k.commissions)}</p>
            <p className="mt-1 text-sm text-green-100">{formatXOF(k.commissions_30d)} sur les 30 derniers jours</p>
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/15 pt-4 text-sm">
              <div>
                <p className="text-green-100/80">Volume payé</p>
                <p className="mt-0.5 font-bold tabular-nums">{formatXOF(k.volume)}</p>
              </div>
              <div>
                <p className="text-green-100/80">Terminées</p>
                <p className="mt-0.5 font-bold tabular-nums">{k.jobs_completed.toLocaleString("fr-FR")}</p>
              </div>
            </div>
          </div>
        </section>
        <Kpi label="Utilisateurs" value={k.users} hint={`+${k.users_7d} cette semaine`} icon={Users} delay={80} spark={data.series.map((d) => d.users)} />
        <Kpi label="Missions ouvertes" value={k.jobs_open} hint={`+${k.jobs_7d} publiées cette semaine`} icon={Briefcase} delay={140} spark={data.series.map((d) => d.jobs)} />
        <Kpi label="Candidatures" value={k.applications} hint={`${k.jobs_active} missions en cours`} icon={ClipboardList} delay={200} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <Card delay={260}>
          <CardTitle icon={Activity}>Activité des 30 derniers jours</CardTitle>
          <TrendChart series={data.series} />
        </Card>
        <Card delay={320}>
          <CardTitle icon={Inbox}>À traiter</CardTitle>
          <ul className="grid gap-1.5">
            {todo.map((t) => (
              <li key={t.label}>
                <Link
                  href={t.href}
                  className="group flex items-center gap-3 rounded-2xl px-2.5 py-2 transition-colors hover:bg-muted/70"
                >
                  <span className={cn("grid size-9 place-items-center rounded-xl", t.value > 0 ? "bg-amber-50 text-amber-600" : "bg-muted text-muted-foreground")}>
                    <t.icon className="size-4" aria-hidden />
                  </span>
                  <span className="flex-1 text-sm">{t.label}</span>
                  <span className={cn("min-w-8 rounded-full px-2 py-0.5 text-center text-xs font-bold tabular-nums", t.value > 0 ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground")}>
                    {t.value}
                  </span>
                  <ArrowUpRight className="size-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <LaunchChecklist health={health} />
        <Funnel k={k} />
        <Card delay={500}>
          <CardTitle icon={Users}>Répartition des comptes</CardTitle>
          <div className="flex h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-full origin-left bg-primary animate-[bar-grow_1s_cubic-bezier(.22,1,.36,1)_both]" style={{ width: `${(k.clients / roleTotal) * 100}%` }} />
            <div className="h-full origin-left bg-primary-strong animate-[bar-grow_1s_cubic-bezier(.22,1,.36,1)_.2s_both]" style={{ width: `${(k.workers / roleTotal) * 100}%` }} />
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
            <div><dt className="flex items-center gap-1.5 text-muted-foreground"><span className="size-2 rounded-full bg-primary" /> Clients</dt><dd className="mt-1 text-2xl font-extrabold tabular-nums">{k.clients}</dd></div>
            <div><dt className="flex items-center gap-1.5 text-muted-foreground"><span className="size-2 rounded-full bg-primary-strong" /> Travailleurs</dt><dd className="mt-1 text-2xl font-extrabold tabular-nums">{k.workers}</dd></div>
            <div><dt className="text-muted-foreground">Administrateurs</dt><dd className="mt-1 font-bold tabular-nums">{k.admins}</dd></div>
            <div><dt className="text-muted-foreground">Comptes suspendus</dt><dd className="mt-1 font-bold tabular-nums text-red-600">{k.suspended}</dd></div>
          </dl>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card delay={560}>
          <CardTitle icon={Briefcase}>Catégories les plus demandées</CardTitle>
          <BarList items={data.by_category} empty="Aucune mission publiée pour l'instant." />
        </Card>
        <Card delay={620}>
          <CardTitle icon={LayoutDashboard}>Villes des membres</CardTitle>
          <BarList items={data.by_city} empty="Aucun membre pour l'instant." />
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card delay={560}>
          <CardTitle icon={Users} action={<Link href="/admin/joblink?tab=users" className="text-xs font-semibold text-primary-strong hover:underline">Tout voir</Link>}>
            Derniers inscrits
          </CardTitle>
          {data.recent_users.length ? (
            <ul className="divide-y">
              {data.recent_users.map((u) => (
                <li key={u.id} className="flex items-center gap-3 py-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent to-green-100 text-sm font-bold text-primary-strong">
                    {u.first_name.charAt(0)}{u.last_name.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {u.first_name} {u.last_name}
                      {u.is_suspended && <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">Suspendu</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{u.email} · {u.roles.map((r) => ROLES[r] ?? r).join(", ") || "—"}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatRelative(u.created_at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Aucun inscrit pour le moment.</Empty>
          )}
        </Card>
        <Card delay={620}>
          <CardTitle
            icon={Wallet}
            action={
              <ExportCsv
                filename="joblink-paiements"
                label="CSV"
                headers={["Montant (FCFA)", "Commission (FCFA)", "Statut", "Prestataire", "N° de reçu", "Date"]}
                rows={data.recent_payments.map((p) => [p.amount, p.commission_amount, p.status, p.provider, p.receipt_number, p.created_at.slice(0, 10)])}
              />
            }
          >
            Derniers paiements
          </CardTitle>
          {data.recent_payments.length ? (
            <ul className="divide-y">
              {data.recent_payments.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold tabular-nums">{formatXOF(p.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      Commission {formatXOF(p.commission_amount)} · {p.provider} · {formatRelative(p.created_at)}
                    </p>
                  </div>
                  <PaymentStatusBadge status={p.status as PaymentStatus} />
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Aucun paiement pour le moment.</Empty>
          )}
        </Card>
      </div>
    </div>
  );
}

function UsersTab({ users, q }: { users: { total: number; items: OwnerUser[] }; q: string }) {
  return (
    <div className="grid gap-5">
      <div className="jl-rise flex flex-wrap items-center justify-between gap-3">
        <UserSearch />
        <p className="text-sm text-muted-foreground">
          {users.total.toLocaleString("fr-FR")} utilisateur{users.total > 1 ? "s" : ""}{q ? ` pour « ${q} »` : ""}
        </p>
      </div>
      <Card delay={80}>
        <UsersExplorer users={users.items} />
      </Card>
    </div>
  );
}

function SiteTab({ announcement }: { announcement: OwnerAnnouncement | null }) {
  return (
    <Card>
      <CardTitle icon={Megaphone}>Bandeau d&apos;annonce</CardTitle>
      {announcement ? (
        <AnnouncementForm initial={announcement} />
      ) : (
        <Empty>L&apos;annonce du site est momentanément indisponible. Réessayez dans un instant.</Empty>
      )}
    </Card>
  );
}

function JobsTab({ data }: { data: OwnerOverview }) {
  return (
    <Card>
      <CardTitle icon={Briefcase} action={<Link href="/admin/jobs" className="text-xs font-semibold text-primary-strong hover:underline">Modération détaillée</Link>}>
        Missions récentes
      </CardTitle>
      {data.recent_jobs.length ? (
        <JobsExplorer jobs={data.recent_jobs} />
      ) : (
        <Empty>Aucune mission publiée pour le moment.</Empty>
      )}
    </Card>
  );
}

function ModerationTab({ data }: { data: OwnerOverview }) {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardTitle icon={AlertTriangle}>Signalements ouverts</CardTitle>
        {data.open_reports.length ? (
          <ul className="grid gap-3">
            {data.open_reports.map((r) => (
              <li key={r.id} className="rounded-2xl border p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-red-50 px-2 py-0.5 font-semibold text-red-700">{REASONS[r.reason] ?? r.reason}</span>
                  <span className="text-muted-foreground">{TARGETS[r.target_type] ?? r.target_type} · {formatRelative(r.created_at)}</span>
                </div>
                {r.details && <p className="mt-2 text-sm leading-relaxed">{r.details}</p>}
                <div className="mt-3"><ReportActions reportId={r.id} /></div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Aucun signalement en attente. Tout est calme.</Empty>
        )}
      </Card>
      <Card delay={80}>
        <CardTitle icon={Mail}>Messages de contact</CardTitle>
        {data.contact_messages.length ? (
          <ul className="grid gap-3">
            {data.contact_messages.map((m) => (
              <li key={m.id} className={cn("rounded-2xl border p-4", m.status === "handled" && "opacity-70")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{m.subject}</p>
                    <p className="text-xs text-muted-foreground">{m.name} · {m.email} · {formatRelative(m.created_at)}</p>
                  </div>
                  {m.status === "new" ? <ContactHandled id={m.id} /> : <span className="text-xs font-medium text-primary">Traité</span>}
                </div>
                <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-foreground/90">{m.message}</p>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Aucun message reçu.</Empty>
        )}
      </Card>
    </div>
  );
}

function SecurityTab({ data }: { data: OwnerOverview }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
      <Card>
        <CardTitle icon={ShieldCheck}>Dernières tentatives de connexion</CardTitle>
        {data.recent_logins.length ? (
          <ul className="divide-y">
            {data.recent_logins.map((l, i) => (
              <li key={`${l.created_at}-${i}`} className="flex items-center gap-3 py-3 text-sm">
                <span className={cn("grid size-9 place-items-center rounded-xl", l.success ? "bg-accent text-primary" : "bg-red-50 text-red-600")}>
                  {l.success ? <ShieldCheck className="size-4" /> : <ShieldAlert className="size-4" />}
                </span>
                <div className="flex-1">
                  <p className="font-medium">{l.success ? "Connexion réussie" : "Mot de passe incorrect"}</p>
                  <p className="text-xs text-muted-foreground">IP {l.ip ?? "inconnue"}</p>
                </div>
                <span className="text-xs text-muted-foreground">{formatDateTime(l.created_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Aucune tentative enregistrée.</Empty>
        )}
      </Card>
      <Card delay={80}>
        <CardTitle icon={ShieldAlert}>Protections actives</CardTitle>
        <ul className="grid gap-3 text-sm leading-relaxed">
          {[
            "Mot de passe stocké uniquement sous forme de hash bcrypt, jamais en clair.",
            "Clé serveur secrète exigée pour chaque requête : l'API publique ne permet pas d'entrer.",
            "Blocage de 15 minutes après 5 échecs (par adresse IP) ou 20 échecs au total.",
            "Session de 8 heures dans un cookie protégé (httpOnly, Secure, SameSite strict).",
            "Toutes les connexions et actions sont inscrites dans le journal d'audit.",
          ].map((t) => (
            <li key={t} className="flex gap-2.5">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden /> {t}
            </li>
          ))}
        </ul>
        <Link href="/admin/audit-logs" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-strong hover:underline">
          Journal d&apos;audit complet <ArrowUpRight className="size-4" />
        </Link>
      </Card>
    </div>
  );
}

const SEVERITY: Record<OwnerIncident["severity"], { label: string; cls: string }> = {
  critical: { label: "Critique", cls: "bg-red-600 text-white" },
  high: { label: "Important", cls: "bg-amber-100 text-amber-800" },
  normal: { label: "Mineur", cls: "bg-muted text-muted-foreground" },
};
const STATUS: Record<OwnerIncident["status"], { label: string; cls: string }> = {
  open: { label: "En attente de votre décision", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
  approved: { label: "Autorisé · l'IA va intervenir", cls: "bg-accent text-primary-strong ring-primary/20" },
  fixing: { label: "L'IA corrige", cls: "bg-primary text-white ring-primary" },
  resolved: { label: "Résolu", cls: "bg-green-50 text-green-700 ring-green-200" },
  dismissed: { label: "Ignoré", cls: "bg-muted text-muted-foreground ring-border" },
};
const SOURCE: Record<OwnerIncident["source"], string> = {
  client: "Navigateur d'un visiteur",
  server: "Serveur du site",
  monitor: "Surveillance automatique",
  ai: "Agent IA",
};

function IncidentsTab({ incidents }: { incidents: OwnerIncidents | null }) {
  if (!incidents) {
    return <Card><Empty>Les incidents ne sont pas disponibles pour le moment.</Empty></Card>;
  }
  const c = incidents.counts;
  const stats = [
    { label: "À décider", value: c.open, icon: Siren, tone: c.open ? "text-amber-600 bg-amber-50" : "text-muted-foreground bg-muted" },
    { label: "Confiés à l'IA", value: c.approved, icon: Bot, tone: "text-primary bg-accent" },
    { label: "Résolus (7 j)", value: c.resolved_7d, icon: CheckCircle2, tone: "text-primary bg-accent" },
    { label: "Urgences traitées seules (7 j)", value: c.auto_7d, icon: Zap, tone: "text-primary-strong bg-accent" },
  ];
  return (
    <div className="grid gap-5">
      <section className="jl-rise relative overflow-hidden rounded-[1.5rem] bg-primary-strong p-6 text-white shadow-[var(--shadow-lift)]">
        <div aria-hidden className="jl-dots absolute inset-0 opacity-[0.08]" />
        <div className="relative grid gap-5 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-green-200"><Bot className="size-4" /> Agent de maintenance IA</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-white">Vous décidez, l&apos;IA corrige.</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/80">
              Chaque erreur du site apparaît ici. L&apos;IA ne touche à rien sans votre accord : cliquez sur « Autoriser l&apos;IA à corriger »
              et elle s&apos;en charge lors de son prochain passage (toutes les heures), puis note ici ce qu&apos;elle a fait.
            </p>
          </div>
          <ul className="grid gap-2 text-sm">
            {[
              { icon: ShieldCheck, text: "Sans votre autorisation, l'IA observe seulement." },
              { icon: Zap, text: "Exception : si le site est inaccessible, elle agit seule (retour à la dernière version qui fonctionnait) puis vous le signale ici." },
              { icon: Wrench, text: "Jamais de modification des mots de passe, clés, paiements ou données des membres." },
            ].map((r) => (
              <li key={r.text} className="flex gap-2.5 rounded-2xl bg-white/[0.07] p-3 ring-1 ring-white/10">
                <r.icon className="mt-0.5 size-4 shrink-0 text-green-300" /> <span className="text-white/85">{r.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((s, i) => (
          <Card key={s.label} delay={80 + i * 60} className="p-4 sm:p-5">
            <span className={cn("grid size-9 place-items-center rounded-xl", s.tone)}><s.icon className="size-4" /></span>
            <p className="mt-3 text-xs text-muted-foreground">{s.label}</p>
            <p className="mt-0.5 text-2xl font-extrabold tabular-nums">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card delay={320}>
        <CardTitle icon={Siren}>Incidents récents</CardTitle>
        {incidents.items.length ? (
          <ul className="grid gap-3">
            {incidents.items.map((it) => (
              <li
                key={it.id}
                className={cn(
                  "rounded-2xl border p-4 transition-colors",
                  it.severity === "critical" && it.status !== "resolved" && it.status !== "dismissed" ? "border-red-200 bg-red-50/40" : "",
                  (it.status === "resolved" || it.status === "dismissed") && "opacity-75",
                )}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={cn("rounded-full px-2 py-0.5 font-bold", SEVERITY[it.severity].cls)}>{SEVERITY[it.severity].label}</span>
                  <span className={cn("rounded-full px-2 py-0.5 font-semibold ring-1", STATUS[it.status].cls)}>{STATUS[it.status].label}</span>
                  {it.auto_action && <span className="rounded-full bg-primary-strong px-2 py-0.5 font-semibold text-white">Action automatique (urgence)</span>}
                  <span className="text-muted-foreground">{SOURCE[it.source]} · {it.occurrences} fois · dernière {formatRelative(it.last_seen)}</span>
                </div>
                <p className="mt-2 break-words text-sm font-semibold">{it.title}</p>
                {it.path && <p className="mt-0.5 font-mono text-xs text-muted-foreground">{it.path}</p>}
                {it.details && (
                  <details className="mt-2 text-xs">
                    <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">Détails techniques</summary>
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-muted/60 p-3 font-mono text-[11px] leading-relaxed">{it.details}</pre>
                  </details>
                )}
                {it.ai_notes && (
                  <div className="mt-3 rounded-xl bg-accent/60 p-3 text-sm">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-primary-strong"><Bot className="size-3.5" /> Compte rendu de l&apos;IA</p>
                    <p className="mt-1 whitespace-pre-line leading-relaxed text-foreground/90">{it.ai_notes}</p>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">Vu pour la première fois le {formatDateTime(it.first_seen)}</span>
                  <IncidentActions id={it.id} status={it.status} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Aucun incident : le site fonctionne normalement.</Empty>
        )}
      </Card>
    </div>
  );
}

export function OwnerDashboard({
  tab,
  data,
  users,
  q,
  health,
  incidents,
  announcement,
}: {
  tab: OwnerTab;
  data: OwnerOverview;
  users?: { total: number; items: OwnerUser[] };
  q: string;
  health: OwnerHealth;
  incidents: OwnerIncidents | null;
  announcement?: OwnerAnnouncement | null;
}) {
  return (
    <Shell tab={tab} data={data} incidents={incidents}>
      {tab === "users" && users ? (
        <UsersTab users={users} q={q} />
      ) : tab === "jobs" ? (
        <JobsTab data={data} />
      ) : tab === "moderation" ? (
        <ModerationTab data={data} />
      ) : tab === "incidents" ? (
        <IncidentsTab incidents={incidents} />
      ) : tab === "site" ? (
        <SiteTab announcement={announcement ?? null} />
      ) : tab === "security" ? (
        <SecurityTab data={data} />
      ) : (
        <Overview data={data} health={health} incidents={incidents} />
      )}
    </Shell>
  );
}
