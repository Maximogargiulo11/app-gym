import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export function BackHeader({ href, label, title }: { href: string; label: string; title: string }) {
  return (
    <header className="flex items-center gap-3 pt-6 pb-6">
      <Link
        href={href}
        aria-label={label}
        className="size-tap bg-surface inline-flex items-center justify-center rounded-full"
      >
        <ChevronLeft aria-hidden className="size-6" />
      </Link>
      <h1 className="font-display text-[28px] leading-none">{title}</h1>
    </header>
  );
}
