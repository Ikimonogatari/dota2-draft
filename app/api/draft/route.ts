import { NextRequest, NextResponse } from "next/server";

interface SavedDraft {
  slots: Array<{ team: string; type: string; heroId: number | null; heroName: string | null }>;
  currentStep: number;
  createdAt: number;
}

const store = new Map<string, SavedDraft>();

function purgeOld() {
  const cutoff = Date.now() - 86_400_000; // 24h
  for (const [id, d] of store) {
    if (d.createdAt < cutoff) store.delete(id);
  }
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 9).toUpperCase();
}

export async function POST(req: NextRequest) {
  purgeOld();
  const body = await req.json();
  const id = makeId();
  store.set(id, { ...body, createdAt: Date.now() });
  return NextResponse.json({ id });
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") ?? "";
  const draft = store.get(id);
  if (!draft) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(draft);
}
