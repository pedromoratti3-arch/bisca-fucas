/**
 * BARALHOS COLECIONÁVEIS — cada baralho é um estilo completo (frente, verso, fonte, cores, acabamento).
 * Para adicionar um baralho novo: copie um bloco, troque id/nome/cores e defina como se desbloqueia.
 * Nada mais no código precisa mudar.
 *
 * Raridades: comum · raro · epico · lendario
 * Desbloqueio: { type: "default" } | { type: "level", level } | { type: "mission", missionId } | { type: "clan", clanId }
 * Fontes (ver src/design/fonts.ts): "cinzel" (baralho impresso), "outfit" (moderna), "inter" (limpa), "bebas" (neon), "slab" (retrô)
 * Frente (face): "pips" (naipes contados, estilo clássico), "index" (número grande no centro), "minimal" (naipe grande no centro)
 * Verso (pattern): "lines" | "diamonds" | "dots" | "grid" | "none" | "emblem" (emblema do clã)
 */
import { OFFICIAL_CLAN_BY_ID } from "./clans";

export type DeckRarity = "comum" | "raro" | "epico" | "lendario";
export type DeckFont = "cinzel" | "outfit" | "inter" | "bebas" | "slab";
export type DeckFace = "pips" | "index" | "minimal";
export type DeckPattern = "lines" | "diamonds" | "dots" | "grid" | "none" | "emblem";

export type DeckUnlock =
  | { type: "default" }
  | { type: "level"; level: number }
  | { type: "mission"; missionId: string; label: string }
  | { type: "clan"; clanId: string };

export type DeckDef = {
  id: string;
  name: string;
  description: string;
  rarity: DeckRarity;
  unlock: DeckUnlock;
  front: {
    paper: string;       // cor/gradiente do papel
    edge: string;        // borda da carta
    red: string;         // tinta de copas/ouros
    dark: string;        // tinta de espadas/paus
    font: DeckFont;
    face: DeckFace;
    accent?: string;     // detalhes (moldura das figuras)
  };
  back: {
    grad: string;
    border: string;
    hi: string;
    pattern: DeckPattern;
    clanId?: string;
  };
  effects?: { holo?: boolean; foil?: boolean; glow?: string };
};

export const RARITY_INFO: Record<DeckRarity, { label: string; color: string; color2: string; order: number }> = {
  comum: { label: "Comum", color: "#9ca3af", color2: "#e5e7eb", order: 0 },
  raro: { label: "Raro", color: "#60a5fa", color2: "#bfdbfe", order: 1 },
  epico: { label: "Épico", color: "#a855f7", color2: "#e9d5ff", order: 2 },
  lendario: { label: "Lendário", color: "#f59e0b", color2: "#fde68a", order: 3 },
};

const CLASSIC_FRONT: DeckDef["front"] = { paper: "linear-gradient(160deg,#ffffff 0%,#f6f2e9 100%)", edge: "rgba(0,0,0,.18)", red: "#d8232f", dark: "#15161c", font: "cinzel", face: "pips", accent: "#d4a843" };

function mono(id: string, name: string, level: number, grad: string, border: string, hi: string, description: string): DeckDef {
  return { id, name, description, rarity: "comum", unlock: { type: "level", level }, front: CLASSIC_FRONT, back: { grad, border, hi, pattern: "lines" } };
}

function clanDeck(clanId: string, level: number): DeckDef {
  const c = OFFICIAL_CLAN_BY_ID[clanId];
  const light = c.fg === "#15161c";
  return {
    id: `cla-${clanId}`,
    name: `Baralho ${c.short}`,
    description: `Baralho oficial do clã ${c.short}. ${c.motto}`,
    rarity: "epico",
    unlock: { type: "clan", clanId },
    front: { paper: light ? "linear-gradient(160deg,#ffffff,#f1f1f3)" : "linear-gradient(160deg,#ffffff 0%,#f7f3ff 100%)", edge: c.color, red: "#d8232f", dark: light ? "#15161c" : c.color2, font: "cinzel", face: "pips", accent: c.color },
    back: { grad: `linear-gradient(160deg, ${c.color} 0%, ${c.color2} 100%)`, border: light ? "#9ca3af" : c.color, hi: light ? "#15161c" : "#ffffff", pattern: "emblem", clanId },
    effects: { glow: c.color },
  };
  void level;
}

