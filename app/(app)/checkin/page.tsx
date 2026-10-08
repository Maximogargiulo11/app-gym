import { CheckCircle2, Flame, Lock } from "lucide-react";
import type { Metadata } from "next";
import { CheckinRunner } from "@/components/checkin/checkin-runner";
import { QrScanner } from "@/components/checkin/qr-scanner";
import { BackHeader } from "@/components/layout/back-header";
import { createClient, getMyProfile } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Check-in" };

const TZ = "America/Argentina/Cordoba";

export default async function CheckinPage({ searchParams }: PageProps<"/checkin">) {
  const { b, t } = await searchParams;
  const profile = (await getMyProfile())!;
  const supabase = await createClient();

  // Link del QR: el check-in se registra desde el cliente con una server action.
  if (typeof b === "string" && typeof t === "string") {
    const { data: active } = await supabase
      .from("workouts")
      .select("id")
      .eq("user_id", profile.id)
      .eq("status", "in_progress")
      .maybeSingle();
    return (
      <>
        <BackHeader href="/feed" label="Volver al feed" title="Check-in" />
        <CheckinRunner key={`${b}:${t}`} slug={b} token={t} hasActiveWorkout={Boolean(active)} />
      </>
    );
  }

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
  const [{ data: streak }, { data: todayCheckins }] = await Promise.all([
    supabase.rpc("my_streak"),
    supabase.from("check_ins").select("id, branch:branches(name)").eq("user_id", profile.id).eq("local_date", today),
  ]);
  const doneToday = todayCheckins?.[0];

  return (
    <>
      <BackHeader href="/feed" label="Volver al feed" title="Check-in" />

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-card bg-surface p-4">
          <Flame aria-hidden className="text-pr mb-2 size-6" strokeWidth={1.75} />
          <p className="font-display text-[26px] leading-none">{streak ?? 0}</p>
          <p className="text-muted mt-1 text-sm">{streak === 1 ? "día seguido" : "días seguidos"}</p>
        </div>
        <div className="rounded-card bg-surface p-4">
          <CheckCircle2
            aria-hidden
            className={doneToday ? "text-accent mb-2 size-6" : "text-muted mb-2 size-6"}
            strokeWidth={1.75}
          />
          <p className="text-[17px] leading-tight font-semibold">{doneToday ? "Hoy ya sumaste" : "Hoy todavía no"}</p>
          <p className="text-muted mt-1 truncate text-sm">
            {doneToday ? (doneToday.branch?.name ?? "Check-in hecho") : "Escaneá para sumar"}
          </p>
        </div>
      </div>

      <QrScanner />

      <p className="text-muted mt-6 flex items-start gap-2 text-[14px] leading-snug">
        <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
        Tu check-in solo suma a tu racha y a los desafíos de la sede. Nadie ve cuándo estás en el gimnasio.
      </p>
    </>
  );
}
