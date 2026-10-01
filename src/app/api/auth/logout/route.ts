import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/server/auth";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  return Response.json({ ok: true });
}
