import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { Schedule } from "@/lib/profile/validation";
import { getMyProfile } from "@/lib/supabase/server";
import { PrivacyForm } from "./privacy-form";

export const metadata: Metadata = { title: "Privacidad" };

export default async function PrivacidadPage() {
  const p = (await getMyProfile())!;

  return (
    <>
      <header className="flex items-center gap-3 pt-6 pb-6">
        <Link
          href="/perfil"
          aria-label="Volver al perfil"
          className="size-tap bg-surface inline-flex items-center justify-center rounded-full"
        >
          <ChevronLeft aria-hidden className="size-6" />
        </Link>
        <h1 className="font-display text-[30px] leading-none">Privacidad</h1>
      </header>
      <PrivacyForm
        initial={{
          is_private: p.is_private,
          show_branch: p.show_branch,
          show_schedule: p.show_schedule,
          show_in_rankings: p.show_in_rankings,
          approve_tags: p.approve_tags,
          usual_schedule: p.usual_schedule as Schedule | null,
        }}
      />
    </>
  );
}
