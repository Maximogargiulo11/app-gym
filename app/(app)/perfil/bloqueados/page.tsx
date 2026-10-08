import { Ban } from "lucide-react";
import type { Metadata } from "next";
import { BackHeader } from "@/components/layout/back-header";
import { Avatar, EmptyState } from "@/components/ui";
import { createClient, getMyProfile } from "@/lib/supabase/server";
import { UnblockButton } from "./unblock-button";

export const metadata: Metadata = { title: "Bloqueados" };

export default async function BloqueadosPage() {
  const profile = (await getMyProfile())!;
  const supabase = await createClient();
  const { data: blocked } = await supabase.rpc("my_blocked_users");

  return (
    <>
      <BackHeader href="/perfil" label="Volver al perfil" title="Bloqueados" />
      {!blocked || blocked.length === 0 ? (
        <EmptyState
          icon={Ban}
          title="No bloqueaste a nadie"
          description="Si bloqueás a alguien, va a aparecer acá para que puedas desbloquearlo."
        />
      ) : (
        <ul className="space-y-3">
          {blocked.map((b) => {
            const name = b.full_name ?? b.username ?? "Usuario";
            return (
              <li key={b.id} className="rounded-card bg-surface flex items-center gap-3 p-4">
                <Avatar name={name} seed={b.id} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{name}</span>
                  {b.username && <span className="text-muted block text-sm">@{b.username}</span>}
                </span>
                <UnblockButton viewerId={profile.id} blockedId={b.id} name={name} />
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-muted mt-6 text-sm">
        Al desbloquear, no se recuperan los seguimientos que había entre ustedes.
      </p>
    </>
  );
}
