import { ChevronLeft, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink, Card } from "@/components/ui";
import { formatDate, formatDuration, formatKg, formatNumber } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Resumen del entrenamiento" };

export default async function ResumenPage({ params }: PageProps<"/entrenar/resumen/[id]">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: w } = await supabase
    .from("workouts")
    .select(
      "id, title, started_at, ended_at, total_volume, total_sets, is_published, status, workout_exercises(id, position, exercise:exercises(name), workout_sets(id, set_number, weight_kg, reps, is_pr))",
    )
    .eq("id", id)
    .order("position", { referencedTable: "workout_exercises" })
    .maybeSingle();

  if (!w || w.status !== "finished") notFound();

  const duration = w.ended_at ? new Date(w.ended_at).getTime() - new Date(w.started_at).getTime() : 0;
  const prs = w.workout_exercises.flatMap((we) =>
    we.workout_sets.filter((s) => s.is_pr).map((s) => ({ name: we.exercise?.name ?? "", ...s })),
  );

  return (
    <>
      <header className="flex items-center gap-3 pt-6 pb-2">
        <Link
          href="/entrenar"
          aria-label="Volver a Entrenar"
          className="size-tap bg-surface inline-flex items-center justify-center rounded-full"
        >
          <ChevronLeft aria-hidden className="size-6" />
        </Link>
        <p className="text-muted text-sm">{formatDate(w.started_at)}</p>
      </header>
      <h1 className="font-display pb-5 text-[32px] leading-tight">{w.title}</h1>

      <dl className="rounded-card bg-surface mb-5 grid grid-cols-3 p-4">
        {[
          { label: "Duración", value: formatDuration(duration) },
          { label: "Volumen", value: formatKg(Number(w.total_volume)) },
          { label: "Series", value: String(w.total_sets) },
        ].map((s) => (
          <div key={s.label}>
            <dt className="text-muted text-xs font-medium tracking-wide uppercase">{s.label}</dt>
            <dd className="tabular mt-1 text-[20px] font-bold">{s.value}</dd>
          </div>
        ))}
      </dl>

      {prs.length > 0 && (
        <Card tone="pr" className="mb-5 space-y-1.5">
          {prs.map((p) => (
            <p key={p.id} className="flex items-center gap-2 font-semibold">
              <Trophy aria-hidden className="size-5 shrink-0" />
              Nuevo récord · {p.name} {formatNumber(Number(p.weight_kg))} kg × {p.reps}
            </p>
          ))}
        </Card>
      )}

      <ul className="mb-6 space-y-3">
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

      <p className="text-muted mb-4 text-center text-sm">
        {w.is_published ? "Publicado: lo ven quienes pueden ver tu perfil." : "Solo lo ves vos."}
      </p>
      <ButtonLink href="/entrenar" variant="secondary" block>
        Volver a Entrenar
      </ButtonLink>
    </>
  );
}
