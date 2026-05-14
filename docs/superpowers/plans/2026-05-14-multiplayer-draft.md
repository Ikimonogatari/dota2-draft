# Multiplayer Draft System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the single-player draft simulator into a real-time 10-player multiplayer draft system with auth, lobbies, captains, hero mentions, post-draft stats, and history.

**Architecture:** In-memory store singleton with SSE (Server-Sent Events) for real-time push to all connected clients. Next.js App Router API routes handle all actions. Auth is a plain cookie (workId + name, no password). Three pages: login (`/`), lobby (`/lobby`), draft room (`/draft/[id]`).

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS v4, Server-Sent Events (native), in-memory Map store, cookie auth.

---

## File Map

| File | Status | Responsibility |
|------|--------|---------------|
| `lib/types.ts` | Create | All shared interfaces: User, Player, Session, ChatMessage, SessionSummary |
| `lib/store.ts` | Create | Singleton in-memory store, SSE broadcasting, timer management, all state mutations |
| `app/api/auth/route.ts` | Create | POST: create/verify user by workId+name, set cookie |
| `app/api/sessions/route.ts` | Create | GET: list sessions (summary), POST: create session |
| `app/api/sessions/[id]/route.ts` | Create | GET: full session state |
| `app/api/sessions/[id]/join/route.ts` | Create | POST: join session |
| `app/api/sessions/[id]/action/route.ts` | Create | POST: unified action handler (setCaptain, resignCaptain, swapPlayer, startDraft, pick, ban, mention, endSession) |
| `app/api/sessions/[id]/stream/route.ts` | Create | GET: SSE stream — pushes session JSON on every state change |
| `app/api/history/route.ts` | Create | GET: completed sessions list |
| `app/page.tsx` | Modify | Login page (redirect to /lobby if cookie exists) |
| `app/lobby/page.tsx` | Create | Lobby page (server component, loads session list) |
| `app/draft/[id]/page.tsx` | Create | Draft room page |
| `app/practice/page.tsx` | Create | Solo practice mode (old DraftApp, dynamically imported to avoid hydration) |
| `components/LoginForm.tsx` | Create | Client component: name + work ID form, sets cookie, redirects |
| `components/LobbyPage.tsx` | Create | Client component: session list with SSE-based live status, create button |
| `components/DraftRoom.tsx` | Create | Client mega-component: SSE connection, all draft UI (lobby/draft/stats states) |
| `components/TeamRoster.tsx` | Create | Team player list with captain badge, become/transfer captain, swap button |
| `components/ChatPanel.tsx` | Create | Scrollable mention feed + system messages |
| `components/DraftStats.tsx` | Create | Post-draft summary: team lineups, attribute breakdown, session duration |
| `components/HeroCard.tsx` | Modify | Add `onMention` prop: show "Suggest" button on hover |
| `components/HeroGrid.tsx` | Modify | Add `onMention` + `isCaptainTurn` props, captain-only pick overlay |
| `components/TeamPanel.tsx` | Modify | Fix image crop (object-center), make ban thumbnails larger (w-12) |

---

## Task 1: Shared Types

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Create lib/types.ts**

```typescript
// lib/types.ts
import type { DraftSlot } from "@/lib/draft";

export interface User {
  workId: string;
  name: string;
}

export type TeamName = "radiant" | "dire";
export type SessionStatus = "waiting" | "ready" | "drafting" | "completed";

export interface Player {
  workId: string;
  name: string;
  team: TeamName | "spectator";
  isCaptain: boolean;
}

export interface ChatMessage {
  id: string;
  type: "mention" | "system";
  authorId: string;
  authorName: string;
  heroId?: number;
  heroName?: string;
  heroKey?: string;   // internal name for image URL
  text?: string;
  timestamp: number;
}

export interface Session {
  id: string;
  name: string;
  status: SessionStatus;
  players: Player[];
  adminId: string;
  radiantCaptain: string | null;  // workId
  direCaptain: string | null;     // workId
  slots: DraftSlot[];
  currentStep: number;
  chat: ChatMessage[];
  timerEndsAt: number | null;     // epoch ms when current step expires
  createdAt: number;
  completedAt?: number;
}

export interface SessionSummary {
  id: string;
  name: string;
  status: SessionStatus;
  playerCount: number;
  adminName: string;
  createdAt: number;
  completedAt?: number;
}
```

- [ ] **Step 2: Verify TypeScript resolves imports**

```bash
cd /home/dicky/Projects/hobby/dota2-draft && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors related to lib/types.ts

---

## Task 2: In-Memory Store

**Files:**
- Create: `lib/store.ts`

This is the core of the backend. All session state lives here. The `global.__draftStore` pattern survives Next.js hot-module replacement in development.

- [ ] **Step 1: Create lib/store.ts**

```typescript
// lib/store.ts
import { DRAFT_SEQUENCE, initDraftSlots } from "@/lib/draft";
import { HEROES } from "@/lib/heroes";
import type { Session, Player, ChatMessage, SessionSummary, TeamName } from "@/lib/types";

function makeId(len = 6): string {
  return Math.random().toString(36).slice(2, 2 + len).toUpperCase();
}

function nanoid(): string {
  return Math.random().toString(36).slice(2, 11);
}

class Store {
  sessions = new Map<string, Session>();
  history: Session[] = [];

  // SSE: map sessionId → set of stream controllers
  private controllers = new Map<string, Set<ReadableStreamDefaultController>>();
  // Timer handles for auto-pick
  private timers = new Map<string, ReturnType<typeof setTimeout>>();

  // ── SSE ──────────────────────────────────────────────────────────────

  subscribe(sessionId: string, ctrl: ReadableStreamDefaultController) {
    if (!this.controllers.has(sessionId)) {
      this.controllers.set(sessionId, new Set());
    }
    this.controllers.get(sessionId)!.add(ctrl);
  }

  unsubscribe(sessionId: string, ctrl: ReadableStreamDefaultController) {
    this.controllers.get(sessionId)?.delete(ctrl);
  }

  broadcast(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    const payload = new TextEncoder().encode(`data: ${JSON.stringify(session)}\n\n`);
    this.controllers.get(sessionId)?.forEach((ctrl) => {
      try { ctrl.enqueue(payload); } catch { /* client disconnected */ }
    });
  }

  // ── Sessions ─────────────────────────────────────────────────────────

  createSession(name: string, adminWorkId: string, adminName: string): Session {
    const id = makeId();
    const firstPlayer: Player = {
      workId: adminWorkId,
      name: adminName,
      team: "radiant",
      isCaptain: false,
    };
    const session: Session = {
      id,
      name,
      status: "waiting",
      players: [firstPlayer],
      adminId: adminWorkId,
      radiantCaptain: null,
      direCaptain: null,
      slots: initDraftSlots(),
      currentStep: 0,
      chat: [],
      timerEndsAt: null,
      createdAt: Date.now(),
    };
    this.sessions.set(id, session);
    return session;
  }

