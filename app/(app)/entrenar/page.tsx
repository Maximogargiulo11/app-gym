import { ChevronRight, ClipboardList, Dumbbell, Pencil, Play, Plus, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button, ButtonLink, Card, EmptyState, FormMessage } from "@/components/ui";
import { formatDate, formatDuration, formatNumber } from "@/lib/format";
import { createClient, getMyProfile } from "@/lib/supabase/server";
import { startWorkout } from "./actions";

export const metadata: Metadata = { title: "Entrenar" };

export default async function EntrenarPage({ searchParams }: PageProps<"/entrenar">) {
  const { error } = await searchParams;
  const profile = (await getMyProfile())!;
  const supabase = await createClient();

  const [{ data: active }, { data: routines }, { data: recent }] = await Promise.all([
    supabase
      .from("workouts")
      .select("id, title, started_at")
      .eq("user_id", profile.id)
      .eq("status", "in_progress")
      .maybeSingle(),
    supabase
      .from("routines")
      .select("id, name, routine_exercises(position, target_sets, exercise:exercises(name))")
      .eq("user_id", profile.id)
      .order("updated_at", { ascending: false })
      .order("position", { referencedTable: "routine_exercises" }),
    supabase
      .from("workouts")
      .select("id, title, started_at, ended_at, total_volume, total_sets, workout_exercises(workout_sets(is_pr))")
      .eq("user_id", profile.id)
      .eq("status", "finished")
      .order("started_at", { ascending: false })
      .limit(8),
  ]);

  return (
    <>
      <h1 className="font-display pt-8 pb-6 text-[34px] leading-none">Entrenar</h1>

      {error === "start" && (
        <div className="mb-4">
          <FormMessage error="No pudimos empezar el entrenamiento. Probá de nuevo." />
        </div>
      )}

      {active ? (
        <Link
          href="/entrenar/en-curso"
          className="rounded-card border-accent-border bg-accent-bg mb-8 flex items-center gap-4 border p-4 transition-colors hover:bg-[#223014]"
        >
          <span className="rounded-btn bg-accent text-on-accent inline-flex size-[52px] shrink-0 items-center justify-center">
            <Dumbbell aria-hidden className="size-7" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="text-soft block text-sm">Entrenamiento en curso</span>
            <span className="block truncate text-[17px] font-semibold">{active.title}</span>
          </span>
          <span className="text-accent font-semibold">Continuar</span>
        </Link>
      ) : (
        <form action={startWorkout} className="mb-8">
          <Button type="submit" size="lg" block>
            <Play aria-hidden className="size-5" fill="currentColor" />
            Empezar entrenamiento vacío
          </Button>
        </form>
      )}

      <section aria-labelledby="rutinas" className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="rutinas" className="text-lg font-semibold">
            Mis rutinas
          </h2>
          <Link
            href="/entrenar/rutinas/nueva"
            className="min-h-tap text-accent inline-flex items-center gap-1 font-semibold hover:underline"
          >
            <Plus aria-hidden className="size-4" />
            Nueva rutina
          </Link>
        </div>

        {!routines || routines.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Todavía no tenés rutinas"
            description="Armá una rutina para empezar tus entrenamientos con los ejercicios ya cargados."
            action={
              <ButtonLink href="/entrenar/rutinas/nueva" variant="secondary" block>
                Crear rutina
              </ButtonLink>
            }
          />
        ) : (
          <ul className="space-y-3">
            {routines.map((r) => (
              <li key={r.id}>
                <Card>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-[17px] font-semibold">{r.name}</h3>
                      <p className="text-muted mt-1 line-clamp-2 text-sm">
                        {r.routine_exercises.map((re) => re.exercise?.name).join(" · ")}
                      </p>
                    </div>
                    <Link
                      href={`/entrenar/rutinas/${r.id}`}
                      aria-label={`Editar ${r.name}`}
                      className="size-tap rounded-btn text-soft hover:bg-surface-2 inline-flex shrink-0 items-center justify-center"
                    >
                      <Pencil aria-hidden className="size-5" />
                    </Link>
                  </div>
                  {!active && (
                    <form action={startWorkout} className="mt-3">
                      <input type="hidden" name="routine_id" value={r.id} />
                      <Button type="submit" variant="secondary" block>
                        <Play aria-hidden className="size-4" fill="currentColor" />
                        Empezar
                      </Button>
                    </form>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="historial">
        <h2 id="historial" className="mb-3 text-lg font-semibold">
          Últimos entrenamientos
        </h2>
        {!recent || recent.length === 0 ? (
          <p className="rounded-card bg-surface text-muted p-4 text-[15px]">
            Cuando termines tu primer entrenamiento, lo vas a ver acá.
          </p>
        ) : (
          <ul className="divide-border rounded-card bg-surface divide-y overflow-hidden">
            {recent.map((w) => {
              const prs = w.workout_exercises.reduce((n, we) => n + we.workout_sets.filter((s) => s.is_pr).length, 0);
              const duration = w.ended_at ? new Date(w.ended_at).getTime() - new Date(w.started_at).getTime() : 0;
              return (
                <li key={w.id}>
                  <Link
                    href={`/entrenar/resumen/${w.id}`}
                    className="hover:bg-surface-2 flex min-h-[64px] items-center gap-3 px-4 py-3"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-semibold">{w.title}</span>
                        {prs > 0 && (
                          <span className="bg-pr-bg text-pr inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-bold">
                            <Trophy aria-hidden className="size-3" />
                            {prs} PR
                          </span>
                        )}
                      </span>
                      <span className="text-muted block text-sm">
                        {formatDate(w.started_at)} · {formatDuration(duration)} · {formatNumber(Number(w.total_volume))}{" "}
                        kg
                      </span>
                    </span>
                    <ChevronRight aria-hidden className="text-muted size-5 shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
