"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { applyAction } from "@/lib/actions/applications";
import { computeBreakdown, DEFAULT_COMMISSION_RATE, formatRate } from "@/lib/payments/commission";
import { formatXOF } from "@/lib/utils/format";

const schema = z.object({
  coverLetter: z.string().trim().min(20, "Présentez-vous en 20 caractères minimum").max(3000),
  proposedAmount: z.string().optional(),
});

export function ApplyForm({ jobId, budget, allowPriceProposal, commissionRate = DEFAULT_COMMISSION_RATE }: { jobId: string; budget: number; allowPriceProposal: boolean; commissionRate?: number }) {
  const router = useRouter();
  const { register, handleSubmit, watch, formState, setError } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { coverLetter: "", proposedAmount: "" },
  });
  const proposed = Number((watch("proposedAmount") ?? "").replace(/\s/g, "")) || budget;
  const breakdown = (() => {
    try {
      return computeBreakdown(Math.round(proposed), commissionRate);
    } catch {
      return null;
    }
  })();

  async function onSubmit(values: z.infer<typeof schema>) {
    const res = await applyAction({ jobId, coverLetter: values.coverLetter, proposedAmount: allowPriceProposal ? values.proposedAmount : "" });
    if (!res.ok) {
      if (res.fieldErrors?.proposedAmount) setError("proposedAmount", { message: res.fieldErrors.proposedAmount[0] });
      toast.error(res.error);
      return;
    }
    toast.success(res.message ?? "Candidature envoyée.");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <FormField id="coverLetter" label="Votre message au client" required error={formState.errors.coverLetter?.message} hint="Expérience, disponibilité, matériel…">
        <Textarea rows={5} maxLength={3000} {...register("coverLetter")} />
      </FormField>
      {allowPriceProposal && (
        <FormField id="proposedAmount" label="Votre prix (FCFA)" error={formState.errors.proposedAmount?.message} hint={`Laissez vide pour accepter le budget de ${formatXOF(budget)}.`}>
          <Input inputMode="numeric" placeholder={String(budget)} {...register("proposedAmount")} />
        </FormField>
      )}
      {breakdown && (
        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          Si vous êtes retenu : {formatXOF(breakdown.amount)} − commission {formatRate(commissionRate)} ({formatXOF(breakdown.commission)}) ={" "}
          <strong className="text-foreground">{formatXOF(breakdown.net)}</strong> nets, avant frais éventuels du prestataire de paiement.
        </p>
      )}
      <Button type="submit" size="lg" loading={formState.isSubmitting}>
        <Send /> Envoyer ma candidature
      </Button>
    </form>
  );
}
