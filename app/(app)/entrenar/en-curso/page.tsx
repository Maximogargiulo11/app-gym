import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getMyProfile } from "@/lib/supabase/server";
import type { ActiveWorkout } from "@/lib/workout/types";
import { WorkoutScreen } from "./workout-screen";

export const metadata: Metadata = { title: "Entrenamiento en curso" };

export default async function EnCursoPage() {
  const profile = (await getMyProfile())!;
  const supabase = await createClient();

  const [{ data: workout }, { data: catalog }] = await Promise.all([
    supabase
      .from("workouts")
      .select(
        "id, title, started_at, workout_exercises(id, exercise_id, position, rest_seconds, exercise:exercises(name, muscle_groups), workout_sets(id, set_number, weight_kg, reps, is_done, completed_at))",
      )
      .eq("user_id", profile.id)
      .eq("status", "in_progress")
      .order("position", { referencedTable: "workout_exercises" })
      .maybeSingle(),
    supabase.from("exercises").select("id, name, muscle_groups, equipment, created_by").order("name"),
  ]);

  if (!workout) redirect("/entrenar");

  const server: ActiveWorkout = {
    workoutId: workout.id,
    title: workout.title,
    startedAt: workout.started_at,
    rest: null,
    exercises: workout.workout_exercises.map((we) => ({
      id: we.id,
      exerciseId: we.exercise_id,
      name: we.exercise?.name ?? "Ejercicio",
      muscles: we.exercise?.muscle_groups ?? [],
      restSeconds: we.rest_seconds,
      sets: [...we.workout_sets]
        .sort((a, b) => a.set_number - b.set_number)
        .map((s) => ({
          id: s.id,
          weight: s.weight_kg != null ? String(s.weight_kg).replace(".", ",") : "",
          reps: s.reps != null ? String(s.reps) : "",
          done: s.is_done,
          completedAt: s.completed_at,
        })),
    })),
  };

  return <WorkoutScreen server={server} catalog={catalog ?? []} userId={profile.id} />;
}
