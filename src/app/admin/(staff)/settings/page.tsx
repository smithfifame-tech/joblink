import { PageHeader } from "@/components/dashboard/page-header";
import { DataTable } from "@/components/admin/data-table";
import { SettingEditor } from "@/components/admin/setting-editor";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isPaymentConfigured } from "@/lib/payments/registry";
import { serverEnv } from "@/lib/env.server";
import { formatDateTime } from "@/lib/utils/format";

export const metadata = { title: "Paramètres de la plateforme" };

export default async function AdminSettingsPage() {
  await requireRole("admin");
  const supabase = await getSupabaseServerClient();
  const [{ data: settings }, { data: events }] = await Promise.all([
    supabase.from("platform_settings").select("*").order("key"),
    supabase.from("webhook_events").select("id, provider, event_type, status, error, received_at").order("received_at", { ascending: false }).limit(15),
  ]);
  const checks: [string, boolean, string][] = [
    ["Clé serveur interne (INTERNAL_RPC_KEY)", Boolean(serverEnv.internalRpcKey), "Webhooks de paiement, limitation de débit, contact, connexion par téléphone"],
    [`Paiements (${serverEnv.paymentProvider})`, isPaymentConfigured(), "Clés API + secret de webhook"],
    ["E-mails Resend", Boolean(serverEnv.resendApiKey), "Facultatif (formulaire de contact)"],
    ["Secret des tâches planifiées", Boolean(serverEnv.cronSecret), "Purge de conservation des données"],
  ];
  return (
    <>
      <PageHeader title="Paramètres" description="Valeurs JSON. Chaque modification est journalisée." />
      <Card className="mb-6">
        <CardHeader><CardTitle>État de la configuration</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm">
          {checks.map(([l, ok, hint]) => (
            <div key={l} className="flex items-center justify-between gap-2"><span>{l} <span className="text-xs text-muted-foreground">— {hint}</span></span>{ok ? <Badge>OK</Badge> : <Badge variant="warning">À configurer</Badge>}</div>
          ))}
          <p className="mt-2 text-xs text-muted-foreground">Environnement : {serverEnv.appEnv}. Attribution d&apos;un administrateur : <code>select public.grant_admin(&apos;email@exemple.com&apos;);</code> dans le SQL Editor Supabase.</p>
        </CardContent>
      </Card>
      <DataTable head={["Clé", "Description", "Public", "Valeur"]} minWidth={900}>
        {(settings ?? []).map((s) => (
          <tr key={s.key as string}>
            <td><code className="text-xs">{s.key as string}</code></td>
            <td className="max-w-72 text-muted-foreground">{s.description as string}</td>
            <td>{s.is_public ? "Oui" : "Non"}</td>
            <td className="min-w-72"><SettingEditor settingKey={s.key as string} value={s.value} /></td>
          </tr>
        ))}
      </DataTable>
      <h2 className="mb-3 mt-8 text-lg font-semibold">Derniers webhooks reçus</h2>
      <DataTable head={["Reçu", "Prestataire", "Type", "Statut", "Erreur"]}>
        {(events ?? []).map((e) => (
          <tr key={e.id as string}>
            <td className="text-muted-foreground">{formatDateTime(e.received_at as string)}</td><td>{e.provider as string}</td><td>{e.event_type as string}</td>
            <td><Badge variant={e.status === "error" ? "danger" : "secondary"}>{e.status as string}</Badge></td><td className="text-xs text-muted-foreground">{(e.error as string) ?? ""}</td>
          </tr>
        ))}
        {(events ?? []).length === 0 && <tr><td colSpan={5} className="text-center text-muted-foreground">Aucun webhook reçu.</td></tr>}
      </DataTable>
    </>
  );
}
