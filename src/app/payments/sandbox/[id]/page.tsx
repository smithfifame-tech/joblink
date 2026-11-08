export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SandboxControls } from "./sandbox-controls";
import { requireUser } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isProduction, serverEnv } from "@/lib/env.server";
import { formatXOF } from "@/lib/utils/format";
import type { Payment } from "@/types/db";

export const metadata = { title: "Paiement de test", robots: { index: false } };

/** Simulateur de prestataire (SANDBOX). Inaccessible en production. */
export default async function SandboxCheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  if (isProduction() || serverEnv.paymentProvider !== "sandbox") notFound();
  const { id } = await params;
  const user = await requireUser(`/payments/sandbox/${id}`);
  const supabase = await getSupabaseServerClient();
  const { data: p } = await supabase.from("payments").select("*").eq("id", id).eq("payer_id", user.id).maybeSingle<Payment>();
  if (!p) notFound();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4">
      <Logo />
      <Alert variant="warning" title="Environnement de test">Aucune somme réelle n&apos;est débitée. Ce simulateur envoie un webhook signé, traité exactement comme un vrai prestataire.</Alert>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FlaskConical className="size-4" /> Paiement sandbox</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <p className="text-3xl font-semibold tabular-nums">{formatXOF(p.amount)}</p>
          <p className="text-sm text-muted-foreground">Référence : {p.provider_reference} · Statut actuel : {p.status}</p>
          <SandboxControls paymentId={p.id} disabled={!["pending", "processing"].includes(p.status)} />
        </CardContent>
      </Card>
    </main>
  );
}
