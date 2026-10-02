import { sessionUid } from "@/lib/server/profile";
import { claimForUser } from "@/lib/server/progress";

/** Resgata uma missão concluída. */
export async function POST(request: Request) {
  const uid = await sessionUid();
  if (!uid) return Response.json({ error: "Faça login" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const id = body && typeof body.id === "string" ? body.id : "";
  if (!id) return Response.json({ error: "Missão inválida" }, { status: 400 });
  try {
    const out = await claimForUser(uid, id);
    if (!out.ok) return Response.json({ error: "Nada para resgatar", progress: out.state }, { status: 409 });
    return Response.json({ progress: out.state, events: out.events });
  } catch (e) {
    console.error("[progress/claim]", e);
    return Response.json({ error: "Erro no servidor" }, { status: 500 });
  }
}