export const DECKS: DeckDef[] = [
  // ── COMUM ────────────────────────────────────────────────────────────
  {
    id: "classico",
    name: "Clássico Fucas",
    description: "O baralho de sempre: vermelho Fucas no verso, índices em serifa de baralho impresso.",
    rarity: "comum",
    unlock: { type: "default" },
    front: CLASSIC_FRONT,
    back: { grad: "linear-gradient(160deg,#7B1010,#3A0606)", border: "#C41230", hi: "#FFD700", pattern: "lines" },
  },
  mono("azul-royal", "Azul Royal", 2, "linear-gradient(160deg,#1e3a8a,#0b1a44)", "#3b82f6", "#93c5fd", "Verso azul profundo, elegante como baralho de cassino."),
  mono("verde-mesa", "Verde Mesa", 3, "linear-gradient(160deg,#14532d,#052e16)", "#22c55e", "#86efac", "O verde das mesas de feltro."),
  mono("roxo-fucas", "Roxo Fucas", 4, "linear-gradient(160deg,#4c1d95,#1e1b4b)", "#8b5cf6", "#c4b5fd", "A cor de destaque do jogo no verso das cartas."),
  mono("rubi", "Rubi", 5, "linear-gradient(160deg,#9f1239,#4c0519)", "#f43f5e", "#fda4af", "Vermelho vivo com brilho de pedra."),
  mono("grafite", "Grafite", 6, "linear-gradient(160deg,#374151,#111827)", "#6b7280", "#d1d5db", "Cinza chumbo, discreto e sóbrio."),

  // ── RARO ─────────────────────────────────────────────────────────────
  {
    id: "minimalista",
    name: "Minimalista",
    description: "Só o essencial: naipe grande no centro, índices finos nos cantos, verso claro.",
    rarity: "raro",
    unlock: { type: "level", level: 8 },
    front: { paper: "#fbfaf7", edge: "rgba(0,0,0,.12)", red: "#e11d48", dark: "#111827", font: "inter", face: "minimal" },
    back: { grad: "linear-gradient(160deg,#f3f4f6,#d1d5db)", border: "#9ca3af", hi: "#111827", pattern: "none" },
  },
  {
    id: "preto-branco",
    name: "Preto & Branco",
    description: "Papel preto com tinta branca. Copas e ouros em vermelho-coral para continuar legíveis.",
    rarity: "raro",
    unlock: { type: "level", level: 10 },
    front: { paper: "linear-gradient(160deg,#1a1a1f,#0d0d10)", edge: "rgba(255,255,255,.22)", red: "#ff6b6b", dark: "#f4f1ea", font: "outfit", face: "index", accent: "#9ca3af" },
    back: { grad: "linear-gradient(160deg,#111214,#000000)", border: "#e5e7eb", hi: "#ffffff", pattern: "diamonds" },
  },
  {
    id: "retro",
    name: "Retrô",
    description: "Papel creme, tipografia de cartaz antigo e verso vinho com losangos.",
    rarity: "raro",
    unlock: { type: "level", level: 12 },
    front: { paper: "linear-gradient(160deg,#f7efd9,#eadfbe)", edge: "#8a6a3a", red: "#b91c1c", dark: "#2a1f14", font: "slab", face: "pips", accent: "#8a6a3a" },
    back: { grad: "linear-gradient(160deg,#6b1d2b,#3b0a14)", border: "#d4a843", hi: "#f0d078", pattern: "diamonds" },
  },
  {
    id: "neon",
    name: "Neon",
    description: "Fundo escuro com tintas luminosas: rosa para copas e ouros, ciano para espadas e paus.",
    rarity: "raro",
    unlock: { type: "level", level: 15 },
    front: { paper: "linear-gradient(160deg,#0b0b14,#141427)", edge: "#22d3ee", red: "#ff2d95", dark: "#22d3ee", font: "bebas", face: "index", accent: "#22d3ee" },
    back: { grad: "linear-gradient(160deg,#0b0b14,#1a0b2e)", border: "#ff2d95", hi: "#22d3ee", pattern: "grid" },
    effects: { glow: "#22d3ee" },
  },
  {
    id: "noturno",
    name: "Noturno",
    description: "Azul-marinho com tinta prata, para quem joga de madrugada.",
    rarity: "raro",
    unlock: { type: "mission", missionId: "ach_online_10", label: "Jogue 10 partidas online" },
    front: { paper: "linear-gradient(160deg,#111a33,#0a1022)", edge: "#94a3b8", red: "#fb7185", dark: "#e2e8f0", font: "cinzel", face: "pips", accent: "#94a3b8" },
    back: { grad: "linear-gradient(160deg,#1e293b,#020617)", border: "#94a3b8", hi: "#e2e8f0", pattern: "dots" },
  },

  // ── ÉPICO ────────────────────────────────────────────────────────────
  clanDeck("tribo-de-aracruz", 0),
  clanDeck("divas-labubonicas", 0),
  clanDeck("legends", 0),
  clanDeck("legends-academy", 0),
  clanDeck("reis-de-paus", 0),
  clanDeck("reis-de-paus-bbc", 0),
  {
    id: "terrafe",
    name: "Terrafé",
    description: "Tons de café e madeira, o baralho da mesa do Terrafé.",
    rarity: "epico",
    unlock: { type: "mission", missionId: "ach_win_terrafe_5", label: "Vença 5 partidas no Terrafé" },
    front: { paper: "linear-gradient(160deg,#fff8ee,#f1e4cf)", edge: "#a67c52", red: "#b4321f", dark: "#3b2a1a", font: "slab", face: "pips", accent: "#a67c52" },
    back: { grad: "linear-gradient(160deg,#5c4033,#2d1810)", border: "#a67c52", hi: "#d4a574", pattern: "dots" },
  },
  {
    id: "floresta",
    name: "Floresta",
    description: "Verde musgo e folha, o baralho da mesa da Floresta.",
    rarity: "epico",
    unlock: { type: "mission", missionId: "ach_win_floresta_5", label: "Vença 5 partidas na Floresta" },
    front: { paper: "linear-gradient(160deg,#f6fbf4,#e3efdd)", edge: "#22c55e", red: "#c2410c", dark: "#14532d", font: "cinzel", face: "pips", accent: "#22c55e" },
    back: { grad: "linear-gradient(160deg,#14532d,#052e16)", border: "#22c55e", hi: "#4ade80", pattern: "diamonds" },
  },
  {
    id: "hub",
    name: "HUB Fucape",
    description: "Azul elétrico do HUB, com grade tecnológica no verso.",
    rarity: "epico",
    unlock: { type: "mission", missionId: "ach_win_hub_5", label: "Vença 5 partidas no HUB" },
    front: { paper: "linear-gradient(160deg,#ffffff,#eef4ff)", edge: "#3b82f6", red: "#dc2626", dark: "#0c4a6e", font: "outfit", face: "index", accent: "#3b82f6" },
    back: { grad: "linear-gradient(160deg,#1e3a5f,#0c1929)", border: "#3b82f6", hi: "#60a5fa", pattern: "grid" },
  },
  {
    id: "sala-de-aula",
    name: "Sala de Aula",
    description: "O vermelho da sala onde tudo começou.",
    rarity: "epico",
    unlock: { type: "mission", missionId: "ach_win_sala_5", label: "Vença 5 partidas na Sala de Aula" },
    front: { paper: "linear-gradient(160deg,#ffffff,#fff1f2)", edge: "#c41230", red: "#c41230", dark: "#1f0a0d", font: "cinzel", face: "pips", accent: "#c41230" },
    back: { grad: "linear-gradient(160deg,#9f1239,#3b0a14)", border: "#fca5a5", hi: "#fecaca", pattern: "lines" },
  },

  // ── LENDÁRIO ─────────────────────────────────────────────────────────
  {
    id: "dourado",
    name: "Dourado",
    description: "Papel dourado com tinta escura e reflexo metálico que acompanha o movimento.",
    rarity: "lendario",
    unlock: { type: "level", level: 30 },
    front: { paper: "linear-gradient(160deg,#fff3c4 0%,#f0d078 40%,#d4a843 100%)", edge: "#8a6212", red: "#7a0b1d", dark: "#2a1d05", font: "cinzel", face: "pips", accent: "#8a6212" },
    back: { grad: "linear-gradient(160deg,#d4a843,#7a5a14)", border: "#fff3c4", hi: "#fff8e1", pattern: "diamonds" },
    effects: { foil: true, glow: "#f0d078" },
  },
  {
    id: "holografico",
    name: "Holográfico",
    description: "Reflexo arco-íris que se move quando a carta se mexe ou o mouse passa por cima.",
    rarity: "lendario",
    unlock: { type: "level", level: 40 },
    front: { paper: "linear-gradient(160deg,#f8f7ff,#e9e4ff)", edge: "#a855f7", red: "#db2777", dark: "#3b0764", font: "outfit", face: "index", accent: "#a855f7" },
    back: { grad: "linear-gradient(135deg,#7c3aed 0%,#c026d3 45%,#f472b6 75%,#8b5cf6 100%)", border: "#f0abfc", hi: "#ffffff", pattern: "none" },
    effects: { holo: true, glow: "#a855f7" },
  },
  {
    id: "lenda",
    name: "Lenda da Bisca",
    description: "Preto absoluto com ouro e reflexo holográfico. Só para quem venceu 100 partidas.",
    rarity: "lendario",
    unlock: { type: "mission", missionId: "ach_win_100", label: "Vença 100 partidas" },
    front: { paper: "linear-gradient(160deg,#141414,#000000)", edge: "#f0d078", red: "#ff4d5e", dark: "#f0d078", font: "cinzel", face: "pips", accent: "#f0d078" },
    back: { grad: "linear-gradient(160deg,#1a1a1a,#000000)", border: "#f0d078", hi: "#fff3c4", pattern: "emblem" },
    effects: { holo: true, foil: true, glow: "#f0d078" },
  },
];

export const DECK_BY_ID: Record<string, DeckDef> = Object.fromEntries(DECKS.map((d) => [d.id, d]));
export const DEFAULT_DECK = DECK_BY_ID.classico;

export function deckFontFamily(f: DeckFont): string {
  switch (f) {
    case "cinzel": return "var(--font-card-cinzel), Georgia, serif";
    case "bebas": return "var(--font-card-bebas), Impact, sans-serif";
    case "slab": return "var(--font-card-slab), Georgia, serif";
    case "inter": return "var(--font-body), system-ui, sans-serif";
    case "outfit":
    default: return "var(--font-display), system-ui, sans-serif";
  }
}

/** Texto do requisito de desbloqueio. */
export function unlockLabel(u: DeckUnlock): string {
  switch (u.type) {
    case "default": return "Padrão";
    case "level": return `Nível ${u.level}`;
    case "mission": return u.label;
    case "clan": return `Membro do clã ${OFFICIAL_CLAN_BY_ID[u.clanId]?.short ?? u.clanId}`;
  }
}
