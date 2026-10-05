"use client";

import { useState, useTransition } from "react";
import { PrivacyFields } from "@/components/profile/privacy-fields";
import { Button, FormMessage, Pill, Spinner } from "@/components/ui";
import { SCHEDULES, type PrivacySettings, type Schedule } from "@/lib/profile/validation";
import { updatePrivacy } from "../actions";

type Props = { initial: PrivacySettings & { usual_schedule: Schedule | null } };

export function PrivacyForm({ initial }: Props) {
  const [privacy, setPrivacy] = useState<PrivacySettings>(initial);
  const [schedule, setSchedule] = useState<Schedule | null>(initial.usual_schedule);
  const [message, setMessage] = useState<{ error?: string; success?: string }>({});
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await updatePrivacy({ ...privacy, usual_schedule: schedule });
          setMessage(result.error ? { error: result.error } : { success: "Listo, guardamos tus cambios." });
        });
      }}
    >
      <PrivacyFields
        value={privacy}
        onChange={(v) => {
          setMessage({});
          setPrivacy({ ...v, is_private: v.is_private ?? privacy.is_private });
        }}
      />

      <fieldset>
        <legend className="text-soft mb-3 text-sm font-medium">Horario habitual</legend>
        <div className="flex flex-wrap gap-2">
          {SCHEDULES.map((s) => (
            <Pill
              key={s}
              active={schedule === s}
              onClick={() => {
                setMessage({});
                setSchedule(schedule === s ? null : s);
              }}
            >
              De {s}
            </Pill>
          ))}
        </div>
      </fieldset>

      <FormMessage error={message.error} success={message.success} />
      <Button type="submit" size="lg" block disabled={pending}>
        {pending && <Spinner />}
        Guardar cambios
      </Button>
    </form>
  );
}
