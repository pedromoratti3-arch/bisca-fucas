import { sessionUid } from "@/lib/server/profile";
import { applyMatchForUser, sanitizeReport } from "@/lib/server/progress";

/** Partida terminada: calcula XP, missões e desbloqueios no servidor. */
export async function POST(request: Request) {
  const uid = await sessionUid();
  if (!uid) return Response.json({ error: "Faça login" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const report = sanitizeReport(body && body.report, Date.now());
  if (!report) return Response.json({ error: "Relatório inválido" }, { status: 400 });
  try {
    const out = await applyMatchForUser(uid, report);
    return Response.json({ progress: out.state, events: out.events, rejected: out.rejected || null });
  } catch (e) {
    console.error("[progress/match]", e);
    return Response.json({ error: "Erro no servidor" }, { status: 500 });
  }
}
