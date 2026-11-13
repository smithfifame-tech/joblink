"use client";

import { Check, X } from "lucide-react";
import { ConfirmAction } from "@/components/dashboard/confirm-action";
import { acceptApplicationAction, rejectApplicationAction } from "@/lib/actions/applications";

export function ApplicationActions({ applicationId, workerName, amount }: { applicationId: string; workerName: string; amount: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmAction
        label="Accepter"
        icon={<Check />}
        size="sm"
        title={`Accepter ${workerName} ?`}
        description={`Montant convenu : ${amount}. Le travailleur devra confirmer la mission. Une conversation sera ouverte avec lui.`}
        confirmLabel="Accepter la candidature"
        action={() => acceptApplicationAction(applicationId)}
      />
      <ConfirmAction
        label="Refuser"
        icon={<X />}
        size="sm"
        variant="outline"
        title="Refuser cette candidature ?"
        input={{ label: "Message au candidat (facultatif)", placeholder: "Merci pour votre proposition…" }}
        confirmLabel="Refuser"
        destructive
        action={(note) => rejectApplicationAction(applicationId, note)}
      />
    </div>
  );
}