  summaries(): SessionSummary[] {
    const all = [...this.sessions.values()];
    return all
      .filter((s) => s.status !== "completed")
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        playerCount: s.players.length,
        adminName: s.players.find((p) => p.workId === s.adminId)?.name ?? "—",
        createdAt: s.createdAt,
        completedAt: s.completedAt,
      }));
  }

  // ── Actions ───────────────────────────────────────────────────────────

  joinSession(sessionId: string, workId: string, name: string): string | null {
    const s = this.sessions.get(sessionId);
    if (!s) return "Session not found";
    if (s.status === "completed") return "Session already completed";
    if (s.players.find((p) => p.workId === workId)) return null; // already joined
    if (s.players.length >= 10) return "Session is full";

    const team: TeamName = s.players.filter((p) => p.team === "radiant").length < 5
      ? "radiant"
      : "dire";

    s.players.push({ workId, name, team, isCaptain: false });

    // Auto-promote to ready when 10 players
    if (s.players.length === 10 && s.status === "waiting") {
      s.status = "ready";
    }

    this.addSystemMessage(sessionId, `${name} joined the session`);
    this.broadcast(sessionId);
    return null;
  }

  setCaptain(sessionId: string, requesterWorkId: string, targetWorkId: string): string | null {
    const s = this.sessions.get(sessionId);
    if (!s) return "Session not found";
    if (s.status === "drafting" || s.status === "completed") return "Cannot change captain now";

    const target = s.players.find((p) => p.workId === targetWorkId);
    if (!target) return "Player not found";

    const requester = s.players.find((p) => p.workId === requesterWorkId);
    if (!requester) return "Requester not found";

    const isAdmin = requesterWorkId === s.adminId;
    const isSelf = requesterWorkId === targetWorkId;
    const existingCaptain = target.team === "radiant" ? s.radiantCaptain : s.direCaptain;
    const isCurrentCaptain = existingCaptain === requesterWorkId;

    // Allow: admin sets anyone, player volunteers (no captain yet), or current captain transfers
    if (!isAdmin && !isSelf && !isCurrentCaptain) return "Not authorized";
    if (isSelf && existingCaptain && existingCaptain !== requesterWorkId) return "Team already has a captain";
    if (!isAdmin && requester.team !== target.team) return "Can only manage your own team";

    // Remove old captain flag
    s.players.forEach((p) => {
      if (p.team === target.team) p.isCaptain = false;
    });

    // Set new captain
    target.isCaptain = true;
    if (target.team === "radiant") s.radiantCaptain = targetWorkId;
    else s.direCaptain = targetWorkId;

    this.addSystemMessage(sessionId, `${target.name} is now ${target.team} captain`);
    this.broadcast(sessionId);
    return null;
  }

  resignCaptain(sessionId: string, workId: string): string | null {
    const s = this.sessions.get(sessionId);
    if (!s) return "Session not found";
    if (s.status === "drafting") return "Cannot resign during draft";

    const player = s.players.find((p) => p.workId === workId);
    if (!player || !player.isCaptain) return "You are not a captain";

    player.isCaptain = false;
    if (player.team === "radiant") s.radiantCaptain = null;
    else s.direCaptain = null;

    this.addSystemMessage(sessionId, `${player.name} resigned as ${player.team} captain`);
    this.broadcast(sessionId);
    return null;
  }

  swapPlayer(sessionId: string, adminWorkId: string, targetWorkId: string): string | null {
    const s = this.sessions.get(sessionId);
    if (!s) return "Session not found";
    if (adminWorkId !== s.adminId) return "Only admin can swap players";
    if (s.status === "drafting" || s.status === "completed") return "Cannot swap during draft";

    const player = s.players.find((p) => p.workId === targetWorkId);
    if (!player) return "Player not found";

    const newTeam: TeamName = player.team === "radiant" ? "dire" : "radiant";
    const targetCount = s.players.filter((p) => p.team === newTeam).length;
    if (targetCount >= 5) return `${newTeam} team is full`;

    // If they were captain, remove captaincy
    if (player.isCaptain) {
      player.isCaptain = false;
      if (player.team === "radiant") s.radiantCaptain = null;
      else s.direCaptain = null;
    }

    player.team = newTeam;
    this.addSystemMessage(sessionId, `${player.name} moved to ${newTeam}`);
    this.broadcast(sessionId);
    return null;
  }

  startDraft(sessionId: string, adminWorkId: string): string | null {
    const s = this.sessions.get(sessionId);
    if (!s) return "Session not found";
    if (adminWorkId !== s.adminId) return "Only admin can start draft";
    if (s.status === "drafting") return "Draft already started";
    if (s.players.length < 2) return "Need at least 2 players"; // relaxed for dev

    s.status = "drafting";
    this.addSystemMessage(sessionId, "Draft has started!");
    this.scheduleTimer(sessionId);
    this.broadcast(sessionId);
    return null;
  }

  performStep(sessionId: string, workId: string, heroId: number): string | null {
    const s = this.sessions.get(sessionId);
    if (!s) return "Session not found";
    if (s.status !== "drafting") return "Not in draft";
    if (s.currentStep >= DRAFT_SEQUENCE.length) return "Draft complete";

    const currentAction = DRAFT_SEQUENCE[s.currentStep];
    const currentTeamCaptain = currentAction.team === "radiant" ? s.radiantCaptain : s.direCaptain;

    // Only the current team's captain (or admin) can pick
    if (workId !== s.adminId && workId !== currentTeamCaptain) {
      return "Only the captain or admin can pick";
    }

    const usedIds = new Set(s.slots.filter((sl) => sl.heroId !== null).map((sl) => sl.heroId as number));
    if (usedIds.has(heroId)) return "Hero already picked or banned";

    const hero = HEROES.find((h) => h.id === heroId);
    if (!hero) return "Hero not found";

    // Clear timer
    clearTimeout(this.timers.get(sessionId));
    this.timers.delete(sessionId);

    s.slots[s.currentStep].heroId = heroId;
    s.slots[s.currentStep].heroName = hero.displayName;
    s.currentStep++;

    if (s.currentStep >= DRAFT_SEQUENCE.length) {
      s.status = "completed";
      s.completedAt = Date.now();
      s.timerEndsAt = null;
      this.history.unshift(s);
      this.addSystemMessage(sessionId, "Draft complete! Good luck, have fun.");
    } else {
      this.scheduleTimer(sessionId);
    }

    this.broadcast(sessionId);
    return null;
  }

  addMention(sessionId: string, workId: string, heroId: number): string | null {
    const s = this.sessions.get(sessionId);
    if (!s) return "Session not found";
    if (s.status !== "drafting") return "Mentions only during draft";

    const player = s.players.find((p) => p.workId === workId);
    if (!player) return "Player not in session";

    const hero = HEROES.find((h) => h.id === heroId);
    if (!hero) return "Hero not found";

    const msg: ChatMessage = {
      id: nanoid(),
      type: "mention",
      authorId: workId,
      authorName: player.name,
      heroId: hero.id,
      heroName: hero.displayName,
      heroKey: hero.name,
      timestamp: Date.now(),
    };

    s.chat.push(msg);
    // Keep last 50 messages
    if (s.chat.length > 50) s.chat.splice(0, s.chat.length - 50);

    this.broadcast(sessionId);
    return null;
  }

  endSession(sessionId: string, adminWorkId: string): string | null {
    const s = this.sessions.get(sessionId);
    if (!s) return "Session not found";
    if (adminWorkId !== s.adminId) return "Only admin can end session";

    clearTimeout(this.timers.get(sessionId));
    this.timers.delete(sessionId);

    s.status = "completed";
    s.completedAt = Date.now();
    s.timerEndsAt = null;
    this.history.unshift(s);

    this.addSystemMessage(sessionId, "Session ended by admin");
    this.broadcast(sessionId);
    return null;
  }

  // ── Internals ─────────────────────────────────────────────────────────

  private addSystemMessage(sessionId: string, text: string) {
    const s = this.sessions.get(sessionId);
    if (!s) return;
    s.chat.push({
      id: nanoid(),
      type: "system",
      authorId: "system",
      authorName: "System",
      text,
      timestamp: Date.now(),
    });
    if (s.chat.length > 50) s.chat.splice(0, s.chat.length - 50);
  }

  private scheduleTimer(sessionId: string) {
    clearTimeout(this.timers.get(sessionId));
    const s = this.sessions.get(sessionId);
    if (!s || s.status !== "drafting") return;

    s.timerEndsAt = Date.now() + 30_000;

    const timer = setTimeout(() => {
      const session = this.sessions.get(sessionId);
      if (!session || session.status !== "drafting") return;

      const usedIds = new Set(session.slots.filter((sl) => sl.heroId !== null).map((sl) => sl.heroId as number));
      const available = HEROES.filter((h) => !usedIds.has(h.id));
      if (available.length === 0) return;

      const hero = available[Math.floor(Math.random() * available.length)];
      this.performStep(sessionId, session.adminId, hero.id); // admin acts as fallback
    }, 30_000);

    this.timers.set(sessionId, timer);
  }
}

