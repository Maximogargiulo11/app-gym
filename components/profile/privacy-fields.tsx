"use client";

import { Globe, Lock, ShieldCheck } from "lucide-react";
import { RadioCard, Toggle } from "@/components/ui";
import type { PrivacySettings } from "@/lib/profile/validation";

type Props = {
  /** null = todavía no eligió (en el onboarding no hay opción preseleccionada). */
  value: Omit<PrivacySettings, "is_private"> & { is_private: boolean | null };
  onChange: (next: Props["value"]) => void;
};

export function PrivacyFields({ value, onChange }: Props) {
  const set = <K extends keyof Props["value"]>(key: K, v: Props["value"][K]) => onChange({ ...value, [key]: v });

  return (
    <div className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="sr-only">Tipo de cuenta</legend>
        <RadioCard
          name="account_type"
          value="public"
          checked={value.is_private === false}
          onChange={() => set("is_private", false)}
          icon={<Globe className="size-5" strokeWidth={1.75} />}
          title="Pública"
          description="Cualquier persona con cuenta ve tus entrenamientos, fotos y récords, y te puede seguir directo."
        />
        <RadioCard
          name="account_type"
          value="private"
          checked={value.is_private === true}
          onChange={() => set("is_private", true)}
          icon={<Lock className="size-5" strokeWidth={1.75} />}
          title="Privada"
          description="Los demás solo ven tu nombre, foto, sede y contadores. Para ver el resto te tienen que mandar solicitud."
        />
      </fieldset>

      <section aria-labelledby="privacy-options" className="rounded-card bg-surface px-4 py-2">
        <h2 id="privacy-options" className="text-muted pt-2 pb-1 text-sm font-semibold">
          Qué mostrar
        </h2>
        <div className="divide-border divide-y">
          <Toggle
            label="Mostrar mi sede"
            description="Aparece en tu perfil."
            checked={value.show_branch}
            onChange={(v) => set("show_branch", v)}
          />
          <Toggle
            label="Mostrar mi horario habitual"
            description="Por ejemplo, “suele ir de tarde”. Solo lo ven quienes pueden ver tu contenido."
            checked={value.show_schedule}
            onChange={(v) => set("show_schedule", v)}
          />
          <Toggle
            label="Aparecer en rankings"
            description="Tus mejores marcas del mes en el ranking de tu sede."
            checked={value.show_in_rankings}
            onChange={(v) => set("show_in_rankings", v)}
          />
          <Toggle
            label="Aprobar etiquetas"
            description="Si alguien te etiqueta en un entrenamiento, aparece recién cuando lo aceptás."
            checked={value.approve_tags}
            onChange={(v) => set("approve_tags", v)}
          />
        </div>
      </section>

      <p className="rounded-card bg-surface text-soft flex gap-3 p-4 text-sm leading-snug">
        <ShieldCheck aria-hidden className="text-accent mt-0.5 size-5 shrink-0" strokeWidth={1.75} />
        Banca nunca muestra si estás en el gimnasio ahora. El check-in solo suma a tu racha y a los desafíos de tu sede.
      </p>
    </div>
  );
}
