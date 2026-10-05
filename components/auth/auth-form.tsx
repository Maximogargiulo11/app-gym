"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "@/app/(auth)/actions";
import { Button, FormMessage, Spinner, TextField } from "@/components/ui";

type Props = { mode: "login" | "registro"; next?: string; initialError?: string };

export function AuthForm({ mode, next, initialError }: Props) {
  const isLogin = mode === "login";
  const [state, action, pending] = useActionState<AuthState, FormData>(
    isLogin ? signIn : signUp,
    initialError ? { error: initialError } : undefined,
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);

  if (state?.success) {
    return (
      <div className="space-y-4">
        <FormMessage success={state.success} />
        <p className="text-muted text-sm">
          ¿No te llegó? Revisá spam o{" "}
          <Link href="/registro" className="text-accent font-semibold underline-offset-4 hover:underline">
            probá de nuevo
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    // Campos controlados: React resetea los formularios con action={...} después de enviar,
    // y así la persona no pierde lo que escribió si hay un error.
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next ?? "/feed"} />
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="vos@email.com"
      />
      <TextField
        label="Contraseña"
        name="password"
        type="password"
        autoComplete={isLogin ? "current-password" : "new-password"}
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        hint={isLogin ? undefined : "Mínimo 8 caracteres."}
      />
      {!isLogin && (
        <label className="min-h-tap text-soft flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="terms"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            className="mt-0.5 size-5 shrink-0 accent-[#C8F53C]"
          />
          <span>
            Acepto los{" "}
            <Link href="/terminos" className="text-accent font-semibold underline-offset-4 hover:underline">
              términos
            </Link>{" "}
            y la{" "}
            <Link href="/privacidad" className="text-accent font-semibold underline-offset-4 hover:underline">
              política de privacidad
            </Link>
            .
          </span>
        </label>
      )}
      <FormMessage error={state?.error} />
      <Button type="submit" size="lg" block disabled={pending}>
        {pending && <Spinner />}
        {isLogin ? "Iniciar sesión" : "Crear cuenta"}
      </Button>
    </form>
  );
}
