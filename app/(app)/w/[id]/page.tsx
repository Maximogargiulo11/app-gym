import { ChevronLeft, MessageSquare, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyRoutineButton } from "@/components/feed/copy-routine-button";
import { LikeButton } from "@/components/feed/like-button";
import { ReportButton } from "@/components/social/report-button";
import { Avatar, Card } from "@/components/ui";
import { formatDate, formatDuration, formatNumber, timeAgo } from "@/lib/format";
import { createClient, getMyProfile } from "@/lib/supabase/server";
import { Comments, type CommentItem } from "./comments";
import { OwnerActions } from "./owner-actions";

export const metadata: Metadata = { title: "Entrenamiento" };

export default async function WorkoutPage({ params }: PageProps<"/w/[id]">) {
  const { id } = await params;
  const viewer = (await getMyProfile())!;
  const supabase = await createClient();

  // RLS decide si se ve: propio, o publicado y de alguien visible sin bloqueo.
  const { data: w } = await supabase
    .from("workouts")
    .select(
      "id, user_id, title, started_at, ended_at, total_volume, total_sets, is_published, status, workout_exercises(id, position, exercise:exercises(name), workout_sets(id, set_number, weight_kg, reps, is_pr))",
    )
    .eq("id", id)
    .eq("status", "finished")
    .order("position", { referencedTable: "workout_exercises" })
    .maybeSingle();
  if (!w) notFound();

  const [{ data: author }, { data: likes }, { data: comments }] = await Promise.all([
    supabase.from("profiles_public").select("id, username, full_name, avatar_url").eq("id", w.user_id).maybeSingle(),
    supabase.from("likes").select("user_id").eq("workout_id", w.id),
    supabase.from("comments").select("id, body, created_at, user_id").eq("workout_id", w.id).order("created_at"),
  ]);
  if (!author?.username) notFound();

  const commenterIds = [...new Set((comments ?? []).map((c) => c.user_id))];
  const { data: commenters } = commenterIds.length
    ? await supabase.from("profiles_public").select("id, username, full_name, avatar_url").in("id", commenterIds)
    : { data: [] };
  const byId = new Map((commenters ?? []).map((c) => [c.id, c]));
  const commentItems: CommentItem[] = (comments ?? []).map((c) => {
    const a = byId.get(c.user_id);
    return {
      ...c,
      author: a?.username ? { username: a.username, full_name: a.full_name, avatar_url: a.avatar_url } : null,
    };
  });

  const isOwn = w.user_id === viewer.id;
  const name = author.full_name ?? author.username;
  const duration = w.ended_at ? new Date(w.ended_at).getTime() - new Date(w.started_at).getTime() : 0;
  const prs = w.workout_exercises.flatMap((we) =>
    we.workout_sets.filter((s) => s.is_pr).map((s) => ({ ...s, name: we.exercise?.name ?? "" })),
  );

  return (
    <>
      <header className="flex items-center gap-3 pt-6 pb-4">
        <Link
          href="/feed"
          aria-label="Volver al feed"
          className="size-tap bg-surface inline-flex items-center justify-center rounded-full"
        >
          <ChevronLeft aria-hidden className="size-6" />
        </Link>
        <Link href={`/u/${author.username}`} className="flex min-w-0 items-center gap-3">
          <Avatar name={name} seed={author.id ?? undefined} src={author.avatar_url} highlight={isOwn} />
          <span className="min-w-0">
            <span className="block truncate font-bold">{name}</span>
            <span className="text-muted block text-sm">
              {formatDate(w.started_at)} · {timeAgo(w.ended_at ?? w.started_at)}
            </span>
          </span>
        </Link>
      </header>

      <h1 className="font-display pb-4 text-[32px] leading-tight">{w.title}</h1>

      <dl className="rounded-card bg-surface mb-4 grid grid-cols-3 p-4">
        {[
          { label: "Duración", value: formatDuration(duration) },
          { label: "Volumen", value: `${formatNumber(Number(w.total_volume))} kg` },
          { label: "Series", value: String(w.total_sets) },
        ].map((s) => (
          <div key={s.label}>
            <dt className="text-muted text-xs font-medium tracking-wide uppercase">{s.label}</dt>
            <dd className="tabular mt-1 text-[20px] font-bold">{s.value}</dd>
          </div>
        ))}
      </dl>

      {prs.length > 0 && (
        <Card tone="pr" className="mb-4 space-y-1.5">
          {prs.map((p) => (
            <p key={p.id} className="flex items-center gap-2 font-semibold">
              <Trophy aria-hidden className="size-5 shrink-0" />
              Nuevo récord · {p.name} {formatNumber(Number(p.weight_kg))} kg × {p.reps}
            </p>
          ))}
        </Card>
      )}

      <ul className="mb-4 space-y-3">
        {w.workout_exercises.map((we) => (
          <li key={we.id}>
            <Card>
              <h2 className="text-accent mb-2 font-semibold">{we.exercise?.name}</h2>
              <ol className="space-y-1 text-[15px]">
                {[...we.workout_sets]
                  .sort((a, b) => a.set_number - b.set_number)
                  .map((s) => (
                    <li key={s.id} className="flex items-center gap-3">
                      <span className="text-muted w-5">{s.set_number}</span>
                      <span className="tabular">
                        {s.weight_kg && Number(s.weight_kg) > 0
                          ? `${formatNumber(Number(s.weight_kg))} kg`
                          : "Peso corporal"}{" "}
                        × {s.reps}
                      </span>
                      {s.is_pr && (
                        <span className="bg-pr-bg text-pr rounded-md px-1.5 py-0.5 text-[11px] font-bold">PR</span>
                      )}
                    </li>
                  ))}
              </ol>
            </Card>
          </li>
        ))}
      </ul>

      <div className="border-border mb-6 flex items-center gap-2 border-y py-2">
        <LikeButton
          workoutId={w.id}
          viewerId={viewer.id}
          initialLiked={(likes ?? []).some((l) => l.user_id === viewer.id)}
          initialCount={(likes ?? []).length}
        />
        <span className="min-h-tap inline-flex items-center gap-2 px-2 text-[17px] font-bold">
          <MessageSquare aria-hidden className="size-6" strokeWidth={1.75} />
          <span className="tabular">{commentItems.length}</span>
          <span className="sr-only">comentarios</span>
        </span>
        <span className="flex-1" />
        {!isOwn && <CopyRoutineButton workoutId={w.id} />}
      </div>

      <div className="mb-8">
        <Comments workoutId={w.id} viewerId={viewer.id} isWorkoutOwner={isOwn} comments={commentItems} />
      </div>

      {isOwn ? (
        <OwnerActions workoutId={w.id} published={w.is_published} />
      ) : (
        <ReportButton targetType="workout" targetId={w.id} label="Reportar este entrenamiento" />
      )}
    </>
  );
}
