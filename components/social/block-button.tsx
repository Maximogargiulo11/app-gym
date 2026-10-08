"use client";

import { Ban } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, FormMessage, Sheet, Spinner } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type Props = { viewerId: string; targetId: string; targetName: string };

export function BlockButton({ viewerId, targetId, targetName }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Ban aria-hidden className="size-4" />
        Bloquear
      </Button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={`Bloquear a ${targetName}`}
        footer={
          <Button
            variant="danger"
            size="lg"
            block
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const { error } = await createClient()
                  .from("blocks")
                  .insert({ blocker_id: viewerId, blocked_id: targetId });
                if (error) return setError("No pudimos bloquear. Probá de nuevo.");
                router.replace("/feed");
                router.refresh();
              })
            }
          >
            {pending && <Spinner />}
            Bloquear
          </Button>
        }
      >
        <ul className="text-soft list-disc space-y-2 pl-5 text-[15px]">
          <li>No va a poder ver tu perfil, tus entrenamientos ni tus comentarios, y vos tampoco los suyos.</li>
          <li>Se cancelan los seguimientos entre ustedes, en los dos sentidos.</li>
          <li>No le avisamos. Podés desbloquear desde Perfil → Bloqueados.</li>
        </ul>
        <div className="mt-4">
          <FormMessage error={error} />
        </div>
      </Sheet>
    </>
  );
}
