import { Trophy } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/ui";
import { createClient, getMyProfile } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mi sede" };

export default async function SedePage() {
  const profile = (await getMyProfile())!;
  const branch = profile.branch;
  const supabase = await createClient();
  const { data: members } = branch ? await supabase.rpc("branch_member_count", { bid: branch.id }) : { data: null };

  return (
    <>
      <header className="pt-8 pb-6">
        <h1 className="font-display text-[40px] leading-none">{branch?.name ?? "Mi sede"}</h1>
        {branch && (
          <p className="text-muted mt-2 text-[16px]">
            {branch.gym?.name}
            {typeof members === "number" && ` · ${members.toLocaleString("es-AR")} socios en Banca`}
          </p>
        )}
      </header>
      <EmptyState
        icon={Trophy}
        title="Rankings y desafíos"
        description="Pronto vas a ver los récords del mes de tu sede y los desafíos contra otras sedes."
      />
    </>
  );
}
