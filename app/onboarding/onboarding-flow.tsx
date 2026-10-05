"use client";

import { Check, ChevronLeft, MapPin } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { PrivacyFields } from "@/components/profile/privacy-fields";
import { Button, ErrorState, FormMessage, Logo, Pill, RadioCard, Spinner, TextField } from "@/components/ui";
import { cn } from "@/lib/cn";
import {
  normalizeUsername,
  SCHEDULES,
  validateFullName,
  validateUsername,
  type Schedule,
} from "@/lib/profile/validation";
import { createClient } from "@/lib/supabase/client";
import { completeOnboarding } from "./actions";

type Gym = { id: string; name: string; branches: { id: string; name: string }[] };
type Props = { gyms: Gym[]; loadError: boolean; initialName: string };
type Step = 1 | 2 | 3;
type Availability = "idle" | "checking" | "available" | "taken";

const TITLES: Record<Step, { title: string; subtitle: string }> = {
  1: { title: "¿Cómo te llamás?", subtitle: "Así te van a ver en tu sede." },
  2: { title: "¿Dónde entrenás?", subtitle: "Vas a ver la comunidad y los desafíos de tu sede." },
  3: { title: "¿Cómo querés que te vean?", subtitle: "Podés cambiarlo cuando quieras desde tu perfil." },
};

