"use client";

import { Heart } from "lucide-react";
import { useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";

type Props = { workoutId: string; viewerId: string; initialLiked: boolean; initialCount: number };

export function LikeButton({ workoutId, viewerId, initialLiked, initialCount }: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [, startTransition] = useTransition();

  function toggle() {
    const next = !liked;
    // Optimista: se ve al instante y se revierte si falla.
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    startTransition(async () => {
      const supabase = createClient();
      const { error } = next
        ? await supabase.from("likes").insert({ workout_id: workoutId })
        : await supabase.from("likes").delete().eq("workout_id", workoutId).eq("user_id", viewerId);
      if (error) {
        setLiked(!next);
        setCount((c) => c + (next ? -1 : 1));
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? "Quitar me gusta" : "Me gusta"}
      className="min-h-tap rounded-btn inline-flex items-center gap-2 px-2 text-[17px] font-bold"
    >
      <Heart
        aria-hidden
        className={cn("size-6 transition-colors", liked ? "fill-danger text-danger" : "text-text")}
        strokeWidth={1.75}
      />
      <span className="tabular">{count}</span>
    </button>
  );
}
