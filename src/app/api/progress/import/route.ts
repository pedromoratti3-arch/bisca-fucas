import { sessionUid } from "@/lib/server/profile";
import { importGuestProgress } from "@/lib/server/progress";

/** Traz o progresso de convidado (do aparelho) para a conta, uma única vez. */
export async function POST(request: Request) {
  const uid = await sessionUid();
  if (!uid) return Response.json({ error: "Faça login" }, { status: 401 });
  const body = await request.json().catch(() => null);
  try {
    const out = await importGuestProgress(uid, body && body.progress);
    return Response.json({ progress: out.state, imported: out.imported });
  } catch (e) {
    console.error("[progress/import]", e);
    return Response.json({ error: "Erro no servidor" }, { status: 500 });
  }
}
