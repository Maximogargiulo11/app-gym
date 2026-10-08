import { BarChart3, Swords, UserPlus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PartnerCard, type FeedPartnerPost } from "@/components/feed/partner-card";
import { ChallengeCard, type ChallengeBranch, type ChallengeView } from "@/components/sede/challenge-card";
import { RankingCard, type RankingExercise, type RankingRow } from "@/components/sede/ranking-card";
import { FollowButton, type FollowStatus } from "@/components/social/follow-button";
import { Avatar, EmptyState, ErrorState } from "@/components/ui";
import { cn } from "@/lib/cn";
import { createClient, getMyProfile } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mi sede" };

const TABS = [
  { id: "rankings", label: "Rankings" },
  { id: "desafios", label: "Desafíos" },
  { id: "companeros", label: "Compañeros" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const TZ = "America/Argentina/Cordoba";

export default async function SedePage({ searchParams }: PageProps<"/sede">) {
  const { tab: rawTab, ex } = await searchParams;
  const tab: Tab = TABS.some((t) => t.id === rawTab) ? (rawTab as Tab) : "rankings";
  const profile = (await getMyProfile())!;
  const branch = profile.branch;
  const supabase = await createClient();
  const { data: members } = branch ? await supabase.rpc("branch_member_count", { bid: branch.id }) : { data: null };

  return (
    <>
      <header className="pt-8 pb-5">
        <h1 className="font-display text-[40px] leading-none">{branch?.name ?? "Mi sede"}</h1>
        {branch && (
          <p className="text-muted mt-2 text-[16px]">
            {branch.gym?.name}
            {typeof members === "number" && ` · ${members.toLocaleString("es-AR")} socios en Banca`}
          </p>
        )}
      </header>

      <nav aria-label="Secciones de la sede" className="rounded-pill bg-surface mb-5 grid grid-cols-3 gap-1 p-1">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/sede?tab=${t.id}`}
            aria-current={tab === t.id ? "page" : undefined}
            className={cn(
              "rounded-pill flex min-h-11 items-center justify-center text-[15px] font-semibold transition-colors",
              tab === t.id ? "bg-accent text-on-accent" : "text-soft hover:bg-surface-2",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {!branch ? (
        <EmptyState
          icon={Users}
          title="Elegí tu sede"
          description="Para ver rankings y desafíos, elegí tu sede en Editar perfil."
        />
      ) : tab === "rankings" ? (
        <Rankings branchId={branch.id} exerciseId={typeof ex === "string" ? ex : null} />
      ) : tab === "desafios" ? (
        <Challenges myBranchId={branch.id} />
      ) : (
        <Companions branchId={branch.id} viewerId={profile.id} />
      )}
    </>
  );
}

async function Rankings({ branchId, exerciseId }: { branchId: string; exerciseId: string | null }) {
  const supabase = await createClient();
  const { data: exercises, error } = await supabase.rpc("ranking_exercises", { p_branch: branchId });
  if (error) return <ErrorState message="No pudimos cargar los rankings." />;
  const list = (exercises ?? []) as RankingExercise[];
  const monthLabel = new Intl.DateTimeFormat("es-AR", { month: "long", timeZone: TZ }).format(new Date());

  if (list.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Todavía no hay marcas este mes"
        description="Cuando la gente de tu sede termine entrenamientos con peso, acá aparecen los récords del mes."
      />
    );
  }

  const selected =
    list.find((e) => e.exercise_id === exerciseId) ?? list.find((e) => e.name === "Sentadilla con barra") ?? list[0];
  const { data: rows } = await supabase.rpc("branch_monthly_ranking", {
    p_branch: branchId,
    p_exercise: selected.exercise_id,
  });

  return (
    <>
      <RankingCard exercise={selected} exercises={list} rows={(rows ?? []) as RankingRow[]} monthLabel={monthLabel} />
      <p className="text-muted mt-4 text-sm leading-snug">
        Cuenta la serie más pesada del mes de cada persona. Solo aparecen quienes eligieron estar en rankings y muestran
        su sede. Lo cambiás en{" "}
        <Link href="/perfil/privacidad" className="text-accent underline-offset-2 hover:underline">
          Privacidad
        </Link>
        .
      </p>
    </>
  );
}

async function Challenges({ myBranchId }: { myBranchId: string }) {
  const supabase = await createClient();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
  const monthAgo = new Date(Date.parse(`${today}T12:00:00Z`) - 30 * 86_400_000).toISOString().slice(0, 10);
  const { data: challenges, error } = await supabase
    .from("challenges")
    .select("id, title, description, starts_on, ends_on")
    .gte("ends_on", monthAgo)
    .order("ends_on", { ascending: true })
    .limit(10);
  if (error) return <ErrorState message="No pudimos cargar los desafíos." />;

  const views: ChallengeView[] = await Promise.all(
    (challenges ?? []).map(async (c) => {
      const { data } = await supabase.rpc("challenge_progress", { p_challenge: c.id });
      return { ...c, branches: (data ?? []) as ChallengeBranch[] };
    }),
  );
  // Primero los activos y próximos; los terminados (último mes) al final.
  views.sort((a, b) => Number(a.ends_on < today) - Number(b.ends_on < today));

  if (views.length === 0) {
    return (
      <EmptyState
        icon={Swords}
        title="No hay desafíos activos"
        description="Cuando el gimnasio arme un desafío entre sedes, lo vas a ver acá. Cada check-in suma un día para tu sede."
      />
    );
  }

  return (
    <div className="space-y-4">
      {views.map((c) => (
        <ChallengeCard key={c.id} challenge={c} today={today} myBranchId={myBranchId} />
      ))}
      <p className="text-muted text-sm leading-snug">
        Cada día con check-in suma un día para tu sede. Solo se muestran totales: nadie ve quién fue ni cuándo.
      </p>
    </div>
  );
}

async function Companions({ branchId, viewerId }: { branchId: string; viewerId: string }) {
  const supabase = await createClient();
  const [postsRes, peopleRes, followsRes] = await Promise.all([
    supabase.rpc("feed_partner_posts", { p_scope: "sede", p_limit: 10 }),
    // profiles_public solo trae branch_id de quienes muestran su sede, y excluye bloqueos.
    supabase
      .from("profiles_public")
      .select("id, username, full_name, avatar_url")
      .eq("branch_id", branchId)
      .neq("id", viewerId)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase.from("follows").select("following_id, status").eq("follower_id", viewerId),
  ]);
  if (peopleRes.error) return <ErrorState message="No pudimos cargar a la gente de tu sede." />;

  const posts = (postsRes.data ?? []) as unknown as FeedPartnerPost[];
  const follows = new Map((followsRes.data ?? []).map((f) => [f.following_id, f.status as FollowStatus]));
  const people = peopleRes.data ?? [];

  return (
    <>
      <Link
        href="/feed/companero"
        className="min-h-tap rounded-btn border-border-strong text-soft hover:bg-surface mb-5 flex items-center justify-center gap-2 border border-dashed text-[15px] font-semibold"
      >
        <UserPlus aria-hidden className="size-5" />
        Busco compañero
      </Link>

      {posts.length > 0 && (
        <div className="mb-6 space-y-4">
          {posts.map((p) => (
            <PartnerCard key={p.id} post={p} viewerId={viewerId} />
          ))}
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold">Gente de tu sede</h2>
      {people.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Todavía no hay nadie más"
          description="Invitá a tus compañeros de gimnasio a sumarse a Banca."
        />
      ) : (
        <ul className="rounded-card bg-surface divide-border divide-y">
          {people.map((p) => {
            const name = p.full_name ?? p.username ?? "";
            return (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={name} seed={p.id!} src={p.avatar_url} />
                <Link href={`/u/${p.username}`} className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{name}</span>
                  <span className="text-muted block truncate text-sm">@{p.username}</span>
                </Link>
                <FollowButton
                  viewerId={viewerId}
                  targetId={p.id!}
                  targetName={name}
                  initialStatus={follows.get(p.id!) ?? "none"}
                  size="sm"
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
