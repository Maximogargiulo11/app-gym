import { AlertTriangle, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-card bg-surface flex flex-col items-center px-6 py-10 text-center", className)}>
      <span className="bg-surface-2 text-accent mb-4 inline-flex size-14 items-center justify-center rounded-full">
        <Icon aria-hidden className="size-7" strokeWidth={1.75} />
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="text-muted mt-2 max-w-xs text-[15px] leading-snug">{description}</p>}
      {action && <div className="mt-6 w-full max-w-xs">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, action }: { message?: string; action?: ReactNode }) {
  return (
    <div role="alert" className="rounded-card bg-danger-bg flex flex-col items-center px-6 py-8 text-center">
      <AlertTriangle aria-hidden className="text-danger mb-3 size-7" strokeWidth={1.75} />
      <p className="text-text font-semibold">Algo salió mal</p>
      <p className="text-soft mt-1 text-[15px]">{message ?? "Probá de nuevo en un rato."}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Spinner({ className, label = "Cargando" }: { className?: string; label?: string }) {
  return (
    <span role="status" className={cn("inline-flex items-center", className)}>
      <span aria-hidden className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("rounded-card bg-surface animate-pulse", className)} />;
}

export function FormMessage({ error, success }: { error?: string | null; success?: string | null }) {
  if (error)
    return (
      <p role="alert" className="rounded-btn bg-danger-bg text-danger px-4 py-3 text-sm">
        {error}
      </p>
    );
  if (success)
    return (
      <p role="status" className="rounded-btn border-accent-border bg-accent-bg text-accent border px-4 py-3 text-sm">
        {success}
      </p>
    );
  return null;
}
