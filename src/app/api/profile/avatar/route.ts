import { userRef } from "@/lib/server/auth";
import { parseAvatar, readUserRecord, sessionUid, toProfile } from "@/lib/server/profile";

/** Salva a foto de perfil (já cortada e reduzida no navegador). */
export async function POST(request: Request) {
  const uid = await sessionUid();
  if (!uid) return Response.json({ error: "Faça login" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const img = parseAvatar(body && body.image);
  if (!img.ok) return Response.json({ error: img.error }, { status: 400 });

  const rec = await readUserRecord(uid);
  if (!rec) return Response.json({ error: "Faça login" }, { status: 401 });

  const now = Date.now();
  await userRef(uid).update({ avatar: img.dataUrl, avatarUpdatedAt: now });
  return Response.json({ user: toProfile(uid, { ...rec, avatar: img.dataUrl, avatarUpdatedAt: now }) });
}

/** Remove a foto personalizada e volta a usar a do Google. */
export async function DELETE() {
  const uid = await sessionUid();
  if (!uid) return Response.json({ error: "Faça login" }, { status: 401 });
  const rec = await readUserRecord(uid);
  if (!rec) return Response.json({ error: "Faça login" }, { status: 401 });
  await userRef(uid).update({ avatar: null, avatarUpdatedAt: null });
  return Response.json({ user: toProfile(uid, { ...rec, avatar: undefined, avatarUpdatedAt: undefined }) });
}
