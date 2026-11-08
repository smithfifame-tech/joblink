"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminSetSettingAction } from "@/lib/actions/admin";

export function SettingEditor({ settingKey, value }: { settingKey: string; value: unknown }) {
  const router = useRouter();
  const [raw, setRaw] = useState(JSON.stringify(value));
  const [loading, setLoading] = useState(false);
  return (
    <form className="flex gap-2" onSubmit={async (e) => {
      e.preventDefault();
      setLoading(true);
      const res = await adminSetSettingAction(settingKey, raw);
      setLoading(false);
      if (!res.ok) return toast.error(res.error);
      toast.success(res.message);
      router.refresh();
    }}>
      <Input value={raw} onChange={(e) => setRaw(e.target.value)} className="font-mono text-xs" aria-label={`Valeur de ${settingKey}`} />
      <Button size="sm" type="submit" loading={loading} disabled={raw === JSON.stringify(value)}>Enregistrer</Button>
    </form>
  );
}
