import { sessionUid } from "@/lib/server/profile";
import { equipForUser } from "@/lib/server/progress";

/** Escolhe o baralho usado nas partidas. */
export async function POST(request: Request) {
  const uid = await sessionUid();
  if (!uid) return Response.json({ error: "Faça login" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const deckId = body && typeof body.deckId === "string" ? body.deckId : "";
  if (!deckId) return Response.json({ error: "Baralho inválido" }, { status: 400 });
  try {
    return Response.json({ progress: await equipForUser(uid, deckId) });
  } catch (e) {
    console.error("[progress/equip]", e);
    return Response.json({ error: "Erro no servidor" }, { status: 500 });
  }
}
