import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";

function getUser(req: NextRequest) {
  const cookie = req.cookies.get("dota-user")?.value;
  if (!cookie) return null;
  try { return JSON.parse(cookie) as { workId: string; name: string; mmr: number; roles: any[] }; } catch { return null; }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const err = getStore().joinSession(id, user.workId, user.name, user.mmr, user.roles);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  return NextResponse.json({ ok: true });
}
