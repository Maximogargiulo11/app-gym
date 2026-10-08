"use server";

import { createClient } from "@/lib/supabase/server";

export type CheckinResult =
  | {
      ok: true;
      branchName: string;
      gymName: string;
      already: boolean;
      checkedAt: string;
      streak: number;
    }
  | { ok: false; error: string };

const ERRORS: Record<string, string> = {
  qr_invalido: "Este QR no es válido o ya fue reemplazado. Pedí el QR actualizado en recepción.",
  otro_gimnasio: "Este QR es de otro gimnasio. Solo podés hacer check-in en las sedes de tu gimnasio.",
  sin_sesion: "Tu sesión venció. Volvé a entrar y escaneá otra vez.",
};

/** Valida el QR en Postgres y registra el check-in del día (si ya estaba, no lo duplica). */
export async function checkIn(slug: string, token: string): Promise<CheckinResult> {
  if (!/^[a-z0-9-]{2,60}$/.test(slug) || !/^[a-f0-9]{32}$/.test(token)) {
    return { ok: false, error: ERRORS.qr_invalido };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("perform_checkin", { p_slug: slug, p_token: token });
  if (error || !data) {
    const key = Object.keys(ERRORS).find((k) => error?.message.includes(k));
    return { ok: false, error: key ? ERRORS[key] : "No pudimos registrar el check-in. Probá de nuevo." };
  }
  const r = data as { branch_name: string; gym_name: string; already: boolean; checked_at: string; streak: number };
  return {
    ok: true,
    branchName: r.branch_name,
    gymName: r.gym_name,
    already: r.already,
    checkedAt: r.checked_at,
    streak: r.streak,
  };
}
