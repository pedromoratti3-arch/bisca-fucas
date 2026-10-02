import { sessionUid } from "@/lib/server/profile";
import { markSeenForUser } from "@/lib/server/progress";

/** Marca baralhos novos como vistos (depois da animação de desbloqueio). */
export async function POST(request: Request) {
  const uid = await sessionUid();
  if (!uid) return Response.json({ error: "Faça login" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const ids: string[] = body && Array.isArray(body.deckIds) ? body.deckIds.filter((x: unknown) => typeof x === "string").slice(0, 50) : [];
  try {
    return Response.json({ progress: await markSeenForUser(uid, ids) });
  } catch (e) {
    console.error("[progress/seen]", e);
    return Response.json({ error: "Erro no servidor" }, { status: 500 });
  }
}
