import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";

function getUser(req: NextRequest) {
  const cookie = req.cookies.get("dota-user")?.value;
  if (!cookie) return null;
  try { return JSON.parse(cookie) as { workId: string; name: string }; } catch { return null; }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const { type, payload } = body as { type: string; payload: Record<string, unknown> };
  const store = getStore();
  let err: string | null = null;

  switch (type) {
    case "setCaptain":
      err = store.setCaptain(id, user.workId, payload.targetWorkId as string);
      break;
    case "resignCaptain":
      err = store.resignCaptain(id, user.workId);
      break;
    case "swapPlayer":
      err = store.swapPlayer(id, user.workId, payload.targetWorkId as string);
      break;
    case "startDraft":
      err = store.startDraft(id, user.workId);
      break;
    case "pick":
    case "ban":
      err = store.performStep(id, user.workId, payload.heroId as number);
      break;
    case "mention":
      err = store.addMention(id, user.workId, payload.heroId as number);
      break;
    case "endSession":
      err = store.endSession(id, user.workId);
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  if (err) return NextResponse.json({ error: err }, { status: 400 });
  return NextResponse.json({ ok: true });
}
