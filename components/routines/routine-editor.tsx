"use client";

import { ArrowDown, ArrowUp, ChevronLeft, ClipboardList, Minus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ExercisePicker } from "@/components/workout/exercise-picker";
import { Button, EmptyState, FormMessage, Spinner, TextField } from "@/components/ui";
import { formatRest } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { REST_OPTIONS, type CatalogExercise } from "@/lib/workout/types";

export type RoutineItem = {
  key: string;
  exerciseId: string;
  name: string;
  muscles: string[];
  targetSets: number;
  targetReps: string;
  restSeconds: number;
};

type Props = {
  routineId: string | null;
  initialName: string;
  initialItems: RoutineItem[];
  catalog: CatalogExercise[];
  userId: string;
};

export function RoutineEditor({ routineId, initialName, initialItems, catalog: initialCatalog, userId }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [items, setItems] = useState(initialItems);
  const [catalog, setCatalog] = useState(initialCatalog);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const update = (key: string, patch: Partial<RoutineItem>) =>
    setItems((list) => list.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  const move = (i: number, dir: -1 | 1) =>
    setItems((list) => {
      const j = i + dir;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  function save() {
    setError(null);
    if (!name.trim()) return setError("Poné un nombre a la rutina.");
    if (items.length === 0) return setError("Agregá al menos un ejercicio.");
    startTransition(async () => {
      const { error } = await createClient().rpc("save_routine", {
        p_routine_id: routineId as string,
        p_name: name,
        p_items: items.map((it) => ({
          exercise_id: it.exerciseId,
          target_sets: it.targetSets,
          target_reps: it.targetReps ? Number(it.targetReps) : null,
          rest_seconds: it.restSeconds,
        })),
      });
      if (error) return setError("No pudimos guardar la rutina. Probá de nuevo.");
      router.push("/entrenar");
      router.refresh();
    });
  }

  function remove() {
    if (!routineId) return;
    startTransition(async () => {
      const { error } = await createClient().from("routines").delete().eq("id", routineId);
      if (error) return setError("No pudimos borrar la rutina.");
      router.push("/entrenar");
      router.refresh();
    });
  }

  return (
    <>
      <header className="flex items-center gap-3 pt-6 pb-6">
        <Link
          href="/entrenar"
          aria-label="Volver a Entrenar"
          className="size-tap bg-surface inline-flex items-center justify-center rounded-full"
        >
          <ChevronLeft aria-hidden className="size-6" />
        </Link>
        <h1 className="font-display text-[28px] leading-none">{routineId ? "Editar rutina" : "Nueva rutina"}</h1>
      </header>

      <TextField
        label="Nombre"
        value={name}
        maxLength={60}
        placeholder="Empuje · Día A"
        onChange={(e) => setName(e.target.value)}
      />

      <div className="mt-6 space-y-3">
        {items.length === 0 ? (
          <EmptyState icon={ClipboardList} title="Sin ejercicios" description="Agregá los ejercicios de esta rutina." />
        ) : (
          items.map((it, i) => (
            <section key={it.key} aria-label={it.name} className="rounded-card bg-surface p-4">
              <div className="mb-3 flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h2 className="text-accent font-bold">{it.name}</h2>
                  {it.muscles.length > 0 && <p className="text-muted text-sm">{it.muscles.join(" · ")}</p>}
                </div>
                <IconButton label="Subir" disabled={i === 0} onClick={() => move(i, -1)} icon={ArrowUp} />
                <IconButton
                  label="Bajar"
                  disabled={i === items.length - 1}
                  onClick={() => move(i, 1)}
                  icon={ArrowDown}
                />
                <IconButton
                  label={`Quitar ${it.name}`}
                  onClick={() => setItems((l) => l.filter((x) => x.key !== it.key))}
                  icon={Trash2}
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-muted mb-1 text-xs font-semibold tracking-wide uppercase">Series</p>
                  <div className="rounded-btn bg-surface-2 flex h-11 items-center justify-between">
                    <button
                      type="button"
                      aria-label="Menos series"
                      onClick={() => update(it.key, { targetSets: Math.max(1, it.targetSets - 1) })}
                      className="inline-flex h-full w-9 items-center justify-center"
                    >
                      <Minus aria-hidden className="size-4" />
                    </button>
                    <span className="tabular font-bold" aria-live="polite">
                      {it.targetSets}
                    </span>
                    <button
                      type="button"
                      aria-label="Más series"
                      onClick={() => update(it.key, { targetSets: Math.min(20, it.targetSets + 1) })}
                      className="inline-flex h-full w-9 items-center justify-center"
                    >
                      <Plus aria-hidden className="size-4" />
                    </button>
                  </div>
                </div>
                <label>
                  <span className="text-muted mb-1 block text-xs font-semibold tracking-wide uppercase">Reps</span>
                  <input
                    inputMode="numeric"
                    value={it.targetReps}
                    placeholder="—"
                    onChange={(e) => update(it.key, { targetReps: e.target.value.replace(/\D/g, "").slice(0, 3) })}
                    className="tabular rounded-btn bg-surface-2 focus:ring-accent h-11 w-full text-center font-bold outline-none focus:ring-2"
                  />
                </label>
                <label>
                  <span className="text-muted mb-1 block text-xs font-semibold tracking-wide uppercase">Descanso</span>
                  <select
                    value={it.restSeconds}
                    onChange={(e) => update(it.key, { restSeconds: Number(e.target.value) })}
                    className="rounded-btn bg-surface-2 focus:ring-accent h-11 w-full px-2 text-center font-bold outline-none focus:ring-2"
                  >
                    {REST_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s === 0 ? "Off" : formatRest(s)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>
          ))
        )}

        <Button variant="secondary" size="lg" block onClick={() => setPickerOpen(true)}>
          <Plus aria-hidden className="size-5" />
          Agregar ejercicio
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        <FormMessage error={error} />
        <Button size="lg" block onClick={save} disabled={pending}>
          {pending && <Spinner />}
          Guardar rutina
        </Button>
        {routineId &&
          (confirmDelete ? (
            <Button variant="danger" block onClick={remove} disabled={pending}>
              Sí, borrar rutina
            </Button>
          ) : (
            <Button variant="ghost" block className="text-danger" onClick={() => setConfirmDelete(true)}>
              Borrar rutina
            </Button>
          ))}
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        catalog={catalog}
        userId={userId}
        onCreated={(e) => setCatalog((c) => [...c, e])}
        onAdd={(list) =>
          setItems((l) => [
            ...l,
            ...list.map((e) => ({
              key: crypto.randomUUID(),
              exerciseId: e.id,
              name: e.name,
              muscles: e.muscle_groups,
              targetSets: 3,
              targetReps: "",
              restSeconds: 120,
            })),
          ])
        }
      />
    </>
  );
}

function IconButton({
  label,
  icon: Icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: typeof ArrowUp;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="rounded-btn text-soft hover:bg-surface-2 inline-flex size-10 shrink-0 items-center justify-center disabled:opacity-30"
    >
      <Icon aria-hidden className="size-5" />
    </button>
  );
}
