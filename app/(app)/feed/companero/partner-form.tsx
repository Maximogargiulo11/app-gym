"use client";

import { useState, useTransition } from "react";
import { Button, FormMessage, Pill, Spinner, TextField } from "@/components/ui";
import { createPartnerPost } from "./actions";

const DAYS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

export function PartnerForm() {
  const [topic, setTopic] = useState("");
  const [days, setDays] = useState<string[]>([]);
  const [timeLabel, setTimeLabel] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const res = await createPartnerPost({ topic, days, timeLabel, body });
          if (res?.error) setError(res.error);
        });
      }}
    >
      <TextField
        label="¿Qué querés entrenar?"
        value={topic}
        maxLength={60}
        placeholder="Press banca pesado"
        onChange={(e) => setTopic(e.target.value)}
      />
      <fieldset>
        <legend className="text-soft mb-3 text-sm font-medium">Días</legend>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((d) => (
            <Pill
              key={d}
              active={days.includes(d)}
              onClick={() => setDays((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d]))}
            >
              {d[0].toUpperCase() + d.slice(1, 3)}
            </Pill>
          ))}
        </div>
      </fieldset>
      <TextField
        label="Horario (opcional)"
        value={timeLabel}
        maxLength={40}
        placeholder="19 hs"
        onChange={(e) => setTimeLabel(e.target.value)}
      />
      <div>
        <label htmlFor="body" className="text-soft mb-2 block text-sm font-medium">
          Mensaje
        </label>
        <textarea
          id="body"
          value={body}
          maxLength={500}
          rows={4}
          placeholder="Busco alguien que me asista en las últimas series."
          onChange={(e) => setBody(e.target.value)}
          className="rounded-btn border-border-strong bg-bg placeholder:text-muted/70 focus:border-accent w-full border px-4 py-3 text-[16px] outline-none"
        />
        <p className="text-muted mt-1 text-right text-xs">{body.length}/500</p>
      </div>
      <p className="rounded-btn bg-surface text-soft px-4 py-3 text-sm">
        Lo ve la gente de tu gimnasio, aunque tu cuenta sea privada. No compartas datos de contacto: quienes se sumen te
        van a aparecer acá.
      </p>
      <FormMessage error={error} />
      <Button type="submit" size="lg" block disabled={pending}>
        {pending && <Spinner />}
        Publicar
      </Button>
    </form>
  );
}
