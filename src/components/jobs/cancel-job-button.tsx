"use client";

import { useRouter } from "next/navigation";
import { Ban, Trash2 } from "lucide-react";
import { ConfirmAction } from "@/components/dashboard/confirm-action";
import { cancelJobAction, deleteDraftAction, publishJobAction } from "@/lib/actions/jobs";

export function CancelJobButton({ jobId }: { jobId: string }) {
  return (
    <ConfirmAction
      label="Annuler la mission"
      icon={<Ban />}
      variant="outline"
      title="Annuler cette mission ?"
      description="Les candidats seront prévenus. Cette action est définitive."
      input={{ label: "Motif de l'annulation", required: true }}
      confirmLabel="Annuler la mission"
      destructive
      action={(reason) => cancelJobAction(jobId, reason)}
    />
  );
}

export function DraftActions({ jobId }: { jobId: string }) {
  const router = useRouter();
  return (
    <>
      <ConfirmAction label="Publier" title="Publier la mission ?" description="Elle sera visible par tous les travailleurs." action={() => publishJobAction(jobId)} />
      <ConfirmAction
        label="Supprimer"
        icon={<Trash2 />}
        variant="ghost"
        title="Supprimer ce brouillon ?"
        destructive
        action={() => deleteDraftAction(jobId)}
        onDone={() => router.push("/client/jobs")}
      />
    </>
  );
}
