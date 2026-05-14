export type Team = "radiant" | "dire";
export type ActionType = "ban" | "pick";

export interface DraftAction {
  team: Team;
  type: ActionType;
}

export interface DraftSlot {
  team: Team;
  type: ActionType;
  heroId: number | null;
  heroName: string | null;
}

// Competitive Captains Mode sequence
export const DRAFT_SEQUENCE: DraftAction[] = [
  // Ban phase 1 (6 bans)
  { team: "radiant", type: "ban" },
  { team: "dire", type: "ban" },
  { team: "radiant", type: "ban" },
  { team: "dire", type: "ban" },
  { team: "radiant", type: "ban" },
  { team: "dire", type: "ban" },
  // Pick phase 1 (4 picks)
  { team: "radiant", type: "pick" },
  { team: "dire", type: "pick" },
  { team: "dire", type: "pick" },
  { team: "radiant", type: "pick" },
  // Ban phase 2 (4 bans)
  { team: "radiant", type: "ban" },
  { team: "dire", type: "ban" },
  { team: "radiant", type: "ban" },
  { team: "dire", type: "ban" },
  // Pick phase 2 (4 picks)
  { team: "radiant", type: "pick" },
  { team: "dire", type: "pick" },
  { team: "dire", type: "pick" },
  { team: "radiant", type: "pick" },
  // Ban phase 3 (2 bans)
  { team: "radiant", type: "ban" },
  { team: "dire", type: "ban" },
  // Final picks (2 picks)
  { team: "dire", type: "pick" },
  { team: "radiant", type: "pick" },
];

export function initDraftSlots(): DraftSlot[] {
  return DRAFT_SEQUENCE.map((action) => ({
    ...action,
    heroId: null,
    heroName: null,
  }));
}

export function getPhaseLabel(stepIndex: number): string {
  if (stepIndex < 6) return "Ban Phase 1";
  if (stepIndex < 10) return "Pick Phase 1";
  if (stepIndex < 14) return "Ban Phase 2";
  if (stepIndex < 18) return "Pick Phase 2";
  if (stepIndex < 20) return "Ban Phase 3";
  return "Final Picks";
}
