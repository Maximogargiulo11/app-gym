"use client";

import { Clock } from "lucide-react";
import { useEffect, useRef } from "react";
import { formatClock } from "@/lib/format";
import { useNow } from "@/lib/use-now";

type Props = {
  rest: { endsAt: number; total: number };
  onAdd: () => void;
  onSkip: () => void;
};

/** Barra lima fija sobre la navegación con el descanso en curso. */
export function RestBar({ rest, onAdd, onSkip }: Props) {
  const now = useNow(250);
  const remaining = Math.max(0, rest.endsAt - now);
  const progress = rest.total > 0 ? remaining / (rest.total * 1000) : 0;
  const ended = useRef(false);

  useEffect(() => {
    if (remaining > 0 || ended.current) return;
    ended.current = true;
    try {
      navigator.vibrate?.([200, 100, 200]);
    } catch {
      // vibración no disponible
    }
    onSkip();
  }, [remaining, onSkip]);

  return (
    <div className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-30 px-5 pb-3">
      <div className="bg-accent text-on-accent mx-auto flex max-w-md items-center gap-3 rounded-[18px] py-3 pr-3 pl-4 shadow-[0_-8px_24px_rgba(0,0,0,0.4)]">
        {/* Tocar el contador o la barra termina el descanso. */}
        <button
          type="button"
          onClick={onSkip}
          aria-label={`Descanso, quedan ${formatClock(remaining)}. Tocá para terminarlo`}
          className="min-h-tap flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <Clock aria-hidden className="size-6 shrink-0" strokeWidth={2.25} />
          <span role="timer" className="shrink-0 text-[18px] font-bold">
            Descanso <span className="tabular">{formatClock(remaining)}</span>
          </span>
          <span aria-hidden className="bg-on-accent/20 h-2 min-w-8 flex-1 overflow-hidden rounded-full">
            <span
              className="bg-on-accent block h-full rounded-full transition-[width] duration-200"
              style={{ width: `${progress * 100}%` }}
            />
          </span>
        </button>
        <button
          type="button"
          onClick={onAdd}
          aria-label="Sumar 15 segundos de descanso"
          className="rounded-btn bg-on-accent text-accent h-11 shrink-0 px-3 text-[15px] font-bold"
        >
          +15
        </button>
      </div>
    </div>
  );
}
