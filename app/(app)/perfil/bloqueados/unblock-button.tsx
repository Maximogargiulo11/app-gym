"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export function UnblockButton({ viewerId, blockedId, name }: { viewerId: string; blockedId: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="secondary"
      disabled={pending}
      aria-label={`Desbloquear a ${name}`}
      onClick={() =>
        startTransition(async () => {
          await createClient().from("blocks").delete().eq("blocker_id", viewerId).eq("blocked_id", blockedId);
          router.refresh();
        })
      }
    >
      Desbloquear
    </Button>
  );
}
