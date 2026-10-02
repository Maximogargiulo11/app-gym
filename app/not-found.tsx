import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5">
      <p className="font-display text-accent text-[64px] leading-none">404</p>
      <h1 className="mt-4 text-xl font-semibold">No encontramos esta página</h1>
      <p className="text-muted mt-2">Puede que el link esté mal o que el contenido ya no exista.</p>
      <ButtonLink href="/" className="mt-8" block>
        Ir al inicio
      </ButtonLink>
    </main>
  );
}
