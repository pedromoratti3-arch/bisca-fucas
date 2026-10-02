import { userRef } from "@/lib/server/auth";
import { NICKNAME_COOLDOWN_MS, cleanNickname, readUserRecord, sessionUid, toProfile } from "@/lib/server/profile";

/** Define ou troca o apelido. A primeira escolha é livre; depois só a cada NICKNAME_COOLDOWN_MS. */
export async function POST(request: Request) {
  const uid = await sessionUid();
  if (!uid) return Response.json({ error: "Faça login" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const nick = cleanNickname(body && body.nickname);
  if (!nick.ok) return Response.json({ error: nick.error }, { status: 400 });

  const rec = await readUserRecord(uid);
  if (!rec) return Response.json({ error: "Faça login" }, { status: 401 });
  if (rec.nickname === nick.value) return Response.json({ user: toProfile(uid, rec) });

  const now = Date.now();
  if (rec.nickname && rec.nicknameChangedAt && now < rec.nicknameChangedAt + NICKNAME_COOLDOWN_MS) {
    return Response.json(
      { error: "Você ainda não pode trocar o apelido", user: toProfile(uid, rec) },
      { status: 429 }
    );
  }

  await userRef(uid).update({ nickname: nick.value, nicknameChangedAt: now });
  return Response.json({ user: toProfile(uid, { ...rec, nickname: nick.value, nicknameChangedAt: now }) });
}
