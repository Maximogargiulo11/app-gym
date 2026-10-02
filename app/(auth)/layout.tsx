import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="pt-safe mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-10">
      <div className="pt-12 pb-8">
        <Logo className="text-[44px]" />
        <p className="text-muted mt-2 text-[17px]">Entrená, registrá y sumate a la comunidad de tu gimnasio.</p>
      </div>
      {children}
    </main>
  );
}
