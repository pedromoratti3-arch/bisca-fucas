/**
 * Fontes do jogo (hospedadas pelo próprio Next.js, sem pedir nada ao Google no navegador).
 * - Outfit: títulos, botões, números grandes (geométrica, "cara de jogo").
 * - Inter: textos corridos e interface (legível em tamanhos pequenos).
 * Expostas como variáveis CSS --font-display e --font-body (ver tokens.css).
 */
import { Inter, Outfit } from "next/font/google";

export const fontDisplay = Outfit({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-display",
  display: "swap",
});

export const fontBody = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

/** Classe para colocar no <html>: ativa as duas variáveis. */
export const fontClassName = `${fontDisplay.variable} ${fontBody.variable}`;
