import { notFound } from "next/navigation";
import { ReceiptView } from "@/components/dashboard/receipt";
import { requireUser } from "@/lib/auth/session";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Payment } from "@/types/db";

export const metadata = { title: "Reçu de paiement" };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser();
  const supabase = await getSupabaseServerClient();
  const { data: payment } = await supabase.from("payments").select("*").eq("id", id).eq("status", "succeeded").maybeSingle<Payment>();
  if (!payment) notFound();
  const [{ data: job }, { data: people }] = await Promise.all([
    supabase.from("jobs").select("title").eq("id", payment.job_id).maybeSingle(),
    supabase.from("public_profiles").select("id, first_name, last_initial").in("id", [payment.payer_id, payment.payee_id]),
  ]);
  const name = (uid: string) => {
    const p = (people ?? []).find((x) => x.id === uid);
    return p ? `${p.first_name} ${p.last_initial}` : "—";
  };
  return <ReceiptView payment={payment} jobTitle={(job?.title as string) ?? "Mission"} payer={name(payment.payer_id)} payee={name(payment.payee_id)} />;
}
