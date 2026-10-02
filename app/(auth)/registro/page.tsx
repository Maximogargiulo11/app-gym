import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { GoogleButton } from "@/components/auth/google-button";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegistroPage() {
  return (
    <>
      <h1 className="font-display mb-6 text-[30px] leading-tight">Creá tu cuenta</h1>
      <GoogleButton next="/onboarding" />
      <div className="text-muted my-6 flex items-center gap-3 text-sm" aria-hidden>
        <span className="bg-border-strong h-px flex-1" />o con tu email
        <span className="bg-border-strong h-px flex-1" />
      </div>
      <AuthForm mode="registro" next="/onboarding" />
      <p className="text-muted mt-8 text-center text-[15px]">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="text-accent font-semibold underline-offset-4 hover:underline">
          Iniciá sesión
        </Link>
      </p>
    </>
  );
}
