import { Bell, MapPin, QrCode, UserPlus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PartnerCard, type FeedPartnerPost } from "@/components/feed/partner-card";
import { WorkoutCard, type FeedWorkout } from "@/components/feed/workout-card";
import type { FollowStatus } from "@/components/social/follow-button";
import { ButtonLink, EmptyState, ErrorState, Logo, PillLink } from "@/components/ui";
import { createClient, getMyProfile } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Feed" };

const TABS = ["siguiendo", "sede", "gimnasio"] as const;
type Tab = (typeof TABS)[number];
const PAGE = 15;

type Item = { kind: "workout"; at: string; data: FeedWorkout } | { kind: "partner"; at: string; data: FeedPartnerPost };

export default async function FeedPage({ searchParams }: PageProps<"/feed">) {
  const { tab: rawTab, before: rawBefore } = await searchParams;
  const tab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "sede";
  const before = typeof rawBefore === "string" && !Number.isNaN(Date.parse(rawBefore)) ? rawBefore : null;

  const profile = (await getMyProfile())!;
  const branch = profile.branch;
  const supabase = await createClient();

  const [todayRes, workoutsRes, partnersRes, followsRes, requestsRes] = await Promise.all([
    branch ? supabase.rpc("branch_checkins_today", { bid: branch.id }) : Promise.resolve({ data: null }),
    supabase.rpc("feed_workouts", { p_tab: tab, p_before: before ?? undefined, p_limit: PAGE }),
    // "Busco compañero" va en la primera página de las pestañas de sede y gimnasio.
    tab !== "siguiendo" && !before
      ? supabase.rpc("feed_partner_posts", { p_scope: tab, p_limit: 5 })
      : Promise.resolve({ data: [] }),
    supabase.from("follows").select("following_id, status").eq("follower_id", profile.id),
    supabase
      .from("follows")
      .select("follower_id", { count: "exact", head: true })
      .eq("following_id", profile.id)
      .eq("status", "pending"),
  ]);

  const todayCount = todayRes.data;
  const workouts = (workoutsRes.data ?? []) as unknown as FeedWorkout[];
  const partners = (partnersRes.data ?? []) as unknown as FeedPartnerPost[];
  const follows = new Map((followsRes.data ?? []).map((f) => [f.following_id, f.status as FollowStatus]));
  const pendingRequests = requestsRes.count ?? 0;

  const items: Item[] = [
    ...workouts.map((w) => ({ kind: "workout" as const, at: w.started_at, data: w })),
    ...partners.map((p) => ({ kind: "partner" as const, at: p.created_at, data: p })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const nextBefore = workouts.length === PAGE ? workouts.at(-1)!.started_at : null;

  return (
    <>
      <header className="flex items-start justify-between pt-8 pb-5">
        <div>
          <Logo className="text-[40px]" />
          {branch && (
            <p className="text-muted mt-2 flex items-center gap-1.5 text-[16px]">
              <MapPin aria-hidden className="size-4" strokeWidth={1.75} />
              {branch.gym?.name} · {branch.name}
            </p>
          )}
        </div>
        <Link
          href="/perfil/solicitudes"
          aria-label={
            pendingRequests > 0
              ? `Solicitudes de seguimiento: ${pendingRequests} pendientes`
              : "Solicitudes de seguimiento"
          }
          className="border-border-strong bg-surface relative inline-flex size-[52px] items-center justify-center rounded-full border"
        >
          <Bell aria-hidden className="size-6" strokeWidth={1.75} />
          {pendingRequests > 0 && (
            <span className="bg-accent text-on-accent absolute -top-0.5 -right-0.5 inline-flex min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold">
              {pendingRequests}
            </span>
          )}
        </Link>
      </header>

      <nav aria-label="Filtrar feed" className="-mx-5 mb-5 flex gap-2 overflow-x-auto px-5 pb-1">
        <PillLink href="/feed?tab=siguiendo" active={tab === "siguiendo"}>
          Siguiendo
        </PillLink>
        <PillLink href="/feed?tab=sede" active={tab === "sede"}>
          {branch?.name ?? "Mi sede"}
        </PillLink>
        <PillLink href="/feed?tab=gimnasio" active={tab === "gimnasio"}>
          Todo {branch?.gym?.name ?? "el gimnasio"}
        </PillLink>
      </nav>

      {!before && (
        <>
          <Link
            href="/checkin"
            className="rounded-card border-accent-border bg-accent-bg mb-3 flex items-center gap-4 border p-4 transition-colors hover:bg-[#223014]"
          >
            <span className="rounded-btn bg-accent text-on-accent inline-flex size-[52px] shrink-0 items-center justify-center">
              <QrCode aria-hidden className="size-7" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-semibold">Hacer check-in</span>
              <span className="text-soft block text-[15px]">
                {typeof todayCount === "number"
                  ? `Hoy entrenaron ${todayCount.toLocaleString("es-AR")} ${todayCount === 1 ? "persona" : "personas"} en tu sede`
                  : "Sumá el día a tu racha"}
              </span>
            </span>
            <span className="text-accent font-semibold">Abrir</span>
          </Link>
          <Link
            href="/feed/companero"
            className="min-h-tap rounded-btn border-border-strong text-soft hover:bg-surface mb-5 flex items-center justify-center gap-2 border border-dashed text-[15px] font-semibold"
          >
            <UserPlus aria-hidden className="size-5" />
            Busco compañero
          </Link>
        </>
      )}

      {workoutsRes.error ? (
        <ErrorState message="No pudimos cargar el feed." />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Users}
          title={tab === "siguiendo" ? "Todavía no seguís a nadie" : "Nada por acá todavía"}
          description={
            tab === "siguiendo"
              ? "Seguí a gente de tu sede para ver sus entrenamientos acá."
              : "Cuando la gente de tu sede publique entrenamientos, los vas a ver acá."
          }
          action={
            tab === "siguiendo" ? (
              <ButtonLink href="/feed?tab=sede" variant="secondary" block>
                Ver mi sede
              </ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {items.map((item) =>
            item.kind === "workout" ? (
              <WorkoutCard
                key={item.data.id}
                workout={item.data}
                viewerId={profile.id}
                followStatus={follows.get(item.data.author_id) ?? "none"}
              />
            ) : (
              <PartnerCard key={item.data.id} post={item.data} viewerId={profile.id} />
            ),
          )}
        </div>
      )}

      {nextBefore && (
        <ButtonLink
          href={`/feed?tab=${tab}&before=${encodeURIComponent(nextBefore)}`}
          variant="secondary"
          block
          className="mt-4"
        >
          Ver más
        </ButtonLink>
      )}
    </>
  );
}
