import "server-only";
/**
 * Progressão no servidor: lê/grava bisca/users/{uid}/progress (só o servidor escreve — regras bloqueiam o navegador).
 * Toda conta de XP/missão passa pelo motor puro (src/lib/progress/engine.ts), igual ao do convidado no aparelho.
 */

import { adminDb, userRef } from "./auth";
import { applyMatch, claimMission, equipDeck, markDecksSeen, normalizeProgress, ROOM_IDS, setClan } from "@/lib/progress/engine";
import { emptyEvents, type MatchReport, type ProgressEvents, type ProgressState } from "@/lib/progress/types";

/** Intervalo mínimo entre partidas reportadas (uma partida real dura bem mais). */
const MIN_REPORT_GAP_MS = 40_000;

export function progressRef(uid: string) {
  return userRef(uid).child("progress");
}

export async function readProgress(uid: string, now = Date.now()): Promise<ProgressState> {
  const snap = await progressRef(uid).get();
  return normalizeProgress(snap.exists() ? snap.val() : null, now);
}

export async function writeProgress(uid: string, state: ProgressState): Promise<void> {
  await progressRef(uid).set(state);
}

function clampInt(v: unknown, lo: number, hi: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!isFinite(n)) return lo;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

/** Valida e limita o relatório vindo do navegador (sem confiar em valores absurdos). */
export function sanitizeReport(raw: unknown, now: number): MatchReport | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const mode = r.mode === "online" ? "online" : r.mode === "solo" ? "solo" : null;
  if (!mode) return null;
  const roomId = typeof r.roomId === "string" && ROOM_IDS.includes(r.roomId) ? r.roomId : "sala";
  const hands = clampInt(r.hands, 1, 20);
  const handsWon = clampInt(r.handsWon, 0, hands);
  const tricksWon = clampInt(r.tricksWon, 0, hands * 10);
  return {
    at: now,
    mode,
    humans: clampInt(r.humans, 1, 4),
    roomId,
    won: !!r.won,
    myTeamPts: clampInt(r.myTeamPts, 0, 12),
    oppPts: clampInt(r.oppPts, 0, 12),
    hands,
    handsWon,
    maxHandCardPts: clampInt(r.maxHandCardPts, 0, 120),
    capotes: clampInt(r.capotes, 0, handsWon),
    tricksWon,
    trumpTricksWon: clampInt(r.trumpTricksWon, 0, tricksWon),
    reles: clampInt(r.reles, 0, hands),
    sevenOpenings: clampInt(r.sevenOpenings, 0, hands),
    batidoWins: clampInt(r.batidoWins, 0, handsWon),
  };
}

/** Aplica uma partida de forma atômica (transaction). Devolve o estado final e os eventos. */
export async function applyMatchForUser(uid: string, report: MatchReport): Promise<{ state: ProgressState; events: ProgressEvents; rejected?: string }> {
  let events: ProgressEvents | null = null;
  let rejected: string | undefined;
  const res = await progressRef(uid).transaction((cur) => {
    const s = normalizeProgress(cur, report.at);
    if (s.lastMatchAt && report.at - s.lastMatchAt < MIN_REPORT_GAP_MS) {
      rejected = "Partida reportada cedo demais.";
      events = emptyEvents(s.level);
      return s;
    }
    const out = applyMatch(s, report);
    events = out.events;
    return out.state;
  });
  const state = normalizeProgress(res.snapshot.val(), report.at);
  const ev = events || emptyEvents(state.level);
  if (!rejected && state.clanId && ev.xpGained > 0) await bumpClanScore(state.clanId, uid, ev.xpGained, state.level);
  return { state, events: ev, rejected };
}

export async function claimForUser(uid: string, missionId: string, now = Date.now()): Promise<{ state: ProgressState; events: ProgressEvents; ok: boolean }> {
  let events: ProgressEvents | null = null;
  let ok = false;
  const res = await progressRef(uid).transaction((cur) => {
    const out = claimMission(normalizeProgress(cur, now), missionId, now);
    events = out.events;
    ok = out.ok;
    return out.state;
  });
  const state = normalizeProgress(res.snapshot.val(), now);
  const ev = events || emptyEvents(state.level);
  if (ok && state.clanId && ev.xpGained > 0) await bumpClanScore(state.clanId, uid, ev.xpGained, state.level);
  return { state, events: ev, ok };
}

export async function equipForUser(uid: string, deckId: string, now = Date.now()): Promise<ProgressState> {
  const res = await progressRef(uid).transaction((cur) => equipDeck(normalizeProgress(cur, now), deckId));
  return normalizeProgress(res.snapshot.val(), now);
}

export async function markSeenForUser(uid: string, ids: string[], now = Date.now()): Promise<ProgressState> {
  const res = await progressRef(uid).transaction((cur) => markDecksSeen(normalizeProgress(cur, now), ids));
  return normalizeProgress(res.snapshot.val(), now);
}

export async function setClanForUser(uid: string, clanId: string | null, now = Date.now()): Promise<{ state: ProgressState; events: ProgressEvents }> {
  let events: ProgressEvents | null = null;
  const res = await progressRef(uid).transaction((cur) => {
    const out = setClan(normalizeProgress(cur, now), clanId, now);
    events = out.events;
    return out.state;
  });
  const state = normalizeProgress(res.snapshot.val(), now);
  return { state, events: events || emptyEvents(state.level) };
}

/**
 * Importa o progresso de convidado (guardado no aparelho) para a conta, uma única vez,
 * só se a conta ainda não jogou. Valores limitados para não aceitar trapaça óbvia.
 */
export async function importGuestProgress(uid: string, raw: unknown, now = Date.now()): Promise<{ state: ProgressState; imported: boolean }> {
  const guest = normalizeProgress(raw, now);
  let imported = false;
  const res = await progressRef(uid).transaction((cur) => {
    const s = normalizeProgress(cur, now);
    if (s.matches > 0 || guest.matches <= 0) return s;
    const capped: ProgressState = {
      ...guest,
      xp: Math.min(guest.xp, 20_000),
      matches: Math.min(guest.matches, 200),
      wins: Math.min(guest.wins, 200),
      clanId: null,
      createdAt: s.createdAt,
      updatedAt: now,
    };
    imported = true;
    return normalizeProgress(capped, now);
  });
  return { state: normalizeProgress(res.snapshot.val(), now), imported };
}

/** Pontuação do clã = XP ganho pelos membros enquanto no clã. Atualiza o nível do membro. */
async function bumpClanScore(clanId: string, uid: string, xp: number, level: number): Promise<void> {
  try {
    const db = adminDb();
    const ref = db.ref("bisca/clans/" + clanId);
    await ref.child("score").transaction((cur) => (typeof cur === "number" ? cur : 0) + xp);
    await ref.child("members/" + uid + "/level").set(level);
  } catch (e) {
    console.error("[clan score]", e);
  }
}
