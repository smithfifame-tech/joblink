"use client";

import { Ban, BadgeCheck, Check, Eye, EyeOff, RotateCcw, Send, ShieldOff, X } from "lucide-react";
import { ConfirmAction } from "@/components/dashboard/confirm-action";
import {
  adminModerateJobAction, adminPayoutAction, adminRecordManualPayoutAction, adminRefundAction, adminResolveDisputeAction,
  adminReviewVerificationAction, adminSuspendAction, adminToggleReviewAction, adminUpdateReportAction, adminVerifyWorkerAction,
  adminMarkContactHandledAction,
} from "@/lib/actions/admin";

export function SuspendUserButton({ userId, suspended }: { userId: string; suspended: boolean }) {
  return suspended ? (
    <ConfirmAction size="sm" variant="outline" label="Réactiver" icon={<RotateCcw />} title="Réactiver ce compte ?" action={() => adminSuspendAction(userId, false)} />
  ) : (
    <ConfirmAction size="sm" variant="ghost" label="Suspendre" icon={<Ban />} destructive title="Suspendre ce compte ?" description="L'utilisateur ne pourra plus publier, candidater ni écrire." input={{ label: "Motif (journalisé)", required: true }} action={(r) => adminSuspendAction(userId, true, r)} />
  );
}

export function VerifyWorkerButton({ userId, verified }: { userId: string; verified: boolean }) {
  return verified ? (
    <ConfirmAction size="sm" variant="ghost" label="Retirer le badge" icon={<ShieldOff />} title="Retirer le badge vérifié ?" action={() => adminVerifyWorkerAction(userId, false)} />
  ) : (
    <ConfirmAction size="sm" variant="outline" label="Vérifier" icon={<BadgeCheck />} title="Attribuer le badge vérifié ?" action={() => adminVerifyWorkerAction(userId, true)} />
  );
}

export function ReviewVerificationButtons({ requestId }: { requestId: string }) {
  return (
    <div className="flex gap-2">
      <ConfirmAction size="sm" label="Approuver" icon={<Check />} title="Approuver le document ?" action={() => adminReviewVerificationAction(requestId, true)} />
      <ConfirmAction size="sm" variant="outline" label="Refuser" icon={<X />} destructive title="Refuser la demande" input={{ label: "Raison communiquée au travailleur", required: true }} action={(n) => adminReviewVerificationAction(requestId, false, n)} />
    </div>
  );
}

export function ModerateJobButton({ jobId, hidden }: { jobId: string; hidden: boolean }) {
  return hidden ? (
    <ConfirmAction size="sm" variant="outline" label="Rétablir" icon={<Eye />} title="Rétablir la mission ?" action={() => adminModerateJobAction(jobId, false)} />
  ) : (
    <ConfirmAction size="sm" variant="ghost" label="Masquer" icon={<EyeOff />} destructive title="Masquer la mission ?" input={{ label: "Motif communiqué au client", required: true }} action={(n) => adminModerateJobAction(jobId, true, n)} />
  );
}

export function ReportStatusButtons({ reportId }: { reportId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmAction size="sm" variant="outline" label="En examen" title="Passer en examen ?" action={() => adminUpdateReportAction(reportId, "reviewing")} />
      <ConfirmAction size="sm" label="Résolu" title="Marquer comme résolu" input={{ label: "Mesure prise" }} action={(n) => adminUpdateReportAction(reportId, "resolved", n)} />
      <ConfirmAction size="sm" variant="ghost" label="Rejeter" title="Rejeter le signalement" input={{ label: "Motif" }} action={(n) => adminUpdateReportAction(reportId, "dismissed", n)} />
    </div>
  );
}

export function DisputeButtons({ disputeId }: { disputeId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmAction size="sm" variant="outline" label="Prendre en charge" title="Passer en examen" input={{ label: "Note interne", required: true, minLength: 5 }} action={(n) => adminResolveDisputeAction(disputeId, "under_review", n)} />
      <ConfirmAction size="sm" label="En faveur du travailleur" title="Résoudre en faveur du travailleur" description="Le travail sera considéré comme réalisé ; le client pourra payer." input={{ label: "Décision motivée (envoyée aux parties)", required: true, minLength: 5 }} action={(n) => adminResolveDisputeAction(disputeId, "resolved_worker", n)} />
      <ConfirmAction size="sm" variant="outline" label="En faveur du client" title="Résoudre en faveur du client" description="Le contrat sera annulé. Remboursez si un paiement a eu lieu." input={{ label: "Décision motivée", required: true, minLength: 5 }} action={(n) => adminResolveDisputeAction(disputeId, "resolved_client", n)} />
      <ConfirmAction size="sm" variant="ghost" label="Clore" title="Clore sans décision" input={{ label: "Motif", required: true, minLength: 5 }} action={(n) => adminResolveDisputeAction(disputeId, "closed", n)} />
    </div>
  );
}

export function ToggleReviewButton({ reviewId, hidden }: { reviewId: string; hidden: boolean }) {
  return <ConfirmAction size="sm" variant="ghost" label={hidden ? "Afficher" : "Masquer"} icon={hidden ? <Eye /> : <EyeOff />} title={hidden ? "Afficher l'avis ?" : "Masquer l'avis ?"} action={() => adminToggleReviewAction(reviewId, !hidden)} />;
}

export function PayoutButtons({ paymentId }: { paymentId: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <ConfirmAction size="sm" label="Verser via API" icon={<Send />} title="Lancer le versement ?" description="Le montant net sera envoyé sur le numéro Mobile Money du travailleur via le prestataire." action={() => adminPayoutAction(paymentId)} />
      <ConfirmAction size="sm" variant="outline" label="Versement manuel" title="Enregistrer un versement manuel" input={{ label: "Référence de la transaction Mobile Money", required: true }} action={(r) => adminRecordManualPayoutAction(paymentId, r)} />
      <ConfirmAction size="sm" variant="ghost" label="Rembourser" destructive title="Enregistrer un remboursement" description="Effectuez d'abord le remboursement chez le prestataire de paiement." input={{ label: "Motif", required: true }} action={(r) => adminRefundAction(paymentId, r)} />
    </div>
  );
}

export function ContactHandledButton({ id }: { id: string }) {
  return <ConfirmAction size="sm" variant="ghost" label="Traité" icon={<Check />} title="Marquer comme traité ?" action={() => adminMarkContactHandledAction(id)} />;
}
