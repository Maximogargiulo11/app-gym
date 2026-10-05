"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

type Props = {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Si se pasa, el valor viaja en formularios nativos. */
  name?: string;
};

export function Toggle({ label, description, checked, onChange, disabled, name }: Props) {
  const id = useId();
  return (
    <div className="min-h-tap flex items-center justify-between gap-4 py-2">
      <div className="min-w-0">
        <label htmlFor={id} className="text-text block text-[15px] font-medium">
          {label}
        </label>
        {description && (
          <p id={`${id}-desc`} className="text-muted mt-0.5 text-sm">
            {description}
          </p>
        )}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${id}-desc` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-8 w-[52px] shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
          checked ? "bg-accent" : "bg-surface-2 ring-border-strong ring-1",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "inline-block size-6 rounded-full transition-transform",
            checked ? "bg-on-accent translate-x-[24px]" : "bg-muted translate-x-1",
          )}
        />
      </button>
      {name && <input type="hidden" name={name} value={checked ? "on" : "off"} />}
    </div>
  );
}
