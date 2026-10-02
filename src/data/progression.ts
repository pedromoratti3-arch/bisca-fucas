/**
 * PROGRESSÃO — curva de XP, faixas de nível e o que cada faixa desbloqueia visualmente.
 * Para ajustar a dificuldade, mude XP_BASE / XP_EXPO ou os pontos de XP por partida.
 */

export const MAX_LEVEL = 50;
const XP_BASE = 100;
const XP_EXPO = 1.25;

/** XP necessário para ir do nível `level` para o seguinte. Nível 1→2: 100 · 5→6: 750 · 10→11: 1 780 · 20→21: 4 230 · 30→31: 7 020 · 40→41: 10 060 */
export function xpToNext(level: number): number {
  if (level >= MAX_LEVEL) return 0;
  return Math.round((XP_BASE * Math.pow(level, XP_EXPO)) / 10) * 10;
}

/** XP acumulado para alcançar o nível `level` (do nível 1). */
export function xpForLevel(level: number): number {
  let t = 0;
  for (let l = 1; l < level; l++) t += xpToNext(l);
  return t;
}

/** Nível e progresso dentro do nível a partir do XP total. */
export function levelFromXp(xp: number): { level: number; into: number; need: number } {
  let level = 1;
  let rest = Math.max(0, Math.floor(xp));
  while (level < MAX_LEVEL && rest >= xpToNext(level)) {
    rest -= xpToNext(level);
    level++;
  }
  return { level, into: level >= MAX_LEVEL ? 0 : rest, need: xpToNext(level) };
}

/** XP ganho numa partida (antes do multiplicador de modo). */
export const MATCH_XP = {
  played: 40,
  win: 60,
  handWon: 6,          // por mão vencida (máx. 5 contadas)
  capote: 15,
  rele: 25,
  sevenOpening: 10,
  batidoWin: 15,
  friends: 20,         // online com 2+ humanos
  bigHand: 10,         // mão com 70+ pontos de carta
  /** solo contra bots rende 70% */
  soloMultiplier: 0.7,
  /** limite de partidas que rendem XP por dia (anti-farm) */
  dailyMatchCap: 25,
} as const;

export type TierFrame = "none" | "bronze" | "silver" | "gold" | "purple" | "holo";

export type Tier = {
  id: string;
  name: string;
  minLevel: number;
  /** cor do nome do jogador */
  nameColor: string;
  /** moldura do avatar */
  frame: TierFrame;
  /** intensidade da animação de vitória (1 = simples … 5 = máxima) */
  victoryFx: 1 | 2 | 3 | 4 | 5;
  /** título mostrado no perfil */
  title: string;
  description: string;
};

export const TIERS: Tier[] = [
  { id: "calouro", name: "Calouro", minLevel: 1, nameColor: "#f4f1ea", frame: "none", victoryFx: 1, title: "Calouro da Bisca", description: "Todo mundo começa aqui. Vitória simples, sem moldura." },
  { id: "aprendiz", name: "Aprendiz", minLevel: 5, nameColor: "#e9a46e", frame: "bronze", victoryFx: 2, title: "Aprendiz de Encarte", description: "Moldura bronze e confete na vitória." },
  { id: "encartador", name: "Encartador", minLevel: 10, nameColor: "#eef1f6", frame: "silver", victoryFx: 2, title: "Encartador", description: "Moldura prata; nome em prata na mesa." },
  { id: "cortador", name: "Cortador", minLevel: 20, nameColor: "#f0d078", frame: "gold", victoryFx: 3, title: "Cortador de Respeito", description: "Moldura dourada, nome dourado e cartas voando na vitória." },
  { id: "mestre", name: "Mestre do Trunfo", minLevel: 30, nameColor: "#c4b5fd", frame: "purple", victoryFx: 4, title: "Mestre do Trunfo", description: "Moldura roxa com brilho, chuva de confete e naipes dourados." },
  { id: "lenda", name: "Lenda da Fucape", minLevel: 40, nameColor: "#f0abfc", frame: "holo", victoryFx: 5, title: "Lenda da Fucape", description: "Moldura holográfica, nome iridescente e a vitória máxima." },
];

export function tierForLevel(level: number): Tier {
  let t = TIERS[0];
  for (const x of TIERS) if (level >= x.minLevel) t = x;
  return t;
}

export function nextTier(level: number): Tier | null {
  for (const x of TIERS) if (x.minLevel > level) return x;
  return null;
}

/** Chave do dia (fuso de Brasília) para missões diárias: "2026-10-02". */
export function dayKey(ts: number): string {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
  return f.format(new Date(ts));
}

/** Chave da semana (segunda a domingo, Brasília): "2026-W40". */
export function weekKey(ts: number): string {
  const [y, m, d] = dayKey(ts).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const day = (date.getUTCDay() + 6) % 7; // segunda = 0
  date.setUTCDate(date.getUTCDate() - day + 3); // quinta da semana ISO
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Quando a chave do dia muda (meia-noite de Brasília), em ms. */
export function nextDayResetAt(ts: number): number {
  const key = dayKey(ts);
  let t = ts + 60_000;
  // avança de hora em hora até a chave mudar, depois refina por minuto
  while (dayKey(t) === key) t += 3_600_000;
  t -= 3_600_000;
  while (dayKey(t) === key) t += 60_000;
  return t;
}
