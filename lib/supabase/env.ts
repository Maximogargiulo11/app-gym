/**
 * Lee las variables de Supabase al crear un cliente (no al importar el módulo), así el build
 * no se cae si todavía no están cargadas (por ejemplo, el primer deploy en Vercel).
 */
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. En local copiá .env.example a .env.local; en Vercel cargalas en Settings → Environment Variables.",
    );
  }
  return { url, key };
}
