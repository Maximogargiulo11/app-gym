import { MessageSquare, Trophy } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui";
import { FollowButton, type FollowStatus } from "@/components/social/follow-button";
import { formatDuration, formatNumber, timeAgo } from "@/lib/format";
import { CopyRoutineButton } from "./copy-routine-button";
import { LikeButton } from "./like-button";

export type FeedWorkout = {
  id: string;
  title: string;
  started_at: string;
  ended_at: string | null;
  total_volume: number;
  total_sets: number;
  branch_name: string | null;
  author_id: string;
  author_username: string;
  author_name: string | null;
  author_avatar: string | null;
  like_count: number;
  comment_count: number;
  liked: boolean;
  exercises: { name: string; sets: number }[];
  top_pr: { name: string; weight_kg: number; reps: number } | null;
};

type Props = { workout: FeedWorkout; viewerId: string; followStatus: FollowStatus };

export function WorkoutCard({ workout: w, viewerId, followStatus }: Props) {
  const isOwn = w.author_id === viewerId;
  const duration = w.ended_at ? new Date(w.ended_at).getTime() - new Date(w.started_at).getTime() : 0;
  const shown = w.exercises.slice(0, 3);
  const rest = w.exercises.length - shown.length;
  const name = w.author_name ?? w.author_username;

  return (
    <article aria-labelledby={`w-${w.id}`} className="bg-surface rounded-[22px] p-5">
      <header className="mb-4 flex items-center gap-3">
        <Link href={`/u/${w.author_username}`} className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar name={name} seed={w.author_id} src={w.author_avatar} size="md" highlight={isOwn} />
          <span className="min-w-0">
            <span className="block truncate text-[18px] font-bold">{name}</span>
            <span className="text-muted block truncate text-[15px]">
              {[w.branch_name, timeAgo(w.ended_at ?? w.started_at)].filter(Boolean).join(" · ")}
            </span>
          </span>
        </Link>
        {!isOwn && followStatus === "none" && (
          <FollowButton
            viewerId={viewerId}
            targetId={w.author_id}
            targetName={name}
            initialStatus={followStatus}
            size="sm"
          />
        )}
      </header>

      <Link href={`/w/${w.id}`} className="block">
        <h2 id={`w-${w.id}`} className="font-display mb-3 text-[28px] leading-tight">
          {w.title}
        </h2>
        <dl className="mb-4 grid grid-cols-3">
          {[
            { label: "Duración", value: formatDuration(duration) },
            { label: "Volumen", value: `${formatNumber(Number(w.total_volume))} kg` },
            { label: "Series", value: String(w.total_sets) },
          ].map((s) => (
            <div key={s.label}>
              <dt className="text-muted text-xs font-medium tracking-wide uppercase">{s.label}</dt>
              <dd className="tabular mt-0.5 text-[20px] font-bold">{s.value}</dd>
            </div>
          ))}
        </dl>

        {w.top_pr && (
          <p className="rounded-btn bg-pr-bg text-pr mb-4 flex items-center gap-2 px-4 py-3 font-semibold">
            <Trophy aria-hidden className="size-5 shrink-0" />
            Nuevo récord · {w.top_pr.name} {formatNumber(Number(w.top_pr.weight_kg))} kg × {w.top_pr.reps}
          </p>
        )}

        <ul className="text-soft space-y-1 text-[16px]">
          {shown.map((e, i) => (
            <li key={i}>
              {e.sets} {e.sets === 1 ? "serie" : "series"} · {e.name}
            </li>
          ))}
          {rest > 0 && <li className="text-muted">y {rest} más</li>}
        </ul>
      </Link>

      <footer className="border-border mt-4 flex items-center gap-2 border-t pt-3">
        <LikeButton workoutId={w.id} viewerId={viewerId} initialLiked={w.liked} initialCount={w.like_count} />
        <Link
          href={`/w/${w.id}#comentarios`}
          aria-label={`${w.comment_count} comentarios`}
          className="min-h-tap rounded-btn inline-flex items-center gap-2 px-2 text-[17px] font-bold"
        >
          <MessageSquare aria-hidden className="size-6" strokeWidth={1.75} />
          <span className="tabular">{w.comment_count}</span>
        </Link>
        <span className="flex-1" />
        {!isOwn && <CopyRoutineButton workoutId={w.id} />}
      </footer>
    </article>
  );
}
