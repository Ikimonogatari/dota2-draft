"use client";

import type { Player } from "@/lib/types";

interface TeamRosterProps {
  team: "radiant" | "dire";
  players: Player[];
  captain: string | null;
  myWorkId: string;
  isAdmin: boolean;
  sessionStatus: string;
  sessionMode: "free" | "draft";
  onBecomeCaptain: (workId: string) => void;
  onTransferCaptain: (workId: string) => void;
  onResignCaptain: () => void;
  onSwap: (workId: string) => void;
  onJoinTeam?: (team: "radiant" | "dire") => void;
}

const STYLE = {
  radiant: {
    label: "RADIANT",
    color: "text-dota-radiant",
    border: "border-dota-radiant/30",
    bg: "bg-dota-radiant/5",
    headerAccent: "from-dota-radiant/15",
  },
  dire: {
    label: "DIRE",
    color: "text-dota-dire",
    border: "border-dota-dire/30",
    bg: "bg-dota-dire/5",
    headerAccent: "from-dota-dire/15",
  },
};

export default function TeamRoster({
  team,
  players,
  captain,
  myWorkId,
  isAdmin,
  sessionStatus,
  sessionMode,
  onBecomeCaptain,
  onTransferCaptain,
  onResignCaptain,
  onSwap,
  onJoinTeam,
}: TeamRosterProps) {
  const style = STYLE[team];
  const me = players.find((p) => p.workId === myWorkId);
  const iAmCaptain = captain === myWorkId;
  const isDrafting = sessionStatus === "drafting" || sessionStatus === "completed";
  const canJoinEmpty = !isDrafting && sessionMode === "free" && onJoinTeam;
  
  const neededRoles: import("@/lib/types").Role[] = ["mid", "carry", "offlane", "support", "hard support"];
  const coveredRoles = new Set(players.flatMap(p => p.roles || []));
  const missingRoles = neededRoles.filter(r => !coveredRoles.has(r));

  return (
    <div className={`flex flex-col rounded-sm border ${style.border} glass-panel overflow-hidden panel-corners transition-all duration-500`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${style.border} bg-linear-to-r ${style.headerAccent} to-transparent`}>
        <span className={`font-display text-xs font-black tracking-[0.3em] uppercase ${style.color}`}>
          {style.label}
        </span>
        <span className="font-display text-[10px] text-white font-black tracking-widest opacity-80">{players.length} / 5</span>
      </div>

      {/* Players */}
      <div className="flex flex-col divide-y divide-white/5">
        {Array.from({ length: 5 }).map((_, i) => {
          const p = players[i];
          if (!p) {
            return (
              <div
                key={i}
                onClick={() => canJoinEmpty && onJoinTeam(team)}
                className={`h-12 flex items-center justify-center px-4 bg-black/20 transition-all ${
                  canJoinEmpty ? "cursor-pointer hover:bg-white/5" : ""
                }`}
              >
                <span className={`text-[10px] font-display font-black uppercase tracking-[0.25em] ${
                  canJoinEmpty ? "text-white/60 hover:text-white" : "text-white/40"
                }`}>
                  {canJoinEmpty ? "— CLICK TO JOIN —" : "— EMPTY —"}
                </span>
              </div>
            );
          }

          const isCaptain = p.workId === captain;
          const isMe = p.workId === myWorkId;

          return (
            <div
              key={p.workId}
              className={`flex items-center gap-3 h-12 px-4 transition-all duration-300 ${isMe ? "bg-white/5" : "hover:bg-white/2"}`}
            >
              {/* Crown */}
              <div className="w-5 shrink-0 flex justify-center">
                {isCaptain ? (
                  <span className="text-sm text-dota-gold drop-shadow-[0_0_8px_rgba(212,175,55,0.6)] animate-float">♛</span>
                ) : (
                  <div className="w-1 h-1 rounded-full bg-white/10" />
                )}
              </div>

              {/* Name and Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-display font-black uppercase tracking-wider truncate ${
                    isMe ? "text-white" : "text-white/70"
                  }`}>
                    {p.name}
                    {isMe && <span className="text-dota-gold text-[9px] ml-2 normal-case font-black tracking-normal opacity-80">(YOU)</span>}
                  </span>
                  {p.mmr !== undefined && (
                    <span className="text-[9px] text-dota-gold font-mono tracking-widest">{p.mmr} MMR</span>
                  )}
                </div>
                {p.roles && p.roles.length > 0 && (
                  <div className="flex gap-1 mt-0.5">
                    {p.roles.map(r => (
                      <span key={r} className="text-[7px] uppercase tracking-widest px-1 py-0.5 bg-white/5 text-white/50 rounded-sm">
                        {r}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              {!isDrafting && (
                <div className="flex gap-1.5 shrink-0">
                  {!captain && isMe && me?.team === team && (
                    <button
                      onClick={() => onBecomeCaptain(myWorkId)}
                      className="dota-button text-[9px] font-black text-dota-gold border border-dota-gold/40 px-2 py-1 rounded-sm hover:bg-dota-gold/10 transition-all"
                    >
                      BECOME CAPTAIN
                    </button>
                  )}
                  {iAmCaptain && !isMe && me?.team === team && (
                    <button
                      onClick={() => onTransferCaptain(p.workId)}
                      className="dota-button text-[9px] font-black text-dota-gold border border-dota-gold/40 px-2 py-1 rounded-sm hover:bg-dota-gold/10 transition-all"
                    >
                      PASS CAPTAIN
                    </button>
                  )}
                  {iAmCaptain && isMe && (
                    <button
                      onClick={onResignCaptain}
                      className="dota-button text-[9px] font-black text-dota-muted border border-white/20 px-2 py-1 rounded-sm hover:text-dota-dire hover:border-dota-dire/40 transition-all"
                    >
                      RESIGN CAPTAIN
                    </button>
                  )}
                  {(isAdmin || isMe) && (
                    <button
                      onClick={() => onSwap(p.workId)}
                      className="dota-button text-[9px] font-black text-dota-muted border border-white/20 px-2 py-1 rounded-sm hover:text-dota-gold hover:border-dota-gold/40 transition-all"
                    >
                      SWAP
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Role Compatibility */}
      {players.length > 0 && (
        <div className={`px-4 py-2 bg-black/40 border-t ${style.border}`}>
          <span className="text-[9px] text-white/40 uppercase tracking-widest font-display block mb-1">Missing Roles</span>
          {missingRoles.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {missingRoles.map(r => (
                <span key={r} className="text-[8px] uppercase tracking-widest px-1.5 py-0.5 bg-dota-dire/10 text-dota-dire rounded-sm border border-dota-dire/20">
                  {r}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-[9px] text-dota-radiant uppercase tracking-widest font-bold">All roles covered ✓</span>
          )}
        </div>
      )}
    </div>
  );
}
