import { ChevronLeft, Globe, Lock, MapPin, Sun, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Counters, RecentWorkouts, Records, type RecordRow } from "@/components/profile/profile-sections";
import { BlockButton } from "@/components/social/block-button";
import { FollowButton, type FollowStatus } from "@/components/social/follow-button";
import { ReportButton } from "@/components/social/report-button";
import { Avatar } from "@/components/ui";
import { createClient, getMyProfile } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Perfil" };

export default async function UserPage({ params }: PageProps<"/u/[username]">) {
  const { username } = await params;
  const viewer = (await getMyProfile())!;
  if (username === viewer.username) redirect("/perfil");

  const supabase = await createClient();
  // profiles_public ya excluye bloqueos y enmascara sede y horario según la privacidad.
  const { data: p } = await supabase
    .from("profiles_public")
    .select("id, username, full_name, avatar_url, is_private, branch_id, usual_schedule, can_view_content")
    .eq("username", username)
    .maybeSingle();
  if (!p?.id || !p.username) notFound();

  const [{ data: stats }, { data: follow }, { data: mutuals }, { data: branch }] = await Promise.all([
    supabase.rpc("profile_stats", { uid: p.id }).maybeSingle(),
    supabase.from("follows").select("status").eq("follower_id", viewer.id).eq("following_id", p.id).maybeSingle(),
    supabase.rpc("followed_by_mutuals", { p_target: p.id }),
    p.branch_id
      ? supabase.from("branches").select("name, gym:gyms(name)").eq("id", p.branch_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const canView = Boolean(p.can_view_content);
  const [{ data: records }, { data: workouts }] = canView
    ? await Promise.all([
        supabase
          .from("personal_records")
          .select("exercise_id, best_weight, best_weight_reps, exercise:exercises(name)")
          .eq("user_id", p.id)
          .order("best_e1rm", { ascending: false })
          .limit(4),
        supabase
          .from("workouts")
          .select("id, title, started_at, ended_at, total_volume")
          .eq("user_id", p.id)
          .eq("is_published", true)
          .order("started_at", { ascending: false })
          .limit(10),
      ])
    : [{ data: [] }, { data: [] }];

  const name = p.full_name ?? p.username;
  const status = (follow?.status as FollowStatus | undefined) ?? "none";
  const m = mutuals as { count: number; usernames: string[] } | null;
  const common: string[] = [];
  if (p.branch_id && p.branch_id === viewer.branch_id) common.push("misma sede");
  if (m && m.count > 0) {
    common.push(
      `lo siguen ${m.usernames.map((u) => `@${u}`).join(", ")}${m.count > m.usernames.length ? ` y ${m.count - m.usernames.length} más` : ""}`,
    );
  }
  const recordRows: RecordRow[] = (records ?? [])
    .filter((r) => r.exercise?.name)
    .map((r) => ({ ...r, name: r.exercise!.name }));

  return (
    <>
      <header className="pt-6 pb-2">
        <Link
          href="/feed"
          aria-label="Volver"
          className="size-tap bg-surface inline-flex items-center justify-center rounded-full"
        >
          <ChevronLeft aria-hidden className="size-6" />
        </Link>
      </header>

      <div className="flex items-center gap-4 pb-5">
        <Avatar name={name} seed={p.id} src={p.avatar_url} size="lg" />
        <div className="min-w-0">
          <h1 className="font-display truncate text-[28px] leading-tight">{name}</h1>
          <p className="text-muted text-[15px]">@{p.username}</p>
        </div>
      </div>

      <ul className="text-soft mb-5 flex flex-wrap gap-x-4 gap-y-2 text-[15px]">
        {branch && (
          <li className="flex items-center gap-1.5">
            <MapPin aria-hidden className="text-muted size-4" strokeWidth={1.75} />
            {branch.gym?.name} · {branch.name}
          </li>
        )}
        {p.usual_schedule && (
          <li className="flex items-center gap-1.5">
            <Sun aria-hidden className="text-muted size-4" strokeWidth={1.75} />
            Suele ir de {p.usual_schedule}
          </li>
        )}
        <li>
          <span className="rounded-pill bg-surface-2 inline-flex items-center gap-1.5 px-3 py-1 text-sm font-semibold">
            {p.is_private ? <Lock aria-hidden className="size-3.5" /> : <Globe aria-hidden className="size-3.5" />}
            Cuenta {p.is_private ? "privada" : "pública"}
          </span>
        </li>
      </ul>

      <Counters stats={stats ?? null} />

      <div className="mb-4">
        <FollowButton viewerId={viewer.id} targetId={p.id} targetName={name} initialStatus={status} block />
      </div>

      {common.length > 0 && (
        <p className="text-soft mb-6 flex items-start gap-2 text-[15px]">
          <Users aria-hidden className="text-muted mt-0.5 size-4 shrink-0" />
          <span>En común: {common.join(" · ")}</span>
        </p>
      )}

      {canView ? (
        <>
          <Records records={recordRows} />
          <RecentWorkouts workouts={workouts ?? []} />
        </>
      ) : (
        <section className="rounded-card bg-surface mb-6 flex flex-col items-center px-6 py-10 text-center">
          <span className="bg-surface-2 text-accent mb-4 inline-flex size-14 items-center justify-center rounded-full">
            <Lock aria-hidden className="size-7" strokeWidth={1.75} />
          </span>
          <h2 className="text-lg font-semibold">Esta cuenta es privada</h2>
          <p className="text-muted mt-2 max-w-xs text-[15px]">
            {status === "pending"
              ? "Te va a aparecer su contenido cuando acepte tu solicitud."
              : `Seguí a ${name} para ver sus entrenamientos y récords.`}
          </p>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3">
        <BlockButton viewerId={viewer.id} targetId={p.id} targetName={name} />
        <ReportButton targetType="profile" targetId={p.id} />
      </div>
    </>
  );
}
