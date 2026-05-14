import type { DraftSlot } from "@/lib/draft";

export type Role = "mid" | "carry" | "offlane" | "support" | "hard support";

export interface User {
  workId: string;
  name: string;
  mmr: number;
  roles: Role[];
}

export type TeamName = "radiant" | "dire";
export type SessionStatus = "waiting" | "ready" | "player_drafting" | "drafting" | "completed";

export interface Player {
  workId: string;
  name: string;
  mmr: number;
  roles: Role[];
  team: TeamName | "spectator" | "unassigned";
  isCaptain: boolean;
}

export interface ChatMessage {
  id: string;
  type: "mention" | "system" | "chat";
  scope: "all" | "radiant" | "dire";
  authorId: string;
  authorName: string;
  heroId?: number;
  heroName?: string;
  heroKey?: string;
  text?: string;
  timestamp: number;
}

export type LobbyMode = "free" | "draft";

export interface Session {
  id: string;
  name: string;
  mode: LobbyMode;
  status: SessionStatus;
  players: Player[];
  adminId: string;
  radiantCaptain: string | null;
  direCaptain: string | null;
  slots: DraftSlot[];
  currentStep: number;
  playerDraftTurn?: TeamName;
  chat: ChatMessage[];
  timerEndsAt: number | null;
  createdAt: number;
  completedAt?: number;
}

export interface SessionSummary {
  id: string;
  name: string;
  mode: LobbyMode;
  status: SessionStatus;
  playerCount: number;
  adminName: string;
  createdAt: number;
  completedAt?: number;
}
