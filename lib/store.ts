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

  private controllers = new Map<string, Set<ReadableStreamDefaultController>>();
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
      try {
        ctrl.enqueue(payload);
      } catch {
        // client disconnected
      }
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
    return [...this.sessions.values()]
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
    if (s.players.find((p) => p.workId === workId)) return null;
    if (s.players.length >= 10) return "Session is full";

    const radiantCount = s.players.filter((p) => p.team === "radiant").length;
    const team: TeamName = radiantCount < 5 ? "radiant" : "dire";

    s.players.push({ workId, name, team, isCaptain: false });

    if (s.players.length === 10 && s.status === "waiting") {
      s.status = "ready";
    }

    this.addSystemMessage(sessionId, `${name} joined`);
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
    if (!requester) return "Not in session";

    const isAdmin = requesterWorkId === s.adminId;
    const isSelf = requesterWorkId === targetWorkId;
    const existingCaptain = target.team === "radiant" ? s.radiantCaptain : s.direCaptain;
    const isCurrentCaptain = existingCaptain === requesterWorkId;

    if (!isAdmin && !isSelf && !isCurrentCaptain) return "Not authorized";
    if (isSelf && existingCaptain && existingCaptain !== requesterWorkId) return "Team already has a captain";
    if (!isAdmin && requester.team !== target.team) return "Can only manage your own team";

    s.players.forEach((p) => {
      if (p.team === target.team) p.isCaptain = false;
    });
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
    if (!player?.isCaptain) return "You are not a captain";

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
    if (s.players.filter((p) => p.team === newTeam).length >= 5) return `${newTeam} team is full`;

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
    if (s.players.length < 2) return "Need at least 2 players";

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
    const currentTeamCaptain =
      currentAction.team === "radiant" ? s.radiantCaptain : s.direCaptain;

    if (workId !== s.adminId && workId !== currentTeamCaptain) {
      return "Only the captain or admin can pick";
    }

    const usedIds = new Set(
      s.slots.filter((sl) => sl.heroId !== null).map((sl) => sl.heroId as number)
    );
    if (usedIds.has(heroId)) return "Hero already used";

    const hero = HEROES.find((h) => h.id === heroId);
    if (!hero) return "Hero not found";

    clearTimeout(this.timers.get(sessionId));
    this.timers.delete(sessionId);

    s.slots[s.currentStep].heroId = heroId;
    s.slots[s.currentStep].heroName = hero.displayName;
    s.currentStep++;

    if (s.currentStep >= DRAFT_SEQUENCE.length) {
      s.status = "completed";
      s.completedAt = Date.now();
      s.timerEndsAt = null;
      this.history.unshift({ ...s });
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
    if (!player) return "Not in session";

    const hero = HEROES.find((h) => h.id === heroId);
    if (!hero) return "Hero not found";

    const playerTeam = player.team === "radiant" || player.team === "dire" ? player.team : "all";
    const msg: ChatMessage = {
      id: nanoid(),
      type: "mention",
      scope: playerTeam as "all" | "radiant" | "dire",
      authorId: workId,
      authorName: player.name,
      heroId: hero.id,
      heroName: hero.displayName,
      heroKey: hero.name,
      timestamp: Date.now(),
    };

    s.chat.push(msg);
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
    this.history.unshift({ ...s });

    this.addSystemMessage(sessionId, "Session ended by admin");
    this.broadcast(sessionId);
    return null;
  }

  // ── Internal ──────────────────────────────────────────────────────────

  sendChat(sessionId: string, workId: string, text: string, scope: "all" | "radiant" | "dire"): string | null {
    const s = this.sessions.get(sessionId);
    if (!s) return "Session not found";
    if (s.status === "completed") return "Session is over";

    const player = s.players.find((p) => p.workId === workId);
    if (!player) return "Not in session";

    const trimmed = text.trim().slice(0, 200);
    if (!trimmed) return "Empty message";

    s.chat.push({
      id: nanoid(),
      type: "chat",
      scope,
      authorId: workId,
      authorName: player.name,
      text: trimmed,
      timestamp: Date.now(),
    });
    if (s.chat.length > 100) s.chat.splice(0, s.chat.length - 100);

    this.broadcast(sessionId);
    return null;
  }

  private addSystemMessage(sessionId: string, text: string) {
    const s = this.sessions.get(sessionId);
    if (!s) return;
    s.chat.push({
      id: nanoid(),
      type: "system",
      scope: "all",
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

      const usedIds = new Set(
        session.slots.filter((sl) => sl.heroId !== null).map((sl) => sl.heroId as number)
      );
      const available = HEROES.filter((h) => !usedIds.has(h.id));
      if (available.length === 0) return;

      const hero = available[Math.floor(Math.random() * available.length)];
      this.addSystemMessage(sessionId, `Time is up! Autoselecting ${hero.displayName}.`);
      this.performStep(sessionId, session.adminId, hero.id);
    }, 30_000);

    this.timers.set(sessionId, timer);
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __draftStore: Store | undefined;
}

export function getStore(): Store {
  // If the singleton exists but is missing methods added after HMR reloaded this
  // module, recreate it so new API routes work without a full server restart.
  if (!global.__draftStore || typeof global.__draftStore.sendChat !== "function") {
    global.__draftStore = new Store();
  }
  return global.__draftStore;
}
