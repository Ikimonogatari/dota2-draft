import { NextRequest, NextResponse } from "next/server";

function generateId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function POST(req: NextRequest) {
  const { name, mmr, roles } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (typeof mmr !== "number" || mmr < 0 || mmr > 18000) {
    return NextResponse.json({ error: "MMR must be between 0 and 18000" }, { status: 400 });
  }
  if (!Array.isArray(roles) || roles.length === 0) {
    return NextResponse.json({ error: "At least one role must be selected" }, { status: 400 });
  }
  const user = { workId: generateId(), name: name.trim(), mmr, roles };
  const res = NextResponse.json({ user });
  res.cookies.set("dota-user", JSON.stringify(user), {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("dota-user");
  return res;
}
