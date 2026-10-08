"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

export function OwnerActions({ workoutId, published }: { workoutId: string; published: boolean }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const supabase = createClient();

  return (
    <div className="space-y-2">
      <Button
        variant="secondary"
        block
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await supabase.from("workouts").update({ is_published: !published }).eq("id", workoutId);
            router.refresh();
          })
        }
      >
        {published ? "Dejar de publicar (solo vos lo ves)" : "Publicar en el feed"}
      </Button>
      {confirm ? (
        <Button
          variant="danger"
          block
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await supabase.from("workouts").delete().eq("id", workoutId);
              router.replace("/perfil");
              router.refresh();
            })
          }
        >
          Sí, borrar entrenamiento
        </Button>
      ) : (
        <Button variant="ghost" block className="text-danger" onClick={() => setConfirm(true)}>
          Borrar entrenamiento
        </Button>
      )}
    </div>
  );
}
