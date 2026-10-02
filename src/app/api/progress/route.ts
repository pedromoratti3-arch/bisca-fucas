import { sessionUid } from "@/lib/server/profile";
import { readProgress } from "@/lib/server/progress";

/** Progresso da conta logada (XP, nível, missões, baralhos, clã). */
export async function GET() {
  const uid = await sessionUid();
  if (!uid) return Response.json({ error: "Faça login" }, { status: 401 });
  try {
    return Response.json({ progress: await readProgress(uid) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[progress]", e);
    return Response.json({ error: "Erro no servidor" }, { status: 500 });
  }
}
