/**
 * MOTOR DA PROGRESSÃO — funções puras (sem rede, sem React).
 * Usadas pelo servidor (conta Google) e pelo navegador (convidado, salvo no aparelho).
 * Entrada: estado + partida reportada → saída: novo estado + eventos para celebrar.
 */
import { DECKS, DECK_BY_ID, DEFAULT_DECK, type DeckDef } from "@/data/decks";
import { ACHIEVEMENTS, DAILY_COUNT, DAILY_POOL, MISSION_BY_ID, WEEKLY_COUNT, WEEKLY_POOL, pickRotation, type MissionDef } from "@/data/missions";
import { MATCH_XP, dayKey, levelFromXp, tierForLevel, weekKey } from "@/data/progression";
import { emptyEvents, type MatchReport, type MissionProgress, type ProgressEvents, type ProgressState } from "./types";

export const ROOM_IDS = ["terrafe", "hub", "floresta", "sala"];

export function createInitialProgress(now: number): ProgressState {
  const s: ProgressState = {
    v: 1,
    xp: 0,
    level: 1,
    matches: 0,
    wins: 0,
    streak: 0,
    bestStreak: 0,
    stats: {},
    missions: { dayKey: "", weekKey: "", daily: [], weekly: [], achievements: {} },
    decks: { unlocked: [DEFAULT_DECK.id], equipped: DEFAULT_DECK.id, unseen: [] },
    clanId: null,
    xpMatchesToday: { dayKey: dayKey(now), count: 0 },
    createdAt: now,
    updatedAt: now,
    lastMatchAt: 0,
  };
  return refreshRotations(s, now);
}

/** Garante campos em estados antigos/incompletos vindos do banco ou do aparelho. */
export function normalizeProgress(raw: unknown, now: number): ProgressState {
  const base = createInitialProgress(now);
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<ProgressState>;
  const s: ProgressState = {
    ...base,
    ...r,
    v: 1,
    stats: { ...(r.stats || {}) },
    missions: {
      dayKey: r.missions?.dayKey || "",
      weekKey: r.missions?.weekKey || "",
      daily: Array.isArray(r.missions?.daily) ? r.missions!.daily : [],
      weekly: Array.isArray(r.missions?.weekly) ? r.missions!.weekly : [],
      achievements: { ...(r.missions?.achievements || {}) },
    },
    decks: {
      unlocked: Array.isArray(r.decks?.unlocked) && r.decks!.unlocked.length ? Array.from(new Set(r.decks!.unlocked)) : [DEFAULT_DECK.id],
      equipped: r.decks?.equipped && DECK_BY_ID[r.decks.equipped] ? r.decks.equipped : DEFAULT_DECK.id,
      unseen: Array.isArray(r.decks?.unseen) ? r.decks!.unseen : [],
    },
    xpMatchesToday: r.xpMatchesToday && typeof r.xpMatchesToday === "object" ? r.xpMatchesToday : base.xpMatchesToday,
    clanId: typeof r.clanId === "string" ? r.clanId : null,
  };
  s.level = levelFromXp(s.xp).level;
  if (!s.decks.unlocked.includes(s.decks.equipped)) s.decks.equipped = DEFAULT_DECK.id;
  return refreshRotations(s, now);
}

/** Renova diárias/semanais quando a chave do dia/semana muda. Garante entradas de conquistas visíveis. */
export function refreshRotations(state: ProgressState, now: number): ProgressState {
  const dk = dayKey(now);
  const wk = weekKey(now);
  let s = state;
  if (s.missions.dayKey !== dk) {
    s = { ...s, missions: { ...s.missions, dayKey: dk, daily: pickRotation(DAILY_POOL, dk, DAILY_COUNT).map(freshProgress) } };
  }
  if (s.missions.weekKey !== wk) {
    s = { ...s, missions: { ...s.missions, weekKey: wk, weekly: pickRotation(WEEKLY_POOL, wk, WEEKLY_COUNT).map(freshProgress) } };
  }
  if (s.xpMatchesToday.dayKey !== dk) s = { ...s, xpMatchesToday: { dayKey: dk, count: 0 } };
  // conquistas: cria entradas (progresso a partir das estatísticas acumuladas)
  const ach = { ...s.missions.achievements };
  let changed = false;
  for (const m of ACHIEVEMENTS) {
    if (!ach[m.id]) {
      ach[m.id] = { ...freshProgress(m.id), progress: Math.min(m.target, metricValue(s, m.metric)) };
      if (ach[m.id].progress >= m.target) ach[m.id].done = true;
      changed = true;
    }
  }
  if (changed) s = { ...s, missions: { ...s.missions, achievements: ach } };
  // baralhos por nível / clã (idempotente)
  return syncUnlocks(s);
}

