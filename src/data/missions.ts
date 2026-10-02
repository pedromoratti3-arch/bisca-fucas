/**
 * MISSÕES
 * - Diárias: 3 por dia, sorteadas (iguais para todos no mesmo dia) a partir de DAILY_POOL. Renovam à meia-noite (Brasília).
 * - Semanais: 3 por semana, de WEEKLY_POOL. Renovam na segunda-feira.
 * - Conquistas: permanentes, com etapas (10 → 50 → 100 vitórias etc.).
 * Quando uma missão fica completa, o jogador "resgata" na tela de Missões e recebe o XP (e o baralho, se houver).
 *
 * Métricas (o que a partida reporta — ver src/lib/progress/types.ts):
 *   played, won, won_solo, won_online, played_online, played_friends, won_friends, hands_won, capotes,
 *   tricks, trump_tricks, reles, seven_openings, batido_wins, big_hands (70+ pts numa mão),
 *   played_room:<id>, won_room:<id>, rooms_distinct, win_streak, clan_joined, decks_unlocked
 */
import type { IconName } from "@/design/icons";

export type MissionKind = "daily" | "weekly" | "achievement";

export type MissionDef = {
  id: string;
  kind: MissionKind;
  title: string;
  description: string;
  icon: IconName;
  metric: string;
  target: number;
  xp: number;
  /** recompensa extra ao resgatar */
  reward?: { deckId?: string };
  /** conquista: id da próxima etapa (aparece quando esta é resgatada) */
  next?: string;
  /** conquista escondida até a anterior ser concluída */
  hiddenUntil?: string;
};

export const DAILY_POOL: MissionDef[] = [
  { id: "d_play_2", kind: "daily", title: "Aquecimento", description: "Jogue 2 partidas", icon: "cards", metric: "played", target: 2, xp: 60 },
  { id: "d_win_1", kind: "daily", title: "Primeira do dia", description: "Vença 1 partida", icon: "trophy", metric: "won", target: 1, xp: 80 },
  { id: "d_trump_5", kind: "daily", title: "Mão de corte", description: "Ganhe 5 vazas com carta de corte", icon: "sword", metric: "trump_tricks", target: 5, xp: 70 },
  { id: "d_big_hand", kind: "daily", title: "Mão cheia", description: "Faça 70+ pontos de carta em uma mão", icon: "calculator", metric: "big_hands", target: 1, xp: 70 },
  { id: "d_online_1", kind: "daily", title: "Mesa online", description: "Jogue 1 partida online", icon: "people", metric: "played_online", target: 1, xp: 80 },
  { id: "d_bots_2", kind: "daily", title: "Treino contra a IA", description: "Vença 2 partidas contra bots", icon: "robot", metric: "won_solo", target: 2, xp: 70 },
  { id: "d_tricks_12", kind: "daily", title: "Colecionador de vazas", description: "Ganhe 12 vazas", icon: "deck", metric: "tricks", target: 12, xp: 60 },
  { id: "d_room_terrafe", kind: "daily", title: "Cafezinho", description: "Jogue 1 partida no Terrafé", icon: "home", metric: "played_room:terrafe", target: 1, xp: 60 },
  { id: "d_room_floresta", kind: "daily", title: "Ar puro", description: "Jogue 1 partida na Floresta", icon: "home", metric: "played_room:floresta", target: 1, xp: 60 },
  { id: "d_room_hub", kind: "daily", title: "Pelo HUB", description: "Jogue 1 partida no HUB Fucape", icon: "home", metric: "played_room:hub", target: 1, xp: 60 },
  { id: "d_hands_3", kind: "daily", title: "Mãos firmes", description: "Vença 3 mãos", icon: "check", metric: "hands_won", target: 3, xp: 60 },
  { id: "d_capote_1", kind: "daily", title: "Capote!", description: "Dê 1 capote (adversário com menos de 30 pontos)", icon: "fire", metric: "capotes", target: 1, xp: 90 },
];

