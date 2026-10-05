import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Tone = "default" | "accent" | "dashed" | "pr";

const tones: Record<Tone, string> = {
  default: "bg-surface",
  accent: "border border-accent-border bg-accent-bg",
  dashed: "border border-dashed border-border-strong bg-bg",
  pr: "bg-pr-bg text-pr",
};

export function Card({ tone = "default", className, ...props }: ComponentProps<"div"> & { tone?: Tone }) {
  return <div className={cn("rounded-card p-4", tones[tone], className)} {...props} />;
}

export function SectionLabel({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-accent text-xs font-semibold tracking-[0.12em] uppercase", className)} {...props} />;
}
