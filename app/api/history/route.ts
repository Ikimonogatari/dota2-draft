import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export async function GET() {
  const store = getStore();
  const completed = store.history.slice(0, 20).map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    playerCount: s.players.length,
    adminName: s.players.find((p) => p.workId === s.adminId)?.name ?? "—",
    radiant: s.slots.filter((sl) => sl.team === "radiant" && sl.type === "pick" && sl.heroName).map((sl) => sl.heroName),
    dire: s.slots.filter((sl) => sl.team === "dire" && sl.type === "pick" && sl.heroName).map((sl) => sl.heroName),
    createdAt: s.createdAt,
    completedAt: s.completedAt,
  }));
  return NextResponse.json(completed);
}
