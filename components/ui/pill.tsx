import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

const pillClasses = (active?: boolean) =>
  cn(
    "inline-flex h-11 shrink-0 items-center justify-center rounded-pill border px-5 text-[15px] font-semibold transition-colors",
    active ? "border-accent bg-accent text-on-accent" : "border-border-strong text-text hover:bg-surface-2",
  );

/** Pill como botón de filtro (usa aria-pressed). */
export function Pill({ active, className, ...props }: ComponentProps<"button"> & { active?: boolean }) {
  return <button type="button" aria-pressed={active} className={cn(pillClasses(active), className)} {...props} />;
}

/** Pill como link de navegación (usa aria-current). */
export function PillLink({ active, className, ...props }: ComponentProps<typeof Link> & { active?: boolean }) {
  return <Link aria-current={active ? "page" : undefined} className={cn(pillClasses(active), className)} {...props} />;
}
