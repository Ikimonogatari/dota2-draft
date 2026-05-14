import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { workId, name } = await req.json();
  if (!workId?.trim() || !name?.trim()) {
    return NextResponse.json({ error: "workId and name required" }, { status: 400 });
  }
  const user = { workId: workId.trim(), name: name.trim() };
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
