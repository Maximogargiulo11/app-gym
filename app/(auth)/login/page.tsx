import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { GoogleButton } from "@/components/auth/google-button";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Iniciar sesión" };

const ERRORS: Record<string, string> = {
  google: "No pudimos conectar con Google. Probá de nuevo.",
  callback: "El link venció o ya se usó. Iniciá sesión de nuevo.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;

  return (
    <>
      <h1 className="font-display mb-6 text-[30px] leading-tight">Iniciá sesión</h1>
      <GoogleButton next={next} />
      <Divider />
      <AuthForm mode="login" next={next} initialError={error} />
      <p className="text-muted mt-8 text-center text-[15px]">
        ¿No tenés cuenta?{" "}
        <Link href="/registro" className="text-accent font-semibold underline-offset-4 hover:underline">
          Registrate
        </Link>
      </p>
    </>
  );
}

function Divider() {
  return (
    <div className="text-muted my-6 flex items-center gap-3 text-sm" aria-hidden>
      <span className="bg-border-strong h-px flex-1" />o con tu email
      <span className="bg-border-strong h-px flex-1" />
    </div>
  );
}
