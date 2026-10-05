import { MapPin, QrCode, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, Logo, PillLink } from "@/components/ui";
import { createClient, getMyProfile } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Feed" };

const TABS = ["siguiendo", "sede", "gimnasio"] as const;
type Tab = (typeof TABS)[number];

export default async function FeedPage({ searchParams }: PageProps<"/feed">) {
  const { tab: rawTab } = await searchParams;
  const tab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "sede";

  const profile = (await getMyProfile())!;
  const branch = profile.branch;
  const supabase = await createClient();
  const { data: todayCount } = branch
    ? await supabase.rpc("branch_checkins_today", { bid: branch.id })
    : { data: null };

  return (
    <>
      <header className="flex items-start justify-between pt-8 pb-5">
        <div>
          <Logo className="text-[40px]" />
          {branch && (
            <p className="text-muted mt-2 flex items-center gap-1.5 text-[16px]">
              <MapPin aria-hidden className="size-4" strokeWidth={1.75} />
              {branch.gym?.name} · {branch.name}
            </p>
          )}
        </div>
      </header>

      <nav aria-label="Filtrar feed" className="-mx-5 mb-5 flex gap-2 overflow-x-auto px-5 pb-1">
        <PillLink href="/feed?tab=siguiendo" active={tab === "siguiendo"}>
          Siguiendo
        </PillLink>
        <PillLink href="/feed?tab=sede" active={tab === "sede"}>
          {branch?.name ?? "Mi sede"}
        </PillLink>
        <PillLink href="/feed?tab=gimnasio" active={tab === "gimnasio"}>
          Todo {branch?.gym?.name ?? "el gimnasio"}
        </PillLink>
      </nav>

      <Link
        href="/checkin"
        className="rounded-card border-accent-border bg-accent-bg mb-5 flex items-center gap-4 border p-4 transition-colors hover:bg-[#223014]"
      >
        <span className="rounded-btn bg-accent text-on-accent inline-flex size-[52px] shrink-0 items-center justify-center">
          <QrCode aria-hidden className="size-7" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-semibold">Hacer check-in</span>
          <span className="text-soft block text-[15px]">
            {typeof todayCount === "number"
              ? `Hoy entrenaron ${todayCount.toLocaleString("es-AR")} ${todayCount === 1 ? "persona" : "personas"} en tu sede`
              : "Sumá el día a tu racha"}
          </span>
        </span>
        <span className="text-accent font-semibold">Abrir</span>
      </Link>

      <EmptyState
        icon={Users}
        title="Muy pronto, tu comunidad"
        description="Acá vas a ver los entrenamientos y las publicaciones de “busco compañero” de tu sede."
      />
    </>
  );
}
