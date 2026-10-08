import { UserCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BackHeader } from "@/components/layout/back-header";
import { Avatar, EmptyState } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import { createClient, getMyProfile } from "@/lib/supabase/server";
import { RequestActions } from "./request-actions";

export const metadata: Metadata = { title: "Solicitudes" };

export default async function SolicitudesPage() {
  const profile = (await getMyProfile())!;
  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("follows")
    .select("follower_id, created_at")
    .eq("following_id", profile.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const ids = (requests ?? []).map((r) => r.follower_id);
  const { data: people } = ids.length
    ? await supabase.from("profiles_public").select("id, username, full_name, avatar_url").in("id", ids)
    : { data: [] };
  const byId = new Map((people ?? []).map((p) => [p.id, p]));

  return (
    <>
      <BackHeader href="/perfil" label="Volver al perfil" title="Solicitudes" />
      {!profile.is_private && (
        <p className="rounded-card bg-surface text-soft mb-4 p-4 text-[15px]">
          Tu cuenta es pública: cualquiera te puede seguir sin solicitud.
        </p>
      )}
      {!requests || requests.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="No tenés solicitudes"
          description="Cuando alguien quiera seguirte, va a aparecer acá."
        />
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => {
            const p = byId.get(r.follower_id);
            if (!p?.username) return null;
            const name = p.full_name ?? p.username;
            return (
              <li key={r.follower_id} className="rounded-card bg-surface flex items-center gap-3 p-4">
                <Link href={`/u/${p.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={name} seed={p.id} src={p.avatar_url} />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{name}</span>
                    <span className="text-muted block text-sm">{timeAgo(r.created_at)}</span>
                  </span>
                </Link>
                <RequestActions followerId={r.follower_id} viewerId={profile.id} name={name} />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
