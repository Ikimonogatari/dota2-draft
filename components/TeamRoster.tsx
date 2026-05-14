"use client";

import type { Player } from "@/lib/types";

interface TeamRosterProps {
  team: "radiant" | "dire";
  players: Player[];
  captain: string | null;
  myWorkId: string;
  isAdmin: boolean;
  sessionStatus: string;
  onBecomeCaptain: (workId: string) => void;
  onTransferCaptain: (workId: string) => void;
  onResignCaptain: () => void;
  onSwap: (workId: string) => void;
}

const STYLE = {
  radiant: {
    label: "РЭЙДИАНТ",
    color: "text-dota-radiant",
    border: "border-dota-radiant/30",
    bg: "bg-dota-radiant/5",
    headerAccent: "from-dota-radiant/15",
  },
  dire: {
    label: "ДАЙЕР",
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
  onBecomeCaptain,
  onTransferCaptain,
  onResignCaptain,
  onSwap,
}: TeamRosterProps) {
  const style = STYLE[team];
  const me = players.find((p) => p.workId === myWorkId);
  const iAmCaptain = captain === myWorkId;
  const isDrafting = sessionStatus === "drafting" || sessionStatus === "completed";

  return (
    <div className={`flex flex-col rounded-sm border ${style.border} glass-panel overflow-hidden panel-corners transition-all duration-500`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${style.border} bg-linear-to-r ${style.headerAccent} to-transparent`}>
        <span className={`font-display text-xs font-black tracking-[0.3em] uppercase ${style.color}`}>
          {style.label}
        </span>
        <span className="font-display text-[10px] text-dota-warm/60 font-black tracking-widest">{players.length} / 5</span>
      </div>

      {/* Players */}
      <div className="flex flex-col divide-y divide-white/5">
        {Array.from({ length: 5 }).map((_, i) => {
          const p = players[i];
          if (!p) {
            return (
              <div key={i} className="h-12 flex items-center justify-center px-4 bg-black/20">
                <span className="text-[10px] font-display font-bold text-white/20 uppercase tracking-[0.2em]">— ХООСОН —</span>
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

              {/* Name */}
              <span className={`text-xs font-display font-black uppercase tracking-wider truncate flex-1 ${
                isMe ? "text-white" : "text-dota-warm/60"
              }`}>
                {p.name}
                {isMe && <span className="text-dota-gold/60 text-[9px] ml-2 normal-case font-bold tracking-normal">(ТА)</span>}
              </span>

              {/* Actions */}
              {!isDrafting && (
                <div className="flex gap-1.5 shrink-0">
                  {!captain && isMe && me?.team === team && (
                    <button
                      onClick={() => onBecomeCaptain(myWorkId)}
                      className="dota-button text-[9px] font-black text-dota-gold border border-dota-gold/40 px-2 py-1 rounded-sm hover:bg-dota-gold/10 transition-all"
                    >
                      АХЛАГЧ
                    </button>
                  )}
                  {iAmCaptain && !isMe && me?.team === team && (
                    <button
                      onClick={() => onTransferCaptain(p.workId)}
                      className="dota-button text-[9px] font-black text-dota-gold border border-dota-gold/40 px-2 py-1 rounded-sm hover:bg-dota-gold/10 transition-all"
                    >
                      ӨГӨХ
                    </button>
                  )}
                  {iAmCaptain && isMe && (
                    <button
                      onClick={onResignCaptain}
                      className="dota-button text-[9px] font-black text-dota-muted border border-white/20 px-2 py-1 rounded-sm hover:text-dota-dire hover:border-dota-dire/40 transition-all"
                    >
                      ОГЦРОХ
                    </button>
                  )}
                  {isAdmin && !isMe && (
                    <button
                      onClick={() => onSwap(p.workId)}
                      className="dota-button text-[9px] font-black text-dota-muted border border-white/20 px-2 py-1 rounded-sm hover:text-dota-gold hover:border-dota-gold/40 transition-all"
                    >
                      СОЛИХ
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
