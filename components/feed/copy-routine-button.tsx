"use client";

import { Check, Copy } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Spinner } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export function CopyRoutineButton({ workoutId }: { workoutId: string }) {
  const [routineId, setRoutineId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  if (routineId) {
    return (
      <Link
        href={`/entrenar/rutinas/${routineId}`}
        className="rounded-btn bg-accent-bg text-accent inline-flex h-12 items-center gap-2 px-4 text-[15px] font-semibold"
      >
        <Check aria-hidden className="size-5" />
        Copiada · ver
      </Link>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          setError(false);
          const { data, error } = await createClient().rpc("copy_workout_as_routine", { p_workout_id: workoutId });
          if (error || !data) return setError(true);
          setRoutineId(data);
        })
      }
      className="rounded-btn bg-surface-2 text-accent inline-flex h-12 items-center gap-2 px-4 text-[15px] font-semibold hover:bg-[#2c312e] disabled:opacity-60"
    >
      {pending ? <Spinner /> : <Copy aria-hidden className="size-5" />}
      {error ? "No se pudo copiar" : "Copiar rutina"}
    </button>
  );
}
