"use client";

import { Flag } from "lucide-react";
import { useState, useTransition } from "react";
import { Button, FormMessage, Sheet, Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";

type TargetType = "profile" | "workout" | "comment" | "partner_post";

const REASONS = [
  { value: "acoso", label: "Acoso o intimidación" },
  { value: "contenido_inapropiado", label: "Contenido inapropiado" },
  { value: "spam", label: "Spam" },
  { value: "suplantacion", label: "Se hace pasar por otra persona" },
  { value: "otro", label: "Otro motivo" },
] as const;

type Props = { targetType: TargetType; targetId: string; label?: string; variant?: "button" | "link" };

export function ReportButton({ targetType, targetId, label = "Reportar", variant = "button" }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!reason) return setError("Elegí un motivo.");
    setError(null);
    startTransition(async () => {
      const { error } = await createClient()
        .from("reports")
        .insert({ target_type: targetType, target_id: targetId, reason, details: details.trim() || null });
      if (error) return setError("No pudimos enviar el reporte. Probá de nuevo.");
      setDone(true);
    });
  }

  return (
    <>
      {variant === "button" ? (
        <Button variant="outline" onClick={() => setOpen(true)}>
          <Flag aria-hidden className="size-4" />
          {label}
        </Button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="min-h-tap text-muted hover:text-soft text-sm">
          {label}
        </button>
      )}
      <Sheet
        open={open}
        onClose={() => {
          setOpen(false);
          setDone(false);
          setReason(null);
          setDetails("");
        }}
        title="Reportar"
        footer={
          done ? undefined : (
            <Button size="lg" block onClick={submit} disabled={pending}>
              {pending && <Spinner />}
              Enviar reporte
            </Button>
          )
        }
      >
        {done ? (
          <FormMessage success="Gracias. Lo vamos a revisar. Si te sentís en riesgo, también podés bloquear a esta persona." />
        ) : (
          <div className="space-y-4">
            <p className="text-soft text-[15px]">Tu reporte es anónimo: la otra persona no se entera.</p>
            <fieldset className="space-y-2">
              <legend className="sr-only">Motivo</legend>
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  className={cn(
                    "min-h-tap rounded-btn flex cursor-pointer items-center gap-3 border px-4",
                    reason === r.value ? "border-accent-border bg-accent-bg" : "border-border-strong",
                  )}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="size-4 accent-[#C8F53C]"
                  />
                  {r.label}
                </label>
              ))}
            </fieldset>
            <label className="block">
              <span className="text-soft mb-2 block text-sm font-medium">Detalles (opcional)</span>
              <textarea
                value={details}
                maxLength={1000}
                rows={3}
                onChange={(e) => setDetails(e.target.value)}
                className="rounded-btn border-border-strong bg-bg focus:border-accent w-full border px-4 py-3 text-[16px] outline-none"
              />
            </label>
            <FormMessage error={error} />
          </div>
        )}
      </Sheet>
    </>
  );
}
