import { GOOGLE_UID_RE, readUserRecord, toProfile } from "@/lib/server/profile";
import { readProgress } from "@/lib/server/progress";
import { levelFromXp, tierForLevel } from "@/data/progression";

/**
 * Perfil público de um jogador logado (o que os outros podem ver): nome, foto, nível, faixa, clã,
 * estatísticas, baralho em uso e conquistas. Nunca devolve e-mail nem dados privados.
 */
export async function GET(_req: Request, ctx: RouteContext<"/api/player/[uid]">) {
  const { uid } = await ctx.params;
  if (!GOOGLE_UID_RE.test(uid)) return Response.json({ error: "Jogador inválido" }, { status: 404 });
  try {
    const rec = await readUserRecord(uid);
    if (!rec) return Response.json({ error: "Jogador não encontrado" }, { status: 404 });
    const prof = toProfile(uid, rec);
    const p = await readProgress(uid);
    const lf = levelFromXp(p.xp);
    const achievements = Object.values(p.missions.achievements).filter((a) => a.done).map((a) => a.id);
    return Response.json(
      {
        uid,
        name: prof.name,
        picture: prof.picture,
        level: p.level,
        tier: tierForLevel(p.level).id,
        xpInto: lf.into,
        xpNeed: lf.need,
        clanId: p.clanId,
        matches: p.matches,
        wins: p.wins,
        bestStreak: p.bestStreak,
        stats: {
          trump_tricks: p.stats.trump_tricks || 0,
          capotes: p.stats.capotes || 0,
          reles: p.stats.reles || 0,
          played_friends: p.stats.played_friends || 0,
        },
        equippedDeck: p.decks.equipped,
        decksUnlocked: p.decks.unlocked.length,
        achievements,
        since: p.createdAt,
      },
      { headers: { "Cache-Control": "public, max-age=30" } }
    );
  } catch (e) {
    console.error("[player]", e);
    return Response.json({ error: "Erro no servidor" }, { status: 500 });
  }
}
