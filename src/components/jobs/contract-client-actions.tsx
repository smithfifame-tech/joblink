"use client";

import { CheckCircle2, RotateCcw, TriangleAlert } from "lucide-react";
import { ConfirmAction } from "@/components/dashboard/confirm-action";
import { openDisputeAction, requestChangesAction, validateCompletionAction } from "@/lib/actions/applications";
import type { ContractStatus } from "@/types/db";

export function ContractClientActions({ contractId, status }: { contractId: string; status: ContractStatus }) {
  return (
    <div className="flex flex-wrap gap-2">
      {status === "submitted" && (
        <>
          <ConfirmAction
            label="Valider le travail"
            icon={<CheckCircle2 />}
            size="sm"
            title="Valider la réalisation ?"
            description="En validant, vous confirmez que le travail a été réalisé. Le paiement pourra ensuite être déclenché."
            confirmLabel="Valider"
            action={() => validateCompletionAction(contractId)}
          />
          <ConfirmAction
            label="Demander des corrections"
            icon={<RotateCcw />}
            size="sm"
            variant="outline"
            title="Demander des corrections"
            input={{ label: "Corrections attendues", required: true, minLength: 5 }}
            confirmLabel="Envoyer"
            action={(note) => requestChangesAction(contractId, note)}
          />
        </>
      )}
      {(status === "in_progress" || status === "submitted" || status === "completed") && <DisputeButton contractId={contractId} />}
    </div>
  );
}

export function DisputeButton({ contractId }: { contractId: string }) {
  return (
    <ConfirmAction
      label="Signaler un problème"
      icon={<TriangleAlert />}
      size="sm"
      variant="ghost"
      title="Ouvrir un litige"
      description="La mission sera suspendue et l'équipe JOBLINK examinera la situation avec les deux parties."
      input={{ label: "Décrivez le problème", required: true, minLength: 5 }}
      confirmLabel="Ouvrir le litige"
      destructive
      action={(text) => openDisputeAction({ contractId, reason: text.slice(0, 200), details: text })}
    />
  );
}
