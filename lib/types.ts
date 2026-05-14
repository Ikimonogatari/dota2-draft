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
  heroKey?: string;
  text?: string;
  timestamp: number;
}

export interface Session {
  id: string;
  name: string;
  status: SessionStatus;
  players: Player[];
  adminId: string;
  radiantCaptain: string | null;
  direCaptain: string | null;
  slots: DraftSlot[];
  currentStep: number;
  chat: ChatMessage[];
  timerEndsAt: number | null;
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
