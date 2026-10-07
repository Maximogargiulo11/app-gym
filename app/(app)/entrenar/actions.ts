"use server";

import { redirect } from "next/navigation";
import { createClient, getMyProfile } from "@/lib/supabase/server";

/** Empieza un entrenamiento (vacío o desde una rutina). Si ya hay uno en curso, lo retoma. */
export async function startWorkout(formData: FormData) {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");
  const supabase = await createClient();

  const { data: active } = await supabase
    .from("workouts")
    .select("id")
    .eq("user_id", profile.id)
    .eq("status", "in_progress")
    .maybeSingle();
  if (active) redirect("/entrenar/en-curso");

  const routineId = String(formData.get("routine_id") ?? "") || null;
  let title = "Entrenamiento libre";
  let items: { exercise_id: string; target_sets: number; target_reps: number | null; rest_seconds: number }[] = [];

  if (routineId) {
    const { data: routine } = await supabase
      .from("routines")
      .select("name, user_id, routine_exercises(exercise_id, position, target_sets, target_reps, rest_seconds)")
      .eq("id", routineId)
      .order("position", { referencedTable: "routine_exercises" })
      .maybeSingle();
    if (routine) {
      title = routine.name;
      items = routine.routine_exercises;
    }
  }

  const workoutId = crypto.randomUUID();
  const { error } = await supabase.from("workouts").insert({
    id: workoutId,
    title,
    branch_id: profile.branch_id,
    // Solo se vincula si la rutina es propia (las copiadas de otros se vinculan al copiarlas).
    routine_id: routineId,
  });
  if (error) {
    // 23505: ya había uno en curso (por ejemplo, doble toque).
    if (error.code === "23505") redirect("/entrenar/en-curso");
    redirect("/entrenar?error=start");
  }

  if (items.length > 0) {
    await supabase.rpc("sync_workout", {
      p_workout_id: workoutId,
      p_title: title,
      p_exercises: items.map((it, position) => ({
        id: crypto.randomUUID(),
        exercise_id: it.exercise_id,
        position,
        rest_seconds: it.rest_seconds,
        sets: Array.from({ length: it.target_sets }, (_, i) => ({
          id: crypto.randomUUID(),
          set_number: i + 1,
          weight_kg: null,
          reps: null,
          is_done: false,
          completed_at: null,
        })),
      })),
    });
  }

  redirect("/entrenar/en-curso");
}
