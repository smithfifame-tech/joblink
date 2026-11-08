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
    <footer className="border-t bg-muted/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-sm text-muted-foreground">Le travail près de vous, les opportunités à portée de main.</p>
          <p className="mt-4 text-xs text-muted-foreground">Lancé au Bénin · Paiements en FCFA (XOF)</p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h2 className="text-sm font-semibold">{col.title}</h2>
            <ul className="mt-3 grid gap-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} JOBLINK. Tous droits réservés.</p>
          <p>Commission de 5 % sur les missions payées · Aucun frais caché</p>
        </div>
      </div>
    </footer>
  );
}
