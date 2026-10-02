"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; success?: string } | undefined;

function translateAuthError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Todavía no confirmaste tu email. Revisá tu bandeja de entrada.";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Ya hay una cuenta con ese email. Probá iniciar sesión.";
  if (m.includes("password") && (m.includes("at least") || m.includes("weak")))
    return "La contraseña tiene que tener al menos 8 caracteres.";
  if (m.includes("rate limit")) return "Demasiados intentos. Esperá un minuto y probá de nuevo.";
  if (m.includes("provider is not enabled")) return "El ingreso con Google todavía no está habilitado.";
  return "No pudimos completar la operación. Probá de nuevo.";
}

async function siteOrigin() {
  const h = await headers();
  return h.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "")
      .trim()
      .toLowerCase(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: "Completá email y contraseña." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: translateAuthError(error.message) };

  redirect(safeNext(formData.get("next")));
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = readCredentials(formData);
  if (!email || !password) return { error: "Completá email y contraseña." };
  if (password.length < 8) return { error: "La contraseña tiene que tener al menos 8 caracteres." };
  if (formData.get("terms") !== "on") return { error: "Tenés que aceptar los términos para seguir." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/callback?next=/onboarding` },
  });
  if (error) return { error: translateAuthError(error.message) };

  // Con confirmación de email activada no hay sesión todavía.
  if (!data.session) {
    return { success: `Te mandamos un email a ${email}. Abrí el link para confirmar tu cuenta.` };
  }
  redirect("/onboarding");
}

export async function signInWithGoogle(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/login?error=google");
  redirect(data.url);
}
