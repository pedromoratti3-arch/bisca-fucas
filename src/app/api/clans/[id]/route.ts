import { getClan } from "@/lib/server/clans";

/** Um clã com os membros. */
export async function GET(_req: Request, ctx: RouteContext<"/api/clans/[id]">) {
  const { id } = await ctx.params;
  try {
    const clan = await getClan(id);
    if (!clan) return Response.json({ error: "Clã não encontrado" }, { status: 404 });
    return Response.json({ clan }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[clans/get]", e);
    return Response.json({ error: "Erro no servidor" }, { status: 500 });
  }
}
