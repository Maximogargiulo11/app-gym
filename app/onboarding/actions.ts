"use server";

import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import {
  SCHEDULES,
  validateFullName,
  validateUsername,
  type PrivacySettings,
  type Schedule,
} from "@/lib/profile/validation";

export type OnboardingInput = PrivacySettings & {
  full_name: string;
  username: string;
  branch_id: string;
  usual_schedule: Schedule | null;
};

export type OnboardingResult = { error: string; step?: 1 | 2 | 3 } | undefined;

export async function completeOnboarding(input: OnboardingInput): Promise<OnboardingResult> {
  const user = await getUser();
  if (!user) redirect("/login");

  // Se valida todo de nuevo en el servidor: el cliente no es confiable.
  const nameError = validateFullName(input.full_name) ?? validateUsername(input.username);
  if (nameError) return { error: nameError, step: 1 };
  if (input.usual_schedule !== null && !SCHEDULES.includes(input.usual_schedule))
    return { error: "Horario inválido.", step: 2 };
  if (typeof input.is_private !== "boolean") return { error: "Elegí si tu cuenta es pública o privada.", step: 3 };

  const supabase = await createClient();

  const { data: branch } = await supabase.from("branches").select("id").eq("id", input.branch_id).maybeSingle();
  if (!branch) return { error: "Elegí tu sede.", step: 2 };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: input.full_name.trim(),
      username: input.username,
      branch_id: input.branch_id,
      usual_schedule: input.usual_schedule,
      is_private: input.is_private,
      show_branch: Boolean(input.show_branch),
      show_schedule: Boolean(input.show_schedule),
      show_in_rankings: Boolean(input.show_in_rankings),
      approve_tags: Boolean(input.approve_tags),
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") return { error: "Ese usuario ya está tomado. Probá con otro.", step: 1 };
    return { error: "No pudimos guardar tu perfil. Probá de nuevo." };
  }

  redirect("/feed");
}
