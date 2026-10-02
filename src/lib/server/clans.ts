import "server-only";
/**
 * Clãs no servidor: bisca/clans/{id}. Os 5 oficiais são criados no banco na primeira vez que alguém entra.
 */

import { OFFICIAL_CLANS, OFFICIAL_CLAN_BY_ID, PLAYER_CLAN_COLORS, PLAYER_CLAN_EMBLEMS, type ClanEmblemKind } from "@/data/clans";
import { adminDb } from "./auth";
import { readUserRecord, toProfile } from "./profile";
import { readProgress, setClanForUser } from "./progress";

export const CLAN_MAX_MEMBERS = 50;
export const CLAN_NAME_MIN = 3;
export const CLAN_NAME_MAX = 24;

export type ClanMember = { name: string; picture: string; joinedAt: number; level: number };
export type ClanRecord = {
  id: string;
  name: string;
  short: string;
  tag: string;
  emblem: ClanEmblemKind;
  color: string;
  color2: string;
  fg: string;
  official: boolean;
  ownerUid: string | null;
  createdAt: number;
  score: number;
  members: Record<string, ClanMember>;
  motto?: string;
  logo?: string;
};

export type ClanSummary = Omit<ClanRecord, "members"> & { memberCount: number };

function clansRef() {
  return adminDb().ref("bisca/clans");
}

function officialRecord(id: string): ClanRecord | null {
  const c = OFFICIAL_CLAN_BY_ID[id];
  if (!c) return null;
  return { id: c.id, name: c.name, short: c.short, tag: c.tag, emblem: c.emblem, color: c.color, color2: c.color2, fg: c.fg, official: true, ownerUid: null, createdAt: 0, score: 0, members: {}, motto: c.motto, logo: c.logo };
}

function normalizeClan(id: string, raw: unknown): ClanRecord | null {
  const base = officialRecord(id);
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<ClanRecord>;
  const members: Record<string, ClanMember> = {};
  const rm = (r.members && typeof r.members === "object" ? r.members : {}) as Record<string, Partial<ClanMember>>;
  for (const uid of Object.keys(rm)) {
    const m = rm[uid] || {};
    members[uid] = { name: String(m.name || "Jogador"), picture: String(m.picture || ""), joinedAt: Number(m.joinedAt || 0), level: Number(m.level || 1) };
  }
  if (base) return { ...base, score: Number(r.score || 0), members, createdAt: Number(r.createdAt || 0) };
  if (!r.name) return null;
  return {
    id,
    name: String(r.name),
    short: String(r.short || r.name),
    tag: String(r.tag || "").slice(0, 4),
    emblem: (PLAYER_CLAN_EMBLEMS.includes(r.emblem as ClanEmblemKind) ? r.emblem : "shield") as ClanEmblemKind,
    color: String(r.color || PLAYER_CLAN_COLORS[0]),
    color2: String(r.color2 || "#0a0a12"),
    fg: String(r.fg || "#ffffff"),
    official: false,
    ownerUid: r.ownerUid ? String(r.ownerUid) : null,
    createdAt: Number(r.createdAt || 0),
    score: Number(r.score || 0),
    members,
  };
}

export function summarize(c: ClanRecord): ClanSummary {
  const { members, ...rest } = c;
  return { ...rest, memberCount: Object.keys(members).length };
}

export async function listClans(): Promise<ClanSummary[]> {
  const snap = await clansRef().get();
  const raw = (snap.exists() ? snap.val() : {}) as Record<string, unknown>;
  const out: ClanRecord[] = [];
  for (const o of OFFICIAL_CLANS) {
    const rec = normalizeClan(o.id, raw[o.id]);
    if (rec) out.push(rec);
  }
  for (const id of Object.keys(raw)) {
    if (OFFICIAL_CLAN_BY_ID[id]) continue;
    const rec = normalizeClan(id, raw[id]);
    if (rec) out.push(rec);
  }
  out.sort((a, b) => (b.official ? 1 : 0) - (a.official ? 1 : 0) || b.score - a.score || a.name.localeCompare(b.name));
  return out.map(summarize);
}

export async function getClan(id: string): Promise<ClanRecord | null> {
  if (!/^[a-z0-9-]{2,60}$/.test(id)) return null;
  const snap = await clansRef().child(id).get();
  return normalizeClan(id, snap.exists() ? snap.val() : null);
}

