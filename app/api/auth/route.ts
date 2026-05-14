import { NextRequest, NextResponse } from "next/server";

function generateId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  const user = { workId: generateId(), name: name.trim() };
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
