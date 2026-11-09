import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";

export const metadata = { title: "Page introuvable", robots: { index: false } };

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <Logo />
      <SearchX className="mt-6 size-10 text-muted-foreground" />
      <h1 className="text-2xl font-semibold">Page introuvable</h1>
      <p className="text-sm text-muted-foreground">Cette page n&apos;existe pas, ou vous n&apos;avez pas l&apos;autorisation d&apos;y accéder.</p>
      <div className="flex gap-2">
        <Button asChild><Link href="/jobs">Voir les missions</Link></Button>
        <Button asChild variant="outline"><Link href="/">Accueil</Link></Button>
      </div>
    </main>
  );
}
