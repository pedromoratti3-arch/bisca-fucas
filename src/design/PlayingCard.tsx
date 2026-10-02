"use client";
/**
 * Carta de baralho (frente e verso) no estilo do baralho equipado (ver src/data/decks.ts).
 *
 * Frente — padrão de baralho profissional:
 *   cantos: só o valor (na cor do naipe) no canto superior esquerdo e inferior direito (de cabeça para baixo);
 *   centro: depende do estilo do baralho —
 *     "pips": Ás = um naipe grande; 2–7 = naipes contados na disposição clássica; J/Q/K = figura própria;
 *     "index": número grande no centro com o naipe atrás; figuras = letra grande + ícone;
 *     "minimal": naipe grande no centro; figuras = ícone.
 * Verso: gradiente + padrão (linhas, losangos, pontos, grade) ou emblema do clã.
 * Acabamentos lendários (dourado, holográfico) são CSS: gradientes + transform. Sem imagens.
 */
import type { CSSProperties } from "react";
import { DECK_BY_ID, DEFAULT_DECK, deckFontFamily, type DeckDef } from "@/data/decks";
import { OFFICIAL_CLAN_BY_ID } from "@/data/clans";
import { ClanEmblem } from "./ClanEmblem";
import { FaceArt } from "./CardFaceArt";
import { SuitGlyph } from "./Suit";

export type Suit = "ouros" | "copas" | "espadas" | "paus";
export type CardValue = "2" | "3" | "4" | "5" | "6" | "7" | "J" | "Q" | "K" | "A";
export type CardLike = { s: Suit; v: CardValue };

export const SUIT_SYMBOL: Record<Suit, string> = { ouros: "♦", copas: "♥", espadas: "♠", paus: "♣" };
export const SUIT_NAME: Record<Suit, string> = { ouros: "Ouros", copas: "Copas", espadas: "Espadas", paus: "Paus" };
export const VALUE_NAME: Record<CardValue, string> = { "2": "Dois", "3": "Três", "4": "Quatro", "5": "Cinco", "6": "Seis", "7": "Sete", J: "Valete", Q: "Dama", K: "Rei", A: "Ás" };

/** Compatibilidade com o código antigo (skin do verso por tema da mesa). */
export type CardBackSkin = { grad: string; border: string; hi: string; label?: string };
export const DEFAULT_BACK: CardBackSkin = { grad: DEFAULT_DECK.back.grad, border: DEFAULT_DECK.back.border, hi: DEFAULT_DECK.back.hi };

export type CardSize = "xs" | "sm" | "md" | "lg" | "xl";
const SIZES: Record<CardSize, { w: number; h: number; r: number }> = {
  xs: { w: 30, h: 42, r: 4 },
  sm: { w: 44, h: 62, r: 6 },
  md: { w: 62, h: 87, r: 8 },
  lg: { w: 96, h: 134, r: 11 },
  xl: { w: 150, h: 210, r: 16 },
};
export function cardSize(size: CardSize) {
  return SIZES[size];
}

/* Disposição clássica dos naipes (2–7). Coordenadas em % da área útil; "flip" = de cabeça para baixo. */
type Pip = { x: number; y: number; flip?: boolean };
const PIPS: Record<string, Pip[]> = {
  "2": [{ x: 50, y: 18 }, { x: 50, y: 82, flip: true }],
  "3": [{ x: 50, y: 18 }, { x: 50, y: 50 }, { x: 50, y: 82, flip: true }],
  "4": [{ x: 30, y: 18 }, { x: 70, y: 18 }, { x: 30, y: 82, flip: true }, { x: 70, y: 82, flip: true }],
  "5": [{ x: 30, y: 18 }, { x: 70, y: 18 }, { x: 50, y: 50 }, { x: 30, y: 82, flip: true }, { x: 70, y: 82, flip: true }],
  "6": [{ x: 30, y: 18 }, { x: 70, y: 18 }, { x: 30, y: 50 }, { x: 70, y: 50 }, { x: 30, y: 82, flip: true }, { x: 70, y: 82, flip: true }],
  "7": [{ x: 30, y: 18 }, { x: 70, y: 18 }, { x: 50, y: 34 }, { x: 30, y: 50 }, { x: 70, y: 50 }, { x: 30, y: 82, flip: true }, { x: 70, y: 82, flip: true }],
};

