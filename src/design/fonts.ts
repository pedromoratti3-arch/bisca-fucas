/**
 * Fontes do jogo (hospedadas pelo próprio Next.js, sem pedir nada ao Google no navegador).
 * Todas com licença livre (SIL Open Font License) no Google Fonts.
 * - Outfit: títulos, botões, números grandes (geométrica, "cara de jogo").
 * - Inter: textos corridos e interface.
 * - Cinzel: índice das cartas do baralho clássico (serifa de baralho impresso).
 * - Bebas Neue: baralho Neon (condensada, estilo luminoso).
 * - Alfa Slab One: baralho Retrô (serifa pesada, estilo cartaz antigo).
 * Expostas como variáveis CSS (ver tokens.css e decks.ts).
 */
import { Alfa_Slab_One, Bebas_Neue, Cinzel, Inter, Outfit } from "next/font/google";

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

export const fontCardCinzel = Cinzel({
  subsets: ["latin"],
  weight: ["700", "900"],
  variable: "--font-card-cinzel",
  display: "swap",
});

export const fontCardBebas = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-card-bebas",
  display: "swap",
});

export const fontCardSlab = Alfa_Slab_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-card-slab",
  display: "swap",
});

/** Classe para colocar no <html>: ativa todas as variáveis. */
export const fontClassName = [fontDisplay.variable, fontBody.variable, fontCardCinzel.variable, fontCardBebas.variable, fontCardSlab.variable].join(" ");
