import Link from "next/link";
import { Logo } from "./logo";

const COLUMNS = [
  {
    title: "Plateforme",
    links: [
      { href: "/jobs", label: "Trouver une mission" },
      { href: "/map", label: "Carte des missions" },
      { href: "/categories", label: "Catégories" },
      { href: "/register?type=client", label: "Publier une mission" },
      { href: "/register?type=worker", label: "Devenir travailleur" },
    ],
  },
  {
    title: "JOBLINK",
    links: [
      { href: "/about", label: "À propos" },
      { href: "/how-it-works", label: "Comment ça marche" },
      { href: "/faq", label: "Questions fréquentes" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Légal",
    links: [
      { href: "/terms", label: "Conditions générales" },
      { href: "/privacy", label: "Confidentialité" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-border/70 bg-[#f7f9f8]">
      <div aria-hidden className="jl-dots pointer-events-none absolute inset-x-0 top-0 h-40 opacity-50 [mask-image:linear-gradient(to_bottom,#000,transparent)]" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-10 pt-16 sm:px-6 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            Le travail près de vous, les opportunités à portée de main.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded-full border border-border bg-white px-3 py-1 text-foreground">Lancé au Bénin</span>
            <span className="rounded-full border border-border bg-white px-3 py-1 text-foreground">Paiements en FCFA (XOF)</span>
          </div>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-foreground">{col.title}</h2>
            <ul className="mt-4 grid gap-2.5">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-primary-strong">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6" aria-hidden>
        <p className="select-none font-logo text-[clamp(3.5rem,15vw,11rem)] font-black leading-[0.8] tracking-tight text-primary/[0.07]">
          JOBLINK
        </p>
      </div>
      <div className="relative border-t border-border/70 bg-white/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} JOBLINK. Tous droits réservés.</p>
          <p>Commission de 5 % sur les missions payées · Aucun frais caché</p>
        </div>
      </div>
    </footer>
  );
}
