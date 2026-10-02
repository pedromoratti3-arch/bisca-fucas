/** Tipos da progressão (compartilhados entre navegador e servidor). */

/** O que uma partida terminada reporta (calculado na mesa a partir do estado do jogo). */
export type MatchReport = {
  at: number;
  mode: "solo" | "online";
  /** humanos na mesa (1 = só eu) */
  humans: number;
  roomId: string;
  won: boolean;
  myTeamPts: number;
  oppPts: number;
  hands: number;
  handsWon: number;
  /** maior pontuação de cartas da minha dupla numa mão */
  maxHandCardPts: number;
  capotes: number;
  /** vazas que eu ganhei */
  tricksWon: number;
  /** vazas que eu ganhei com carta de corte */
  trumpTricksWon: number;
  /** Réles da minha dupla */
  reles: number;
  /** 7 de abertura da minha dupla */
  sevenOpenings: number;
  /** mãos vencidas pela minha dupla com copas batido */
  batidoWins: number;
};

export type MissionProgress = {
  id: string;
  progress: number;
  done: boolean;
  claimed: boolean;
  completedAt?: number;
};

export type ProgressState = {
  v: 1;
  xp: number;
  level: number;
  matches: number;
  wins: number;
  streak: number;
  bestStreak: number;
  /** métricas acumuladas (ver missions.ts) */
  stats: Record<string, number>;
  missions: {
    dayKey: string;
    weekKey: string;
    daily: MissionProgress[];
    weekly: MissionProgress[];
    achievements: Record<string, MissionProgress>;
  };
  decks: {
    unlocked: string[];
    equipped: string;
    /** baralhos desbloqueados que o jogador ainda não viu a animação */
    unseen: string[];
  };
  clanId: string | null;
  /** quantas partidas renderam XP hoje (limite diário) */
  xpMatchesToday: { dayKey: string; count: number };
  createdAt: number;
  updatedAt: number;
  lastMatchAt: number;
};

export type XpLine = { label: string; xp: number };

/** O que aconteceu ao aplicar uma partida ou um resgate (para as telas celebrarem). */
export type ProgressEvents = {
  xpGained: number;
  xpLines: XpLine[];
  levelBefore: number;
  levelAfter: number;
  tierChanged: boolean;
  missionsCompleted: string[];
  missionsProgressed: string[];
  decksUnlocked: string[];
};

export function emptyEvents(level: number): ProgressEvents {
  return { xpGained: 0, xpLines: [], levelBefore: level, levelAfter: level, tierChanged: false, missionsCompleted: [], missionsProgressed: [], decksUnlocked: [] };
}