// Global singleton — survives Next.js HMR in development
declare global {
  // eslint-disable-next-line no-var
  var __draftStore: Store | undefined;
}

export function getStore(): Store {
  if (!global.__draftStore) {
    global.__draftStore = new Store();
  }
  return global.__draftStore;
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /home/dicky/Projects/hobby/dota2-draft && npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors from lib/store.ts or lib/types.ts

---

## Task 3: Auth API

**Files:**
- Create: `app/api/auth/route.ts`

- [ ] **Step 1: Create auth route**

```typescript
// app/api/auth/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { workId, name } = await req.json();
  if (!workId?.trim() || !name?.trim()) {
    return NextResponse.json({ error: "workId and name required" }, { status: 400 });
  }
  const user = { workId: workId.trim(), name: name.trim() };
  const res = NextResponse.json({ user });
  res.cookies.set("dota-user", JSON.stringify(user), {
    httpOnly: false, // must be readable from JS for client-side auth checks
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("dota-user");
  return res;
}
```

---

## Task 4: Sessions API (list, create, get, join)

**Files:**
- Create: `app/api/sessions/route.ts`
- Create: `app/api/sessions/[id]/route.ts`
- Create: `app/api/sessions/[id]/join/route.ts`

- [ ] **Step 1: Create sessions list + create route**

```typescript
// app/api/sessions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";

function getUser(req: NextRequest) {
  const cookie = req.cookies.get("dota-user")?.value;
  if (!cookie) return null;
  try { return JSON.parse(cookie) as { workId: string; name: string }; } catch { return null; }
}

export async function GET() {
  const store = getStore();
  return NextResponse.json(store.summaries());
}

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Session name required" }, { status: 400 });

  const store = getStore();
  const session = store.createSession(name.trim(), user.workId, user.name);
  return NextResponse.json({ id: session.id });
}
```

- [ ] **Step 2: Create session get route**

```typescript
// app/api/sessions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = getStore().sessions.get(id);
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(session);
}
```

- [ ] **Step 3: Create join route**

```typescript
// app/api/sessions/[id]/join/route.ts
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

  const store = getStore();
  const err = store.joinSession(id, user.workId, user.name);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  return NextResponse.json({ ok: true });
}
```

---

## Task 5: Actions API

**Files:**
- Create: `app/api/sessions/[id]/action/route.ts`

Single endpoint for all game actions. Action type determines what happens.

- [ ] **Step 1: Create action route**

```typescript
// app/api/sessions/[id]/action/route.ts
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
```

---

## Task 6: SSE Stream

**Files:**
- Create: `app/api/sessions/[id]/stream/route.ts`

- [ ] **Step 1: Create SSE route**

```typescript
// app/api/sessions/[id]/stream/route.ts
import { NextRequest } from "next/server";
import { getStore } from "@/lib/store";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = getStore();

  const enc = new TextEncoder();
  let ctrl: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(c) {
      ctrl = c;
      // Send current state immediately on connect
      const session = store.sessions.get(id);
      if (session) {
        ctrl.enqueue(enc.encode(`data: ${JSON.stringify(session)}\n\n`));
      }
      store.subscribe(id, ctrl);
    },
    cancel() {
      store.unsubscribe(id, ctrl);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
```

---

## Task 7: History API

**Files:**
- Create: `app/api/history/route.ts`

- [ ] **Step 1: Create history route**

```typescript
// app/api/history/route.ts
import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";

export async function GET() {
  const store = getStore();
  // Return last 20 completed sessions (summary format)
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
```

---

## Task 8: Fix Existing Components

**Files:**
- Modify: `components/TeamPanel.tsx` (image crop + ban visibility)

- [ ] **Step 1: Fix TeamPanel PickSlot — change object-[center_15%] to object-center**

In `components/TeamPanel.tsx`, find the `PickSlot` function. Change:
```tsx
className="object-cover object-[center_15%]"
```
to:
```tsx
className="object-cover object-center"
```

- [ ] **Step 2: Fix ban thumbnails — increase size from w-7 to w-12**

In `BanThumb`, change:
```tsx
<div className="relative w-7 aspect-video rounded overflow-hidden shrink-0 border border-dota-line/40">
```
to:
```tsx
<div className="relative w-12 aspect-video rounded overflow-hidden shrink-0 border border-dota-line/50">
```
And for empty ban slots:
```tsx
<div className="w-7 aspect-video rounded border border-dashed border-dota-line/20 bg-dota-surface/20 shrink-0" />
```
to:
```tsx
<div className="w-12 aspect-video rounded border border-dashed border-dota-line/20 bg-dota-surface/20 shrink-0" />
```

- [ ] **Step 3: Also fix MobileTeamStrip ban thumbnails in DraftApp.tsx**

Change `w-5 aspect-video` ban thumbnails in `MobileTeamStrip` to `w-8 aspect-video`.

---

## Task 9: LoginForm + Login Page

**Files:**
- Create: `components/LoginForm.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create LoginForm component**

```tsx
// components/LoginForm.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [name, setName] = useState("");
  const [workId, setWorkId] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !workId.trim()) {
      setError("Both fields are required");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workId: workId.trim(), name: name.trim() }),
      });
      if (res.ok) {
        router.push("/lobby");
      } else {
        setError("Login failed");
      }
    });
  }

  return (
    <div className="min-h-screen bg-dota-bg bg-dot-grid flex items-center justify-center p-4">
      <div className="w-full max-w-sm panel-corners panel-corners-active">
        <div className="bg-dota-panel border border-dota-gold/40 rounded p-8 shadow-[0_0_40px_rgba(200,162,67,0.1)]">
          {/* Logo */}
          <div className="text-center mb-8">
            <p className="text-[9px] font-display tracking-[0.5em] text-dota-muted uppercase mb-1">Dota 2</p>
            <h1 className="font-display text-2xl font-black tracking-[0.2em] text-dota-gold uppercase">
              Draft
            </h1>
            <div className="h-px w-24 bg-linear-to-r from-transparent via-dota-gold/50 to-transparent mx-auto mt-3" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-display text-dota-muted uppercase tracking-widest">
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                maxLength={32}
                className="bg-dota-surface border border-dota-line rounded px-3 py-2 text-sm text-dota-warm placeholder-dota-muted/50 focus:outline-none focus:border-dota-gold/60 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-display text-dota-muted uppercase tracking-widest">
                Work ID
              </label>
              <input
                type="text"
                value={workId}
                onChange={(e) => setWorkId(e.target.value)}
                placeholder="e.g. EMP-1234"
                maxLength={20}
                className="bg-dota-surface border border-dota-line rounded px-3 py-2 text-sm text-dota-warm placeholder-dota-muted/50 focus:outline-none focus:border-dota-gold/60 transition-colors"
              />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="mt-2 py-2.5 bg-dota-gold hover:bg-dota-gold-light text-dota-bg font-display font-black text-sm uppercase tracking-widest rounded transition-colors disabled:opacity-50"
            >
              {pending ? "Entering..." : "Enter"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update app/page.tsx to redirect logged-in users**

```tsx
// app/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";

export default async function Home() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("dota-user");
  if (userCookie?.value) {
    redirect("/lobby");
  }
  return <LoginForm />;
}
```

---

## Task 10: LobbyPage + Lobby Route

**Files:**
- Create: `components/LobbyPage.tsx`
- Create: `app/lobby/page.tsx`

- [ ] **Step 1: Create LobbyPage client component**

```tsx
// components/LobbyPage.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SessionSummary, User } from "@/lib/types";

const STATUS_STYLES: Record<string, { label: string; color: string; dot: string }> = {
  waiting:   { label: "WAITING",  color: "text-dota-muted",   dot: "bg-dota-muted" },
  ready:     { label: "READY",    color: "text-dota-gold",    dot: "bg-dota-gold" },
  drafting:  { label: "DRAFTING", color: "text-dota-radiant", dot: "bg-dota-radiant" },
  completed: { label: "ENDED",    color: "text-dota-dire",    dot: "bg-dota-dire" },
};

interface Props {
  user: User;
  history: Array<{ id: string; name: string; radiant: string[]; dire: string[]; completedAt?: number }>;
}

export default function LobbyPage({ user, history }: Props) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const fetchSessions = useCallback(async () => {
    const res = await fetch("/api/sessions");
    if (res.ok) setSessions(await res.json());
  }, []);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 3000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  async function createSession() {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/draft/${id}`);
    }
    setCreating(false);
  }

  async function joinSession(id: string) {
    await fetch(`/api/sessions/${id}/join`, { method: "POST" });
    router.push(`/draft/${id}`);
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-dota-bg bg-dot-grid text-dota-warm">
      {/* Header */}
      <header className="border-b border-dota-line bg-dota-panel/90 px-6 py-3 flex items-center justify-between">
        <span className="font-display text-lg font-black tracking-[0.15em] text-dota-gold uppercase">Dota 2 Draft</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-dota-muted">
            <span className="text-dota-warm font-bold">{user.name}</span>
            <span className="ml-2 text-dota-muted/60 text-xs">#{user.workId}</span>
          </span>
          <button onClick={logout} className="text-[10px] font-bold uppercase tracking-widest text-dota-muted hover:text-dota-dire transition-colors border border-dota-line px-2.5 py-1 rounded">
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-8">
        {/* Create session */}
        <div className="panel-corners bg-dota-panel border border-dota-line rounded p-5">
          <h2 className="font-display text-xs font-bold uppercase tracking-widest text-dota-muted mb-3">Create Session</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createSession()}
              placeholder="Session name..."
              className="flex-1 bg-dota-surface border border-dota-line rounded px-3 py-2 text-sm text-dota-warm placeholder-dota-muted/50 focus:outline-none focus:border-dota-gold/60 transition-colors"
            />
            <button
              onClick={createSession}
              disabled={creating || !newName.trim()}
              className="px-5 py-2 bg-dota-gold hover:bg-dota-gold-light text-dota-bg font-display font-black text-xs uppercase tracking-widest rounded transition-colors disabled:opacity-40"
            >
              Create
            </button>
          </div>
        </div>

        {/* Session list */}
        <div>
          <h2 className="font-display text-xs font-bold uppercase tracking-widest text-dota-muted mb-3">Open Sessions</h2>
          {sessions.length === 0 ? (
            <p className="text-dota-muted text-sm text-center py-8 border border-dashed border-dota-line rounded">
              No open sessions. Create one above.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {sessions.map((s) => {
                const style = STATUS_STYLES[s.status] ?? STATUS_STYLES.waiting;
                return (
                  <div key={s.id} className="flex items-center gap-4 bg-dota-panel border border-dota-line rounded px-4 py-3 hover:border-dota-line/80 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-sm text-dota-warm">{s.name}</span>
                        <span className="text-dota-muted/60 text-xs">by {s.adminName}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px]">
                        <div className="flex items-center gap-1">
                          <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                          <span className={`font-display font-bold tracking-wider ${style.color}`}>{style.label}</span>
                        </div>
                        <span className="text-dota-muted">{s.playerCount}/10 players</span>
                      </div>
                    </div>
                    <button
                      onClick={() => joinSession(s.id)}
                      disabled={s.status === "completed"}
                      className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest border border-dota-gold/40 text-dota-gold rounded hover:bg-dota-gold/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-display"
                    >
                      {s.status === "drafting" ? "Watch" : "Join"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* History */}
        {history.length > 0 && (
          <div>
            <h2 className="font-display text-xs font-bold uppercase tracking-widest text-dota-muted mb-3">Recent History</h2>
            <div className="flex flex-col gap-2">
              {history.map((h) => (
                <div key={h.id} className="bg-dota-panel border border-dota-line/50 rounded px-4 py-3 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-dota-warm/70 mb-1">{h.name}</p>
                    <div className="flex gap-4 text-[10px]">
                      <span className="text-dota-radiant">Radiant: {h.radiant.join(", ") || "—"}</span>
                      <span className="text-dota-dire">Dire: {h.dire.join(", ") || "—"}</span>
                    </div>
                  </div>
                  <button onClick={() => router.push(`/draft/${h.id}`)} className="text-[10px] text-dota-muted hover:text-dota-warm border border-dota-line px-3 py-1 rounded font-display uppercase tracking-widest">
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create lobby page (server component)**

```tsx
// app/lobby/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LobbyPage from "@/components/LobbyPage";

export default async function Lobby() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("dota-user");
  if (!userCookie?.value) redirect("/");
  const user = JSON.parse(userCookie.value);

  const [historyRes] = await Promise.all([
    fetch("http://localhost:3000/api/history", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
  ]);

  return <LobbyPage user={user} history={historyRes} />;
}
```

---

## Task 11: Hero Mention Feature (HeroCard + HeroGrid updates)

**Files:**
- Modify: `components/HeroCard.tsx`
- Modify: `components/HeroGrid.tsx`

- [ ] **Step 1: Add onMention prop to HeroCard**

At the top of HeroCard, update the props interface:
```typescript
interface HeroCardProps {
  hero: Hero;
  disabled?: boolean;
  banned?: boolean;
  picked?: boolean;
  onClick?: (hero: Hero) => void;
  onMention?: (hero: Hero) => void;  // NEW
  isCaptainTurn?: boolean;            // NEW — grays out grid when not captain's turn
}
```

Inside the `<button>` (the card container), add a "Suggest" button overlay on hover. Add this BEFORE the closing `</button>`:

```tsx
{/* Mention / Suggest button — visible on hover */}
{onMention && !banned && !picked && (
  <button
    onClick={(e) => { e.stopPropagation(); onMention(hero); }}
    className="absolute top-0.5 left-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 rounded px-1 py-px text-[7px] font-bold text-dota-gold uppercase tracking-wide z-20 hover:bg-dota-gold/20"
  >
    Suggest
  </button>
)}
```

Add `isCaptainTurn` to the disabled logic: when `isCaptainTurn === false`, the card should show a subtle overlay but still show "Suggest":
```tsx
const cannotPick = unavailable || (isCaptainTurn === false);
```
Use `cannotPick` instead of `unavailable` for the click handler and `disabled` prop.

- [ ] **Step 2: Add onMention + isCaptainTurn to HeroGrid**

Update HeroGrid's interface:
```typescript
interface HeroGridProps {
  bannedIds: Set<number>;
  pickedIds: Set<number>;
  disabled: boolean;
  onSelect: (hero: Hero) => void;
  onMention?: (hero: Hero) => void;   // NEW
  isCaptainTurn?: boolean;            // NEW
}
```

Pass them through to HeroCard:
```tsx
<HeroCard
  key={hero.id}
  hero={hero}
  banned={bannedIds.has(hero.id)}
  picked={pickedIds.has(hero.id)}
  disabled={disabled}
  onClick={onSelect}
  onMention={onMention}
  isCaptainTurn={isCaptainTurn}
/>
```

---

## Task 12: TeamRoster Component

**Files:**
- Create: `components/TeamRoster.tsx`

- [ ] **Step 1: Create TeamRoster**

```tsx
// components/TeamRoster.tsx
"use client";

import type { Player, TeamName } from "@/lib/types";

interface TeamRosterProps {
  team: TeamName;
  players: Player[];
  captain: string | null;
  myWorkId: string;
  isAdmin: boolean;
  sessionStatus: string;
  onBecomeCaptain: (targetWorkId: string) => void;
  onTransferCaptain: (targetWorkId: string) => void;
  onResignCaptain: () => void;
  onSwap: (targetWorkId: string) => void;
}

const STYLE = {
  radiant: { label: "RADIANT", color: "text-dota-radiant", border: "border-dota-radiant/30" },
  dire:    { label: "DIRE",    color: "text-dota-dire",    border: "border-dota-dire/30" },
};

export default function TeamRoster({
  team, players, captain, myWorkId, isAdmin, sessionStatus,
  onBecomeCaptain, onTransferCaptain, onResignCaptain, onSwap,
}: TeamRosterProps) {
  const style = STYLE[team];
  const me = players.find((p) => p.workId === myWorkId);
  const iAmCaptain = captain === myWorkId;
  const isDrafting = sessionStatus === "drafting" || sessionStatus === "completed";

  return (
    <div className={`flex flex-col gap-1 rounded border ${style.border} bg-dota-panel p-2`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`font-display text-[11px] font-black tracking-[0.2em] uppercase ${style.color}`}>
          {style.label}
        </span>
        <span className="text-[9px] text-dota-muted">{players.length}/5</span>
      </div>

      {/* Player slots */}
      {Array.from({ length: 5 }).map((_, i) => {
        const p = players[i];
        if (!p) {
          return (
            <div key={i} className="h-8 rounded border border-dashed border-dota-line/30 flex items-center justify-center">
              <span className="text-[9px] text-dota-line">Empty</span>
            </div>
          );
        }
        const isCaptain = p.workId === captain;
        const isMe = p.workId === myWorkId;

        return (
          <div key={p.workId} className="flex items-center gap-1.5 h-8 px-2 rounded bg-dota-surface border border-dota-line/40">
            {/* Captain crown */}
            <span className={`text-[10px] ${isCaptain ? "text-dota-gold" : "text-transparent"}`}>♛</span>

            <span className={`text-xs font-bold truncate flex-1 ${isMe ? "text-dota-warm" : "text-dota-warm/70"}`}>
              {p.name}
              {isMe && <span className="text-dota-muted text-[8px] ml-1">(you)</span>}
            </span>

            {/* Actions */}
            {!isDrafting && (
              <div className="flex gap-1 shrink-0">
                {/* Become captain (if no captain set and I'm on this team) */}
                {!captain && isMe && me?.team === team && (
                  <button onClick={() => onBecomeCaptain(myWorkId)} className="text-[8px] text-dota-gold border border-dota-gold/30 px-1 rounded hover:bg-dota-gold/10">
                    Captain
                  </button>
                )}
                {/* Transfer captain (if I am captain and hovering another teammate) */}
                {iAmCaptain && !isMe && me?.team === team && (
                  <button onClick={() => onTransferCaptain(p.workId)} className="text-[8px] text-dota-gold border border-dota-gold/30 px-1 rounded hover:bg-dota-gold/10">
                    Give
                  </button>
                )}
                {/* Resign captain */}
                {iAmCaptain && isMe && (
                  <button onClick={onResignCaptain} className="text-[8px] text-dota-muted border border-dota-line px-1 rounded hover:text-dota-dire">
                    Resign
                  </button>
                )}
                {/* Admin swap */}
                {isAdmin && !isMe && (
                  <button onClick={() => onSwap(p.workId)} className="text-[8px] text-dota-muted border border-dota-line px-1 rounded hover:text-dota-warm">
                    Swap
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
```

---

## Task 13: ChatPanel Component

**Files:**
- Create: `components/ChatPanel.tsx`

- [ ] **Step 1: Create ChatPanel**

```tsx
// components/ChatPanel.tsx
"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/types";
import { heroImageUrl } from "@/lib/heroes";

interface ChatPanelProps {
  messages: ChatMessage[];
}

export default function ChatPanel({ messages }: ChatPanelProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-dota-muted text-xs">
        Suggestions and game events will appear here
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 overflow-y-auto h-full scrollbar-slim px-1">
      {messages.map((msg) => {
        if (msg.type === "system") {
          return (
            <div key={msg.id} className="flex items-center gap-2 py-0.5">
              <div className="flex-1 h-px bg-dota-line/40" />
              <span className="text-[9px] text-dota-muted shrink-0">{msg.text}</span>
              <div className="flex-1 h-px bg-dota-line/40" />
            </div>
          );
        }
        // Mention
        return (
          <div key={msg.id} className="flex items-center gap-2 bg-dota-surface/60 rounded px-2 py-1 border border-dota-line/30">
            {msg.heroKey && (
              <div className="relative w-10 aspect-video shrink-0 rounded overflow-hidden">
                <Image
                  src={heroImageUrl(msg.heroKey)}
                  alt={msg.heroName ?? ""}
                  fill
                  className="object-cover object-center"
                  unoptimized
                />
              </div>
            )}
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[9px] text-dota-muted truncate">{msg.authorName} suggests</span>
              <span className="text-[11px] font-bold text-dota-gold truncate">{msg.heroName}</span>
            </div>
            <span className="ml-auto text-[8px] text-dota-muted shrink-0">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
```

---

## Task 14: DraftStats Component

**Files:**
- Create: `components/DraftStats.tsx`

- [ ] **Step 1: Create DraftStats**

```tsx
// components/DraftStats.tsx
"use client";

import Image from "next/image";
import { useState } from "react";
import type { Session } from "@/lib/types";
import { HEROES, heroImageUrl } from "@/lib/heroes";
import type { Attribute } from "@/lib/heroes";

interface DraftStatsProps {
  session: Session;
  onNewDraft: () => void;
}

const ATTR_LABEL: Record<Attribute, string> = {
  strength: "STR",
  agility: "AGI",
  intelligence: "INT",
  universal: "UNI",
};
const ATTR_COLOR: Record<Attribute, string> = {
  strength: "text-dota-str",
  agility: "text-dota-agi",
  intelligence: "text-dota-int",
  universal: "text-dota-uni",
};

function HeroPortrait({ heroId, heroName }: { heroId: number; heroName: string }) {
  const [err, setErr] = useState(false);
  const hero = HEROES.find((h) => h.id === heroId);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-14 aspect-video rounded overflow-hidden border border-dota-line/60 bg-dota-surface">
        {hero && !err ? (
          <Image src={heroImageUrl(hero.name)} alt={heroName} fill className="object-cover object-center" onError={() => setErr(true)} unoptimized />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[6px] text-dota-muted text-center px-0.5">{heroName}</span>
          </div>
        )}
      </div>
      <span className="text-[8px] text-dota-warm text-center leading-tight max-w-[56px] truncate">{heroName}</span>
      {hero && (
        <span className={`text-[7px] font-bold ${ATTR_COLOR[hero.attribute]}`}>{ATTR_LABEL[hero.attribute]}</span>
      )}
    </div>
  );
}

export default function DraftStats({ session, onNewDraft }: DraftStatsProps) {
  const radiantPicks = session.slots.filter((s) => s.team === "radiant" && s.type === "pick" && s.heroId);
  const direPicks = session.slots.filter((s) => s.team === "dire" && s.type === "pick" && s.heroId);
  const radiantBans = session.slots.filter((s) => s.team === "radiant" && s.type === "ban" && s.heroId).length;
  const direBans = session.slots.filter((s) => s.team === "dire" && s.type === "ban" && s.heroId).length;

  const duration = session.completedAt && session.createdAt
    ? Math.floor((session.completedAt - session.createdAt) / 1000)
    : 0;
  const durationStr = duration > 0
    ? `${Math.floor(duration / 60)}m ${duration % 60}s`
    : "—";

  return (
    <div className="flex flex-col gap-6 p-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="h-px w-48 bg-linear-to-r from-transparent via-dota-gold/50 to-transparent mx-auto mb-4" />
        <h1 className="font-display text-2xl font-black tracking-[0.25em] text-dota-gold uppercase">Draft Complete</h1>
        <p className="text-dota-muted text-xs mt-1">Session: {session.name} · Duration: {durationStr}</p>
        <div className="h-px w-48 bg-linear-to-r from-transparent via-dota-gold/50 to-transparent mx-auto mt-4" />
      </div>

      {/* Teams */}
      <div className="grid grid-cols-2 gap-4">
        {/* Radiant */}
        <div className="bg-dota-panel border border-dota-radiant/30 rounded p-4">
          <h2 className="font-display text-xs font-black tracking-widest text-dota-radiant uppercase mb-3 text-center">Radiant</h2>
          <div className="flex flex-wrap gap-2 justify-center mb-3">
            {radiantPicks.map((s, i) => (
              <HeroPortrait key={i} heroId={s.heroId!} heroName={s.heroName!} />
            ))}
          </div>
          <p className="text-[9px] text-dota-muted text-center">{radiantBans} bans</p>
        </div>

        {/* Dire */}
        <div className="bg-dota-panel border border-dota-dire/30 rounded p-4">
          <h2 className="font-display text-xs font-black tracking-widest text-dota-dire uppercase mb-3 text-center">Dire</h2>
          <div className="flex flex-wrap gap-2 justify-center mb-3">
            {direPicks.map((s, i) => (
              <HeroPortrait key={i} heroId={s.heroId!} heroName={s.heroName!} />
            ))}
          </div>
          <p className="text-[9px] text-dota-muted text-center">{direBans} bans</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-3">
        <button
          onClick={onNewDraft}
          className="px-6 py-2 bg-dota-gold hover:bg-dota-gold-light text-dota-bg font-display font-black text-xs uppercase tracking-widest rounded transition-colors"
        >
          Back to Lobby
        </button>
      </div>
    </div>
  );
}
```

---

## Task 15: DraftRoom Main Component

**Files:**
- Create: `components/DraftRoom.tsx`

This is the largest component. It handles SSE, all three states (pre-draft, drafting, completed), and wires all sub-components together.

- [ ] **Step 1: Create DraftRoom.tsx**

```tsx
// components/DraftRoom.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Session, User } from "@/lib/types";
import type { Hero } from "@/lib/heroes";
import { DRAFT_SEQUENCE } from "@/lib/draft";
import TeamPanel from "./TeamPanel";
import HeroGrid from "./HeroGrid";
import PhaseBar from "./PhaseBar";
import TeamRoster from "./TeamRoster";
import ChatPanel from "./ChatPanel";
import DraftStats from "./DraftStats";

interface DraftRoomProps {
  sessionId: string;
  user: User;
}

function useServerTimer(timerEndsAt: number | null): number {
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (!timerEndsAt) { setTimeLeft(30); return; }
    const update = () => {
      const remaining = Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    update();
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, [timerEndsAt]);

  return timeLeft;
}

async function sendAction(sessionId: string, type: string, payload: Record<string, unknown> = {}) {
  await fetch(`/api/sessions/${sessionId}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, payload }),
  });
}

export default function DraftRoom({ sessionId, user }: DraftRoomProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const esRef = useRef<EventSource | null>(null);

  // SSE connection
  useEffect(() => {
    const es = new EventSource(`/api/sessions/${sessionId}/stream`);
    esRef.current = es;

    es.onmessage = (e) => {
      try { setSession(JSON.parse(e.data)); } catch {}
    };
    es.onerror = () => setError("Connection lost. Refresh to reconnect.");

    return () => es.close();
  }, [sessionId]);

  const action = useCallback((type: string, payload?: Record<string, unknown>) => {
    sendAction(sessionId, type, payload ?? {});
  }, [sessionId]);

  const handlePickOrBan = useCallback((hero: Hero) => {
    if (!session || session.status !== "drafting") return;
    const currentAction = DRAFT_SEQUENCE[session.currentStep];
    action(currentAction.type, { heroId: hero.id });
  }, [session, action]);

  const handleMention = useCallback((hero: Hero) => {
    action("mention", { heroId: hero.id });
  }, [action]);

  const timeLeft = useServerTimer(session?.timerEndsAt ?? null);

  if (error) {
    return (
      <div className="min-h-screen bg-dota-bg flex items-center justify-center text-dota-dire text-sm">
        {error}
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-dota-bg flex items-center justify-center text-dota-muted text-sm">
        Connecting...
      </div>
    );
  }

  const isDone = session.status === "completed";
  const isDrafting = session.status === "drafting";
  const isAdmin = user.workId === session.adminId;
  const me = session.players.find((p) => p.workId === user.workId);

  // Captain logic
  const currentAction = isDrafting && !isDone ? DRAFT_SEQUENCE[session.currentStep] : null;
  const currentTeamCaptain = currentAction
    ? (currentAction.team === "radiant" ? session.radiantCaptain : session.direCaptain)
    : null;
  const iAmCaptain = currentTeamCaptain === user.workId;
  const isCaptainTurn = iAmCaptain || isAdmin;

  const radiantPlayers = session.players.filter((p) => p.team === "radiant");
  const direPlayers = session.players.filter((p) => p.team === "dire");

  const bannedIds = new Set(session.slots.filter((s) => s.type === "ban" && s.heroId).map((s) => s.heroId!));
  const pickedIds = new Set(session.slots.filter((s) => s.type === "pick" && s.heroId).map((s) => s.heroId!));

  // Pre-draft waiting room
  if (session.status === "waiting" || session.status === "ready") {
    return (
      <div className="min-h-screen bg-dota-bg bg-dot-grid text-dota-warm flex flex-col">
        {/* Header */}
        <header className="shrink-0 border-b border-dota-line bg-dota-panel/90 px-4 py-2.5 flex items-center gap-3">
          <button onClick={() => router.push("/lobby")} className="text-[10px] text-dota-muted hover:text-dota-warm border border-dota-line px-2 py-1 rounded font-display uppercase tracking-widest">
            ← Lobby
          </button>
          <span className="font-display text-sm font-black text-dota-gold tracking-[0.15em] uppercase flex-1 text-center">{session.name}</span>
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${session.status === "ready" ? "bg-dota-gold" : "bg-dota-muted"}`} />
            <span className="text-[10px] font-display text-dota-muted uppercase tracking-widest">
              {session.status === "ready" ? "Ready" : "Waiting"} · {session.players.length}/10
            </span>
          </div>
        </header>

        <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 max-w-4xl mx-auto w-full">
          {/* Teams */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:w-56 shrink-0">
            <TeamRoster
              team="radiant"
              players={radiantPlayers}
              captain={session.radiantCaptain}
              myWorkId={user.workId}
              isAdmin={isAdmin}
              sessionStatus={session.status}
              onBecomeCaptain={(t) => action("setCaptain", { targetWorkId: t })}
              onTransferCaptain={(t) => action("setCaptain", { targetWorkId: t })}
              onResignCaptain={() => action("resignCaptain")}
              onSwap={(t) => action("swapPlayer", { targetWorkId: t })}
            />
            <TeamRoster
              team="dire"
              players={direPlayers}
              captain={session.direCaptain}
              myWorkId={user.workId}
              isAdmin={isAdmin}
              sessionStatus={session.status}
              onBecomeCaptain={(t) => action("setCaptain", { targetWorkId: t })}
              onTransferCaptain={(t) => action("setCaptain", { targetWorkId: t })}
              onResignCaptain={() => action("resignCaptain")}
              onSwap={(t) => action("swapPlayer", { targetWorkId: t })}
            />
          </div>

          {/* Center: info + controls */}
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="text-center">
              <p className="font-display text-xs text-dota-muted uppercase tracking-widest mb-1">Session</p>
              <p className="font-display text-lg font-black text-dota-warm tracking-wide">{session.name}</p>
              <p className="text-sm text-dota-muted mt-1">{session.players.length}/10 players joined</p>
            </div>

            {/* Waiting for players */}
            {session.status === "waiting" && (
              <div className="text-center text-dota-muted text-sm">
                <div className="flex gap-1 justify-center mb-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full ${i < session.players.length ? "bg-dota-gold" : "bg-dota-line"}`} />
                  ))}
                </div>
                Waiting for {10 - session.players.length} more players...
              </div>
            )}

            {/* Admin controls */}
            {isAdmin && (
              <div className="flex flex-col gap-2 items-center">
                {session.status === "ready" && (
                  <button
                    onClick={() => action("startDraft")}
                    className="px-8 py-3 bg-dota-gold hover:bg-dota-gold-light text-dota-bg font-display font-black text-sm uppercase tracking-widest rounded transition-colors shadow-[0_0_20px_rgba(200,162,67,0.3)]"
                  >
                    Start Draft
                  </button>
                )}
                {/* Dev override: start even without 10 players */}
                {session.status === "waiting" && session.players.length >= 2 && (
                  <button
                    onClick={() => action("startDraft")}
                    className="px-6 py-2 border border-dota-gold/30 text-dota-gold/70 hover:text-dota-gold font-display text-xs uppercase tracking-widest rounded transition-colors"
                  >
                    Start Anyway (dev)
                  </button>
                )}
                <button
                  onClick={() => action("endSession")}
                  className="text-[10px] text-dota-muted hover:text-dota-dire font-display uppercase tracking-widest transition-colors"
                >
                  End Session
                </button>
              </div>
            )}

            {!isAdmin && (
              <p className="text-xs text-dota-muted">Waiting for admin to start the draft...</p>
            )}

            {/* My team + captain status */}
            {me && (
              <div className="text-center text-[10px] text-dota-muted">
                Team: <span className={me.team === "radiant" ? "text-dota-radiant" : "text-dota-dire"}>{me.team}</span>
                {me.isCaptain && <span className="ml-2 text-dota-gold">♛ Captain</span>}
              </div>
            )}
          </div>
        </div>

        {/* System messages */}
        <div className="shrink-0 border-t border-dota-line bg-dota-panel/60 px-4 py-2 h-20">
          <ChatPanel messages={session.chat} />
        </div>
      </div>
    );
  }

  // Completed — show stats
  if (isDone) {
    return (
      <div className="min-h-screen bg-dota-bg bg-dot-grid text-dota-warm overflow-y-auto">
        <header className="border-b border-dota-line bg-dota-panel/90 px-4 py-2.5 flex items-center gap-3">
          <span className="font-display text-sm font-black text-dota-gold tracking-[0.15em] uppercase flex-1 text-center">{session.name}</span>
        </header>
        <DraftStats session={session} onNewDraft={() => router.push("/lobby")} />
      </div>
    );
  }

  // Active draft
  const captainOverlay = isDrafting && !isCaptainTurn;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-dota-bg text-dota-warm">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-dot-grid opacity-100" />
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-dota-radiant/[0.04] to-transparent" />
        <div className="absolute inset-y-0 right-0 w-1/3 bg-linear-to-l from-dota-dire/[0.04] to-transparent" />
      </div>

      {/* Header */}
      <header className="relative z-10 shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-dota-line bg-dota-panel/90 backdrop-blur-sm">
        <span className="font-display text-base font-black text-dota-gold tracking-[0.15em] uppercase shrink-0">{session.name}</span>
        <div className="w-px h-6 bg-dota-line shrink-0" />

        {/* Current turn */}
        {currentAction && (
          <div className="flex items-center gap-2 flex-1 justify-center">
            <div className={`w-2 h-2 rounded-full glow-pulse ${currentAction.team === "radiant" ? "bg-dota-radiant shadow-[0_0_8px_rgba(74,158,74,0.9)]" : "bg-dota-dire shadow-[0_0_8px_rgba(184,64,64,0.9)]"}`} />
            <span className={`font-display text-sm font-black tracking-[0.2em] uppercase ${currentAction.team === "radiant" ? "text-dota-radiant" : "text-dota-dire"}`}>
              {currentAction.team}
            </span>
            <span className="text-dota-muted text-xs hidden sm:inline">{currentAction.type === "ban" ? "· banning" : "· picking"}</span>
            {iAmCaptain && <span className="text-[10px] text-dota-gold font-bold ml-2">♛ Your turn</span>}
            {!isCaptainTurn && isDrafting && <span className="text-[10px] text-dota-muted ml-2">Captain is drafting...</span>}
          </div>
        )}

        {/* Controls */}
        <div className="shrink-0 flex items-center gap-1.5">
          <button onClick={() => router.push("/lobby")} className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest border border-dota-line text-dota-muted hover:text-dota-warm rounded transition-all">
            Lobby
          </button>
          {isAdmin && (
            <button onClick={() => action("endSession")} className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest border border-dota-line text-dota-muted hover:text-dota-dire rounded transition-all">
              End
            </button>
          )}
        </div>
      </header>

      {/* Phase bar */}
      <div className="relative z-10 shrink-0 border-b border-dota-line bg-dota-panel/60">
        <PhaseBar currentStep={session.currentStep} timeLeft={timeLeft} />
      </div>

      {/* Main 3-column */}
      <div className="relative z-10 flex flex-1 min-h-0 gap-2 p-2">
        {/* Radiant */}
        <div className="hidden lg:flex w-52 shrink-0 flex-col">
          <TeamPanel team="radiant" slots={session.slots} currentStep={session.currentStep} />
        </div>

        {/* Center: hero grid + chat */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          {/* Captain overlay label */}
          {captainOverlay && (
            <div className="shrink-0 text-center py-1 bg-dota-surface/80 rounded border border-dota-line text-[10px] text-dota-muted font-display uppercase tracking-widest">
              Waiting for {currentAction?.team} captain to pick...
            </div>
          )}

          <div className="flex-1 min-h-0">
            <HeroGrid
              bannedIds={bannedIds}
              pickedIds={pickedIds}
              disabled={!isDrafting || isDone || !isCaptainTurn}
              onSelect={handlePickOrBan}
              onMention={handleMention}
              isCaptainTurn={isCaptainTurn}
            />
          </div>

          {/* Chat panel */}
          <div className="shrink-0 h-20 bg-dota-panel/60 border border-dota-line rounded p-2">
            <ChatPanel messages={session.chat} />
          </div>
        </div>

        {/* Dire */}
        <div className="hidden lg:flex w-52 shrink-0 flex-col">
          <TeamPanel team="dire" slots={session.slots} currentStep={session.currentStep} />
        </div>
      </div>
    </div>
  );
}
```

---

## Task 16: Pages + Practice Mode

**Files:**
- Create: `app/draft/[id]/page.tsx`
- Create: `app/practice/page.tsx`

- [ ] **Step 1: Create draft page**

```tsx
// app/draft/[id]/page.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DraftRoom from "@/components/DraftRoom";

