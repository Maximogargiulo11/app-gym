"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";

export type FollowStatus = "none" | "pending" | "accepted";

type Props = {
  viewerId: string;
  targetId: string;
  targetName: string;
  initialStatus: FollowStatus;
  size?: "sm" | "md";
  block?: boolean;
};

const LABELS: Record<FollowStatus, string> = {
  none: "Seguir",
  pending: "Solicitud enviada",
  accepted: "Siguiendo",
};

/** Seguir / cancelar solicitud / dejar de seguir. Si la cuenta es privada, queda pendiente (lo decide la base). */
export function FollowButton({ viewerId, targetId, targetName, initialStatus, size = "md", block }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  function toggle() {
    setError(false);
    startTransition(async () => {
      const supabase = createClient();
      if (status === "none") {
        const { data, error } = await supabase
          .from("follows")
          .insert({ follower_id: viewerId, following_id: targetId })
          .select("status")
          .single();
        if (error || !data) return setError(true);
        setStatus(data.status as FollowStatus);
      } else {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", viewerId)
          .eq("following_id", targetId);
        if (error) return setError(true);
        setStatus("none");
      }
    });
  }

  return (
    <Button
      variant={status === "none" ? "primary" : "secondary"}
      onClick={toggle}
      disabled={pending}
      block={block}
      aria-label={
        status === "none"
          ? `Seguir a ${targetName}`
          : status === "pending"
            ? `Cancelar la solicitud a ${targetName}`
            : `Dejar de seguir a ${targetName}`
      }
      className={cn(size === "sm" && "h-11 px-4 text-[15px]", error && "ring-danger ring-2")}
    >
      {LABELS[status]}
    </Button>
  );
}
