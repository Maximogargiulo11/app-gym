import type { Metadata } from "next";
import { RoutineEditor } from "@/components/routines/routine-editor";
import { createClient, getMyProfile } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Nueva rutina" };

export default async function NuevaRutinaPage() {
  const profile = (await getMyProfile())!;
  const supabase = await createClient();
  const { data: catalog } = await supabase
    .from("exercises")
    .select("id, name, muscle_groups, equipment, created_by")
    .order("name");
  return (
    <RoutineEditor routineId={null} initialName="" initialItems={[]} catalog={catalog ?? []} userId={profile.id} />
  );
}
