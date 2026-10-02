import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  createFirebaseToken,
  sessionCookieOptions,
  signSession,
  uidFromGoogleSub,
  upsertUser,
  verifyGoogleIdToken,
  type SessionUser,
} from "@/lib/server/auth";
import { readUserRecord, toProfile } from "@/lib/server/profile";

/** Recebe o ID token do botão "Entrar com Google", valida-o no servidor e abre a sessão. */
export async function POST(request: Request) {
  let credential = "";
  try {
    const body = await request.json();
    credential = typeof body?.credential === "string" ? body.credential : "";
  } catch {
    void 0;
  }
  if (!credential) return Response.json({ error: "Token em falta" }, { status: 400 });

  let google;
  try {
    google = await verifyGoogleIdToken(credential);
  } catch {
    return Response.json({ error: "Token do Google inválido" }, { status: 401 });
  }

  const user: SessionUser = {
    uid: uidFromGoogleSub(google.sub),
    name: google.name,
    email: google.email,
    picture: google.picture,
  };

  try {
    await upsertUser(user);
    const firebaseToken = await createFirebaseToken(user.uid);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, await signSession(user), sessionCookieOptions);
    const rec = await readUserRecord(user.uid);
    return Response.json({ user: toProfile(user.uid, rec || user), firebaseToken });
  } catch (e) {
    console.error("[auth/google]", e);
    return Response.json({ error: "Erro no servidor ao entrar" }, { status: 500 });
  }
}
