import { Badge } from "@/components/ui/badge";
import type { ApplicationStatus, ContractStatus, JobStatus, PaymentStatus } from "@/types/db";

type V = "default" | "secondary" | "warning" | "danger" | "info" | "dark" | "solid" | "outline";

const JOB: Record<JobStatus, [string, V]> = {
  draft: ["Brouillon", "secondary"],
  published: ["Publiée", "default"],
  reviewing: ["Candidatures en cours", "info"],
  assigned: ["Attribuée", "warning"],
  in_progress: ["En cours", "warning"],
  completed: ["Terminée", "dark"],
  cancelled: ["Annulée", "secondary"],
  disputed: ["En litige", "danger"],
};
const APP: Record<ApplicationStatus, [string, V]> = {
  pending: ["En attente", "info"],
  accepted: ["Acceptée", "default"],
  rejected: ["Non retenue", "secondary"],
  withdrawn: ["Retirée", "secondary"],
};
const CONTRACT: Record<ContractStatus, [string, V]> = {
  pending_acceptance: ["À confirmer", "info"],
  in_progress: ["En cours", "warning"],
  submitted: ["À valider", "warning"],
  completed: ["Terminée", "dark"],
  cancelled: ["Annulée", "secondary"],
  disputed: ["En litige", "danger"],
};
const PAYMENT: Record<PaymentStatus, [string, V]> = {
  pending: ["En attente", "info"],
  processing: ["En cours", "warning"],
  succeeded: ["Payé", "default"],
  failed: ["Échoué", "danger"],
  cancelled: ["Annulé", "secondary"],
  refunded: ["Remboursé", "secondary"],
};

export const jobStatusLabel = (s: JobStatus) => JOB[s][0];

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const [l, v] = JOB[status];
  return <Badge variant={v}>{l}</Badge>;
}
export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const [l, v] = APP[status];
  return <Badge variant={v}>{l}</Badge>;
}
export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const [l, v] = CONTRACT[status];
  return <Badge variant={v}>{l}</Badge>;
}
export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const [l, v] = PAYMENT[status];
  return <Badge variant={v}>{l}</Badge>;
}

export const PAY_TYPE_LABEL = { fixed: "Forfait", hourly: "par heure", daily: "par jour" } as const;
