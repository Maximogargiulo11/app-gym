import { Ban, ChevronRight, Globe, Lock, LogOut, MapPin, Pencil, QrCode, Shield, Sun, UserCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Counters, RecentWorkouts, Records, type RecordRow } from "@/components/profile/profile-sections";
import { Avatar, Button, ButtonLink } from "@/components/ui";
import { cn } from "@/lib/cn";
import { createClient, getMyProfile } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Perfil" };

const TZ = "America/Argentina/Cordoba";
const DAY_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

/** Fecha local (Córdoba) en formato YYYY-MM-DD. */
function localDate(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

/** Los 7 días (lunes a domingo) de la semana actual en Córdoba. */
function currentWeek() {
  const today = new Date(`${localDate(new Date())}T12:00:00Z`);
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - ((today.getUTCDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export default async function PerfilPage() {
  const profile = (await getMyProfile())!;
  const supabase = await createClient();
  const week = currentWeek();

  const [
    { data: stats },
    { data: records },
    { data: workouts },
    { data: weekWorkouts },
    { count: pending },
    { count: staff },
  ] = await Promise.all([
    supabase.rpc("profile_stats", { uid: profile.id }).maybeSingle(),
    supabase
      .from("personal_records")
      .select("exercise_id, best_weight, best_weight_reps, exercise:exercises(name)")
      .eq("user_id", profile.id)
      .order("best_e1rm", { ascending: false })
      .limit(4),
    supabase
      .from("workouts")
      .select("id, title, started_at, ended_at, total_volume")
      .eq("user_id", profile.id)
      .eq("status", "finished")
      .order("started_at", { ascending: false })
      .limit(5),
    supabase
      .from("workouts")
      .select("started_at")
      .eq("user_id", profile.id)
      .eq("status", "finished")
      .gte("started_at", new Date(`${week[0]}T00:00:00-03:00`).toISOString()),
    supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", profile.id)
      .eq("status", "pending"),
    supabase.from("gym_staff").select("gym_id", { count: "exact", head: true }).eq("user_id", profile.id),
  ]);

  const trainedDays = new Set((weekWorkouts ?? []).map((w) => localDate(new Date(w.started_at))));
  const today = localDate(new Date());
  const recordRows: RecordRow[] = (records ?? [])
    .filter((r) => r.exercise?.name)
    .map((r) => ({ ...r, name: r.exercise!.name }));

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
              <Lock aria-hidden className="size-3.5" />
            ) : (
              <Globe aria-hidden className="size-3.5" />
            )}
            Cuenta {profile.is_private ? "privada" : "pública"}
          </span>
        </li>
      </ul>

      <Counters stats={stats ?? null} />

      <ButtonLink href="/perfil/editar" variant="secondary" block className="mb-6">
        <Pencil aria-hidden className="size-4" />
        Editar perfil
      </ButtonLink>

      <section aria-labelledby="semana" className="mb-6">
        <h2 id="semana" className="mb-3 text-lg font-semibold">
          Esta semana · {trainedDays.size} {trainedDays.size === 1 ? "día" : "días"}
        </h2>
        <ol className="grid grid-cols-7 gap-2">
          {week.map((day, i) => {
            const done = trainedDays.has(day);
            return (
              <li key={day} className="flex flex-col items-center gap-1.5">
                <span
                  className={cn(
                    "inline-flex size-10 items-center justify-center rounded-full text-sm font-bold",
                    done ? "bg-accent text-on-accent" : "bg-surface text-muted",
                    day === today && !done && "ring-accent-border ring-2",
                  )}
                >
                  {DAY_LABELS[i]}
                </span>
                <span className="sr-only">{done ? "entrenaste" : "sin entrenar"}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <Records records={recordRows} />
      <RecentWorkouts workouts={workouts ?? []} ownHref />

      <nav aria-label="Ajustes" className="divide-border rounded-card bg-surface mb-4 divide-y overflow-hidden">
        {[
          { href: "/perfil/solicitudes", label: "Solicitudes de seguimiento", icon: UserCheck, badge: pending ?? 0 },
          { href: "/perfil/privacidad", label: "Privacidad", icon: Shield },
          { href: "/perfil/bloqueados", label: "Bloqueados", icon: Ban },
          ...(staff ? [{ href: "/admin/sedes", label: "Admin de sedes", icon: QrCode }] : []),
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="hover:bg-surface-2 flex min-h-[56px] items-center gap-3 px-4"
          >
            <item.icon aria-hidden className="text-soft size-5" strokeWidth={1.75} />
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <span className="bg-accent text-on-accent rounded-full px-2 py-0.5 text-xs font-bold">{item.badge}</span>
            ) : null}
            <ChevronRight aria-hidden className="text-muted size-5" />
          </Link>
        ))}
      </nav>
      <form action="/auth/signout" method="post">
        <Button type="submit" variant="outline" block>
          <LogOut aria-hidden className="size-5" strokeWidth={1.75} />
          Cerrar sesión
        </Button>
      </form>
    </>
  );
}
