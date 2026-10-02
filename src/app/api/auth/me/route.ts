import { createFirebaseToken } from "@/lib/server/auth";
import { readUserRecord, sessionUid, toProfile } from "@/lib/server/profile";

/** Diz quem está logado (pelo cookie), com o perfil atual, e devolve um passe novo para o Firebase. */
export async function GET() {
  const uid = await sessionUid();
  if (!uid) return Response.json({ user: null });
  try {
    const rec = await readUserRecord(uid);
    if (!rec) return Response.json({ user: null });
    const firebaseToken = await createFirebaseToken(uid);
    return Response.json({ user: toProfile(uid, rec), firebaseToken });
  } catch (e) {
    console.error("[auth/me]", e);
    return Response.json({ error: "Erro no servidor" }, { status: 500 });
  }
}
