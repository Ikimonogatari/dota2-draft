"use client";

import Image from "next/image";
import { useState } from "react";
import { DraftSlot } from "@/lib/draft";
import { heroImageUrl } from "@/lib/heroes";

interface TeamPanelProps {
  team: "radiant" | "dire";
  slots: DraftSlot[];
  currentStep: number;
  totalSteps: number;
}

const TEAM_LABELS = {
  radiant: { label: "RADIANT", color: "text-emerald-400", glow: "shadow-emerald-500/30", border: "border-emerald-600", bg: "from-emerald-950/60" },
  dire: { label: "DIRE", color: "text-red-400", glow: "shadow-red-500/30", border: "border-red-700", bg: "from-red-950/60" },
};

function SlotImage({ slot }: { slot: DraftSlot }) {
  const [imgError, setImgError] = useState(false);

  if (!slot.heroName) return null;

  if (imgError) {
    return (
      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
        <span className="text-xs text-gray-400 text-center px-1">{slot.heroName}</span>
      </div>
    );
  }

  return (
    <Image
      src={heroImageUrl(slot.heroName)}
      alt={slot.heroName}
      fill
      className="object-cover object-top"
      onError={() => setImgError(true)}
      unoptimized
    />
  );
}

export default function TeamPanel({ team, slots, currentStep, totalSteps }: TeamPanelProps) {
  const style = TEAM_LABELS[team];
  const picks = slots.filter((s) => s.team === team && s.type === "pick");
  const bans = slots.filter((s) => s.team === team && s.type === "ban");

  // Current slot this team needs to fill
  const globalStep = currentStep < totalSteps ? currentStep : -1;
  const currentSlot = globalStep >= 0 ? slots[globalStep] : null;
  const isActive = currentSlot?.team === team;

  return (
    <div
      className={[
        "flex flex-col h-full min-h-0 rounded-lg border",
        style.border,
        "bg-gradient-to-b",
        style.bg,
        "to-black/40 backdrop-blur-sm",
        isActive ? `shadow-lg ${style.glow}` : "",
        "transition-all duration-300",
      ].join(" ")}
    >
      {/* Team header */}
      <div className={`px-3 py-2 border-b ${style.border} flex items-center gap-2`}>
        <div className={`text-xs font-black tracking-widest ${style.color}`}>{style.label}</div>
        {isActive && (
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-current animate-pulse" style={{ color: team === "radiant" ? "#34d399" : "#f87171" }} />
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">
              {currentSlot?.type === "ban" ? "Banning" : "Picking"}
            </span>
          </div>
        )}
      </div>

      {/* Picks */}
      <div className="flex-1 p-2 min-h-0">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5 font-bold">Picks</p>
        <div className="grid grid-cols-1 gap-1.5">
          {picks.map((slot, i) => (
            <div
              key={i}
              className={[
                "relative flex items-center gap-2 rounded overflow-hidden h-12",
                slot.heroId
                  ? "border border-gray-600"
                  : `border border-dashed ${style.border} opacity-40`,
              ].join(" ")}
            >
              {slot.heroName ? (
                <>
                  <div className="relative w-16 h-full flex-shrink-0 overflow-hidden">
                    <SlotImage slot={slot} />
                  </div>
                  <span className="text-xs font-semibold text-white truncate">{slot.heroName}</span>
                </>
              ) : (
                <div className="flex items-center justify-center w-full h-full">
                  <span className="text-[10px] text-gray-600">Pick {i + 1}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bans */}
      <div className="p-2 border-t border-gray-800">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5 font-bold">Bans</p>
        <div className="flex flex-wrap gap-1">
          {bans.map((slot, i) => (
            <div
              key={i}
              className={[
                "relative w-9 h-9 rounded overflow-hidden flex-shrink-0",
                slot.heroId
                  ? "border border-red-900/70"
                  : "border border-dashed border-gray-700 opacity-40",
              ].join(" ")}
            >
              {slot.heroName ? (
                <>
                  <div className="relative w-full h-full overflow-hidden">
                    <SlotImage slot={slot} />
                  </div>
                  <div className="absolute inset-0 bg-red-900/40" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-[1.5px] bg-red-500 rotate-45 absolute" />
                    <div className="w-full h-[1.5px] bg-red-500 -rotate-45 absolute" />
                  </div>
                </>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
