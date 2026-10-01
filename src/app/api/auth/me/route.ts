import { cookies } from "next/headers";
import { SESSION_COOKIE, createFirebaseToken, readSession } from "@/lib/server/auth";

/** Diz quem está logado (pelo cookie) e devolve um passe novo para o Firebase. */
export async function GET() {
  const cookieStore = await cookies();
  const user = await readSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!user) return Response.json({ user: null });
  try {
    const firebaseToken = await createFirebaseToken(user.uid);
    return Response.json({ user, firebaseToken });
  } catch (e) {
    console.error("[auth/me]", e);
    return Response.json({ user, firebaseToken: null });
  }
}
