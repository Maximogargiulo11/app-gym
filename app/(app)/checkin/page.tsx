import { QrCode } from "lucide-react";
import type { Metadata } from "next";
import { ButtonLink, EmptyState } from "@/components/ui";

export const metadata: Metadata = { title: "Check-in" };

export default function CheckinPage() {
  return (
    <>
      <h1 className="font-display pt-8 pb-6 text-[34px] leading-none">Check-in</h1>
      <EmptyState
        icon={QrCode}
        title="Check-in con QR"
        description="Pronto vas a poder escanear el QR de recepción para sumar a tu racha y a los desafíos de tu sede."
        action={
          <ButtonLink href="/feed" variant="secondary" block>
            Volver al feed
          </ButtonLink>
        }
      />
    </>
  );
}
