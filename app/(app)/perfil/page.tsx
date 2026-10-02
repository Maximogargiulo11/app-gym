import { Globe, Lock, LogOut, MapPin, Shield, Sun } from "lucide-react";
import type { Metadata } from "next";
import { Avatar, Button, ButtonLink } from "@/components/ui";
import { createClient, getMyProfile } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Perfil" };

export default async function PerfilPage() {
  const profile = (await getMyProfile())!;
  const supabase = await createClient();
  const { data: stats } = await supabase.rpc("profile_stats", { uid: profile.id }).maybeSingle();

  const counters = [
    { label: "Entrenamientos", value: stats?.workouts ?? 0 },
    { label: "Seguidores", value: stats?.followers ?? 0 },
    { label: "Seguidos", value: stats?.following ?? 0 },
  ];

  return (
    <>
      <header className="flex items-center gap-4 pt-8 pb-5">
        <Avatar name={profile.full_name} seed={profile.id} src={profile.avatar_url} size="lg" highlight />
        <div className="min-w-0">
          <h1 className="font-display truncate text-[28px] leading-tight">{profile.full_name}</h1>
          <p className="text-muted text-[15px]">@{profile.username}</p>
        </div>
      </header>

      <ul className="text-soft mb-5 flex flex-wrap gap-x-4 gap-y-2 text-[15px]">
        {profile.branch && (
          <li className="flex items-center gap-1.5">
            <MapPin aria-hidden className="text-muted size-4" strokeWidth={1.75} />
            {profile.branch.gym?.name} · {profile.branch.name}
          </li>
        )}
        {profile.usual_schedule && (
          <li className="flex items-center gap-1.5">
            <Sun aria-hidden className="text-muted size-4" strokeWidth={1.75} />
            Suele ir de {profile.usual_schedule}
          </li>
        )}
        <li>
          <span className="rounded-pill bg-surface-2 inline-flex items-center gap-1.5 px-3 py-1 text-sm font-semibold">
            {profile.is_private ? (
              <Lock aria-hidden className="size-3.5" strokeWidth={2} />
            ) : (
              <Globe aria-hidden className="size-3.5" strokeWidth={2} />
            )}
            Cuenta {profile.is_private ? "privada" : "pública"}
          </span>
        </li>
      </ul>

      <dl className="rounded-card bg-surface mb-6 grid grid-cols-3 py-4 text-center">
        {counters.map((c) => (
          <div key={c.label}>
            <dd className="tabular font-display text-[26px] leading-none">{c.value.toLocaleString("es-AR")}</dd>
            <dt className="text-muted mt-1.5 text-sm">{c.label}</dt>
          </div>
        ))}
      </dl>

      <div className="space-y-3">
        <ButtonLink href="/perfil/privacidad" variant="secondary" block>
          <Shield aria-hidden className="size-5" strokeWidth={1.75} />
          Privacidad
        </ButtonLink>
        <form action="/auth/signout" method="post">
          <Button type="submit" variant="outline" block>
            <LogOut aria-hidden className="size-5" strokeWidth={1.75} />
            Cerrar sesión
          </Button>
        </form>
      </div>
    </>
  );
}
