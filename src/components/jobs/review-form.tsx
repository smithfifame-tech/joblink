"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitReviewAction } from "@/lib/actions/applications";
import { cn } from "@/lib/utils";

export function ReviewForm({ contractId, targetName }: { contractId: string; targetName: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <div className="grid gap-3 rounded-xl border p-4">
      <p className="text-sm font-medium">Évaluez {targetName}</p>
      <div className="flex gap-1" role="radiogroup" aria-label="Note sur 5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} étoile${n > 1 ? "s" : ""}`} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)} className="rounded p-0.5">
            <Star className={cn("size-7 transition-colors", (hover || rating) >= n ? "fill-amber-400 text-amber-400" : "text-gray-300")} />
          </button>
        ))}
      </div>
      <Textarea placeholder="Votre commentaire (facultatif)" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1500} rows={3} aria-label="Commentaire" />
      <Button
        className="justify-self-start"
        disabled={rating === 0}
        loading={loading}
        onClick={async () => {
          setLoading(true);
          const res = await submitReviewAction({ contractId, rating, comment });
          setLoading(false);
          if (!res.ok) return toast.error(res.error);
          toast.success(res.message);
          router.refresh();
        }}
      >
        Publier l&apos;avis
      </Button>
    </div>
  );
}
