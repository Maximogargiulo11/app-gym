"use server";

import { redirect } from "next/navigation";
import { createClient, getMyProfile } from "@/lib/supabase/server";

const DAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

export type PartnerInput = { topic: string; days: string[]; timeLabel: string; body: string };

export async function createPartnerPost(input: PartnerInput): Promise<{ error?: string }> {
  const profile = await getMyProfile();
  if (!profile?.branch_id) return { error: "Elegí tu sede en tu perfil antes de publicar." };

  const topic = input.topic.trim();
  const body = input.body.trim();
  if (topic.length < 2) return { error: "Contá qué querés entrenar." };
  if (body.length < 1) return { error: "Escribí unas líneas para que sepan qué buscás." };
  if (body.length > 500) return { error: "Máximo 500 caracteres." };

  const supabase = await createClient();
  const { error } = await supabase.from("partner_posts").insert({
    branch_id: profile.branch_id,
    topic: topic.slice(0, 60),
    days: input.days.filter((d) => DAYS.includes(d)),
    time_label: input.timeLabel.trim().slice(0, 40) || null,
    body,
  });
  if (error) return { error: "No pudimos publicar. Probá de nuevo." };
  redirect("/feed?tab=sede");
}
