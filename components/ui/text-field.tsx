import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = ComponentProps<"input"> & {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  /** Texto fijo a la izquierda del input, por ejemplo "@". */
  prefix?: string;
};

export function TextField({ label, hint, error, prefix, className, id, ...props }: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className={className}>
      <label htmlFor={inputId} className="text-soft mb-2 block text-sm font-medium">
        {label}
      </label>
      <div
        className={cn(
          "rounded-btn bg-bg focus-within:border-accent flex h-12 items-center border px-4",
          error ? "border-danger" : "border-border-strong",
        )}
      >
        {prefix && <span className="text-muted mr-0.5">{prefix}</span>}
        <input
          id={inputId}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          className="text-text placeholder:text-muted/70 h-full w-full min-w-0 bg-transparent text-[16px] outline-none"
          {...props}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} role="alert" className="text-danger mt-1.5 text-sm">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-muted mt-1.5 text-sm">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
