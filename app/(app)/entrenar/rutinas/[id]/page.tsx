import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RoutineEditor } from "@/components/routines/routine-editor";
import { createClient, getMyProfile } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Editar rutina" };

export default async function EditarRutinaPage({ params }: PageProps<"/entrenar/rutinas/[id]">) {
  const { id } = await params;
  const profile = (await getMyProfile())!;
  const supabase = await createClient();
  const [{ data: routine }, { data: catalog }] = await Promise.all([
    supabase
      .from("routines")
      .select(
        "id, name, user_id, routine_exercises(id, exercise_id, position, target_sets, target_reps, rest_seconds, exercise:exercises(name, muscle_groups))",
      )
      .eq("id", id)
      .order("position", { referencedTable: "routine_exercises" })
      .maybeSingle(),
    supabase.from("exercises").select("id, name, muscle_groups, equipment, created_by").order("name"),
  ]);

  // Solo se editan rutinas propias.
  if (!routine || routine.user_id !== profile.id) notFound();

  return (
    <RoutineEditor
      routineId={routine.id}
      initialName={routine.name}
      initialItems={routine.routine_exercises.map((re) => ({
        key: re.id,
        exerciseId: re.exercise_id,
        name: re.exercise?.name ?? "Ejercicio",
        muscles: re.exercise?.muscle_groups ?? [],
        targetSets: re.target_sets,
        targetReps: re.target_reps != null ? String(re.target_reps) : "",
        restSeconds: re.rest_seconds,
      }))}
      catalog={catalog ?? []}
      userId={profile.id}
    />
  );
}
