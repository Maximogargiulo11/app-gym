"use client";

import { Check, Flame, Lock, Play, QrCode } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { checkIn, type CheckinResult } from "@/app/(app)/checkin/actions";
import { startWorkout } from "@/app/(app)/entrenar/actions";
import { Button, ButtonLink, ErrorState, Spinner } from "@/components/ui";

const timeFormat = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Cordoba",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Registra el check-in apenas se abre el link del QR (con POST, no en el render) y muestra el resultado. */
export function CheckinRunner({
  slug,
  token,
  hasActiveWorkout,
}: {
  slug: string;
  token: string;
  hasActiveWorkout: boolean;
}) {
  const [result, setResult] = useState<CheckinResult | null>(null);
  // Un solo envío por QR, aunque el efecto corra dos veces (StrictMode en desarrollo).
  const request = useRef<Promise<CheckinResult> | null>(null);

  useEffect(() => {
    let cancelled = false;
    request.current ??= checkIn(slug, token);
    request.current
      .then((r) => !cancelled && setResult(r))
      .catch(() => !cancelled && setResult({ ok: false, error: "No pudimos registrar el check-in. Probá de nuevo." }));
    return () => {
      cancelled = true;
    };
  }, [slug, token]);

  if (!result) {
    return (
      <div className="rounded-card bg-surface flex flex-col items-center gap-4 px-6 py-12 text-center">
        <Spinner label="Registrando el check-in" className="text-accent" />
        <p className="text-soft">Registrando tu check-in…</p>
      </div>
    );
  }

  if (!result.ok) {
    return (
      <ErrorState
        message={result.error}
        action={
          <ButtonLink href="/checkin" variant="secondary">
            <QrCode aria-hidden className="size-5" />
            Escanear otra vez
          </ButtonLink>
        }
      />
    );
  }

  return (
    <>
      <section
        aria-labelledby="checkin-ok"
        className="rounded-card border-accent-border bg-accent-bg flex flex-col items-center border px-6 py-8 text-center"
      >
        <span className="bg-accent text-on-accent mb-4 inline-flex size-16 items-center justify-center rounded-full">
          <Check aria-hidden className="size-9" strokeWidth={2.5} />
        </span>
        <h2 id="checkin-ok" className="font-display text-[26px] leading-tight">
          {result.already ? "Ya hiciste check-in hoy" : "Check-in confirmado"}
        </h2>
        <p className="text-soft mt-2 text-[16px]">
          {result.gymName} · {result.branchName} · {timeFormat.format(new Date(result.checkedAt))}
        </p>
      </section>

      <div className="rounded-card bg-surface mt-3 flex items-center gap-4 p-4">
        <span className="rounded-btn bg-pr-bg text-pr inline-flex size-12 shrink-0 items-center justify-center">
          <Flame aria-hidden className="size-6" strokeWidth={1.75} />
        </span>
        <div>
          <p className="font-display text-[22px] leading-tight">
            {result.streak} {result.streak === 1 ? "día seguido" : "días seguidos"}
          </p>
          <p className="text-muted text-[15px]">
            {result.streak > 1 ? "Seguí así, no cortes la racha." : "Arrancó tu racha. Volvé mañana para sumar."}
          </p>
        </div>
      </div>

      <p className="text-muted mt-4 flex items-start gap-2 text-[14px] leading-snug">
        <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
        Tu check-in solo suma a tu racha y a los desafíos de la sede. Nadie ve cuándo estás en el gimnasio.
      </p>

      <div className="mt-6 space-y-3">
        {hasActiveWorkout ? (
          <ButtonLink href="/entrenar/en-curso" size="lg" block>
            <Play aria-hidden className="size-5" fill="currentColor" />
            Seguir entrenamiento
          </ButtonLink>
        ) : (
          <form action={startWorkout}>
            <Button type="submit" size="lg" block>
              <Play aria-hidden className="size-5" fill="currentColor" />
              Empezar entrenamiento
            </Button>
          </form>
        )}
        <ButtonLink href="/feed" variant="secondary" block>
          Volver al feed
        </ButtonLink>
      </div>
    </>
  );
}
