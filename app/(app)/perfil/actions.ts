"use server";

import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { SCHEDULES, type PrivacySettings, type Schedule } from "@/lib/profile/validation";

export type PrivacyInput = PrivacySettings & { usual_schedule: Schedule | null };

export async function updatePrivacy(input: PrivacyInput): Promise<{ error?: string; ok?: boolean }> {
  const user = await getUser();
  if (!user) return { error: "Tu sesión venció. Volvé a iniciar sesión." };
  if (input.usual_schedule !== null && !SCHEDULES.includes(input.usual_schedule)) return { error: "Horario inválido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      is_private: Boolean(input.is_private),
      show_branch: Boolean(input.show_branch),
      show_schedule: Boolean(input.show_schedule),
      show_in_rankings: Boolean(input.show_in_rankings),
      approve_tags: Boolean(input.approve_tags),
      usual_schedule: input.usual_schedule,
    })
    .eq("id", user.id);

  if (error) return { error: "No pudimos guardar los cambios. Probá de nuevo." };
  revalidatePath("/perfil");
  return { ok: true };
}
