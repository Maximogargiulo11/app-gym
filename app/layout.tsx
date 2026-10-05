import type { Metadata, Viewport } from "next";
import { dmSans, googleSans } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Banca", template: "%s · Banca" },
  description: "Registrá tus entrenamientos y conocé a la comunidad de tu gimnasio.",
  applicationName: "Banca",
};

export const viewport: Viewport = {
  themeColor: "#0F1110",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${googleSans.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="bg-bg text-text min-h-full font-sans">{children}</body>
    </html>
  );
}
