import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, readSession, userRef } from "@/lib/server/auth";

/** Tempo mínimo entre trocas de apelido. */
export const NICKNAME_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 16;
/** Tamanho máximo da foto já reduzida no navegador (bytes da imagem, não do base64). */
export const AVATAR_MAX_BYTES = 150 * 1024;

export const GOOGLE_UID_RE = /^g_\d{1,40}$/;

type UserRecord = {
  name?: string;
  email?: string;
  picture?: string;
  nickname?: string;
  nicknameChangedAt?: number;
  avatar?: string; // data URL
  avatarUpdatedAt?: number;
};

/** Perfil devolvido ao navegador do próprio jogador. `name`/`picture` já são os efetivos (apelido / foto escolhida). */
export type Profile = {
  uid: string;
  email: string;
  googleName: string;
  googlePicture: string;
  nickname: string | null;
  name: string;
  picture: string;
  hasCustomAvatar: boolean;
  nextNicknameChangeAt: number;
};

export function avatarUrlFor(uid: string, rec: UserRecord): string {
  if (rec.avatar) return `/api/avatar/${uid}?v=${rec.avatarUpdatedAt || 0}`;
  return rec.picture || "";
}

export function toProfile(uid: string, rec: UserRecord): Profile {
  const nickname = rec.nickname || null;
  return {
    uid,
    email: rec.email || "",
    googleName: rec.name || "Jogador",
    googlePicture: rec.picture || "",
    nickname,
    name: nickname || rec.name || "Jogador",
    picture: avatarUrlFor(uid, rec),
    hasCustomAvatar: !!rec.avatar,
    nextNicknameChangeAt: nickname && rec.nicknameChangedAt ? rec.nicknameChangedAt + NICKNAME_COOLDOWN_MS : 0,
  };
}

export async function readUserRecord(uid: string): Promise<UserRecord | null> {
  const snap = await userRef(uid).get();
  return snap.exists() ? (snap.val() as UserRecord) : null;
}

/** uid do jogador logado (pelo cookie) ou null. */
export async function sessionUid(): Promise<string | null> {
  const cookieStore = await cookies();
  const s = await readSession(cookieStore.get(SESSION_COOKIE)?.value);
  return s ? s.uid : null;
}

/** Normaliza e valida o apelido. Devolve o apelido limpo ou uma mensagem de erro. */
export function cleanNickname(raw: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof raw !== "string") return { ok: false, error: "Apelido inválido" };
  const v = raw.replace(/\s+/g, " ").trim();
  if (v.length < NICKNAME_MIN) return { ok: false, error: `Use pelo menos ${NICKNAME_MIN} caracteres` };
  if (v.length > NICKNAME_MAX) return { ok: false, error: `Use no máximo ${NICKNAME_MAX} caracteres` };
  if (!/^[\p{L}\p{N} _.\-]+$/u.test(v)) return { ok: false, error: "Use só letras, números, espaço, _ . -" };
  return { ok: true, value: v };
}

/** Decodifica e valida a foto (data URL JPEG/PNG/WEBP). */
export function parseAvatar(raw: unknown): { ok: true; mime: string; bytes: Buffer; dataUrl: string } | { ok: false; error: string } {
  if (typeof raw !== "string") return { ok: false, error: "Imagem inválida" };
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(raw);
  if (!m) return { ok: false, error: "Formato de imagem não suportado" };
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length === 0) return { ok: false, error: "Imagem vazia" };
  if (bytes.length > AVATAR_MAX_BYTES) return { ok: false, error: "Imagem muito grande" };
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const isWebp = bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  const okMagic = (m[1] === "image/jpeg" && isJpeg) || (m[1] === "image/png" && isPng) || (m[1] === "image/webp" && isWebp);
  if (!okMagic) return { ok: false, error: "Arquivo não é uma imagem válida" };
  return { ok: true, mime: m[1], bytes, dataUrl: raw };
}
