/**
 * Naipes em SVG (desenho próprio, um único conjunto usado em todo o jogo: cartas, fundo, carregamento, interface).
 * Os quatro têm o mesmo peso visual e ocupam a mesma caixa 24×24, centrados.
 * Copas e ouros vermelhos; espadas e paus escuros — ou dourados quando `tone="gold"`.
 */
import { useId, type CSSProperties } from "react";
import type { Suit } from "./PlayingCard";

export const SUIT_ORDER: Suit[] = ["espadas", "copas", "paus", "ouros"];
export const SUIT_IS_RED: Record<Suit, boolean> = { ouros: true, copas: true, espadas: false, paus: false };

/** Caminhos (viewBox 0 0 24 24). */
export const SUIT_PATH: Record<Suit, string> = {
  // Coração: dois lobos iguais, ponta centrada.
  copas: "M12 21.6C7.4 17.6 2.4 13.7 2.4 8.7 2.4 5.6 4.8 3.2 7.8 3.2c1.8 0 3.3.9 4.2 2.3.9-1.4 2.4-2.3 4.2-2.3 3 0 5.4 2.4 5.4 5.5 0 5-5 8.9-9.6 12.9z",
  // Ouros: losango com lados levemente convexos.
  ouros: "M12 2.3c1.8 3.4 4.2 6.6 7.4 9.7-3.2 3.1-5.6 6.3-7.4 9.7-1.8-3.4-4.2-6.6-7.4-9.7 3.2-3.1 5.6-6.3 7.4-9.7z",
  // Espadas: coração invertido com cabo.
  espadas: "M12 2.4c4.6 4 9.6 7.9 9.6 12.9 0 3.1-2.4 5.5-5.4 5.5-1.3 0-2.4-.5-3.3-1.3.2 1.7 1 3 2.3 3.9H8.8c1.3-.9 2.1-2.2 2.3-3.9-.9.8-2 1.3-3.3 1.3-3 0-5.4-2.4-5.4-5.5C2.4 10.3 7.4 6.4 12 2.4z",
  // Paus: três folhas iguais (círculos) unidas no centro + cabo simétrico.
  paus: "M12 2.6a4.3 4.3 0 0 1 4.1 5.6 4.3 4.3 0 1 1-2.6 7.6c.2 2.9 1.1 5.4 2.7 7.7H7.8c1.6-2.3 2.5-4.8 2.7-7.7a4.3 4.3 0 1 1-2.6-7.6A4.3 4.3 0 0 1 12 2.6z",
};

export function SuitPath(props: { suit: Suit }) {
  return <path d={SUIT_PATH[props.suit]} />;
}

export type SuitTone = "auto" | "red" | "dark" | "gold" | "white" | "current";

export function suitColor(suit: Suit, tone: SuitTone = "auto"): string {
  if (tone === "current") return "currentColor";
  if (tone === "red") return "var(--bf-suit-red, #d8232f)";
  if (tone === "dark") return "var(--bf-suit-dark, #15161c)";
  if (tone === "gold") return "var(--bf-gold-2)";
  if (tone === "white") return "#f4f1ea";
  return SUIT_IS_RED[suit] ? "var(--bf-suit-red, #d8232f)" : "var(--bf-suit-dark, #15161c)";
}

export function SuitGlyph(props: { suit: Suit; size?: number | string; tone?: SuitTone; style?: CSSProperties; className?: string; gradient?: boolean }) {
  const s = props.size ?? 24;
  const color = suitColor(props.suit, props.tone);
  const uid = useId();
  const gid = props.gradient ? `bfsg${uid.replace(/[^a-zA-Z0-9]/g, "")}` : undefined;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden className={props.className} style={{ display: "block", flexShrink: 0, ...props.style }} fill={gid ? `url(#${gid})` : color}>
      {gid ? (
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0" stopColor={props.tone === "gold" ? "#fff0b8" : SUIT_IS_RED[props.suit] ? "#ff5c68" : "#4b4f5c"} />
            <stop offset="0.55" stopColor={props.tone === "gold" ? "#e3b74a" : SUIT_IS_RED[props.suit] ? "#d8232f" : "#15161c"} />
            <stop offset="1" stopColor={props.tone === "gold" ? "#8a6212" : SUIT_IS_RED[props.suit] ? "#7a0b1d" : "#000"} />
          </linearGradient>
        </defs>
      ) : null}
      <SuitPath suit={props.suit} />
    </svg>
  );
}
