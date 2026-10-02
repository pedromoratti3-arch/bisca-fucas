import { GOOGLE_UID_RE } from "@/lib/server/profile";
import { readProgress } from "@/lib/server/progress";
import { tierForLevel } from "@/data/progression";

/** Dados públicos de um jogador logado (para mostrar nível e clã na mesa): nível, faixa e clã. */
export async function GET(_req: Request, ctx: RouteContext<"/api/player/[uid]">) {
  const { uid } = await ctx.params;
  if (!GOOGLE_UID_RE.test(uid)) return Response.json({ error: "Jogador inválido" }, { status: 404 });
  try {
    const p = await readProgress(uid);
    return Response.json({ uid, level: p.level, tier: tierForLevel(p.level).id, clanId: p.clanId }, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch (e) {
    console.error("[player]", e);
    return Response.json({ error: "Erro no servidor" }, { status: 500 });
  }
}