export function OnboardingFlow({ gyms, loadError, initialName }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [fullName, setFullName] = useState(initialName);
  const [username, setUsername] = useState("");
  // Último resultado del chequeo de disponibilidad, atado al usuario consultado.
  const [checked, setChecked] = useState<{ name: string; available: boolean } | null>(null);
  const [gymId, setGymId] = useState(gyms.length === 1 ? gyms[0].id : "");
  const [branchId, setBranchId] = useState("");
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [privacy, setPrivacy] = useState({
    is_private: null as boolean | null,
    show_branch: true,
    show_schedule: true,
    show_in_rankings: true,
    approve_tags: true,
  });
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const usernameError = username ? validateUsername(username) : null;
  const availability: Availability =
    !username || usernameError
      ? "idle"
      : checked?.name !== username
        ? "checking"
        : checked.available
          ? "available"
          : "taken";

  // Chequeo de disponibilidad con debounce (el servidor vuelve a validar al guardar).
  useEffect(() => {
    if (!username || validateUsername(username)) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const { data } = await createClient().rpc("username_available", { name: username });
      if (!cancelled) setChecked({ name: username, available: Boolean(data) });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username]);

  const gym = gyms.find((g) => g.id === gymId);

  const canContinue =
    step === 1
      ? !validateFullName(fullName) && !validateUsername(username) && availability === "available"
      : step === 2
        ? Boolean(branchId)
        : privacy.is_private !== null;

  function next() {
    setTouched(true);
    if (!canContinue) return;
    setError(null);
    setTouched(false);
    if (step < 3) {
      setStep((s) => (s + 1) as Step);
      return;
    }
    startTransition(async () => {
      const result = await completeOnboarding({
        full_name: fullName,
        username,
        branch_id: branchId,
        usual_schedule: schedule,
        ...privacy,
        is_private: privacy.is_private!,
      });
      if (result?.error) {
        setError(result.error);
        if (result.step) setStep(result.step);
      }
    });
  }

  if (loadError) return <ErrorState message="No pudimos cargar los gimnasios." />;

  return (
    <form
      className="flex flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        next();
      }}
    >
      <header className="flex items-center justify-between pt-6 pb-6">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => (s - 1) as Step)}
            aria-label="Volver al paso anterior"
            className="size-tap bg-surface -ml-2 inline-flex items-center justify-center rounded-full"
          >
            <ChevronLeft aria-hidden className="size-6" />
          </button>
        ) : (
          <Logo className="text-[28px]" />
        )}
        <p className="text-muted text-sm font-medium" aria-live="polite">
          Paso {step} de 3
        </p>
      </header>

      <div className="mb-8 grid grid-cols-3 gap-2" aria-hidden>
        {[1, 2, 3].map((n) => (
          <span key={n} className={cn("h-1.5 rounded-full", n <= step ? "bg-accent" : "bg-surface-2")} />
        ))}
      </div>

      <h1 className="font-display text-[30px] leading-tight">{TITLES[step].title}</h1>
      <p className="text-muted mt-2 mb-8 text-[16px]">{TITLES[step].subtitle}</p>

      <div className="flex-1 space-y-6">
        {step === 1 && (
          <>
            <TextField
              label="Nombre"
              name="full_name"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Lucía Martínez"
              maxLength={60}
              error={touched ? validateFullName(fullName) : null}
              hint="Podés poner solo tu nombre y la inicial del apellido."
            />
            <TextField
              label="Usuario"
              name="username"
              prefix="@"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={username}
              onChange={(e) => setUsername(normalizeUsername(e.target.value))}
              placeholder="lucia.m"
              error={
                usernameError && (touched || username.length >= 3)
                  ? usernameError
                  : availability === "taken"
                    ? "Ese usuario ya está tomado."
                    : touched && !username
                      ? "Elegí un usuario."
                      : null
              }
              hint={
                availability === "checking" ? (
                  "Revisando…"
                ) : availability === "available" ? (
                  <span className="text-accent inline-flex items-center gap-1">
                    <Check aria-hidden className="size-4" /> Disponible
                  </span>
                ) : (
                  "Letras, números, punto y guion bajo."
                )
              }
            />
          </>
        )}

        {step === 2 && (
          <>
            {gyms.length > 1 && (
              <fieldset>
                <legend className="text-soft mb-3 text-sm font-medium">Gimnasio</legend>
                <div className="flex flex-wrap gap-2">
                  {gyms.map((g) => (
                    <Pill
                      key={g.id}
                      active={g.id === gymId}
                      onClick={() => {
                        setGymId(g.id);
                        setBranchId("");
                      }}
                    >
                      {g.name}
                    </Pill>
                  ))}
                </div>
              </fieldset>
            )}

            {gym && (
              <fieldset className="space-y-3">
                <legend className="text-soft mb-3 text-sm font-medium">Sede de {gym.name}</legend>
                {gym.branches.map((b) => (
                  <RadioCard
                    key={b.id}
                    name="branch"
                    value={b.id}
                    checked={branchId === b.id}
                    onChange={setBranchId}
                    icon={<MapPin className="size-5" strokeWidth={1.75} />}
                    title={b.name}
                    description={`${gym.name} · ${b.name}`}
                  />
                ))}
                {touched && !branchId && <FormMessage error="Elegí tu sede." />}
              </fieldset>
            )}

            <fieldset>
              <legend className="text-soft mb-1 text-sm font-medium">¿Cuándo solés ir? (opcional)</legend>
              <p className="text-muted mb-3 text-sm">En el próximo paso elegís si se muestra.</p>
              <div className="flex flex-wrap gap-2">
                {SCHEDULES.map((s) => (
                  <Pill key={s} active={schedule === s} onClick={() => setSchedule(schedule === s ? null : s)}>
                    De {s}
                  </Pill>
                ))}
              </div>
            </fieldset>
          </>
        )}

        {step === 3 && (
          <>
            <PrivacyFields value={privacy} onChange={setPrivacy} />
            {touched && privacy.is_private === null && <FormMessage error="Elegí pública o privada." />}
          </>
        )}

        <FormMessage error={error} />
      </div>

      <div className="bg-bg pb-safe sticky bottom-0 -mx-5 mt-8 px-5 pt-3">
        <Button type="submit" size="lg" block disabled={pending} className="mb-4">
          {pending && <Spinner />}
          {step < 3 ? "Continuar" : "Empezar a usar Banca"}
        </Button>
      </div>
    </form>
  );
}