function freshProgress(id: string): MissionProgress {
  return { id, progress: 0, done: false, claimed: false };
}

/** Valor atual de uma métrica a partir das estatísticas acumuladas. */
export function metricValue(s: ProgressState, metric: string): number {
  if (metric === "rooms_distinct") return ROOM_IDS.filter((r) => (s.stats[`played_room:${r}`] || 0) > 0).length;
  if (metric === "rooms_won_distinct") return ROOM_IDS.filter((r) => (s.stats[`won_room:${r}`] || 0) > 0).length;
  if (metric === "win_streak") return s.bestStreak;
  if (metric === "clan_joined") return s.clanId ? 1 : 0;
  if (metric === "decks_unlocked") return s.decks.unlocked.length;
  return s.stats[metric] || 0;
}

/** Métricas que a partida acrescenta (delta). */
function matchDeltas(r: MatchReport): Record<string, number> {
  const d: Record<string, number> = {};
  const add = (k: string, v: number) => {
    if (v > 0) d[k] = (d[k] || 0) + v;
  };
  add("played", 1);
  if (r.won) add("won", 1);
  if (r.mode === "solo") {
    add("played_solo", 1);
    if (r.won) add("won_solo", 1);
  } else {
    add("played_online", 1);
    if (r.won) add("won_online", 1);
    if (r.humans >= 2) {
      add("played_friends", 1);
      if (r.won) add("won_friends", 1);
    }
  }
  add(`played_room:${r.roomId}`, 1);
  if (r.won) add(`won_room:${r.roomId}`, 1);
  add("hands", r.hands);
  add("hands_won", r.handsWon);
  add("capotes", r.capotes);
  add("tricks", r.tricksWon);
  add("trump_tricks", r.trumpTricksWon);
  add("reles", r.reles);
  add("seven_openings", r.sevenOpenings);
  add("batido_wins", r.batidoWins);
  if (r.maxHandCardPts >= 70) add("big_hands", 1);
  return d;
}

/** XP da partida, linha a linha. */
export function matchXpLines(r: MatchReport): { lines: { label: string; xp: number }[]; total: number } {
  const lines: { label: string; xp: number }[] = [];
  lines.push({ label: "Partida jogada", xp: MATCH_XP.played });
  if (r.won) lines.push({ label: "Vitória", xp: MATCH_XP.win });
  const hw = Math.min(5, r.handsWon);
  if (hw > 0) lines.push({ label: `${hw} ${hw === 1 ? "mão vencida" : "mãos vencidas"}`, xp: hw * MATCH_XP.handWon });
  if (r.capotes > 0) lines.push({ label: `${r.capotes} capote${r.capotes > 1 ? "s" : ""}`, xp: r.capotes * MATCH_XP.capote });
  if (r.reles > 0) lines.push({ label: `${r.reles} Réle${r.reles > 1 ? "s" : ""}`, xp: r.reles * MATCH_XP.rele });
  if (r.sevenOpenings > 0) lines.push({ label: "7 de abertura", xp: r.sevenOpenings * MATCH_XP.sevenOpening });
  if (r.batidoWins > 0) lines.push({ label: "Copas batido", xp: r.batidoWins * MATCH_XP.batidoWin });
  if (r.maxHandCardPts >= 70) lines.push({ label: `Mão de ${r.maxHandCardPts} pontos`, xp: MATCH_XP.bigHand });
  if (r.mode === "online" && r.humans >= 2) lines.push({ label: "Com amigos", xp: MATCH_XP.friends });
  let total = lines.reduce((a, l) => a + l.xp, 0);
  if (r.mode === "solo") {
    const cut = Math.round(total * (1 - MATCH_XP.soloMultiplier));
    lines.push({ label: "Contra bots (70%)", xp: -cut });
    total -= cut;
  }
  return { lines, total };
}

