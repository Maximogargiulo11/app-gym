"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { parseDecimal, parseIntOrNull } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { ActiveWorkout, CatalogExercise, DraftExercise, DraftSet } from "./types";

const STORAGE_KEY = "banca:active-workout:v1";

export type WorkoutAction = Action;

type Action =
  | { type: "title"; title: string }
  | { type: "addExercises"; items: { exercise: CatalogExercise; sets: number }[] }
  | { type: "removeExercise"; exId: string }
  | { type: "moveExercise"; exId: string; dir: -1 | 1 }
  | { type: "restSeconds"; exId: string; seconds: number }
  | { type: "addSet"; exId: string }
  | { type: "removeSet"; exId: string; setId: string }
  | { type: "updateSet"; exId: string; setId: string; patch: Partial<Pick<DraftSet, "weight" | "reps">> }
  | { type: "toggleDone"; exId: string; setId: string; fill?: { weight: string; reps: string } }
  | { type: "restAdd"; seconds: number }
  | { type: "restSkip" };

const uuid = () => crypto.randomUUID();
const emptySet = (weight = "", reps = ""): DraftSet => ({ id: uuid(), weight, reps, done: false, completedAt: null });

function mapExercise(state: ActiveWorkout, exId: string, fn: (ex: DraftExercise) => DraftExercise): ActiveWorkout {
  return { ...state, exercises: state.exercises.map((ex) => (ex.id === exId ? fn(ex) : ex)) };
}

function reducer(state: ActiveWorkout, action: Action): ActiveWorkout {
  switch (action.type) {
    case "title":
      return { ...state, title: action.title };
    case "addExercises":
      return {
        ...state,
        exercises: [
          ...state.exercises,
          ...action.items.map(({ exercise, sets }) => ({
            id: uuid(),
            exerciseId: exercise.id,
            name: exercise.name,
            muscles: exercise.muscle_groups,
            restSeconds: 120,
            sets: Array.from({ length: Math.max(1, sets) }, () => emptySet()),
          })),
        ],
      };
    case "removeExercise":
      return { ...state, exercises: state.exercises.filter((ex) => ex.id !== action.exId) };
    case "moveExercise": {
      const i = state.exercises.findIndex((ex) => ex.id === action.exId);
      const j = i + action.dir;
      if (i < 0 || j < 0 || j >= state.exercises.length) return state;
      const exercises = [...state.exercises];
      [exercises[i], exercises[j]] = [exercises[j], exercises[i]];
      return { ...state, exercises };
    }
    case "restSeconds":
      return mapExercise(state, action.exId, (ex) => ({ ...ex, restSeconds: action.seconds }));
    case "addSet":
      return mapExercise(state, action.exId, (ex) => {
        const last = ex.sets.at(-1);
        return { ...ex, sets: [...ex.sets, emptySet(last?.weight ?? "", last?.reps ?? "")] };
      });
    case "removeSet":
      return mapExercise(state, action.exId, (ex) => ({ ...ex, sets: ex.sets.filter((s) => s.id !== action.setId) }));
    case "updateSet":
      return mapExercise(state, action.exId, (ex) => ({
        ...ex,
        sets: ex.sets.map((s) => (s.id === action.setId ? { ...s, ...action.patch } : s)),
      }));
    case "toggleDone": {
      const ex = state.exercises.find((e) => e.id === action.exId);
      const set = ex?.sets.find((s) => s.id === action.setId);
      if (!ex || !set) return state;
      const becomingDone = !set.done;
      const next = mapExercise(state, action.exId, (e) => ({
        ...e,
        sets: e.sets.map((s) =>
          s.id !== action.setId
            ? s
            : {
                ...s,
                weight: becomingDone && !s.weight && action.fill ? action.fill.weight : s.weight,
                reps: becomingDone && !s.reps && action.fill ? action.fill.reps : s.reps,
                done: becomingDone,
                completedAt: becomingDone ? new Date().toISOString() : null,
              },
        ),
      }));
      if (becomingDone && ex.restSeconds > 0) {
        next.rest = { endsAt: Date.now() + ex.restSeconds * 1000, total: ex.restSeconds };
      }
      return next;
    }
    case "restAdd":
      return state.rest
        ? {
            ...state,
            rest: { endsAt: state.rest.endsAt + action.seconds * 1000, total: state.rest.total + action.seconds },
          }
        : state;
    case "restSkip":
      return { ...state, rest: null };
  }
}

/** Lo que se manda a la base: sin el descanso y con números parseados. */
export function toPayload(state: ActiveWorkout) {
  return state.exercises.map((ex, position) => ({
    id: ex.id,
    exercise_id: ex.exerciseId,
    position,
    rest_seconds: ex.restSeconds,
    sets: ex.sets.map((s, i) => ({
      id: s.id,
      set_number: i + 1,
      weight_kg: parseDecimal(s.weight),
      reps: parseIntOrNull(s.reps),
      is_done: s.done,
      completed_at: s.completedAt,
    })),
  }));
}

export function readStoredWorkout(): ActiveWorkout | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ActiveWorkout) : null;
  } catch {
    return null;
  }
}

export function clearStoredWorkout() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // sin almacenamiento disponible: no hay nada que limpiar
  }
}

export type SyncStatus = "saved" | "saving" | "offline" | "error";

/**
 * Estado del entrenamiento en curso. Se guarda al instante en el dispositivo (localStorage)
 * y se sincroniza con Supabase con un pequeño retraso, así no se pierde nada si se cierra la app
 * o se corta la conexión.
 */
export function useActiveWorkout(initial: ActiveWorkout) {
  const [state, dispatch] = useReducer(reducer, initial);
  const [status, setStatus] = useState<SyncStatus>("saved");
  const lastSynced = useRef<string | null>(null);
  const pending = useRef<Promise<boolean> | null>(null);

  const payload = JSON.stringify({ title: state.title, exercises: toPayload(state) });

  // Guardado local inmediato.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // modo privado o almacenamiento lleno: igual se sincroniza con el servidor
    }
  }, [state]);

  const sync = useCallback(async (): Promise<boolean> => {
    if (payload === lastSynced.current) return true;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setStatus("offline");
      return false;
    }
    setStatus("saving");
    const body = JSON.parse(payload) as { title: string; exercises: unknown };
    const { error } = await createClient().rpc("sync_workout", {
      p_workout_id: state.workoutId,
      p_title: body.title,
      p_exercises: body.exercises as never,
    });
    if (error) {
      setStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
      return false;
    }
    lastSynced.current = payload;
    setStatus("saved");
    return true;
  }, [payload, state.workoutId]);

  // Sincronización diferida.
  useEffect(() => {
    if (payload === lastSynced.current) return;
    const t = setTimeout(() => {
      pending.current = sync();
    }, 800);
    return () => clearTimeout(t);
  }, [payload, sync]);

  // Reintentar al recuperar la conexión.
  useEffect(() => {
    const onOnline = () => {
      pending.current = sync();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [sync]);

  /** Fuerza la sincronización (antes de terminar el entrenamiento). */
  const flush = useCallback(async () => {
    await pending.current;
    return sync();
  }, [sync]);

  return { state, dispatch, status, flush };
}
