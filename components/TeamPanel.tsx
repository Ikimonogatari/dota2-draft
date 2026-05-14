"use client";

import Image from "next/image";
import { useState } from "react";
import { DraftSlot, DRAFT_SEQUENCE } from "@/lib/draft";
import { HEROES, heroImageUrl } from "@/lib/heroes";

interface TeamPanelProps {
  team: "radiant" | "dire";
  slots: DraftSlot[];
  currentStep: number;
}

const TEAM = {
  radiant: {
    label: "RADIANT",
    color: "text-dota-radiant",
    border: "border-dota-radiant/30",
    activeBorder: "border-dota-radiant/60",
    activeGlow: "shadow-[0_0_40px_rgba(74,222,128,0.2)]",
    dot: "bg-dota-radiant",
    headerBg: "from-dota-radiant/20",
    picking: "PICKING",
    banning: "BANNING",
    picksLabel: "PICKS",
    bansLabel: "BANS",
  },
  dire: {
    label: "DIRE",
    color: "text-dota-dire",
    border: "border-dota-dire/30",
    activeBorder: "border-dota-dire/60",
    activeGlow: "shadow-[0_0_40px_rgba(248,113,113,0.2)]",
    dot: "bg-dota-dire",
    headerBg: "from-dota-dire/20",
    picking: "PICKING",
    banning: "BANNING",
    picksLabel: "PICKS",
    bansLabel: "BANS",
  },
};

function PickSlot({ slot, index, team }: { slot: DraftSlot; index: number; team: "radiant" | "dire" }) {
  const [imgError, setImgError] = useState(false);
  const hero = HEROES.find((h) => h.id === slot.heroId);

  if (!hero) {
    return (
      <div className="relative flex-1 w-full border-b border-white/5 flex items-center px-6 bg-black/40">
        <div className="flex flex-col leading-tight opacity-20">
          <span className="text-sm font-display font-black text-white uppercase tracking-[0.2em]">EMPTY</span>
          <span className="text-[9px] font-display font-bold text-white uppercase tracking-[0.3em]">SLOT {index + 1}</span>
        </div>
      </div>
    );
  }

  const src = heroImageUrl(hero.name);
  const isRadiant = team === "radiant";

  return (
    <div className={`relative flex-1 w-full overflow-hidden border-b ${isRadiant ? "border-dota-radiant/10" : "border-dota-dire/10"} shadow-xl transition-all duration-700 animate-pop-in hover:brightness-110`}>
      {imgError ? (
        <div className="absolute inset-0 bg-dota-surface flex items-center justify-center">
          <span className="text-[9px] text-dota-warm px-2 text-center font-display uppercase font-black tracking-widest">{hero.displayName}</span>
        </div>
      ) : (
        <div className="absolute inset-0">
          <Image
            src={src}
            alt={hero.displayName}
            fill
            className="object-cover object-center scale-110"
            onError={() => setImgError(true)}
            unoptimized
          />
        </div>
      )}
      
      {/* Overlays */}
      <div className="absolute inset-0 bg-linear-to-r from-black/80 via-transparent to-transparent" />
      <div className={`absolute inset-y-0 left-0 w-1 ${isRadiant ? "bg-dota-radiant" : "bg-dota-dire"} shadow-lg`} />
      
      {/* Hero Name Tag */}
      <div className="absolute inset-0 flex items-center px-4">
        <div className="flex flex-col leading-tight">
          <span className="text-[11px] font-display font-black text-white leading-none tracking-[0.2em] uppercase drop-shadow-2xl">
            {hero.displayName}
          </span>
          <span className={`text-[8px] font-display font-bold ${isRadiant ? "text-dota-radiant" : "text-dota-dire"} uppercase tracking-widest opacity-60`}>
            SLOT {index + 1}
          </span>
        </div>
      </div>
    </div>
  );
}

function BanThumb({ slot }: { slot: DraftSlot }) {
  const [imgError, setImgError] = useState(false);
  const hero = HEROES.find((h) => h.id === slot.heroId);

  if (!hero) {
    return <div className="w-16 aspect-video rounded-sm border border-dashed border-white/10 bg-black/20 shrink-0" />;
  }

  const src = heroImageUrl(hero.name);

  return (
    <div className="relative w-16 aspect-video rounded-sm overflow-hidden bg-dota-surface border border-white/10 group shadow-lg">
      {imgError ? (
        <div className="absolute inset-0 bg-dota-surface" />
      ) : (
        <Image 
          src={src} 
          alt={hero.displayName} 
          fill 
          className="object-cover grayscale brightness-[0.3] group-hover:brightness-[0.4] transition-all duration-500" 
          onError={() => setImgError(true)} 
          unoptimized 
        />
      )}
      <div className="absolute inset-0 bg-red-950/20" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-60">
        <div className="absolute w-[120%] h-px bg-red-500/60 rotate-[35deg] shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
        <div className="absolute w-[120%] h-px bg-red-500/60 -rotate-[35deg] shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
      </div>
    </div>
  );
}

export default function TeamPanel({ team, slots, currentStep }: TeamPanelProps) {
  const style = TEAM[team];
  const picks = slots.filter((s) => s.team === team && s.type === "pick");
  const bans = slots.filter((s) => s.team === team && s.type === "ban");

  const isDone = currentStep >= DRAFT_SEQUENCE.length;
  const currentSlot = !isDone ? slots[currentStep] : null;
  const isActive = currentSlot?.team === team;

  return (
    <div
      className={[
        "flex flex-col h-full min-h-0 rounded-sm glass-panel transition-all duration-700",
        isActive ? `${style.activeBorder} ${style.activeGlow} panel-corners-active` : "border-white/10",
      ].join(" ")}
    >
      {/* Header */}
      <div
        className={[
          "shrink-0 px-5 py-4 border-b flex flex-col gap-1 bg-linear-to-r to-transparent",
          style.headerBg,
          isActive ? style.activeBorder : "border-white/10",
        ].join(" ")}
      >
        <div className="flex items-center justify-between">
          <span className={`font-display text-base font-black tracking-[0.4em] ${style.color} drop-shadow-lg`}>
            {style.label}
          </span>
          {isActive && (
            <div className={`w-3 h-3 rounded-full glow-pulse ${style.dot} shadow-[0_0_15px_rgba(255,255,255,0.6)]`} />
          )}
        </div>
        {isActive && (
          <span className="text-[10px] text-white font-black uppercase tracking-[0.2em] opacity-80 animate-pulse">
            {currentSlot?.type === "ban" ? style.banning : style.picking}
          </span>
        )}
      </div>

      {/* Picks */}
      <div className="flex-1 flex flex-col">
        {Array.from({ length: 5 }).map((_, i) => (
          <PickSlot key={i} slot={picks[i] || { team, type: "pick", heroId: null, heroName: null }} index={i} team={team} />
        ))}
      </div>

      {/* Bans */}
      <div className="shrink-0 p-4 border-t border-white/10 bg-black/40">
        <p className="text-[11px] text-dota-muted uppercase tracking-[0.4em] font-black mb-3 flex items-center gap-3">
          <span className="w-1.5 h-1.5 rounded-full bg-dota-dire opacity-60" />
          {style.bansLabel}
        </p>
        <div className="flex flex-wrap gap-2.5">
          {bans.map((slot, i) => (
            <BanThumb key={i} slot={slot} />
          ))}
        </div>
      </div>
    </div>
  );

}
