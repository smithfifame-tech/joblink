"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeStorageName, validateFile } from "@/lib/validations/profile";
import { updateAvatarAction } from "@/lib/actions/profile";
import { storagePublicUrl } from "@/lib/env";

export function AvatarUpload({ userId, path, name }: { userId: string; path: string | null; name: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function onFile(file: File | undefined) {
    if (!file) return;
    const err = validateFile(file, "avatar");
    if (err) return toast.error(err);
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const newPath = `${userId}/${safeStorageName("avatar", file.type)}`;
    const { error } = await supabase.storage.from("avatars").upload(newPath, file, { contentType: file.type, cacheControl: "31536000" });
    if (error) {
      setLoading(false);
      return toast.error("Envoi impossible. Réessayez.");
    }
    const res = await updateAvatarAction(newPath);
    if (res.ok && path) await supabase.storage.from("avatars").remove([path]);
    setLoading(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(res.message);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-20">
        {path && <AvatarImage src={storagePublicUrl("avatars", path) ?? undefined} alt="Photo de profil" />}
        <AvatarFallback className="text-xl">{name.charAt(0)}</AvatarFallback>
      </Avatar>
      <div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} aria-label="Choisir une photo" />
        <Button type="button" variant="outline" onClick={() => input.current?.click()} loading={loading}><Camera /> Changer la photo</Button>
        <p className="mt-1 text-xs text-muted-foreground">JPG, PNG ou WebP, 2 Mo maximum.</p>
      </div>
    </div>
  );
}
