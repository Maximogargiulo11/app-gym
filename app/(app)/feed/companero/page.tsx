import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/ui";
import { createClient, getMyProfile } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/format";
import { PartnerForm } from "./partner-form";

export const metadata: Metadata = { title: "Busco compañero" };

export default async function CompaneroPage() {
  const profile = (await getMyProfile())!;
  const supabase = await createClient();
  // Mis publicaciones abiertas y quiénes se sumaron.
  const { data: mine } = await supabase
    .from("partner_posts")
    .select("id, topic, created_at, partner_requests(user_id, created_at)")
    .eq("user_id", profile.id)
    .eq("is_open", true)
    .order("created_at", { ascending: false });

  const joinerIds = [...new Set((mine ?? []).flatMap((p) => p.partner_requests.map((r) => r.user_id)))];
  const { data: joiners } = joinerIds.length
    ? await supabase.from("profiles_public").select("id, username, full_name, avatar_url").in("id", joinerIds)
    : { data: [] };
  const byId = new Map((joiners ?? []).map((j) => [j.id, j]));

  return (
    <>
      <header className="flex items-center gap-3 pt-6 pb-6">
        <Link
          href="/feed"
          aria-label="Volver al feed"
          className="size-tap bg-surface inline-flex items-center justify-center rounded-full"
        >
          <ChevronLeft aria-hidden className="size-6" />
        </Link>
        <h1 className="font-display text-[28px] leading-none">Busco compañero</h1>
      </header>

      {mine && mine.length > 0 && (
        <section aria-labelledby="mis-busquedas" className="mb-8">
          <h2 id="mis-busquedas" className="mb-3 text-lg font-semibold">
            Tus búsquedas abiertas
          </h2>
          <ul className="space-y-3">
            {mine.map((p) => (
              <li key={p.id} className="rounded-card bg-surface p-4">
                <p className="font-semibold">{p.topic}</p>
                <p className="text-muted mb-2 text-sm">{timeAgo(p.created_at)}</p>
                {p.partner_requests.length === 0 ? (
                  <p className="text-soft text-sm">Todavía nadie se sumó.</p>
                ) : (
                  <ul className="space-y-2">
                    {p.partner_requests.map((r) => {
                      const j = byId.get(r.user_id);
                      if (!j?.username) return null;
                      return (
                        <li key={r.user_id}>
                          <Link href={`/u/${j.username}`} className="flex items-center gap-3">
                            <Avatar name={j.full_name} seed={j.id} src={j.avatar_url} />
                            <span>
                              <span className="block font-semibold">{j.full_name}</span>
                              <span className="text-muted block text-sm">se sumó {timeAgo(r.created_at)}</span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="mb-4 text-lg font-semibold">Nueva búsqueda</h2>
      <PartnerForm />
    </>
  );
}
