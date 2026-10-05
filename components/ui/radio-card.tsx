import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  title: string;
  description: string;
  icon?: ReactNode;
};

/** Tarjeta seleccionable que es un <input type="radio"> real. */
export function RadioCard({ name, value, checked, onChange, title, description, icon }: Props) {
  return (
    <label
      className={cn(
        "rounded-card has-[:focus-visible]:outline-accent flex cursor-pointer items-start gap-4 border p-4 transition-colors has-[:focus-visible]:outline-2",
        checked ? "border-accent-border bg-accent-bg" : "border-border-strong bg-surface hover:bg-surface-2",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      {icon && (
        <span
          aria-hidden
          className={cn(
            "rounded-btn mt-0.5 inline-flex size-11 shrink-0 items-center justify-center",
            checked ? "bg-accent text-on-accent" : "bg-surface-2 text-soft",
          )}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="text-text block text-[17px] font-semibold">{title}</span>
        <span className="text-muted mt-1 block text-sm leading-snug">{description}</span>
      </span>
      <span
        aria-hidden
        className={cn(
          "mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full border-2",
          checked ? "border-accent" : "border-border-strong",
        )}
      >
        {checked && <span className="bg-accent size-3 rounded-full" />}
      </span>
    </label>
  );
}