export const WEEKLY_POOL: MissionDef[] = [
  { id: "w_win_7", kind: "weekly", title: "Semana vitoriosa", description: "Vença 7 partidas", icon: "trophy", metric: "won", target: 7, xp: 300 },
  { id: "w_play_15", kind: "weekly", title: "Maratona", description: "Jogue 15 partidas", icon: "cards", metric: "played", target: 15, xp: 250 },
  { id: "w_friends_3", kind: "weekly", title: "Com os amigos", description: "Vença 3 partidas com amigos (2+ humanos na mesa)", icon: "people", metric: "won_friends", target: 3, xp: 350 },
  { id: "w_capote_2", kind: "weekly", title: "Capotes em série", description: "Dê 2 capotes", icon: "fire", metric: "capotes", target: 2, xp: 300 },
  { id: "w_rooms_3", kind: "weekly", title: "Turista", description: "Jogue em 3 salas diferentes", icon: "flag", metric: "rooms_distinct", target: 3, xp: 250 },
  { id: "w_rele_1", kind: "weekly", title: "Réle!", description: "Faça uma Réle (7 de corte seguido do Ás)", icon: "bolt", metric: "reles", target: 1, xp: 300 },
  { id: "w_trump_25", kind: "weekly", title: "Rei do corte", description: "Ganhe 25 vazas com carta de corte", icon: "sword", metric: "trump_tricks", target: 25, xp: 280 },
  { id: "w_seven_3", kind: "weekly", title: "Abertura de 7", description: "Faça 3 aberturas com o 7 de corte", icon: "spark", metric: "seven_openings", target: 3, xp: 300 },
  { id: "w_streak_3", kind: "weekly", title: "Em chamas", description: "Vença 3 partidas seguidas", icon: "fire", metric: "win_streak", target: 3, xp: 320 },
];

