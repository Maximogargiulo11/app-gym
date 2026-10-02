import { cn } from "@/lib/cn";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("font-display text-accent text-[34px] leading-none tracking-tight", className)}>BANCA</span>
  );
}
