import { GOOGLE_UID_RE, readUserRecord } from "@/lib/server/profile";

/** Foto pública de um jogador logado (para os outros jogadores verem na sala). */
export async function GET(_req: Request, ctx: RouteContext<"/api/avatar/[uid]">) {
  const { uid } = await ctx.params;
  if (!GOOGLE_UID_RE.test(uid)) return new Response(null, { status: 404 });
  const rec = await readUserRecord(uid);
  if (!rec) return new Response(null, { status: 404 });

  const m = rec.avatar ? /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(rec.avatar) : null;
  if (m) {
    return new Response(Buffer.from(m[2], "base64"), {
      headers: {
        "Content-Type": m[1],
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  // Sem foto personalizada: usa a do Google.
  if (rec.picture && /^https:\/\/[a-z0-9.-]+\.googleusercontent\.com\//.test(rec.picture)) {
    return Response.redirect(rec.picture, 302);
  }
  return new Response(null, { status: 404 });
}
