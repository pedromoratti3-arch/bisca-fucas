/**
 * Observa o estado da mesa e acumula as estatísticas da partida para o relatório de XP/missões.
 * Puro: não mexe no jogo, só lê o estado (g) a cada mudança.
 */
import { getWin, pTm } from "@/lib/bisca/rules.mjs";
import type { MatchReport } from "./types";

type Card = { s: string; v: string; id: string };
type TrickEntry = { player: number; card: Card };
export type GameLike = {
  phase: string;
  trick: TrickEntry[];
  trickN: number;
  trump: string | null;
  tPts: number[];
  mPts: number[];
  events: { tm: number; lbl: string }[];
  batido: boolean;
  summaryFinalMPts: number[] | null;
};

export type MatchTracker = {
  handIdx: number;
  lastPhase: string;
  countedTricks: Record<string, true>;
  countedHands: Record<number, true>;
  hands: number;
  handsWon: number;
  maxHandCardPts: number;
  capotes: number;
  tricksWon: number;
  trumpTricksWon: number;
  reles: number;
  sevenOpenings: number;
  batidoWins: number;
  reportedKey: string;
};

export function newTracker(): MatchTracker {
  return { handIdx: 0, lastPhase: "", countedTricks: {}, countedHands: {}, hands: 0, handsWon: 0, maxHandCardPts: 0, capotes: 0, tricksWon: 0, trumpTricksWon: 0, reles: 0, sevenOpenings: 0, batidoWins: 0, reportedKey: "" };
}

/** Chama a cada mudança de `g`. Muta o tracker. */
export function trackerObserve(t: MatchTracker, g: GameLike, mySeat: number): void {
  if (!g) return;
  if (g.phase === "shuffle" && t.lastPhase !== "shuffle") t.handIdx++;
  const myTeam = pTm(mySeat);

  // vaza fechada (4 cartas na mesa, fase end_trick)
  if (g.phase === "end_trick" && Array.isArray(g.trick) && g.trick.length === 4 && g.trump) {
    const key = `${t.handIdx}:${g.trickN}`;
    if (!t.countedTricks[key]) {
      t.countedTricks[key] = true;
      try {
        const w = getWin(g.trick, g.trump) as TrickEntry;
        if (w && w.player === mySeat) {
          t.tricksWon++;
          if (w.card && w.card.s === g.trump) t.trumpTricksWon++;
        }
      } catch {
        /* estado incompleto: ignora */
      }
    }
  }

  // mão terminada
  if (g.phase === "show_summary" && !t.countedHands[t.handIdx] && Array.isArray(g.tPts)) {
    t.countedHands[t.handIdx] = true;
    const my = g.tPts[myTeam] || 0;
    const op = g.tPts[1 - myTeam] || 0;
    t.hands++;
    if (my > op) {
      t.handsWon++;
      if (op < 30) t.capotes++;
      if (g.batido && g.trump === "copas") t.batidoWins++;
    }
    t.maxHandCardPts = Math.max(t.maxHandCardPts, my);
    for (const e of g.events || []) {
      if (e.tm !== myTeam) continue;
      const l = String(e.lbl || "").toLowerCase();
      if (l.indexOf("réle") === 0 || l.indexOf("rele") === 0) t.reles++;
      else if (l.indexOf("7 de abertura") === 0) t.sevenOpenings++;
    }
  }
  t.lastPhase = g.phase;
}

/** Partida acabou (summaryFinalMPts preenchido)? Devolve o relatório uma única vez por partida. */
export function trackerTakeReport(t: MatchTracker, g: GameLike, mySeat: number, mode: "solo" | "online", humans: number, roomId: string): MatchReport | null {
  const sf = g.summaryFinalMPts;
  if (!sf || sf.length < 2 || sf[0] === sf[1]) return null;
  const key = `${t.handIdx}:${sf[0]}-${sf[1]}`;
  if (t.reportedKey === key) return null;
  t.reportedKey = key;
  const myTeam = pTm(mySeat);
  const report: MatchReport = {
    at: Date.now(),
    mode,
    humans: Math.max(1, Math.min(4, humans)),
    roomId,
    won: sf[myTeam] > sf[1 - myTeam],
    myTeamPts: sf[myTeam],
    oppPts: sf[1 - myTeam],
    hands: Math.max(1, t.hands),
    handsWon: t.handsWon,
    maxHandCardPts: t.maxHandCardPts,
    capotes: t.capotes,
    tricksWon: t.tricksWon,
    trumpTricksWon: t.trumpTricksWon,
    reles: t.reles,
    sevenOpenings: t.sevenOpenings,
    batidoWins: t.batidoWins,
  };
  // zera contadores para a próxima partida (mantém handIdx para as chaves continuarem únicas)
  t.hands = 0; t.handsWon = 0; t.maxHandCardPts = 0; t.capotes = 0; t.tricksWon = 0; t.trumpTricksWon = 0; t.reles = 0; t.sevenOpenings = 0; t.batidoWins = 0;
  return report;
}
