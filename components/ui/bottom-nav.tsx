"use client";

import { Dumbbell, House, Trophy, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const ITEMS = [
  { href: "/feed", label: "Feed", icon: House },
  { href: "/entrenar", label: "Entrenar", icon: Dumbbell },
  { href: "/sede", label: "Mi sede", icon: Trophy },
  { href: "/perfil", label: "Perfil", icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Principal"
      className="pb-safe border-border bg-bg/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur print:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-[68px] flex-col items-center justify-center gap-1 text-[13px] font-semibold",
                  active ? "text-accent" : "text-muted hover:text-soft",
                )}
              >
                <Icon aria-hidden className="size-6" strokeWidth={1.75} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
