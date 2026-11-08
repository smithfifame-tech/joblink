"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resendConfirmationAction } from "@/lib/actions/auth";

export function ResendButton({ email }: { email: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="ghost"
      loading={loading}
      onClick={async () => {
        setLoading(true);
        const res = await resendConfirmationAction(email);
        setLoading(false);
        if (res.ok) {
          toast.success(res.message);
        } else {
          toast.error(res.error);
        }
      }}
    >
      Renvoyer l&apos;e-mail
    </Button>
  );
}
