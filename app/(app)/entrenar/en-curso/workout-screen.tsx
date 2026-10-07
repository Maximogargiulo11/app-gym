"use client";

import { CloudOff, Dumbbell, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { ExerciseCard } from "@/components/workout/exercise-card";
import { ExercisePicker } from "@/components/workout/exercise-picker";
import { RestBar } from "@/components/workout/rest-bar";
import { Button, EmptyState, FormMessage, Sheet, Skeleton, Spinner, TextField, Toggle } from "@/components/ui";
import { formatClock, formatNumber, parseDecimal, parseIntOrNull } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { useNow } from "@/lib/use-now";
import {
  clearStoredWorkout,
  readStoredWorkout,
  useActiveWorkout,
  type SyncStatus,
} from "@/lib/workout/use-active-workout";
import type { ActiveWorkout, CatalogExercise, PreviousSet, Record } from "@/lib/workout/types";

type Props = { server: ActiveWorkout; catalog: CatalogExercise[]; userId: string };

const subscribeNoop = () => () => {};

/**
 * Elige el estado inicial: si en este dispositivo hay una copia del mismo entrenamiento,
 * esa es la más nueva (se guarda antes que en el servidor).
 */
export function WorkoutScreen({ server, catalog, userId }: Props) {
  // No montar hasta estar en el cliente: si se montara con la copia del servidor, su guardado
  // local pisaría la copia del dispositivo (que puede tener cambios todavía no sincronizados).
  const isClient = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  if (!isClient) return <Skeleton className="mt-8 h-96 w-full" />;

  const stored = readStoredWorkout();
  const initial = stored && stored.workoutId === server.workoutId ? stored : server;
  return <Workout initial={initial} catalog={catalog} userId={userId} />;
}

function Workout({
  initial,
  catalog: initialCatalog,
  userId,
}: {
  initial: ActiveWorkout;
  catalog: CatalogExercise[];
  userId: string;
}) {
  const router = useRouter();
  const { state, dispatch, status, flush } = useActiveWorkout(initial);
  const [catalog, setCatalog] = useState(initialCatalog);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [previous, setPrevious] = useState<Map<string, PreviousSet[]>>(new Map());
  const [records, setRecords] = useState<Map<string, Record>>(new Map());
  const now = useNow(1000);

  // "Anterior" y récords de los ejercicios del entrenamiento.
  const exerciseIds = useMemo(() => [...new Set(state.exercises.map((e) => e.exerciseId))].sort(), [state.exercises]);
  const idsKey = exerciseIds.join(",");
  useEffect(() => {
    if (exerciseIds.length === 0) return;
    let cancelled = false;
    const supabase = createClient();
    Promise.all([
      supabase.rpc("previous_sets", { p_exercise_ids: exerciseIds }),
      supabase
        .from("personal_records")
        .select("exercise_id, best_weight, best_weight_reps, best_e1rm")
        .eq("user_id", userId)
        .in("exercise_id", exerciseIds),
    ]).then(([prev, recs]) => {
      if (cancelled) return;
      const pm = new Map<string, PreviousSet[]>();
      for (const row of prev.data ?? []) {
        pm.set(row.exercise_id, [...(pm.get(row.exercise_id) ?? []), row]);
      }
      setPrevious(pm);
      setRecords(new Map((recs.data ?? []).map((r) => [r.exercise_id, r])));
    });
    return () => {
      cancelled = true;
    };
    // idsKey resume exerciseIds
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, userId]);

  const stats = useMemo(() => {
    let volume = 0;
    let sets = 0;
    for (const ex of state.exercises)
      for (const s of ex.sets)
        if (s.done) {
          sets++;
          volume += (parseDecimal(s.weight) ?? 0) * (parseIntOrNull(s.reps) ?? 0);
        }
    return { volume, sets };
  }, [state.exercises]);

  const skipRest = useCallback(() => dispatch({ type: "restSkip" }), [dispatch]);

  return (
    <div className={state.rest ? "pb-24" : undefined}>
      <header className="bg-bg/95 sticky top-0 z-20 -mx-5 px-5 pt-6 pb-4 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-muted text-sm">Entrenamiento en curso</p>
            <h1 className="font-display line-clamp-2 text-[26px] leading-tight break-words">{state.title}</h1>
          </div>
          <Button size="lg" className="shrink-0 px-6" onClick={() => setFinishOpen(true)}>
            Terminar
          </Button>
        </div>
        <dl className="mt-4 grid grid-cols-3">
          <Stat label="Duración" value={formatClock(now - new Date(state.startedAt).getTime())} accent />
          <Stat label="Volumen" value={`${formatNumber(stats.volume)} kg`} />
          <Stat label="Series" value={String(stats.sets)} />
        </dl>
        <SyncBadge status={status} />
      </header>

      <div className="space-y-4">
        {state.exercises.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="Agregá tu primer ejercicio"
            description="Buscá en la biblioteca o creá uno propio."
          />
        ) : (
          state.exercises.map((ex, i) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              previous={previous.get(ex.exerciseId)}
              record={records.get(ex.exerciseId)}
              isFirst={i === 0}
              isLast={i === state.exercises.length - 1}
              dispatch={dispatch}
            />
          ))
        )}

        <Button variant="secondary" size="lg" block onClick={() => setPickerOpen(true)}>
          <Plus aria-hidden className="size-5" />
          Agregar ejercicio
        </Button>
      </div>

      {state.rest && (
        <RestBar
          key={state.rest.endsAt}
          rest={state.rest}
          onAdd={() => dispatch({ type: "restAdd", seconds: 15 })}
          onSkip={skipRest}
        />
      )}

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        catalog={catalog}
        userId={userId}
        onCreated={(e) => setCatalog((c) => [...c, e])}
        onAdd={(list) =>
          dispatch({
            type: "addExercises",
            items: list.map((exercise) => ({ exercise, sets: previous.get(exercise.id)?.length || 3 })),
          })
        }
      />

      <FinishSheet
        open={finishOpen}
        onClose={() => setFinishOpen(false)}
        state={state}
        doneSets={stats.sets}
        onTitle={(title) => dispatch({ type: "title", title })}
        flush={flush}
        onDone={(path) => {
          clearStoredWorkout();
          router.replace(path);
          router.refresh();
        }}
      />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <dt className="text-muted text-xs font-medium tracking-wide uppercase">{label}</dt>
      <dd className={`tabular mt-1 text-[22px] font-bold ${accent ? "text-accent" : ""}`}>{value}</dd>
    </div>
  );
}

