"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BadgeCheck, Clock, FileUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeStorageName, validateFile } from "@/lib/validations/profile";
import { submitVerificationAction } from "@/lib/actions/profile";

type Status = { verified: boolean; pending: boolean; lastRejectedNote: string | null };

export function VerificationRequest({ userId, status }: { userId: string; status: Status }) {
  const router = useRouter();
  const [type, setType] = useState("cni");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  if (status.verified) return <p className="flex items-center gap-2 text-sm font-medium text-primary-strong"><BadgeCheck className="size-5 text-primary" /> Profil vérifié</p>;
  if (status.pending) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="size-4" /> Demande en cours d&apos;examen (48 h ouvrées).</p>;

  async function submit() {
    if (!file) return toast.error("Ajoutez une photo ou un scan du document.");
    const err = validateFile(file, "verification");
    if (err) return toast.error(err);
    setLoading(true);
    const path = `${userId}/${safeStorageName("piece-identite", file.type)}`;
    const { error } = await getSupabaseBrowserClient().storage.from("verifications").upload(path, file, { contentType: file.type });
    if (error) {
      setLoading(false);
      return toast.error("Envoi impossible.");
    }
    const res = await submitVerificationAction({ documentType: type, documentPath: path });
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(res.message);
    router.refresh();
  }

  return (
    <div className="grid gap-3">
      {status.lastRejectedNote && <p className="text-sm text-destructive">Dernière demande refusée : {status.lastRejectedNote}</p>}
      <p className="text-sm text-muted-foreground">Le badge « Vérifié » rassure les clients. Votre document est stocké de façon privée et consulté uniquement par l&apos;équipe de vérification.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="doc-type">Type de document</Label>
          <NativeSelect id="doc-type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="cni">Carte nationale d&apos;identité</option>
            <option value="cip">Certificat d&apos;identification personnelle (CIP)</option>
            <option value="passport">Passeport</option>
            <option value="driver_license">Permis de conduire</option>
            <option value="other">Autre</option>
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="doc-file">Fichier (image ou PDF, 10 Mo max)</Label>
          <label className="flex h-10 cursor-pointer items-center gap-2 truncate rounded-lg border border-dashed px-3 text-sm text-muted-foreground hover:border-primary">
            <FileUp className="size-4 shrink-0" /> {file ? file.name : "Choisir un fichier"}
            <input id="doc-file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>
      </div>
      <Button className="justify-self-start" onClick={submit} loading={loading}>Demander la vérification</Button>
    </div>
  );
}