export const ACHIEVEMENTS: MissionDef[] = [
  { id: "ach_first_win", kind: "achievement", title: "Primeira vitória", description: "Vença sua primeira partida", icon: "trophy", metric: "won", target: 1, xp: 100 },
  { id: "ach_win_10", kind: "achievement", title: "Veterano I", description: "Vença 10 partidas", icon: "medal", metric: "won", target: 10, xp: 250, next: "ach_win_50" },
  { id: "ach_win_50", kind: "achievement", title: "Veterano II", description: "Vença 50 partidas", icon: "medal", metric: "won", target: 50, xp: 600, next: "ach_win_100", hiddenUntil: "ach_win_10" },
  { id: "ach_win_100", kind: "achievement", title: "Zero", description: "Vença 100 partidas e desbloqueie o baralho 0", icon: "crown", metric: "won", target: 100, xp: 1500, reward: { deckId: "zero" }, hiddenUntil: "ach_win_50" },
  { id: "ach_play_25", kind: "achievement", title: "Frequentador I", description: "Jogue 25 partidas", icon: "cards", metric: "played", target: 25, xp: 200, next: "ach_play_100" },
  { id: "ach_play_100", kind: "achievement", title: "Frequentador II", description: "Jogue 100 partidas", icon: "cards", metric: "played", target: 100, xp: 500, next: "ach_play_500", hiddenUntil: "ach_play_25" },
  { id: "ach_play_500", kind: "achievement", title: "Morador da mesa", description: "Jogue 500 partidas", icon: "cards", metric: "played", target: 500, xp: 1200, hiddenUntil: "ach_play_100" },
  { id: "ach_bots_5", kind: "achievement", title: "Domador de bots", description: "Vença 5 partidas contra bots", icon: "robot", metric: "won_solo", target: 5, xp: 150 },
  { id: "ach_online_10", kind: "achievement", title: "Noturno", description: "Jogue 10 partidas online", icon: "people", metric: "played_online", target: 10, xp: 300, reward: { deckId: "noturno" } },
  { id: "ach_friends_10", kind: "achievement", title: "Turma da bisca", description: "Jogue 10 partidas com amigos", icon: "people", metric: "played_friends", target: 10, xp: 300 },
  { id: "ach_capote_5", kind: "achievement", title: "Capotador I", description: "Dê 5 capotes", icon: "fire", metric: "capotes", target: 5, xp: 250, next: "ach_capote_25" },
  { id: "ach_capote_25", kind: "achievement", title: "Capotador II", description: "Dê 25 capotes", icon: "fire", metric: "capotes", target: 25, xp: 700, hiddenUntil: "ach_capote_5" },
  { id: "ach_rele_1", kind: "achievement", title: "Primeira Réle", description: "Faça uma Réle", icon: "bolt", metric: "reles", target: 1, xp: 200, next: "ach_rele_10" },
  { id: "ach_rele_10", kind: "achievement", title: "Relezeiro", description: "Faça 10 Réles", icon: "bolt", metric: "reles", target: 10, xp: 800, hiddenUntil: "ach_rele_1" },
  { id: "ach_seven_5", kind: "achievement", title: "Abertura perfeita", description: "Faça 5 aberturas com o 7 de corte", icon: "spark", metric: "seven_openings", target: 5, xp: 300 },
  { id: "ach_batido_3", kind: "achievement", title: "Copas batido", description: "Vença 3 mãos com copas batido", icon: "shield", metric: "batido_wins", target: 3, xp: 300 },
  { id: "ach_trump_100", kind: "achievement", title: "Mestre do corte", description: "Ganhe 100 vazas com carta de corte", icon: "sword", metric: "trump_tricks", target: 100, xp: 600 },
  { id: "ach_streak_5", kind: "achievement", title: "Invicto", description: "Vença 5 partidas seguidas", icon: "fire", metric: "win_streak", target: 5, xp: 400 },
  { id: "ach_rooms_4", kind: "achievement", title: "Conhece a casa", description: "Vença em todas as 4 salas", icon: "flag", metric: "rooms_won_distinct", target: 4, xp: 300 },
  { id: "ach_win_terrafe_5", kind: "achievement", title: "Da casa: Terrafé", description: "Vença 5 partidas no Terrafé", icon: "home", metric: "won_room:terrafe", target: 5, xp: 250, reward: { deckId: "terrafe" } },
  { id: "ach_win_floresta_5", kind: "achievement", title: "Da casa: Floresta", description: "Vença 5 partidas na Floresta", icon: "home", metric: "won_room:floresta", target: 5, xp: 250, reward: { deckId: "floresta" } },
  { id: "ach_win_hub_5", kind: "achievement", title: "Da casa: HUB", description: "Vença 5 partidas no HUB Fucape", icon: "home", metric: "won_room:hub", target: 5, xp: 250, reward: { deckId: "hub" } },
  { id: "ach_win_sala_5", kind: "achievement", title: "Da casa: Sala de Aula", description: "Vença 5 partidas na Sala de Aula", icon: "home", metric: "won_room:sala", target: 5, xp: 250, reward: { deckId: "sala-de-aula" } },
  { id: "ach_clan", kind: "achievement", title: "De clã", description: "Entre em um clã", icon: "shield", metric: "clan_joined", target: 1, xp: 150 },
  { id: "ach_decks_5", kind: "achievement", title: "Colecionador", description: "Desbloqueie 5 baralhos", icon: "deck", metric: "decks_unlocked", target: 5, xp: 200 },
];

export const MISSION_BY_ID: Record<string, MissionDef> = Object.fromEntries([...DAILY_POOL, ...WEEKLY_POOL, ...ACHIEVEMENTS].map((m) => [m.id, m]));

export const DAILY_COUNT = 3;
export const WEEKLY_COUNT = 3;

/** Sorteio determinístico (mesma chave → mesmas missões para todos). */
export function pickRotation(pool: MissionDef[], key: string, count: number): string[] {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const idx = pool.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1103515245) + 12345) >>> 0;
    const j = h % (i + 1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, count).map((i) => pool[i].id);
}
