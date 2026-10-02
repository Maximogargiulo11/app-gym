import { Dumbbell } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Entrenar" };

export default function EntrenarPage() {
  return (
    <>
      <h1 className="font-display pt-8 pb-6 text-[34px] leading-none">Entrenar</h1>
      <EmptyState
        icon={Dumbbell}
        title="Tu registro de entrenamientos"
        description="Pronto vas a poder anotar series, kg y repeticiones, con temporizador de descanso y récords."
      />
    </>
  );
}
