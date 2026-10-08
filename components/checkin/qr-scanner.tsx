"use client";

import type { IScannerControls } from "@zxing/browser";
import { Camera, CameraOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, Spinner } from "@/components/ui";
import { cn } from "@/lib/cn";

type Status = "idle" | "starting" | "scanning" | "error";

/** Saca sede y token de un QR de Banca (https://…/checkin?b=<slug>&t=<token>). */
export function parseCheckinQr(text: string): { b: string; t: string } | null {
  try {
    const url = new URL(text);
    if (!url.pathname.replace(/\/$/, "").endsWith("/checkin")) return null;
    const b = url.searchParams.get("b");
    const t = url.searchParams.get("t");
    return b && t ? { b, t } : null;
  } catch {
    return null;
  }
}

function cameraError(e: unknown) {
  const name = e instanceof DOMException ? e.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "No tenemos permiso para usar la cámara. Habilitalo en los ajustes del navegador y probá de nuevo.";
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return "No encontramos una cámara en este dispositivo.";
  if (name === "NotReadableError") return "La cámara está en uso por otra app. Cerrala y probá de nuevo.";
  return "No pudimos abrir la cámara. Probá de nuevo.";
}

const corner = "absolute size-10 border-accent";

/** Visor con esquinas verdes. La cámara se abre al tocar el botón, no al entrar a la pantalla. */
export function QrScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => () => controlsRef.current?.stop(), []);

  async function start() {
    if (!videoRef.current) return;
    setStatus("starting");
    setMessage(null);
    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 150 });
      controlsRef.current = await reader.decodeFromConstraints(
        { video: { facingMode: { ideal: "environment" } }, audio: false },
        videoRef.current,
        (result, _err, controls) => {
          if (!result) return;
          const qr = parseCheckinQr(result.getText());
          if (!qr) {
            setMessage("Ese QR no es de Banca. Buscá el QR de check-in en recepción.");
            return;
          }
          controls.stop();
          controlsRef.current = null;
          router.push(`/checkin?b=${encodeURIComponent(qr.b)}&t=${encodeURIComponent(qr.t)}`);
        },
      );
      setStatus("scanning");
    } catch (e) {
      setStatus("error");
      setMessage(cameraError(e));
    }
  }

  function stop() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setStatus("idle");
    setMessage(null);
  }

  const live = status === "scanning" || status === "starting";

  return (
    <div>
      <div className="rounded-card bg-surface relative mx-auto aspect-square w-full max-w-[320px] overflow-hidden">
        <video
          ref={videoRef}
          muted
          playsInline
          aria-label="Vista de la cámara"
          className={cn("size-full object-cover", !live && "invisible")}
        />
        {!live && (
          <div className="text-muted absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
            {status === "error" ? (
              <CameraOff aria-hidden className="size-10" strokeWidth={1.5} />
            ) : (
              <Camera aria-hidden className="size-10" strokeWidth={1.5} />
            )}
            <p className="text-[15px]">Apuntá al QR de recepción</p>
          </div>
        )}
        {status === "starting" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner label="Abriendo la cámara" className="text-accent" />
          </div>
        )}
        <div aria-hidden className="pointer-events-none absolute inset-8">
          <span className={cn(corner, "top-0 left-0 rounded-tl-[14px] border-t-4 border-l-4")} />
          <span className={cn(corner, "top-0 right-0 rounded-tr-[14px] border-t-4 border-r-4")} />
          <span className={cn(corner, "bottom-0 left-0 rounded-bl-[14px] border-b-4 border-l-4")} />
          <span className={cn(corner, "right-0 bottom-0 rounded-br-[14px] border-r-4 border-b-4")} />
        </div>
      </div>

      <p
        role="status"
        className={cn("mt-3 min-h-6 text-center text-[15px]", status === "error" ? "text-danger" : "text-soft")}
      >
        {message}
      </p>

      <div className="mt-3">
        {live ? (
          <Button variant="secondary" block onClick={stop}>
            Cerrar cámara
          </Button>
        ) : (
          <Button size="lg" block onClick={start}>
            <Camera aria-hidden className="size-5" />
            {status === "error" ? "Probar de nuevo" : "Escanear QR"}
          </Button>
        )}
      </div>
    </div>
  );
}
