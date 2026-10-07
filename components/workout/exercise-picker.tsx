"use client";

import { Check, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button, Pill, Sheet, Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";
import { normalizeSearch } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { MUSCLE_FILTERS, type CatalogExercise } from "@/lib/workout/types";

type Props = {
  open: boolean;
  onClose: () => void;
  catalog: CatalogExercise[];
  userId: string;
  onAdd: (exercises: CatalogExercise[]) => void;
  /** Para crear ejercicios propios y que aparezcan en la lista. */
  onCreated: (exercise: CatalogExercise) => void;
};

export function ExercisePicker({ open, onClose, catalog, userId, onAdd, onCreated }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const results = useMemo(() => {
    // Todas las palabras tienen que aparecer, en cualquier orden y sin importar tildes.
    const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
    const groups = MUSCLE_FILTERS.find((f) => f.label === filter)?.groups;
    return catalog
      .filter((e) => {
        const name = normalizeSearch(e.name);
        return words.every((w) => name.includes(w));
      })
      .filter((e) => !groups || e.muscle_groups.some((g) => groups.includes(g)))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [catalog, query, filter]);

  function close() {
    setSelected([]);
    setQuery("");
    setError(null);
    onClose();
  }

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function createExercise() {
    const name = query.trim();
    if (name.length < 2) return;
    setCreating(true);
    setError(null);
    const groups = MUSCLE_FILTERS.find((f) => f.label === filter)?.groups.slice(0, 1) ?? [];
    const { data, error } = await createClient()
      .from("exercises")
      .insert({ name, muscle_groups: groups, created_by: userId })
      .select("id, name, muscle_groups, equipment, created_by")
      .single();
    setCreating(false);
    if (error || !data) {
      setError("No pudimos crear el ejercicio. Probá de nuevo.");
      return;
    }
    onCreated(data);
    setSelected((s) => [...s, data.id]);
    setQuery("");
  }

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Agregar ejercicios"
      size="full"
      footer={
        <Button
          size="lg"
          block
          disabled={selected.length === 0}
          onClick={() => {
            onAdd(selected.map((id) => catalog.find((e) => e.id === id)!).filter(Boolean));
            close();
          }}
        >
          {selected.length === 0
            ? "Elegí ejercicios"
            : `Agregar ${selected.length} ${selected.length === 1 ? "ejercicio" : "ejercicios"}`}
        </Button>
      }
    >
      <label className="rounded-btn border-border-strong bg-bg focus-within:border-accent mb-3 flex h-12 items-center gap-2 border px-4">
        <Search aria-hidden className="text-muted size-5" />
        <span className="sr-only">Buscar ejercicio</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar: press, sentadilla, remo…"
          className="placeholder:text-muted/70 h-full w-full bg-transparent text-[16px] outline-none"
        />
      </label>

      <div className="-mx-5 mb-3 flex gap-2 overflow-x-auto px-5 pb-1" role="group" aria-label="Filtrar por músculo">
        <Pill active={filter === null} onClick={() => setFilter(null)}>
          Todos
        </Pill>
        {MUSCLE_FILTERS.map((f) => (
          <Pill
            key={f.label}
            active={filter === f.label}
            onClick={() => setFilter(filter === f.label ? null : f.label)}
          >
            {f.label}
          </Pill>
        ))}
      </div>

      <ul className="divide-border divide-y">
        {results.map((e) => {
          const isSelected = selected.includes(e.id);
          return (
            <li key={e.id}>
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggle(e.id)}
                className="flex min-h-[60px] w-full items-center gap-3 py-2 text-left"
              >
                <span
                  aria-hidden
                  className={cn(
                    "inline-flex size-7 shrink-0 items-center justify-center rounded-full border-2",
                    isSelected ? "border-accent bg-accent text-on-accent" : "border-border-strong",
                  )}
                >
                  {isSelected && <Check className="size-4" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{e.name}</span>
                  <span className="text-muted block truncate text-sm">
                    {[e.muscle_groups.join(" · "), e.equipment].filter(Boolean).join(" — ")}
                    {e.created_by && " · Propio"}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {query.trim().length >= 2 && (
        <div className="rounded-card bg-surface-2 mt-4 p-4">
          <p className="text-soft text-sm">
            {results.length === 0 ? "No encontramos ese ejercicio." : "¿No es ninguno de estos?"}
          </p>
          <Button variant="ghost" className="mt-2 -ml-3" onClick={createExercise} disabled={creating}>
            {creating ? <Spinner /> : <Plus aria-hidden className="size-5" />}
            Crear “{query.trim()}”
          </Button>
          {error && (
            <p role="alert" className="text-danger mt-2 text-sm">
              {error}
            </p>
          )}
        </div>
      )}
    </Sheet>
  );
}
