"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, FileUp, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ConfirmAction } from "@/components/dashboard/confirm-action";
import { DisputeButton } from "./contract-client-actions";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeStorageName, validateFile } from "@/lib/validations/profile";
import { respondContractAction, submitCompletionAction } from "@/lib/actions/applications";
import type { ContractStatus } from "@/types/db";

export function ContractWorkerActions({ contractId, status, userId }: { contractId: string; status: ContractStatus; userId: string }) {
  return (
    <div className="grid gap-4">
      {status === "pending_acceptance" && (
        <div className="flex flex-wrap gap-2">
          <ConfirmAction label="Confirmer la mission" icon={<Check />} title="Confirmer et démarrer ?" description="Vous vous engagez à réaliser la mission selon les conditions convenues." action={() => respondContractAction(contractId, true)} />
          <ConfirmAction label="Décliner" icon={<X />} variant="outline" title="Décliner la mission ?" description="Le client pourra choisir un autre travailleur." destructive action={() => respondContractAction(contractId, false)} />
        </div>
      )}
      {status === "in_progress" && <CompletionForm contractId={contractId} userId={userId} />}
      {(status === "in_progress" || status === "submitted" || status === "completed") && <div><DisputeButton contractId={contractId} /></div>}
    </div>
  );
}

function CompletionForm({ contractId, userId }: { contractId: string; userId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (note.trim().length < 5) return toast.error("Décrivez brièvement le travail réalisé.");
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const paths: string[] = [];
    for (const f of files) {
      const path = `${userId}/${contractId}/${safeStorageName(f.name, f.type)}`;
      const { error } = await supabase.storage.from("proofs").upload(path, f, { contentType: f.type });
      if (error) {
        setLoading(false);
        return toast.error(`Envoi impossible : ${f.name}`);
      }
      paths.push(path);
    }
    const res = await submitCompletionAction({ contractId, note, proofPaths: paths });
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(res.message);
    router.refresh();
  }

  return (
    <div className="grid gap-3 rounded-xl border p-4">
      <p className="font-medium">Déclarer le travail terminé</p>
      <div className="grid gap-1.5">
        <Label htmlFor="completion-note">Compte rendu <span className="text-destructive">*</span></Label>
        <Textarea id="completion-note" rows={4} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder="Travaux effectués, pièces remplacées, conseils…" />
      </div>
      <div className="grid gap-1.5">
        <Label>Preuves de réalisation (photos ou PDF, 6 max, 10 Mo chacun)</Label>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground hover:border-primary hover:text-primary">
          <FileUp className="size-4" /> Ajouter des fichiers
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="sr-only"
            onChange={(e) => {
              const next = [...files];
              for (const f of Array.from(e.target.files ?? [])) {
                const err = validateFile(f, "proof");
                if (err) toast.error(`${f.name} : ${err}`);
                else if (next.length < 6) next.push(f);
              }
              setFiles(next);
              e.target.value = "";
            }}
          />
        </label>
        {files.length > 0 && (
          <ul className="grid gap-1 text-sm">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center justify-between rounded-md bg-muted px-2 py-1">
                <span className="truncate">{f.name}</span>
                <button type="button" aria-label={`Retirer ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}><X className="size-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Button className="justify-self-start" onClick={submit} loading={loading}>Envoyer pour validation</Button>
    </div>
  );
}
