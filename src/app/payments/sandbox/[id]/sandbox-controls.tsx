"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { simulateSandboxPaymentAction } from "@/lib/actions/payments";

export function SandboxControls({ paymentId, disabled }: { paymentId: string; disabled: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState<null | "approved" | "declined">(null);
  async function run(outcome: "approved" | "declined") {
    setLoading(outcome);
    const res = await simulateSandboxPaymentAction(paymentId, outcome);
    setLoading(null);
    if (!res.ok) return toast.error(res.error);
    toast.success(res.message);
    router.push(`/client/payments?payment=${paymentId}`);
  }
  return (
    <div className="grid gap-2">
      <Button size="lg" disabled={disabled} loading={loading === "approved"} onClick={() => run("approved")}>Simuler un paiement réussi (MTN MoMo test)</Button>
      <Button size="lg" variant="outline" disabled={disabled} loading={loading === "declined"} onClick={() => run("declined")}>Simuler un refus</Button>
    </div>
  );
}