export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("dota-user");
  if (!userCookie?.value) redirect("/");
  const user = JSON.parse(userCookie.value);
  return <DraftRoom sessionId={id} user={user} />;
}
```

- [ ] **Step 2: Create practice page (solo simulator — avoids hydration error via dynamic import)**

```tsx
// app/practice/page.tsx
import dynamic from "next/dynamic";
import { Suspense } from "react";

const DraftApp = dynamic(() => import("@/components/DraftApp"), { ssr: false });

export default function PracticePage() {
  return (
    <Suspense>
      <DraftApp />
    </Suspense>
  );
}
```

- [ ] **Step 3: Add Practice link to LobbyPage**

In `components/LobbyPage.tsx`, add a link in the header:
```tsx
<a href="/practice" className="text-[10px] text-dota-muted hover:text-dota-warm border border-dota-line px-2.5 py-1 rounded font-display uppercase tracking-widest">
  Practice
</a>
```

---

## Task 17: Verify Build

- [ ] **Step 1: Run TypeScript check**

```bash
cd /home/dicky/Projects/hobby/dota2-draft && npx tsc --noEmit 2>&1
```
Expected: no errors

- [ ] **Step 2: Run build**

```bash
npm run build 2>&1 | tail -25
```
Expected: `✓ Compiled successfully`

---

## Backend Explanation (for docs)

**How the backend works:**

1. **Store (`lib/store.ts`)**: Single in-memory class instance on the Node.js server. All sessions live in a `Map<string, Session>`. On Next.js dev HMR (hot reload), modules re-run, so the store is pinned to `global.__draftStore` to survive reloads.

2. **SSE (`/api/sessions/[id]/stream`)**: Each browser tab opens a persistent HTTP connection. The server holds a `ReadableStreamDefaultController` for every connected client. When any action mutates state, `store.broadcast(sessionId)` serializes the full session to JSON and pushes it to every connected controller. No polling, no WebSocket library — just native browser `EventSource` + `Response(ReadableStream)`.

3. **Actions (`/api/sessions/[id]/action`)**: Single `POST` endpoint, action type in body. Auth is read from the `dota-user` cookie on every request. After mutating state, the store automatically broadcasts to all SSE listeners.

4. **Timer**: When a draft step starts, `store.scheduleTimer(sessionId)` uses `setTimeout(30s)`. If no pick/ban happens in time, the server auto-picks a random hero using `store.adminId` as the actor, then advances the step and broadcasts.

5. **History**: Completed sessions are `unshift`-ed into `store.history[]`. The `/api/history` route returns the last 20.

6. **Limitation**: In-memory only — data is lost on server restart. For production, replace the store with Redis or a database, keeping the same `broadcast()` interface.

---

*Self-review: all spec requirements covered — auth, lobby, statuses, 10-player cap, admin=first player, captain system with transfer/resign, swap teams, start/end controls, hero mention feature, 30s auto-pick timer, post-draft stats, history, hydration fix via dynamic import.*
