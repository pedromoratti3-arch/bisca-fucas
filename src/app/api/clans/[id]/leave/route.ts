import { sessionUid } from "@/lib/server/profile";
import { leaveClan } from "@/lib/server/clans";
import { readProgress } from "@/lib/server/progress";

/** Sai do clã atual. */
export async function POST() {
  const uid = await sessionUid();
  if (!uid) return Response.json({ error: "Faça login" }, { status: 401 });
  try {
    const out = await leaveClan(uid);
    if (!out.ok) return Response.json({ error: out.error }, { status: 400 });
    return Response.json({ progress: await readProgress(uid) });
  } catch (e) {
    console.error("[clans/leave]", e);
    return Response.json({ error: "Erro no servidor" }, { status: 500 });
  }
}
