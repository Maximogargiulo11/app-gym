import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "md" | "lg";

const base =
  "inline-flex min-h-tap items-center justify-center gap-2 rounded-btn px-4 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-[#d4ff52] active:bg-[#b5e02f]",
  secondary: "bg-surface-2 text-text hover:bg-[#2c312e]",
  ghost: "text-accent hover:bg-accent-bg",
  outline: "border border-border-strong text-text hover:bg-surface-2",
  danger: "bg-danger-bg text-danger hover:bg-[#3a1d1a]",
};

const sizes: Record<Size, string> = {
  md: "h-11 text-[15px]",
  lg: "h-14 text-[17px]",
};

type StyleProps = { variant?: Variant; size?: Size; block?: boolean };

export function buttonClasses({ variant = "primary", size = "md", block }: StyleProps = {}) {
  return cn(base, variants[variant], sizes[size], block && "w-full");
}

export function Button({
  variant,
  size,
  block,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & StyleProps) {
  return <button type={type} className={cn(buttonClasses({ variant, size, block }), className)} {...props} />;
}

export function ButtonLink({ variant, size, block, className, ...props }: ComponentProps<typeof Link> & StyleProps) {
  return <Link className={cn(buttonClasses({ variant, size, block }), className)} {...props} />;
}
