"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui";

export function PrintButton() {
  return (
    <Button size="lg" block onClick={() => window.print()} className="print:hidden">
      <Printer aria-hidden className="size-5" />
      Imprimir
    </Button>
  );
}
