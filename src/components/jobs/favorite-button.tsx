"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleFavoriteAction } from "@/lib/actions/jobs";
import { cn } from "@/lib/utils";

export function FavoriteButton({ targetType, targetId, initial }: { targetType: "job" | "worker"; targetId: string; initial: boolean }) {
  const [fav, setFav] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      aria-pressed={fav}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await toggleFavoriteAction(targetType, targetId);
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          setFav(res.data.favorite);
        })
      }
    >
      <Heart className={cn(fav && "fill-red-500 text-red-500")} /> {fav ? "Enregistrée" : "Enregistrer"}
    </Button>
  );
}
