"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export function RequestActions({ followerId, viewerId, name }: { followerId: string; viewerId: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (accept: boolean) =>
    startTransition(async () => {
      const q = createClient().from("follows");
      if (accept) await q.update({ status: "accepted" }).eq("follower_id", followerId).eq("following_id", viewerId);
      else await q.delete().eq("follower_id", followerId).eq("following_id", viewerId);
      router.refresh();
    });

  return (
    <div className="flex gap-2">
      <Button onClick={() => run(true)} disabled={pending} aria-label={`Aceptar a ${name}`} className="px-4">
        Aceptar
      </Button>
      <Button
        variant="secondary"
        onClick={() => run(false)}
        disabled={pending}
        aria-label={`Rechazar a ${name}`}
        className="px-4"
      >
        Rechazar
      </Button>
    </div>
  );
}
