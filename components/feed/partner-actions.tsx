"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type Props = { postId: string; isOwn: boolean; initialJoined: boolean; joinedCount: number };

export function PartnerActions({ postId, isOwn, initialJoined, joinedCount }: Props) {
  const router = useRouter();
  const [joined, setJoined] = useState(initialJoined);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  if (isOwn) {
    return (
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-soft text-sm">
          {joinedCount === 0
            ? "Todavía nadie se sumó."
            : `${joinedCount} ${joinedCount === 1 ? "persona se sumó" : "personas se sumaron"}.`}
        </p>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await createClient().from("partner_posts").update({ is_open: false }).eq("id", postId);
              router.refresh();
            })
          }
        >
          Cerrar
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4 flex items-center justify-end gap-3">
      {error && <p className="text-danger text-sm">No se pudo. Probá de nuevo.</p>}
      <Button
        variant={joined ? "secondary" : "primary"}
        disabled={pending}
        aria-pressed={joined}
        onClick={() =>
          startTransition(async () => {
            setError(false);
            const supabase = createClient();
            const { error } = joined
              ? await supabase.from("partner_requests").delete().eq("post_id", postId)
              : await supabase.from("partner_requests").insert({ post_id: postId });
            if (error) return setError(true);
            setJoined(!joined);
          })
        }
      >
        {joined ? "Te sumaste" : "Sumarme"}
      </Button>
    </div>
  );
}
