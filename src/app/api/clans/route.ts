import { sessionUid } from "@/lib/server/profile";
import { createClan, listClans } from "@/lib/server/clans";
import { readProgress } from "@/lib/server/progress";

/** Lista de clãs (oficiais primeiro). */
export async function GET() {
  try {
    return Response.json({ clans: await listClans() }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[clans]", e);
    return Response.json({ error: "Erro no servidor" }, { status: 500 });
  }
}

/** Cria um clã e entra nele. */
export async function POST(request: Request) {
  const uid = await sessionUid();
  if (!uid) return Response.json({ error: "Faça login" }, { status: 401 });
  const body = await request.json().catch(() => null);
  try {
    const out = await createClan(uid, body || {});
    if (!out.ok) return Response.json({ error: out.error }, { status: 400 });
    return Response.json({ clan: out.clan, progress: await readProgress(uid) });
  } catch (e) {
    console.error("[clans/create]", e);
    return Response.json({ error: "Erro no servidor" }, { status: 500 });
  }
}
