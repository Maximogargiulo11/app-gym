import { ChevronRight, Trophy } from "lucide-react";
import Link from "next/link";
import { formatDate, formatDuration, formatNumber } from "@/lib/format";

export function Counters({ stats }: { stats: { workouts: number; followers: number; following: number } | null }) {
  const items = [
    { label: "Entrenamientos", value: stats?.workouts ?? 0 },
    { label: "Seguidores", value: stats?.followers ?? 0 },
    { label: "Seguidos", value: stats?.following ?? 0 },
  ];
  return (
    <dl className="rounded-card bg-surface mb-5 grid grid-cols-3 py-4 text-center">
      {items.map((c) => (
        <div key={c.label} className="flex flex-col-reverse">
          <dt className="text-muted mt-1.5 text-sm">{c.label}</dt>
          <dd className="tabular font-display text-[26px] leading-none">{c.value.toLocaleString("es-AR")}</dd>
        </div>
      ))}
    </dl>
  );
}

export type RecordRow = { exercise_id: string; best_weight: number; best_weight_reps: number; name: string };

export function Records({ records }: { records: RecordRow[] }) {
  if (records.length === 0) return null;
  return (
    <section aria-labelledby="records" className="mb-6">
      <h2 id="records" className="mb-3 text-lg font-semibold">
        Récords
      </h2>
      <ul className="grid grid-cols-2 gap-3">
        {records.map((r) => (
          <li key={r.exercise_id} className="rounded-card bg-surface p-4">
            <Trophy aria-hidden className="text-pr mb-2 size-5" />
            <p className="tabular font-display text-[22px] leading-none">{formatNumber(Number(r.best_weight))} kg</p>
            <p className="text-muted mt-1 text-sm">
              × {r.best_weight_reps} · {r.name}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export type WorkoutRow = {
  id: string;
  title: string;
  started_at: string;
  ended_at: string | null;
  total_volume: number;
};

export function RecentWorkouts({ workouts, ownHref }: { workouts: WorkoutRow[]; ownHref?: boolean }) {
  return (
    <section aria-labelledby="ultimos" className="mb-6">
      <h2 id="ultimos" className="mb-3 text-lg font-semibold">
        Últimos entrenamientos
      </h2>
      {workouts.length === 0 ? (
        <p className="rounded-card bg-surface text-muted p-4 text-[15px]">Todavía no hay entrenamientos publicados.</p>
      ) : (
        <ul className="divide-border rounded-card bg-surface divide-y overflow-hidden">
          {workouts.map((w) => (
            <li key={w.id}>
              <Link
                href={ownHref ? `/entrenar/resumen/${w.id}` : `/w/${w.id}`}
                className="hover:bg-surface-2 flex min-h-[64px] items-center gap-3 px-4 py-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{w.title}</span>
                  <span className="text-muted block text-sm">
                    {formatDate(w.started_at)} ·{" "}
                    {formatDuration(w.ended_at ? new Date(w.ended_at).getTime() - new Date(w.started_at).getTime() : 0)}{" "}
                    · {formatNumber(Number(w.total_volume))} kg
                  </span>
                </span>
                <ChevronRight aria-hidden className="text-muted size-5" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
