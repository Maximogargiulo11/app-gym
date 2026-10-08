"use client";

import { useActionState, useState } from "react";
import { claimAdmin, type FormState } from "@/app/(app)/admin/sedes/actions";
import { Button, FormMessage, TextField } from "@/components/ui";

export function ClaimForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(claimAdmin, null);
  const [code, setCode] = useState("");

  return (
    <form action={action} className="space-y-4">
      <TextField
        label="Código de administrador"
        name="code"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        required
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <FormMessage error={state?.error} />
      <Button type="submit" block disabled={pending || !code.trim()}>
        {pending ? "Validando…" : "Activar"}
      </Button>
    </form>
  );
}