/** Aplica progresso a uma lista de missões; devolve lista nova e ids que progrediram/completaram. */
function advanceMissions(list: MissionProgress[], deltas: Record<string, number>, state: ProgressState, now: number, ev: ProgressEvents): MissionProgress[] {
  return list.map((mp) => {
    const def = MISSION_BY_ID[mp.id];
    if (!def || mp.done) return mp;
    let next = mp.progress;
    if (def.metric in deltas) next += deltas[def.metric];
    else if (["rooms_distinct", "rooms_won_distinct", "win_streak", "clan_joined", "decks_unlocked"].includes(def.metric)) next = Math.max(next, metricValue(state, def.metric));
    if (next === mp.progress) return mp;
    ev.missionsProgressed.push(mp.id);
    const done = next >= def.target;
    if (done) ev.missionsCompleted.push(mp.id);
    return { ...mp, progress: Math.min(def.target, next), done, completedAt: done ? now : mp.completedAt };
  });
}

function advanceAchievements(state: ProgressState, deltas: Record<string, number>, now: number, ev: ProgressEvents): Record<string, MissionProgress> {
  const out: Record<string, MissionProgress> = {};
  for (const m of ACHIEVEMENTS) {
    const cur = state.missions.achievements[m.id] || freshProgress(m.id);
    if (cur.done) {
      out[m.id] = cur;
      continue;
    }
    const val = Math.min(m.target, metricValue(state, m.metric));
    void deltas;
    if (val !== cur.progress) {
      ev.missionsProgressed.push(m.id);
      const done = val >= m.target;
      if (done) ev.missionsCompleted.push(m.id);
      out[m.id] = { ...cur, progress: val, done, completedAt: done ? now : cur.completedAt };
    } else out[m.id] = cur;
  }
  return out;
}

/** Baralhos que o nível/clã liberam. Idempotente. */
export function syncUnlocks(state: ProgressState, ev?: ProgressEvents): ProgressState {
  const unlocked = new Set(state.decks.unlocked);
  const unseen = new Set(state.decks.unseen);
  let changed = false;
  for (const d of DECKS) {
    if (unlocked.has(d.id)) continue;
    const ok = (d.unlock.type === "level" && state.level >= d.unlock.level) || (d.unlock.type === "clan" && state.clanId === d.unlock.clanId) || d.unlock.type === "default";
    if (ok) {
      unlocked.add(d.id);
      unseen.add(d.id);
      ev?.decksUnlocked.push(d.id);
      changed = true;
    }
  }
  if (!changed) return state;
  return { ...state, decks: { ...state.decks, unlocked: Array.from(unlocked), unseen: Array.from(unseen) } };
}

function addXp(state: ProgressState, xp: number, ev: ProgressEvents): ProgressState {
  if (xp <= 0) return state;
  const before = state.level;
  const nxp = state.xp + xp;
  const after = levelFromXp(nxp).level;
  ev.xpGained += xp;
  ev.levelAfter = after;
  if (tierForLevel(after).id !== tierForLevel(before).id) ev.tierChanged = true;
  return { ...state, xp: nxp, level: after };
}

/** Partida terminada → novo estado + eventos. */
export function applyMatch(state0: ProgressState, r: MatchReport): { state: ProgressState; events: ProgressEvents } {
  const now = r.at || Date.now();
  let s = refreshRotations(state0, now);
  const ev = emptyEvents(s.level);

  // estatísticas
  const deltas = matchDeltas(r);
  const stats = { ...s.stats };
  for (const k of Object.keys(deltas)) stats[k] = (stats[k] || 0) + deltas[k];
  const streak = r.won ? s.streak + 1 : 0;
  s = { ...s, stats, matches: s.matches + 1, wins: s.wins + (r.won ? 1 : 0), streak, bestStreak: Math.max(s.bestStreak, streak), lastMatchAt: now, updatedAt: now };

  // missões
  const daily = advanceMissions(s.missions.daily, deltas, s, now, ev);
  const weekly = advanceMissions(s.missions.weekly, deltas, s, now, ev);
  const achievements = advanceAchievements(s, deltas, now, ev);
  s = { ...s, missions: { ...s.missions, daily, weekly, achievements } };

  // XP (com limite diário anti-farm)
  const { lines, total } = matchXpLines(r);
  if (s.xpMatchesToday.count < MATCH_XP.dailyMatchCap) {
    ev.xpLines = lines;
    s = addXp(s, total, ev);
    s = { ...s, xpMatchesToday: { dayKey: s.xpMatchesToday.dayKey, count: s.xpMatchesToday.count + 1 } };
  } else {
    ev.xpLines = [{ label: "Limite diário de XP por partidas atingido", xp: 0 }];
  }
  s = syncUnlocks(s, ev);
  return { state: s, events: ev };
}

