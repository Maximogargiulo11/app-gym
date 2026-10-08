"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { rotateQr } from "@/app/(app)/admin/sedes/actions";
import { Button } from "@/components/ui";

function Confirm({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button variant="secondary" onClick={onCancel} disabled={pending}>
        Cancelar
      </Button>
      <Button type="submit" variant="danger" disabled={pending}>
        {pending ? "Rotando…" : "Sí, rotar"}
      </Button>
    </div>
  );
}

/** Rotar invalida los QR impresos de la sede: pide confirmación antes. */
export function RotateQrButton({ branchId, branchName }: { branchId: string; branchName: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button variant="outline" block onClick={() => setConfirming(true)}>
        <RefreshCw aria-hidden className="size-4" />
        Rotar QR
      </Button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await rotateQr(formData);
        setConfirming(false);
      }}
      className="space-y-2"
    >
      <input type="hidden" name="branch_id" value={branchId} />
      <p role="alert" className="text-soft text-sm">
        El QR impreso de {branchName} va a dejar de funcionar. Vas a tener que imprimir el nuevo.
      </p>
      <Confirm onCancel={() => setConfirming(false)} />
    </form>
  );
}
