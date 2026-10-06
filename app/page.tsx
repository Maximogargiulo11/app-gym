import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";

export default async function Home({ searchParams }: PageProps<"/">) {
  // Si Supabase no reconoce la redirect URL, vuelve al Site URL (la raíz) con el ?code.
  const { code, next } = await searchParams;
  if (typeof code === "string") {
    const params = new URLSearchParams({ code });
    if (typeof next === "string") params.set("next", next);
    redirect(`/auth/callback?${params}`);
  }

  const user = await getUser();
  redirect(user ? "/feed" : "/login");
}
