import { Instrument_Serif, Inter_Tight } from "next/font/google";

// Fontes do website público: serifada editorial para títulos e uma sans
// compacta para o texto. Self-hosted pelo next/font (sem pedidos ao Google).
export const siteSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-site-serif",
  display: "swap",
});

export const siteSans = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-site-sans",
  display: "swap",
});
