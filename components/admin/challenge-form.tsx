"use client";

import { useActionState, useState } from "react";
import { createChallenge, type FormState } from "@/app/(app)/admin/sedes/actions";
import { Button, FormMessage, TextField } from "@/components/ui";
import { cn } from "@/lib/cn";

type Branch = { id: string; name: string };

/** Alta de desafío entre sedes (métrica: días con check-in). Campos controlados. */
export function ChallengeForm({
  branches,
  defaultStart,
  defaultEnd,
}: {
  branches: Branch[];
  defaultStart: string;
  defaultEnd: string;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("Días entrenados entre todos los socios");
  const [startsOn, setStartsOn] = useState(defaultStart);
  const [endsOn, setEndsOn] = useState(defaultEnd);
  const [selected, setSelected] = useState<string[]>(branches.slice(0, 2).map((b) => b.id));

  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await createChallenge(prev, formData);
    if (result?.success) setTitle("");
    return result;
  }, null);

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  return (
    <form action={action} className="space-y-4">
      <TextField
        label="Nombre"
        name="title"
        maxLength={80}
        required
        placeholder="Chacabuco vs Sede Centro"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <TextField
        label="Descripción (opcional)"
        name="description"
        maxLength={200}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Empieza"
          name="starts_on"
          type="date"
          required
          value={startsOn}
          onChange={(e) => setStartsOn(e.target.value)}
        />
        <TextField
          label="Termina"
          name="ends_on"
          type="date"
          required
          min={startsOn}
          value={endsOn}
          onChange={(e) => setEndsOn(e.target.value)}
        />
      </div>
      <fieldset>
        <legend className="text-soft mb-2 text-sm font-medium">Sedes que compiten</legend>
        <div className="flex flex-wrap gap-2">
          {branches.map((b) => {
            const on = selected.includes(b.id);
            return (
              <label
                key={b.id}
                className={cn(
                  "rounded-pill inline-flex h-11 cursor-pointer items-center border px-4 text-[15px] font-semibold has-[:focus-visible]:outline-2",
                  on ? "border-accent bg-accent text-on-accent" : "border-border-strong text-text",
                )}
              >
                <input
                  type="checkbox"
                  name="branch_ids"
                  value={b.id}
                  checked={on}
                  onChange={() => toggle(b.id)}
                  className="sr-only"
                />
                {b.name}
              </label>
            );
          })}
        </div>
      </fieldset>
      <FormMessage error={state?.error} success={state?.success} />
      <Button type="submit" block disabled={pending || !title.trim() || selected.length < 2}>
        {pending ? "Creando…" : "Crear desafío"}
      </Button>
    </form>
  );
}
