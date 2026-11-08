export const dynamic = "force-dynamic";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/actions/auth";

export const metadata = { title: "Compte suspendu", robots: { index: false } };

export default function SuspendedPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
      <ShieldAlert className="size-10 text-destructive" />
      <h1 className="mt-4 text-2xl font-semibold">Compte suspendu</h1>
      <p className="mt-2 text-sm text-muted-foreground">Votre compte a été suspendu par la modération. Contactez le support pour en savoir plus.</p>
      <div className="mt-6 flex gap-2">
        <Button asChild variant="outline"><Link href="/contact">Contacter le support</Link></Button>
        <form action={logoutAction}><Button type="submit">Se déconnecter</Button></form>
      </div>
    </main>
  );
}
