import "server-only";
import { headers } from "next/headers";
import QRCode from "qrcode";

/** URL base para el QR: NEXT_PUBLIC_SITE_URL o, si falta, el host del request. */
export async function siteUrl() {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (env) return env;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function checkinUrl(base: string, slug: string, token: string) {
  return `${base}/checkin?b=${encodeURIComponent(slug)}&t=${encodeURIComponent(token)}`;
}

/** QR en SVG (negro sobre blanco, para que cualquier cámara lo lea impreso o en pantalla). */
export function qrSvg(text: string) {
  return QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    color: { dark: "#0F1110", light: "#FFFFFF" },
  });
}