async function memberInfo(uid: string): Promise<ClanMember> {
  const rec = await readUserRecord(uid);
  const prof = toProfile(uid, rec || {});
  const prog = await readProgress(uid);
  return { name: prof.name, picture: prof.picture, joinedAt: Date.now(), level: prog.level };
}

export async function joinClan(uid: string, clanId: string): Promise<{ ok: boolean; error?: string; clan?: ClanRecord }> {
  const clan = await getClan(clanId);
  if (!clan) return { ok: false, error: "Clã não encontrado" };
  const prog = await readProgress(uid);
  if (prog.clanId && prog.clanId !== clanId) return { ok: false, error: "Saia do seu clã atual antes de entrar em outro" };
  if (Object.keys(clan.members).length >= CLAN_MAX_MEMBERS && !clan.members[uid]) return { ok: false, error: "Este clã está cheio" };
  const info = await memberInfo(uid);
  const ref = clansRef().child(clanId);
  if (clan.official && !clan.createdAt) {
    const base = officialRecord(clanId)!;
    await ref.update({ id: base.id, name: base.name, short: base.short, tag: base.tag, emblem: base.emblem, color: base.color, color2: base.color2, fg: base.fg, official: true, createdAt: Date.now(), score: 0 });
  }
  await ref.child("members/" + uid).set(info);
  await setClanForUser(uid, clanId);
  const fresh = await getClan(clanId);
  return { ok: true, clan: fresh || clan };
}

export async function leaveClan(uid: string): Promise<{ ok: boolean; error?: string }> {
  const prog = await readProgress(uid);
  const clanId = prog.clanId;
  if (!clanId) return { ok: false, error: "Você não está em um clã" };
  const clan = await getClan(clanId);
  const ref = clansRef().child(clanId);
  if (clan) {
    const rest = Object.keys(clan.members).filter((u) => u !== uid);
    await ref.child("members/" + uid).remove();
    if (!clan.official) {
      if (rest.length === 0) await ref.remove();
      else if (clan.ownerUid === uid) {
        rest.sort((a, b) => clan.members[a].joinedAt - clan.members[b].joinedAt);
        await ref.child("ownerUid").set(rest[0]);
      }
    }
  }
  await setClanForUser(uid, null);
  return { ok: true };
}

function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export async function createClan(uid: string, input: { name?: unknown; tag?: unknown; emblem?: unknown; color?: unknown }): Promise<{ ok: boolean; error?: string; clan?: ClanRecord }> {
  const name = typeof input.name === "string" ? input.name.replace(/\s+/g, " ").trim() : "";
  if (name.length < CLAN_NAME_MIN || name.length > CLAN_NAME_MAX) return { ok: false, error: `Nome do clã: ${CLAN_NAME_MIN} a ${CLAN_NAME_MAX} caracteres` };
  if (!/^[\p{L}\p{N} _.\-!]+$/u.test(name)) return { ok: false, error: "Nome com caracteres inválidos" };
  const tag = typeof input.tag === "string" ? input.tag.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) : "";
  if (tag.length < 2) return { ok: false, error: "Tag: 2 a 4 letras" };
  const emblem = (PLAYER_CLAN_EMBLEMS.includes(input.emblem as ClanEmblemKind) ? input.emblem : "shield") as ClanEmblemKind;
  const color = typeof input.color === "string" && PLAYER_CLAN_COLORS.includes(input.color) ? input.color : PLAYER_CLAN_COLORS[0];
  const prog = await readProgress(uid);
  if (prog.clanId) return { ok: false, error: "Saia do seu clã atual antes de criar outro" };
  const base = slug(name) || "cla";
  const id = `${base}-${Math.random().toString(36).slice(2, 7)}`;
  const info = await memberInfo(uid);
  const light = color === "#f4f1ea";
  const rec: ClanRecord = {
    id,
    name,
    short: name,
    tag,
    emblem,
    color,
    color2: light ? "#9ca3af" : "#0a0a12",
    fg: light ? "#15161c" : "#ffffff",
    official: false,
    ownerUid: uid,
    createdAt: Date.now(),
    score: 0,
    members: { [uid]: info },
  };
  await clansRef().child(id).set(rec);
  await setClanForUser(uid, id);
  return { ok: true, clan: rec };
}
