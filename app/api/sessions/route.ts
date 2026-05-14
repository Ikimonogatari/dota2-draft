import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";

function getUser(req: NextRequest) {
  const cookie = req.cookies.get("dota-user")?.value;
  if (!cookie) return null;
  try { return JSON.parse(cookie) as { workId: string; name: string; mmr: number; roles: any[] }; } catch { return null; }
}

export async function GET() {
  return NextResponse.json(getStore().summaries());
}

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Session name required" }, { status: 400 });

  const session = getStore().createSession(name.trim(), user.workId, user.name, user.mmr, user.roles);
  return NextResponse.json({ id: session.id });
}
