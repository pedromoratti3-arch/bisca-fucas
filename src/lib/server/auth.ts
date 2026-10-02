import "server-only";
import { OAuth2Client } from "google-auth-library";
import { SignJWT, importPKCS8, jwtVerify } from "jose";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

export const SESSION_COOKIE = "bf_session";
export const SESSION_MAX_AGE_S = 30 * 24 * 60 * 60;

/** Jogador logado como devolvido ao navegador. `uid` é também o playerId nas salas e o auth.uid no Firebase. */
export type SessionUser = {
  uid: string;
  name: string;
  email: string;
  picture: string;
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente em falta: ${name}`);
  return v;
}

/** Prefixo "g_" distingue jogadores Google de convidados (ids aleatórios) nas regras do Firebase. */
export function uidFromGoogleSub(sub: string): string {
  return "g_" + sub;
}

// ---------- Google ----------

let googleClient: OAuth2Client | null = null;

/**
 * Valida o ID token do Google (assinatura, expiração, emissor e audience = nosso Client ID).
 * Lança erro se for inválido.
 */
export async function verifyGoogleIdToken(idToken: string) {
  const clientId = requireEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID");
  if (!googleClient) googleClient = new OAuth2Client(clientId);
  const ticket = await googleClient.verifyIdToken({ idToken, audience: clientId });
  const p = ticket.getPayload();
  if (!p || !p.sub) throw new Error("Token sem 'sub'");
  return {
    sub: p.sub,
    name: p.name || p.given_name || "Jogador",
    email: p.email || "",
    picture: p.picture || "",
  };
}

// ---------- Firebase Admin ----------

/**
 * Chave privada da conta de serviço. Aceita quebras de linha reais ou escritas como "\n", e com ou sem
 * aspas em volta (painéis como o da Vercel às vezes guardam as aspas coladas do .env).
 */
function adminPrivateKey(): string {
  return requireEnv("FIREBASE_ADMIN_PRIVATE_KEY")
    .trim()
    .replace(/^"([\s\S]*)"$/, "$1")
    .replace(/\\n/g, "\n");
}

function adminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;
  return initializeApp({
    credential: cert({
      projectId: requireEnv("FIREBASE_ADMIN_PROJECT_ID"),
      clientEmail: requireEnv("FIREBASE_ADMIN_CLIENT_EMAIL"),
      privateKey: adminPrivateKey(),
    }),
    databaseURL: requireEnv("NEXT_PUBLIC_FIREBASE_DATABASE_URL"),
  });
}

/** Ref de bisca/users/{uid}. Só o servidor escreve aqui (as regras bloqueiam o navegador). */
export function userRef(uid: string) {
  return getDatabase(adminApp()).ref("bisca/users/" + uid);
}

/** Cria ou atualiza os dados vindos do Google; preserva apelido e foto escolhidos no perfil. */
export async function upsertUser(u: SessionUser): Promise<void> {
  const now = Date.now();
  await userRef(u.uid).transaction((cur) => ({
    ...(cur || {}),
    name: u.name,
    email: u.email,
    picture: u.picture,
    createdAt: cur && typeof cur.createdAt === "number" ? cur.createdAt : now,
    lastLoginAt: now,
  }));
}

const CUSTOM_TOKEN_AUD = "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit";

/**
 * Passe para o navegador entrar no Firebase com auth.uid = uid do jogador.
 * Assinado aqui com a chave da conta de serviço (formato oficial de custom token) em vez de
 * firebase-admin/auth, cujo jwks-rsa quebra na Vercel com ERR_REQUIRE_ESM ao carregar o jose.
 */
export async function createFirebaseToken(uid: string): Promise<string> {
  const email = requireEnv("FIREBASE_ADMIN_CLIENT_EMAIL");
  const key = await importPKCS8(adminPrivateKey(), "RS256");
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ uid })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(email)
    .setSubject(email)
    .setAudience(CUSTOM_TOKEN_AUD)
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key);
}

// ---------- Sessão (cookie httpOnly com JWT assinado) ----------

function sessionKey(): Uint8Array {
  const secret = requireEnv("SESSION_SECRET");
  if (secret.length < 32) throw new Error("SESSION_SECRET deve ter pelo menos 32 caracteres");
  return new TextEncoder().encode(secret);
}

export async function signSession(u: SessionUser): Promise<string> {
  return new SignJWT({ name: u.name, email: u.email, picture: u.picture })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(u.uid)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_S}s`)
    .sign(sessionKey());
}

export async function readSession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionKey(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    return {
      uid: payload.sub,
      name: String(payload.name || "Jogador"),
      email: String(payload.email || ""),
      picture: String(payload.picture || ""),
    };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_S,
};
