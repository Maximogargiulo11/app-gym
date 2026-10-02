"use client";

import { Button, ErrorState } from "@/components/ui";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="pt-10">
      <ErrorState
        message="No pudimos cargar esta pantalla."
        action={
          <Button variant="secondary" onClick={reset}>
            Reintentar
          </Button>
        }
      />
    </div>
  );
}
