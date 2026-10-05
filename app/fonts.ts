import localFont from "next/font/local";

// Google Sans Bold (OFL): títulos, números grandes y el logo.
export const googleSans = localFont({
  src: "./fonts/GoogleSans-Bold.woff2",
  weight: "700",
  style: "normal",
  variable: "--font-google-sans",
  display: "swap",
});

// DM Sans variable (OFL, 400–800): todo el resto del texto.
export const dmSans = localFont({
  src: "./fonts/DMSans-Variable.woff2",
  weight: "100 1000",
  style: "normal",
  variable: "--font-dm-sans",
  display: "swap",
});
