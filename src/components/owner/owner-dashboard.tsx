import Link from "next/link";
import {
  Activity, AlertTriangle, ArrowUpRight, Banknote, Briefcase, ClipboardList, ExternalLink, Gavel, Inbox,
  LayoutDashboard, LogOut, Mail, RefreshCw, ShieldCheck, ShieldAlert, Sparkles, UserCheck, Users, Wallet,
} from "lucide-react";
import type { OwnerOverview, OwnerUser } from "@/lib/owner-panel/server";
import { ownerLogoutAction } from "@/app/admin/joblink/actions";
import { LogoMark } from "@/components/layout/logo";
import { CountUp } from "@/components/motion/count-up";
import { JobStatusBadge, PaymentStatusBadge } from "@/components/jobs/status-badge";
import { formatDate, formatDateTime, formatRelative, formatXOF } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { JobStatus, PaymentStatus } from "@/types/db";
import { BarList, TrendChart } from "./trend-chart";
import { ContactHandled, JobVisibilityToggle, ReportActions, SuspendToggle, UserSearch } from "./owner-actions";

export type OwnerTab = "overview" | "users" | "jobs" | "moderation" | "security";

const NAV: { tab: OwnerTab; label: string; icon: typeof LayoutDashboard }[] = [
  { tab: "overview", label: "Vue d'ensemble", icon: LayoutDashboard },
  { tab: "users", label: "Utilisateurs", icon: Users },
  { tab: "jobs", label: "Missions", icon: Briefcase },
  { tab: "moderation", label: "Signalements & messages", icon: ShieldAlert },
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

function Kpi({ label, value, hint, icon: Icon, delay }: { label: string; value: number; hint?: string; icon: typeof Users; delay: number }) {
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
      </div>
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

function Shell({ tab, data, children }: { tab: OwnerTab; data: OwnerOverview; children: React.ReactNode }) {
  const badge: Partial<Record<OwnerTab, number>> = {
    moderation: data.kpis.reports_open + data.kpis.contact_new,
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
                href={tab === "overview" ? "/admin/joblink" : `/admin/joblink?tab=${tab}`}
                className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 font-semibold text-foreground shadow-sm transition-colors hover:border-primary/40 hover:text-primary-strong"
                prefetch={false}
              >
                <RefreshCw className="size-3.5" /> Actualiser
              </Link>
            </div>
          </header>

          {children}
        </div>
      </div>
    </div>
  );
}

function Overview({ data }: { data: OwnerOverview }) {
  const k = data.kpis;
  const todo = [
    { label: "Signalements ouverts", value: k.reports_open, icon: AlertTriangle, href: "/admin/joblink?tab=moderation" },
    { label: "Litiges en cours", value: k.disputes_open, icon: Gavel, href: "/admin/disputes" },
    { label: "Vérifications d'identité", value: k.verifications_pending, icon: UserCheck, href: "/admin/workers" },
    { label: "Paiements en attente", value: k.payments_pending, icon: Wallet, href: "/admin/transactions" },
    { label: "Versements à effectuer", value: k.payouts_pending, icon: Banknote, href: "/admin/transactions" },
    { label: "Messages de contact", value: k.contact_new, icon: Mail, href: "/admin/joblink?tab=moderation" },
  ];
  const roleTotal = Math.max(1, k.clients + k.workers);
  return (
    <div className="grid gap-5">
      {/* Bandeau revenus + KPI */}
      <div className="grid gap-5 xl:grid-cols-[1.25fr_1fr_1fr_1fr]">
        <section className="jl-rise relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-primary via-[#15803d] to-primary-strong p-6 text-white shadow-[var(--shadow-lift)] md:col-span-1">
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
        <Kpi label="Utilisateurs" value={k.users} hint={`+${k.users_7d} cette semaine`} icon={Users} delay={80} />
        <Kpi label="Missions ouvertes" value={k.jobs_open} hint={`+${k.jobs_7d} publiées cette semaine`} icon={Briefcase} delay={140} />
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

      <div className="grid gap-5 lg:grid-cols-3">
        <Card delay={380}>
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
        <Card delay={440}>
          <CardTitle icon={Briefcase}>Catégories les plus demandées</CardTitle>
          <BarList items={data.by_category} empty="Aucune mission publiée pour l'instant." />
        </Card>
        <Card delay={500}>
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
          <CardTitle icon={Wallet}>Derniers paiements</CardTitle>
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
      <Card delay={80} className="overflow-hidden p-0 sm:p-0">
        {users.items.length ? (
          <div className="overflow-x-auto">
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
                {users.items.map((u, i) => (
                  <tr key={u.id} className="jl-rise transition-colors hover:bg-accent/30" style={{ animationDelay: `${120 + i * 25}ms` }}>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold">{u.first_name} {u.last_name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}{u.phone ? ` · ${u.phone}` : ""}</p>
                      {u.is_suspended && <p className="mt-1 text-xs font-medium text-red-600">Suspendu{u.suspended_reason ? ` — ${u.suspended_reason}` : ""}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <span key={r} className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", r === "admin" ? "bg-primary-strong text-white" : "bg-accent text-primary-strong")}>
                            {ROLES[r] ?? r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground">{[u.neighborhood, u.city].filter(Boolean).join(", ") || "—"}</td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">{u.jobs_count} mission{u.jobs_count > 1 ? "s" : ""} · {u.applications_count} candidature{u.applications_count > 1 ? "s" : ""}</td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">{formatDate(u.created_at)}</td>
                    <td className="px-5 py-3.5 text-right">
                      {u.roles.includes("admin") ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <SuspendToggle userId={u.id} suspended={u.is_suspended} name={u.first_name} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6"><Empty>Aucun utilisateur ne correspond à cette recherche.</Empty></div>
        )}
      </Card>
    </div>
  );
}

function JobsTab({ data }: { data: OwnerOverview }) {
  return (
    <Card>
      <CardTitle icon={Briefcase} action={<Link href="/admin/jobs" className="text-xs font-semibold text-primary-strong hover:underline">Modération détaillée</Link>}>
        Missions récentes
      </CardTitle>
      {data.recent_jobs.length ? (
        <ul className="grid gap-3">
          {data.recent_jobs.map((j, i) => (
            <li
              key={j.id}
              className={cn("jl-rise flex flex-wrap items-center gap-4 rounded-2xl border p-4 transition-all duration-300 hover:border-primary/30 hover:shadow-[var(--shadow-soft)]", j.is_hidden && "bg-muted/50 opacity-80")}
              style={{ animationDelay: `${80 + i * 50}ms` }}
            >
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

export function OwnerDashboard({
  tab,
  data,
  users,
  q,
}: {
  tab: OwnerTab;
  data: OwnerOverview;
  users?: { total: number; items: OwnerUser[] };
  q: string;
}) {
  return (
    <Shell tab={tab} data={data}>
      {tab === "users" && users ? (
        <UsersTab users={users} q={q} />
      ) : tab === "jobs" ? (
        <JobsTab data={data} />
      ) : tab === "moderation" ? (
        <ModerationTab data={data} />
      ) : tab === "security" ? (
        <SecurityTab data={data} />
      ) : (
        <Overview data={data} />
      )}
    </Shell>
  );
}
