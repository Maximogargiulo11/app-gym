import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient, getMyProfile, getUser } from "@/lib/supabase/server";
import { OnboardingFlow } from "./onboarding-flow";

export const metadata: Metadata = { title: "Armá tu perfil" };

export default async function OnboardingPage() {
  const profile = await getMyProfile();
  if (!profile) redirect((await getUser()) ? "/login?error=perfil" : "/login?next=/onboarding");
  if (profile.onboarded_at) redirect("/feed");

  const supabase = await createClient();
  const { data: gyms, error } = await supabase
    .from("gyms")
    .select("id, name, branches(id, name)")
    .order("name")
    .order("name", { referencedTable: "branches" });

  return (
    <main className="pt-safe mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-8">
      <OnboardingFlow gyms={gyms ?? []} loadError={Boolean(error)} initialName={profile.full_name ?? ""} />
    </main>
  );
}
