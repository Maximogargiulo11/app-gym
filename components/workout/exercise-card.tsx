"use client";

import { ArrowDown, ArrowUp, Check, Clock, MoreVertical, Trash2, Undo2 } from "lucide-react";
import { useState, type Dispatch } from "react";
import type { WorkoutAction } from "@/lib/workout/use-active-workout";
import { cn } from "@/lib/cn";
import { epley, formatNumber, formatRest, parseDecimal, parseIntOrNull } from "@/lib/format";
import { REST_OPTIONS, type DraftExercise, type PreviousSet, type Record } from "@/lib/workout/types";

type Props = {
  exercise: DraftExercise;
  previous?: PreviousSet[];
  record?: Record;
  isFirst: boolean;
  isLast: boolean;
  dispatch: Dispatch<WorkoutAction>;
};

/** ¿La serie supera el récord conocido? (el servidor lo confirma al terminar) */
function isLivePr(weight: number | null, reps: number | null, record?: Record) {
  if (!record || weight === null || reps === null || weight <= 0 || reps <= 0) return false;
  return (
    weight > record.best_weight ||
    (weight === record.best_weight && reps > record.best_weight_reps) ||
    epley(weight, reps) > record.best_e1rm + 0.01
  );
}

export function ExerciseCard({ exercise, previous, record, isFirst, isLast, dispatch }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const exId = exercise.id;

  return (
    <section aria-labelledby={`ex-${exId}`} className="rounded-card bg-surface p-4">
      <header className="mb-3 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 id={`ex-${exId}`} className="text-accent text-[19px] leading-tight font-bold">
            {exercise.name}
          </h2>
          {exercise.muscles.length > 0 && <p className="text-muted mt-0.5 text-sm">{exercise.muscles.join(" · ")}</p>}
        </div>

        <label className="rounded-btn bg-surface-2 relative inline-flex h-10 shrink-0 items-center gap-1.5 px-3 text-sm font-semibold">
          <Clock aria-hidden className="text-soft size-4" />
          <span aria-hidden className="tabular">
            {exercise.restSeconds > 0 ? formatRest(exercise.restSeconds) : "Off"}
          </span>
          <span className="sr-only">Descanso de {exercise.name}</span>
          <select
            value={exercise.restSeconds}
            onChange={(e) => dispatch({ type: "restSeconds", exId, seconds: Number(e.target.value) })}
            className="absolute inset-0 cursor-pointer opacity-0"
          >
            {REST_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === 0 ? "Sin descanso" : formatRest(s)}
              </option>
            ))}
          </select>
        </label>

        <div className="relative">
          <button
            type="button"
            aria-label={`Opciones de ${exercise.name}`}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="rounded-btn text-soft hover:bg-surface-2 inline-flex size-10 items-center justify-center"
          >
            <MoreVertical aria-hidden className="size-5" />
          </button>
          {menuOpen && (
            <ul
              className="rounded-btn border-border-strong bg-surface-2 absolute top-11 right-0 z-20 w-52 overflow-hidden border py-1 shadow-xl"
              onMouseLeave={() => setMenuOpen(false)}
            >
              {(
                [
                  !isFirst && { label: "Subir", icon: ArrowUp, action: { type: "moveExercise", exId, dir: -1 } },
                  !isLast && { label: "Bajar", icon: ArrowDown, action: { type: "moveExercise", exId, dir: 1 } },
                  exercise.sets.length > 1 && {
                    label: "Quitar última serie",
                    icon: Undo2,
                    action: { type: "removeSet", exId, setId: exercise.sets.at(-1)!.id },
                  },
                  { label: "Quitar ejercicio", icon: Trash2, action: { type: "removeExercise", exId }, danger: true },
                ] as (false | { label: string; icon: typeof ArrowUp; action: WorkoutAction; danger?: boolean })[]
              )
                .filter((it): it is Exclude<typeof it, false> => Boolean(it))
                .map((it) => {
                  return (
                    <li key={it.label}>
                      <button
                        type="button"
                        onClick={() => {
                          dispatch(it.action);
                          setMenuOpen(false);
                        }}
                        className={cn(
                          "min-h-tap hover:bg-surface flex w-full items-center gap-3 px-4 text-left text-[15px]",
                          it.danger && "text-danger",
                        )}
                      >
                        <it.icon aria-hidden className="size-4" />
                        {it.label}
                      </button>
                    </li>
                  );
                })}
            </ul>
          )}
        </div>
      </header>

      <table className="w-full table-fixed border-separate border-spacing-y-1.5">
        <thead>
          <tr className="text-muted text-left text-xs font-semibold tracking-wide uppercase">
            <th scope="col" className="w-12 pb-1">
              Serie
            </th>
            <th scope="col" className="pb-1">
              Anterior
            </th>
            <th scope="col" className="w-[76px] pb-1 text-center">
              Kg
            </th>
            <th scope="col" className="w-[60px] pb-1 text-center">
              Reps
            </th>
            <th scope="col" className="w-[52px] pb-1 text-center">
              <span className="sr-only">Hecho</span>
              <span aria-hidden>
                <Check className="mx-auto size-4" />
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {exercise.sets.map((set, i) => {
            const prev = previous?.find((p) => p.set_number === i + 1) ?? previous?.at(-1);
            const prevWeight = prev?.weight_kg != null ? formatNumber(prev.weight_kg) : "";
            const prevReps = prev?.reps != null ? String(prev.reps) : "";
            const weight = parseDecimal(set.weight);
            const reps = parseIntOrNull(set.reps);
            const pr = set.done && isLivePr(weight, reps, record);
            const n = i + 1;

            return (
              <tr key={set.id} className={cn(set.done && "[&>td]:bg-accent-bg/60")}>
                <td className="rounded-l-btn py-0.5 pl-1">
                  <span className="inline-flex items-center gap-1.5 text-[17px] font-bold">
                    {n}
                    {pr && <span className="bg-pr-bg text-pr rounded-md px-1.5 py-0.5 text-[11px] font-bold">PR</span>}
                  </span>
                </td>
                <td className="text-muted truncate text-[15px]">
                  {prev ? (
                    <button
                      type="button"
                      className="hover:text-soft truncate text-left"
                      aria-label={`Usar la marca anterior en la serie ${n}`}
                      onClick={() =>
                        dispatch({
                          type: "updateSet",
                          exId,
                          setId: set.id,
                          patch: { weight: prevWeight, reps: prevReps },
                        })
                      }
                    >
                      {prevWeight ? `${prevWeight} kg` : "Peso corporal"} × {prevReps}
                    </button>
                  ) : (
                    <span aria-label="Sin datos anteriores">—</span>
                  )}
                </td>
                <td className="px-1">
                  <input
                    inputMode="decimal"
                    aria-label={`Kg serie ${n}`}
                    value={set.weight}
                    placeholder={prevWeight || "0"}
                    onChange={(e) =>
                      dispatch({
                        type: "updateSet",
                        exId,
                        setId: set.id,
                        patch: { weight: e.target.value.replace(/[^\d.,]/g, "").slice(0, 6) },
                      })
                    }
                    className="tabular rounded-btn bg-surface-2 placeholder:text-muted/60 focus:ring-accent h-12 w-full text-center text-[18px] font-bold outline-none placeholder:font-semibold focus:ring-2"
                  />
                </td>
                <td className="px-1">
                  <input
                    inputMode="numeric"
                    aria-label={`Repeticiones serie ${n}`}
                    value={set.reps}
                    placeholder={prevReps || "0"}
                    onChange={(e) =>
                      dispatch({
                        type: "updateSet",
                        exId,
                        setId: set.id,
                        patch: { reps: e.target.value.replace(/\D/g, "").slice(0, 3) },
                      })
                    }
                    className="tabular rounded-btn bg-surface-2 placeholder:text-muted/60 focus:ring-accent h-12 w-full text-center text-[18px] font-bold outline-none placeholder:font-semibold focus:ring-2"
                  />
                </td>
                <td className="rounded-r-btn py-0.5 pl-1">
                  <button
                    type="button"
                    aria-pressed={set.done}
                    aria-label={set.done ? `Desmarcar serie ${n}` : `Marcar serie ${n} como hecha`}
                    onClick={() =>
                      dispatch({
                        type: "toggleDone",
                        exId,
                        setId: set.id,
                        fill: { weight: prevWeight, reps: prevReps },
                      })
                    }
                    className={cn(
                      "rounded-btn inline-flex h-12 w-full items-center justify-center border-2 transition-colors",
                      set.done
                        ? "border-accent bg-accent text-on-accent"
                        : "border-border-strong text-muted hover:border-soft",
                    )}
                  >
                    <Check aria-hidden className="size-6" strokeWidth={2.5} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <button
        type="button"
        onClick={() => dispatch({ type: "addSet", exId })}
        className="rounded-btn bg-surface-2 mt-2 flex h-12 w-full items-center justify-center text-[15px] font-semibold hover:bg-[#2c312e]"
      >
        + Agregar serie
      </button>
    </section>
  );
}
