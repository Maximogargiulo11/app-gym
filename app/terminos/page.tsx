import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = { title: "Términos y condiciones" };

export default function Page() {
  return (
    <main className="pt-safe mx-auto w-full max-w-md px-5 py-10">
      <h1 className="font-display text-[30px] leading-tight">Términos y condiciones</h1>
      <p className="text-soft mt-4 text-[16px] leading-relaxed">
        Estamos preparando este documento. Va a estar disponible antes del lanzamiento del piloto.
      </p>
      <ButtonLink href="/" variant="secondary" className="mt-8">
        Volver
      </ButtonLink>
    </main>
  );
}