function backPattern(p: DeckDef["back"]["pattern"], hi: string): string {
  switch (p) {
    case "lines": return `repeating-linear-gradient(45deg, ${hi}1f 0 2px, transparent 2px 7px)`;
    case "diamonds": return `repeating-linear-gradient(45deg, ${hi}22 0 1.5px, transparent 1.5px 9px), repeating-linear-gradient(-45deg, ${hi}22 0 1.5px, transparent 1.5px 9px)`;
    case "dots": return `radial-gradient(${hi}33 1.2px, transparent 1.6px)`;
    case "grid": return `repeating-linear-gradient(0deg, ${hi}1c 0 1px, transparent 1px 8px), repeating-linear-gradient(90deg, ${hi}1c 0 1px, transparent 1px 8px)`;
    default: return "none";
  }
}

export type PlayingCardProps = {
  card?: CardLike | null;
  back?: boolean;
  size?: CardSize;
  /** id do baralho (src/data/decks.ts) ou o objeto; padrão: clássico */
  deck?: string | DeckDef;
  /** compat: skin de verso do tema antigo (só usada se não houver deck) */
  skin?: CardBackSkin;
  glow?: "none" | "gold" | "accent";
  dim?: boolean;
  selected?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
  className?: string;
  title?: string;
};

export function PlayingCard(props: PlayingCardProps) {
  const S = SIZES[props.size ?? "md"];
  const deck: DeckDef = typeof props.deck === "string" ? DECK_BY_ID[props.deck] || DEFAULT_DECK : props.deck || DEFAULT_DECK;
  const glow = props.glow ?? "none";
  const glowShadow = glow === "gold" ? "0 0 0 2px #f0d078, 0 0 18px rgba(240,208,120,.65)" : glow === "accent" ? "0 0 0 2px #a78bfa, 0 0 18px rgba(139,92,246,.65)" : "";
  const fx = deck.effects || {};
  const cls = ["bf-card", fx.holo ? "bf-card--holo" : "", fx.foil ? "bf-card--foil" : "", props.className || ""].filter(Boolean).join(" ");
  const base: CSSProperties = {
    width: S.w,
    height: S.h,
    borderRadius: S.r,
    boxSizing: "border-box",
    flexShrink: 0,
    position: "relative",
    overflow: "hidden",
    cursor: props.onClick ? "pointer" : "default",
    opacity: props.dim ? 0.38 : 1,
    transform: props.selected ? "translateY(-10px)" : undefined,
    transition: "transform var(--bf-dur-sm) var(--bf-ease-card), opacity var(--bf-dur-sm) var(--bf-ease-out), box-shadow var(--bf-dur-sm) var(--bf-ease-out)",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation",
    ...props.style,
  };

  // ── VERSO ──
  if (props.back || !props.card) {
    const bk = props.deck || !props.skin ? deck.back : { grad: props.skin.grad, border: props.skin.border, hi: props.skin.hi, pattern: "lines" as const };
    const inset = Math.max(3, Math.round(S.w * 0.075));
    const clan = bk.pattern === "emblem" && bk.clanId ? OFFICIAL_CLAN_BY_ID[bk.clanId] : null;
    return (
      <div
        className={cls}
        onClick={props.onClick}
        title={props.title}
        style={{
          ...base,
          background: bk.grad,
          border: `2px solid ${glow !== "none" ? bk.hi : bk.border}`,
          boxShadow: glowShadow || "0 2px 6px rgba(0,0,0,.45), inset 0 0 0 1px rgba(255,255,255,.08)",
        }}
      >
        <div style={{ position: "absolute", inset, borderRadius: Math.max(2, S.r - 3), border: `1px solid ${bk.hi}66`, background: backPattern(bk.pattern, bk.hi), backgroundSize: bk.pattern === "dots" ? "7px 7px" : undefined, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {clan ? (
            <ClanEmblem kind={clan.emblem} color={clan.color} color2={clan.color2} fg={clan.fg} logo={clan.logo} size={Math.round(S.w * 0.5)} style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,.4))" }} />
          ) : bk.pattern === "emblem" ? (
            <SuitGlyph suit="espadas" size={Math.round(S.w * 0.4)} tone="gold" />
          ) : S.w >= 60 ? (
            <div style={{ width: "46%", height: "32%", borderRadius: 999, border: `1px solid ${bk.hi}55`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "var(--bf-font-display)", fontWeight: 800, fontSize: Math.round(S.w * 0.16), color: `${bk.hi}aa`, letterSpacing: ".06em" }}>BF</span>
            </div>
          ) : null}
        </div>
        {fx.holo || fx.foil ? <span className="bf-card__fx" aria-hidden /> : null}
      </div>
    );
  }

  // ── FRENTE ──
  const c = props.card;
  const isRed = c.s === "copas" || c.s === "ouros";
  const ink = isRed ? deck.front.red : deck.front.dark;
  const font = deckFontFamily(deck.front.font);
  const face = deck.front.face;
  const isFace = c.v === "J" || c.v === "Q" || c.v === "K";
  const idxFs = Math.round(S.w * (S.w < 44 ? 0.4 : 0.3));
  const pad = Math.max(2, Math.round(S.w * 0.07));

  const corner = (flip: boolean) => (
    <span
      style={{
        position: "absolute",
        ...(flip ? { right: pad, bottom: pad, transform: "rotate(180deg)" } : { left: pad, top: pad }),
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        lineHeight: 1,
        fontFamily: font,
        fontWeight: deck.front.font === "inter" ? 800 : 700,
        fontSize: idxFs,
        color: ink,
        letterSpacing: deck.front.font === "bebas" ? ".02em" : undefined,
      }}
    >
      <span>{c.v}</span>
    </span>
  );

  let center: React.ReactNode = null;
  const area: CSSProperties = { position: "absolute", left: "22%", right: "22%", top: "14%", bottom: "14%" };
  if (isFace) {
    const art = (
      <div style={{ width: face === "minimal" ? "62%" : "56%", aspectRatio: "1", color: ink }}>
        <FaceArt value={c.v as "J" | "Q" | "K"} accent={deck.front.accent} />
      </div>
    );
    center = (
      <div style={{ ...area, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: Math.round(S.w * 0.02) }}>
        {face === "pips" && S.w >= 44 ? (
          <div style={{ position: "absolute", inset: 0, borderRadius: Math.round(S.r * 0.6), border: `1px solid ${deck.front.accent || ink}55` }} />
        ) : null}
        {face !== "minimal" ? (
          <span style={{ fontFamily: font, fontWeight: 700, fontSize: Math.round(S.w * (face === "index" ? 0.34 : 0.22)), color: ink, lineHeight: 1 }}>{c.v}</span>
        ) : null}
        {art}
      </div>
    );
  } else if (c.v === "A" || face === "minimal") {
    const big = c.v === "A" ? 0.5 : 0.46;
    center = (
      <div style={{ ...area, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <SuitGlyph suit={c.s} size={Math.round(S.w * big)} tone="current" style={{ color: ink, filter: fx.foil ? "drop-shadow(0 1px 0 rgba(255,255,255,.35))" : undefined }} />
      </div>
    );
  } else if (face === "index") {
    center = (
      <div style={{ ...area, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <SuitGlyph suit={c.s} size={Math.round(S.w * 0.5)} tone="current" style={{ color: ink, opacity: 0.18, position: "absolute" }} />
        <span style={{ fontFamily: font, fontWeight: 800, fontSize: Math.round(S.w * 0.5), color: ink, lineHeight: 1, position: "relative", letterSpacing: deck.front.font === "bebas" ? ".02em" : "-.02em" }}>{c.v}</span>
      </div>
    );
  } else {
    const pips = PIPS[c.v] || [];
    const pipSize = Math.round(S.w * 0.2);
    center = (
      <div style={area}>
        {pips.map((p, i) => (
          <SuitGlyph key={i} suit={c.s} size={pipSize} tone="current" style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`, color: ink, transform: `translate(-50%,-50%)${p.flip ? " rotate(180deg)" : ""}` }} />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cls}
      onClick={props.onClick}
      title={props.title ?? `${VALUE_NAME[c.v]} de ${SUIT_NAME[c.s]}`}
      role={props.onClick ? "button" : undefined}
      style={{
        ...base,
        background: deck.front.paper,
        border: `1.5px solid ${glow !== "none" ? "transparent" : deck.front.edge}`,
        boxShadow: glowShadow || "0 2px 6px rgba(0,0,0,.4)",
        color: ink,
      }}
    >
      {corner(false)}
      {center}
      {corner(true)}
      {fx.holo || fx.foil ? <span className="bf-card__fx" aria-hidden /> : null}
    </div>
  );
}

/** Carta que vira (verso → frente) quando `flipped` é true. */
export function FlipCard(props: { card: CardLike; flipped: boolean; size?: CardSize; deck?: string | DeckDef; skin?: CardBackSkin; glow?: "none" | "gold" | "accent"; durationMs?: number }) {
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
          <PlayingCard card={props.card} size={props.size} deck={props.deck} glow={props.glow} />
        </div>
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
          <PlayingCard back size={props.size} deck={props.deck} skin={props.skin} />
        </div>
      </div>
    </div>
  );
}
