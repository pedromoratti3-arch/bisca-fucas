"use client";
/**
 * Carta de baralho do design system (frente e verso).
 * Tamanhos: xs (vaza/outros), sm (mesa), md (mão), lg (destaque/revelação).
 * O verso aceita "skin" (gradiente, borda, brilho) para os baralhos colecionáveis.
 * A animação de virar (flip) usa só transform — roda liso no celular.
 */
import type { CSSProperties } from "react";

export type Suit = "ouros" | "copas" | "espadas" | "paus";
export type CardValue = "2" | "3" | "4" | "5" | "6" | "7" | "J" | "Q" | "K" | "A";
export type CardLike = { s: Suit; v: CardValue };

export const SUIT_SYMBOL: Record<Suit, string> = { ouros: "♦", copas: "♥", espadas: "♠", paus: "♣" };
export const SUIT_NAME: Record<Suit, string> = { ouros: "Ouros", copas: "Copas", espadas: "Espadas", paus: "Paus" };
const SUIT_COLOR: Record<Suit, string> = { ouros: "#c8102e", copas: "#c8102e", espadas: "#15161c", paus: "#15161c" };

export type CardBackSkin = { grad: string; border: string; hi: string; label?: string };
export const DEFAULT_BACK: CardBackSkin = { grad: "linear-gradient(160deg,#7B1010,#3A0606)", border: "#C41230", hi: "#FFD700" };

export type CardSize = "xs" | "sm" | "md" | "lg";
const SIZES: Record<CardSize, { w: number; h: number; fs: number; sym: number; pad: string; r: number }> = {
  xs: { w: 30, h: 42, fs: 10, sym: 13, pad: "2px 3px", r: 5 },
  sm: { w: 44, h: 62, fs: 13, sym: 18, pad: "4px 5px", r: 6 },
  md: { w: 60, h: 84, fs: 16, sym: 26, pad: "5px 6px", r: 8 },
  lg: { w: 96, h: 134, fs: 24, sym: 44, pad: "8px 10px", r: 12 },
};

export function cardSize(size: CardSize) {
  return SIZES[size];
}

export function PlayingCard(props: {
  card?: CardLike | null;
  back?: boolean;
  size?: CardSize;
  skin?: CardBackSkin;
  glow?: "none" | "gold" | "accent";
  dim?: boolean;
  selected?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
  className?: string;
  title?: string;
}) {
  const S = SIZES[props.size ?? "md"];
  const skin = props.skin ?? DEFAULT_BACK;
  const glow = props.glow ?? "none";
  const glowShadow = glow === "gold" ? "0 0 0 2px #f0d078, 0 0 18px rgba(240,208,120,.65)" : glow === "accent" ? "0 0 0 2px #a78bfa, 0 0 18px rgba(139,92,246,.65)" : "";
  const base: CSSProperties = {
    width: S.w,
    height: S.h,
    borderRadius: S.r,
    boxSizing: "border-box",
    flexShrink: 0,
    position: "relative",
    cursor: props.onClick ? "pointer" : "default",
    opacity: props.dim ? 0.38 : 1,
    transform: props.selected ? "translateY(-10px)" : undefined,
    transition: "transform var(--bf-dur-sm) var(--bf-ease-card), opacity var(--bf-dur-sm) var(--bf-ease-out), box-shadow var(--bf-dur-sm) var(--bf-ease-out)",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation",
    ...props.style,
  };

  if (props.back || !props.card) {
    return (
      <div
        className={props.className}
        onClick={props.onClick}
        title={props.title}
        style={{
          ...base,
          background: skin.grad,
          border: `2px solid ${glow !== "none" ? skin.hi : skin.border}`,
          boxShadow: glowShadow || "0 2px 6px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.08)",
        }}
      >
        {/* moldura interna do verso */}
        <div style={{ position: "absolute", inset: Math.max(3, Math.round(S.w * 0.08)), borderRadius: Math.max(2, S.r - 3), border: `1px solid ${skin.hi}55`, background: "repeating-linear-gradient(45deg, rgba(255,255,255,.05) 0 2px, transparent 2px 6px)" }} />
      </div>
    );
  }

  const c = props.card;
  const col = SUIT_COLOR[c.s];
  return (
    <div
      className={props.className}
      onClick={props.onClick}
      title={props.title ?? `${c.v} de ${SUIT_NAME[c.s]}`}
      role={props.onClick ? "button" : undefined}
      style={{
        ...base,
        background: "linear-gradient(160deg, #ffffff 0%, #f6f3ec 100%)",
        border: `1.5px solid ${glow !== "none" ? "transparent" : "rgba(0,0,0,.18)"}`,
        boxShadow: glowShadow || "0 2px 6px rgba(0,0,0,.4)",
        color: col,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: S.pad,
        fontFamily: "var(--bf-font-display)",
        fontWeight: 800,
        fontSize: S.fs,
        lineHeight: 1,
      }}
    >
      <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
        <span>{c.v}</span>
        <span style={{ fontSize: Math.round(S.fs * 0.8) }}>{SUIT_SYMBOL[c.s]}</span>
      </span>
      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: S.sym, pointerEvents: "none" }}>{SUIT_SYMBOL[c.s]}</span>
      <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1, transform: "rotate(180deg)" }}>
        <span>{c.v}</span>
        <span style={{ fontSize: Math.round(S.fs * 0.8) }}>{SUIT_SYMBOL[c.s]}</span>
      </span>
    </div>
  );
}

/** Carta que vira (verso → frente) quando `flipped` é true. */
export function FlipCard(props: { card: CardLike; flipped: boolean; size?: CardSize; skin?: CardBackSkin; glow?: "none" | "gold" | "accent"; durationMs?: number }) {
  const S = SIZES[props.size ?? "md"];
  const d = props.durationMs ?? 600;
  return (
    <div style={{ width: S.w, height: S.h, perspective: 900, flexShrink: 0 }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transition: `transform ${d}ms var(--bf-ease-card)`,
          transform: props.flipped ? "rotateY(0deg)" : "rotateY(180deg)",
        }}
      >
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}>
          <PlayingCard card={props.card} size={props.size} glow={props.glow} />
        </div>
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
          <PlayingCard back size={props.size} skin={props.skin} />
        </div>
      </div>
    </div>
  );
}
