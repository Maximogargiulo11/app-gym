/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/cn";

// Colores de los avatares del mockup (texto blanco encima).
const COLORS = ["#5B3FD9", "#B8430F", "#0F766E", "#1D4ED8", "#9D174D", "#4D7C0F", "#7C2D12", "#155E75"];

function hash(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.replace(/\./g, "").trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

const sizes = { sm: "size-10 text-sm", md: "size-14 text-lg", lg: "size-20 text-2xl" } as const;

type Props = {
  name?: string | null;
  /** Semilla estable para el color (id del usuario). */
  seed?: string | null;
  src?: string | null;
  size?: keyof typeof sizes;
  /** El avatar propio va en lima, como en el ranking del mockup. */
  highlight?: boolean;
  className?: string;
};

export function Avatar({ name, seed, src, size = "sm", highlight, className }: Props) {
  const classes = cn(
    "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold",
    sizes[size],
    className,
  );
  if (src) return <img src={src} alt="" className={cn(classes, "object-cover")} />;
  return (
    <span
      aria-hidden
      className={cn(classes, highlight ? "bg-accent text-on-accent" : "text-white")}
      style={highlight ? undefined : { backgroundColor: COLORS[hash(seed ?? name ?? "") % COLORS.length] }}
    >
      {initials(name)}
    </span>
  );
}
