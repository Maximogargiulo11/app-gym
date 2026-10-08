"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FormState = { error?: string; success?: string } | null;

export async function claimAdmin(_prev: FormState, formData: FormData): Promise<FormState> {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Ingresá el código." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_gym_admin", { p_code: code });
  if (error) return { error: "No pudimos validar el código. Probá de nuevo." };
  if (!data) return { error: "El código no es válido o ya se usó." };
  revalidatePath("/perfil");
  redirect("/admin/sedes");
}

export async function rotateQr(formData: FormData) {
  const branchId = String(formData.get("branch_id") ?? "");
  const supabase = await createClient();
  await supabase.rpc("rotate_branch_qr", { p_branch_id: branchId });
  revalidatePath("/admin/sedes");
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function createChallenge(_prev: FormState, formData: FormData): Promise<FormState> {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const startsOn = String(formData.get("starts_on") ?? "");
  const endsOn = String(formData.get("ends_on") ?? "");
  const branchIds = formData.getAll("branch_ids").map(String);

  if (!title) return { error: "Ponele un nombre al desafío." };
  if (!DATE.test(startsOn) || !DATE.test(endsOn)) return { error: "Elegí las fechas de inicio y fin." };
  if (endsOn < startsOn) return { error: "La fecha de fin tiene que ser después del inicio." };
  if (branchIds.length < 2) return { error: "Elegí al menos dos sedes." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_challenge", {
    p_title: title,
    p_description: description,
    p_starts_on: startsOn,
    p_ends_on: endsOn,
    p_branch_ids: branchIds,
  });
  if (error) return { error: "No pudimos crear el desafío. Revisá los datos." };
  revalidatePath("/admin/sedes");
  revalidatePath("/sede");
  return { success: "Desafío creado." };
}

export async function deleteChallenge(formData: FormData) {
  const id = String(formData.get("challenge_id") ?? "");
  const supabase = await createClient();
  await supabase.rpc("delete_challenge", { p_challenge: id });
  revalidatePath("/admin/sedes");
  revalidatePath("/sede");
}
