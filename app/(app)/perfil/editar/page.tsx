import type { Metadata } from "next";
import { BackHeader } from "@/components/layout/back-header";
import { getMyProfile } from "@/lib/supabase/server";
import { EditProfileForm } from "./edit-profile-form";

export const metadata: Metadata = { title: "Editar perfil" };

export default async function EditarPerfilPage() {
  const p = (await getMyProfile())!;
  return (
    <>
      <BackHeader href="/perfil" label="Volver al perfil" title="Editar perfil" />
      <EditProfileForm
        userId={p.id}
        fullName={p.full_name ?? ""}
        username={p.username ?? ""}
        avatarUrl={p.avatar_url}
      />
      <p className="text-muted mt-6 text-center text-sm">
        Tu horario y tu privacidad se cambian desde Perfil → Privacidad.
      </p>
    </>
  );
}
