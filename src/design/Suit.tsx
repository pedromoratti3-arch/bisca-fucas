/**
 * Naipes em SVG (desenho próprio, sem fonte): ficam iguais em qualquer celular.
 * Copas e ouros vermelhos; espadas e paus escuros — ou dourados quando `tone="gold"`.
 */
import type { CSSProperties } from "react";
import type { Suit } from "./PlayingCard";

export const SUIT_ORDER: Suit[] = ["espadas", "copas", "paus", "ouros"];
export const SUIT_IS_RED: Record<Suit, boolean> = { ouros: true, copas: true, espadas: false, paus: false };

export function SuitPath(props: { suit: Suit }) {
  switch (props.suit) {
    case "copas":
      return <path d="M12 21.2S3.2 15.8 2.4 10.4C1.9 6.9 4.3 4 7.5 4c2 0 3.5 1.1 4.5 2.8C13 5.1 14.5 4 16.5 4c3.2 0 5.6 2.9 5.1 6.4C20.8 15.8 12 21.2 12 21.2z" />;
    case "ouros":
      return <path d="M12 2.2c.5 0 .9.2 1.2.6l6.3 8.1c.5.6.5 1.5 0 2.2l-6.3 8.1c-.6.8-1.8.8-2.4 0L4.5 13.1c-.5-.7-.5-1.6 0-2.2l6.3-8.1c.3-.4.7-.6 1.2-.6z" />;
    case "espadas":
      return <path d="M12 2.4c2.4 3.6 8.2 7.4 8.2 11.6 0 2.4-1.9 4.3-4.3 4.3-1.1 0-2.1-.4-2.9-1.1.2 1.7 1 3.1 2.5 4.3H8.5c1.5-1.2 2.3-2.6 2.5-4.3-.8.7-1.8 1.1-2.9 1.1-2.4 0-4.3-1.9-4.3-4.3C3.8 9.8 9.6 6 12 2.4z" />;
    case "paus":
    default:
      return (
        <>
          <circle cx="12" cy="7.3" r="4.1" />
          <circle cx="6.9" cy="13.6" r="4.1" />
          <circle cx="17.1" cy="13.6" r="4.1" />
          <path d="M10.4 12.6c.4 3-.4 5.7-2.4 8.9h8c-2-3.2-2.8-5.9-2.4-8.9z" />
        </>
      );
  }
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
  const gid = props.gradient ? `bfsg-${props.suit}-${props.tone || "auto"}` : undefined;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" aria-hidden className={props.className} style={{ display: "block", flexShrink: 0, ...props.style }} fill={gid ? `url(#${gid})` : color}>
      {gid ? (
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="1" />
            <stop offset="1" stopColor={SUIT_IS_RED[props.suit] && props.tone !== "gold" ? "#8f0f1a" : props.tone === "gold" ? "#9a7420" : "#000"} stopOpacity="1" />
          </linearGradient>
        </defs>
      ) : null}
      <SuitPath suit={props.suit} />
    </svg>
  );
}
