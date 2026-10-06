import { redirect } from "next/navigation";
import { BottomNav } from "@/components/ui";
import { getMyProfile, getUser } from "@/lib/supabase/server";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const profile = await getMyProfile();
  if (!profile) redirect((await getUser()) ? "/login?error=perfil" : "/login");
  if (!profile.onboarded_at) redirect("/onboarding");

  return (
    <>
      <main className="pt-safe mx-auto w-full max-w-md px-5 pb-[calc(96px+env(safe-area-inset-bottom))]">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
