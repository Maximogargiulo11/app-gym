import { ChevronDown, Trophy } from "lucide-react";
import Link from "next/link";
import { Avatar, SectionLabel } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatKg } from "@/lib/format";

export type RankingRow = {
  rank: number;
  user_id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  weight_kg: number;
  reps: number;
  is_me: boolean;
};

export type RankingExercise = { exercise_id: string; name: string; participants: number };

/** Récord del mes de un ejercicio en la sede: top 10 y tu fila resaltada. */
export function RankingCard({
  exercise,
  exercises,
  rows,
  monthLabel,
}: {
  exercise: RankingExercise;
  exercises: RankingExercise[];
  rows: RankingRow[];
  monthLabel: string;
}) {
  const top = rows.filter((r) => r.rank <= 10);
  const mine = rows.find((r) => r.is_me && r.rank > 10);

  return (
    <section aria-labelledby="ranking-title" className="rounded-card bg-surface p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <SectionLabel>Récord de {monthLabel}</SectionLabel>
          <h2 id="ranking-title" className="font-display mt-1 text-[22px] leading-tight">
            {exercise.name}
          </h2>
          <p className="text-muted text-sm">
            {exercise.participants} {exercise.participants === 1 ? "persona" : "personas"} este mes
          </p>
        </div>
        {exercises.length > 1 && (
          <details key={exercise.exercise_id} className="group relative shrink-0">
            <summary className="min-h-tap rounded-btn text-accent hover:bg-accent-bg flex cursor-pointer list-none items-center gap-1 px-3 font-semibold [&::-webkit-details-marker]:hidden">
              Cambiar
              <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
            </summary>
            <ul className="rounded-card border-border-strong bg-surface-2 absolute right-0 z-10 mt-1 max-h-80 w-64 overflow-y-auto border py-2 shadow-xl">
              {exercises.map((e) => (
                <li key={e.exercise_id}>
                  <Link
                    href={`/sede?tab=rankings&ex=${e.exercise_id}`}
                    aria-current={e.exercise_id === exercise.exercise_id ? "true" : undefined}
                    className={cn(
                      "hover:bg-surface flex min-h-11 items-center justify-between gap-2 px-4 text-[15px]",
                      e.exercise_id === exercise.exercise_id && "text-accent font-semibold",
                    )}
                  >
                    <span className="truncate">{e.name}</span>
                    <span className="text-muted text-xs">{e.participants}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <ol className="space-y-1">
        {top.map((r) => (
          <Row key={r.user_id} row={r} />
        ))}
      </ol>
      {mine && (
        <>
          <p aria-hidden className="text-muted py-1 text-center">
            ···
          </p>
          <ol>
            <Row row={mine} />
          </ol>
        </>
      )}
    </section>
  );
}

function Row({ row: r }: { row: RankingRow }) {
  const name = r.full_name ?? r.username;
  return (
    <li
      className={cn(
        "rounded-btn flex items-center gap-3 px-2 py-2",
        r.is_me && "border-accent-border bg-accent-bg border",
      )}
    >
      <span
        className={cn(
          "font-display w-7 shrink-0 text-center text-[18px]",
          r.rank === 1 ? "text-pr" : r.is_me ? "text-accent" : "text-muted",
        )}
      >
        {r.rank === 1 ? <Trophy aria-label="Primer puesto" className="mx-auto size-5" strokeWidth={2} /> : r.rank}
      </span>
      <Avatar name={name} seed={r.user_id} src={r.avatar_url} />
      <Link href={r.is_me ? "/perfil" : `/u/${r.username}`} className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{r.is_me ? "Vos" : name}</span>
        <span className="text-muted block truncate text-sm">@{r.username}</span>
      </Link>
      <span className="text-right">
        <span className="font-display block text-[18px] leading-tight">{formatKg(Number(r.weight_kg))}</span>
        <span className="text-muted block text-xs">
          × {r.reps} {r.reps === 1 ? "rep" : "reps"}
        </span>
      </span>
    </li>
  );
}
