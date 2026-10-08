import { Swords } from "lucide-react";
import { SectionLabel } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";

export type ChallengeBranch = { branch_id: string; branch_name: string; days: number; my_days: number };

export type ChallengeView = {
  id: string;
  title: string;
  description: string | null;
  starts_on: string;
  ends_on: string;
  branches: ChallengeBranch[];
};

function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 86_400_000);
}

function shortDate(iso: string) {
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${iso}T12:00:00Z`),
  );
}

/** Desafío entre sedes: barras con los días entrenados de cada sede. Solo cantidades. */
export function ChallengeCard({
  challenge: c,
  today,
  myBranchId,
}: {
  challenge: ChallengeView;
  today: string;
  myBranchId: string | null;
}) {
  const max = Math.max(1, ...c.branches.map((b) => b.days));
  const leader = [...c.branches].sort((a, b) => b.days - a.days)[0];
  const tie = c.branches.filter((b) => b.days === leader?.days).length > 1;
  const myDays = c.branches.reduce((sum, b) => sum + b.my_days, 0);
  const upcoming = today < c.starts_on;
  const finished = today > c.ends_on;
  const left = daysBetween(today, c.ends_on) + 1;

  let status: string;
  if (upcoming) status = `Empieza el ${shortDate(c.starts_on)}`;
  else if (finished) status = tie || !leader ? "Terminó empatado" : `Ganó ${leader.branch_name}`;
  else status = left === 1 ? "Termina hoy" : `Quedan ${left} días`;

  return (
    <article aria-labelledby={`c-${c.id}`} className="rounded-card bg-surface p-4">
      <div className="mb-4 flex items-start gap-3">
        <span className="rounded-btn bg-accent-bg text-accent inline-flex size-11 shrink-0 items-center justify-center">
          <Swords aria-hidden className="size-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <SectionLabel>
            {finished ? "Desafío terminado" : upcoming ? "Próximo desafío" : "Desafío entre sedes"}
          </SectionLabel>
          <h3 id={`c-${c.id}`} className="mt-1 text-[18px] leading-tight font-semibold">
            {c.title}
          </h3>
          {c.description && <p className="text-muted mt-0.5 text-sm">{c.description}</p>}
        </div>
      </div>

      <ul className="space-y-3">
        {c.branches.map((b) => {
          const mine = b.branch_id === myBranchId;
          return (
            <li key={b.branch_id}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-[15px]">
                <span className={cn("truncate", mine && "font-semibold")}>
                  {b.branch_name}
                  {mine && <span className="text-muted font-normal"> · tu sede</span>}
                </span>
                <span className="font-display">
                  {formatNumber(b.days)} <span className="text-muted font-sans text-xs">días</span>
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={`${b.branch_name}: ${b.days} días entrenados`}
                aria-valuenow={b.days}
                aria-valuemin={0}
                aria-valuemax={max}
                className="bg-surface-2 h-2.5 overflow-hidden rounded-full"
              >
                <div
                  className={cn("h-full rounded-full", mine ? "bg-accent" : "bg-soft/60")}
                  style={{ width: `${(b.days / max) * 100}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-soft mt-4 text-sm">
        {status}
        {!upcoming && (
          <>
            {" · "}vos sumaste {myDays} {myDays === 1 ? "día" : "días"}
          </>
        )}
      </p>
    </article>
  );
}
