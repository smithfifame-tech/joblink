import { formatDateTime } from "@/lib/utils/format";
import type { ContractEvent } from "@/types/db";

const LABELS: Record<string, string> = {
  "job.created": "Mission créée",
  "job.published": "Mission publiée",
  "job.updated": "Mission modifiée",
  "job.assigned": "Mission attribuée",
  "job.completed": "Mission terminée",
  "job.cancelled": "Mission annulée",
  "application.created": "Nouvelle candidature",
  "application.accepted": "Candidature acceptée",
  "application.rejected": "Candidature refusée",
  "application.withdrawn": "Candidature retirée",
  "contract.started": "Mission confirmée et démarrée",
  "contract.declined": "Mission déclinée par le travailleur",
  "contract.submitted": "Travail déclaré terminé",
  "contract.changes_requested": "Corrections demandées",
  "contract.completed": "Travail validé",
  "payment.initiated": "Paiement initié",
  "payment.succeeded": "Paiement confirmé",
  "dispute.opened": "Litige ouvert",
  "dispute.updated": "Litige mis à jour",
};

export function EventTimeline({ events }: { events: ContractEvent[] }) {
  if (!events.length) return <p className="text-sm text-muted-foreground">Aucun événement.</p>;
  return (
    <ol className="relative grid gap-4 border-l pl-5">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[25px] top-1.5 size-2.5 rounded-full border-2 border-background bg-primary" aria-hidden />
          <p className="text-sm font-medium">{LABELS[e.event_type] ?? e.event_type}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(e.created_at)}</p>
        </li>
      ))}
    </ol>
  );
}