function findMission(s: ProgressState, id: string): { where: "daily" | "weekly" | "achievement"; mp: MissionProgress } | null {
  const d = s.missions.daily.find((m) => m.id === id);
  if (d) return { where: "daily", mp: d };
  const w = s.missions.weekly.find((m) => m.id === id);
  if (w) return { where: "weekly", mp: w };
  const a = s.missions.achievements[id];
  if (a) return { where: "achievement", mp: a };
  return null;
}

/** Resgata uma missão concluída: dá o XP (e o baralho) e marca como resgatada. */
export function claimMission(state0: ProgressState, id: string, now: number): { state: ProgressState; events: ProgressEvents; ok: boolean } {
  let s = refreshRotations(state0, now);
  const ev = emptyEvents(s.level);
  const def = MISSION_BY_ID[id];
  const found = findMission(s, id);
  if (!def || !found || !found.mp.done || found.mp.claimed) return { state: s, events: ev, ok: false };
  const claimed = { ...found.mp, claimed: true };
  if (found.where === "daily") s = { ...s, missions: { ...s.missions, daily: s.missions.daily.map((m) => (m.id === id ? claimed : m)) } };
  else if (found.where === "weekly") s = { ...s, missions: { ...s.missions, weekly: s.missions.weekly.map((m) => (m.id === id ? claimed : m)) } };
  else s = { ...s, missions: { ...s.missions, achievements: { ...s.missions.achievements, [id]: claimed } } };
  ev.xpLines = [{ label: def.title, xp: def.xp }];
  s = addXp(s, def.xp, ev);
  if (def.reward?.deckId && DECK_BY_ID[def.reward.deckId] && !s.decks.unlocked.includes(def.reward.deckId)) {
    s = { ...s, decks: { ...s.decks, unlocked: [...s.decks.unlocked, def.reward.deckId], unseen: [...s.decks.unseen, def.reward.deckId] } };
    ev.decksUnlocked.push(def.reward.deckId);
  }
  s = syncUnlocks(s, ev);
  return { state: { ...s, updatedAt: now }, events: ev, ok: true };
}

export function equipDeck(state: ProgressState, deckId: string): ProgressState {
  if (!state.decks.unlocked.includes(deckId)) return state;
  return { ...state, decks: { ...state.decks, equipped: deckId }, updatedAt: Date.now() };
}

export function markDecksSeen(state: ProgressState, ids: string[]): ProgressState {
  if (!ids.length) return state;
  return { ...state, decks: { ...state.decks, unseen: state.decks.unseen.filter((d) => !ids.includes(d)) } };
}

export function setClan(state0: ProgressState, clanId: string | null, now: number): { state: ProgressState; events: ProgressEvents } {
  let s = { ...state0, clanId, updatedAt: now };
  const ev = emptyEvents(s.level);
  s = refreshRotations(s, now);
  const achievements = advanceAchievements(s, {}, now, ev);
  s = { ...s, missions: { ...s.missions, achievements } };
  s = syncUnlocks(s, ev);
  return { state: s, events: ev };
}

/** Missões concluídas e ainda não resgatadas (para a bolinha vermelha). */
export function claimableCount(s: ProgressState): number {
  const list = [...s.missions.daily, ...s.missions.weekly, ...Object.values(s.missions.achievements)];
  return list.filter((m) => m.done && !m.claimed).length;
}

/** Conquista visível? (etapas escondidas até a anterior ser concluída) */
export function achievementVisible(s: ProgressState, m: MissionDef): boolean {
  if (!m.hiddenUntil) return true;
  const prev = s.missions.achievements[m.hiddenUntil];
  return !!prev && prev.done;
}

export function deckDef(id: string): DeckDef {
  return DECK_BY_ID[id] || DEFAULT_DECK;
}
