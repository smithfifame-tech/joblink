"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";
import { formatRate } from "@/lib/payments/commission";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { startPaymentAction } from "@/lib/actions/payments";
import { formatXOF } from "@/lib/utils/format";

/** Récapitulatif transparent puis redirection vers le prestataire de paiement. */
export function PayButton({
  contractId,
  amount,
  commission,
  providerFee,
  net,
  methods,
  rate,
}: {
  contractId: string;
  amount: number;
  commission: number;
  providerFee: number;
  net: number;
  methods: string[];
  /** Taux de commission appliqué (affichage). */
  rate?: number;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // Clé d'idempotence stable pendant la session : un double clic ne crée pas deux paiements
  const [key] = useState(() => `pay-${contractId}-${crypto.randomUUID()}`);

  async function pay() {
    setLoading(true);
    const res = await startPaymentAction(contractId, key);
    if (!res.ok) {
      setLoading(false);
      return toast.error(res.error);
    }
    window.location.assign(res.data.checkoutUrl);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><CreditCard /> Payer {formatXOF(amount)}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Récapitulatif du paiement</DialogTitle>
          <DialogDescription>Aucun frais caché : voici exactement ce qui est payé et reversé.</DialogDescription>
        </DialogHeader>
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between font-medium"><dt>Vous payez</dt><dd className="tabular-nums">{formatXOF(amount)}</dd></div>
          <div className="flex justify-between text-muted-foreground"><dt>Commission JOBLINK{rate !== undefined ? ` (${formatRate(rate)})` : ""}</dt><dd className="tabular-nums">− {formatXOF(commission)}</dd></div>
          <div className="flex justify-between text-muted-foreground"><dt>Frais estimés du prestataire de paiement</dt><dd className="tabular-nums">− {formatXOF(providerFee)}</dd></div>
          <div className="flex justify-between border-t pt-2 font-semibold"><dt>Le travailleur reçoit</dt><dd className="text-primary-strong tabular-nums">{formatXOF(net)}</dd></div>
        </dl>
        <p className="text-xs text-muted-foreground">Moyens acceptés : {methods.join(", ")}. Le paiement est confirmé uniquement par notification signée du prestataire.</p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={pay} loading={loading}>Continuer vers le paiement</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