function SyncBadge({ status }: { status: SyncStatus }) {
  if (status === "saved" || status === "saving") {
    return (
      <p className="sr-only" aria-live="polite">
        {status === "saving" ? "Guardando" : "Guardado"}
      </p>
    );
  }
  return (
    <p role="status" className="rounded-btn bg-surface-2 text-soft mt-3 flex items-center gap-2 px-3 py-2 text-sm">
      <CloudOff aria-hidden className="size-4 shrink-0" />
      {status === "offline"
        ? "Sin conexión. Tu entrenamiento queda guardado en este dispositivo."
        : "No pudimos guardar en el servidor. Lo reintentamos solo."}
    </p>
  );
}

type FinishProps = {
  open: boolean;
  onClose: () => void;
  state: ActiveWorkout;
  doneSets: number;
  onTitle: (title: string) => void;
  flush: () => Promise<boolean>;
  onDone: (path: string) => void;
};

function FinishSheet({ open, onClose, state, doneSets, onTitle, flush, onDone }: FinishProps) {
  const [publish, setPublish] = useState(true);
  const [saveRoutine, setSaveRoutine] = useState(false);
  const [routineName, setRoutineName] = useState(state.title);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const pendingSets = state.exercises.reduce((n, ex) => n + ex.sets.filter((s) => !s.done).length, 0);

  function finish() {
    setError(null);
    startTransition(async () => {
      if (!(await flush())) {
        setError("Necesitás conexión para guardar. Tu entrenamiento sigue guardado en este dispositivo.");
        return;
      }
      const supabase = createClient();
      const { error } = await supabase.rpc("finish_workout", { p_workout_id: state.workoutId, p_publish: publish });
      if (error) {
        setError(
          error.message.includes("Marcá") ? error.message : "No pudimos guardar el entrenamiento. Probá de nuevo.",
        );
        return;
      }
      if (saveRoutine) {
        await supabase.rpc("save_routine", {
          p_routine_id: null as unknown as string,
          p_name: routineName || state.title,
          p_items: state.exercises
            .filter((ex) => ex.sets.some((s) => s.done))
            .map((ex) => {
              const done = ex.sets.filter((s) => s.done);
              return {
                exercise_id: ex.exerciseId,
                target_sets: done.length,
                target_reps: parseIntOrNull(done.at(-1)?.reps ?? ""),
                rest_seconds: ex.restSeconds,
              };
            }),
        });
      }
      onDone(`/entrenar/resumen/${state.workoutId}`);
    });
  }

  function discard() {
    startTransition(async () => {
      const { error } = await createClient().from("workouts").delete().eq("id", state.workoutId);
      if (error) {
        setError("No pudimos descartar el entrenamiento. Probá de nuevo.");
        return;
      }
      onDone("/entrenar");
    });
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Terminar entrenamiento"
      footer={
        <div className="space-y-2">
          <Button size="lg" block onClick={finish} disabled={pending || doneSets === 0}>
            {pending && <Spinner />}
            Guardar entrenamiento
          </Button>
          {confirmDiscard ? (
            <Button variant="danger" block onClick={discard} disabled={pending}>
              Sí, descartar todo
            </Button>
          ) : (
            <Button variant="ghost" block className="text-danger" onClick={() => setConfirmDiscard(true)}>
              Descartar entrenamiento
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        <TextField label="Nombre" value={state.title} maxLength={80} onChange={(e) => onTitle(e.target.value)} />
        {doneSets === 0 ? (
          <FormMessage error="Marcá al menos una serie como hecha para poder guardar." />
        ) : (
          pendingSets > 0 && (
            <p className="rounded-btn bg-surface-2 text-soft px-4 py-3 text-sm">
              Tenés {pendingSets} {pendingSets === 1 ? "serie sin marcar" : "series sin marcar"}: no se van a guardar.
            </p>
          )
        )}
        <div className="divide-border rounded-card bg-surface-2 divide-y px-4">
          <Toggle
            label="Publicar en el feed"
            description="Lo ven quienes pueden ver tu perfil, según tu privacidad."
            checked={publish}
            onChange={setPublish}
          />
          <Toggle
            label="Guardar como rutina"
            description="Para repetirlo la próxima vez con un toque."
            checked={saveRoutine}
            onChange={setSaveRoutine}
          />
        </div>
        {saveRoutine && (
          <TextField
            label="Nombre de la rutina"
            value={routineName}
            maxLength={60}
            onChange={(e) => setRoutineName(e.target.value)}
          />
        )}
        {confirmDiscard && (
          <FormMessage error="Vas a borrar este entrenamiento y todas sus series. No se puede deshacer." />
        )}
        <FormMessage error={error} />
      </div>
    </Sheet>
  );
}
