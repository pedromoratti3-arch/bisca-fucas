import { sessionUid } from "@/lib/server/profile";
import { joinClan } from "@/lib/server/clans";
import { readProgress } from "@/lib/server/progress";

/** Entra em um clã. */
export async function POST(_req: Request, ctx: RouteContext<"/api/clans/[id]/join">) {
  const uid = await sessionUid();
  if (!uid) return Response.json({ error: "Faça login" }, { status: 401 });
  const { id } = await ctx.params;
  try {
    const out = await joinClan(uid, id);
    if (!out.ok) return Response.json({ error: out.error }, { status: 400 });
    return Response.json({ clan: out.clan, progress: await readProgress(uid) });
  } catch (e) {
    console.error("[clans/join]", e);
    return Response.json({ error: "Erro no servidor" }, { status: 500 });
  }
}
