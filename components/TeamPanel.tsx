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
    label: "РЭЙДИАНТ",
    color: "text-dota-radiant",
    border: "border-dota-radiant/30",
    activeBorder: "border-dota-radiant/60",
    activeGlow: "shadow-[0_0_40px_rgba(74,222,128,0.2)]",
    dot: "bg-dota-radiant",
    headerBg: "from-dota-radiant/20",
    picking: "СОНГОЖ БАЙНА",
    banning: "ХОРИГЛОЖ БАЙНА",
    picksLabel: "СОНГОЛТ",
    bansLabel: "ХОРИГ",
  },
  dire: {
    label: "ДАЙЕР",
    color: "text-dota-dire",
    border: "border-dota-dire/30",
    activeBorder: "border-dota-dire/60",
    activeGlow: "shadow-[0_0_40px_rgba(248,113,113,0.2)]",
    dot: "bg-dota-dire",
    headerBg: "from-dota-dire/20",
    picking: "СОНГОЖ БАЙНА",
    banning: "ХОРИГЛОЖ БАЙНА",
    picksLabel: "СОНГОЛТ",
    bansLabel: "ХОРИГ",
  },
};

function PickSlot({ slot, index, team }: { slot: DraftSlot; index: number; team: "radiant" | "dire" }) {
  const [imgError, setImgError] = useState(false);
  const hero = HEROES.find((h) => h.id === slot.heroId);

  if (!hero) {
    return (
      <div className="relative aspect-10/13 w-full rounded-sm border border-dashed border-white/10 flex items-center justify-center bg-black/20 group transition-all duration-500">
        <div className="absolute inset-0 bg-linear-to-b from-transparent to-black/40" />
        <span className="text-2xl font-display font-black text-white/10 group-hover:text-white/20 transition-all">{index + 1}</span>
      </div>
    );
  }

  const src = heroImageUrl(hero.name);
  const isRadiant = team === "radiant";

  return (
    <div className={`relative aspect-10/13 w-full rounded-sm overflow-hidden border ${isRadiant ? "border-dota-radiant/30" : "border-dota-dire/30"} shadow-2xl transition-all duration-700 animate-pop-in`}>
      {imgError ? (
        <div className="absolute inset-0 bg-dota-surface flex items-center justify-center">
          <span className="text-[10px] text-dota-warm px-2 text-center font-display uppercase font-black">{hero.displayName}</span>
        </div>
      ) : (
        <Image
          src={src}
          alt={hero.displayName}
          fill
          className="object-cover object-[center_15%] scale-105"
          onError={() => setImgError(true)}
          unoptimized
        />
      )}
      
      {/* Overlays */}
      <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/20 to-transparent" />
      <div className={`absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t ${isRadiant ? "from-dota-radiant/30" : "from-dota-dire/30"} to-transparent mix-blend-overlay`} />
      
      {/* Hero Name Tag */}
      <div className="absolute bottom-0 inset-x-0 p-3 pt-6 bg-linear-to-t from-black/90 to-transparent">
        <span className="block text-[12px] font-display font-black text-white leading-none tracking-wider uppercase truncate drop-shadow-2xl">
          {hero.displayName}
        </span>
        <div className={`h-1 w-full mt-2 ${isRadiant ? "bg-dota-radiant/80 shadow-[0_0_10px_rgba(74,222,128,0.4)]" : "bg-dota-dire/80 shadow-[0_0_10px_rgba(248,113,113,0.4)]"}`} />
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
      <div className="flex-1 flex flex-col p-4 gap-3 min-h-0 overflow-y-auto scrollbar-slim">
        <p className="text-[11px] text-dota-muted uppercase tracking-[0.4em] font-black shrink-0 mb-2 flex items-center gap-3">
          <span className={`w-1.5 h-1.5 rounded-full ${style.dot} shadow-sm`} />
          {style.picksLabel}
        </p>
        <div className="flex flex-col gap-4">
          {picks.map((slot, i) => (
            <PickSlot key={i} slot={slot} index={i} team={team} />
          ))}
        </div>
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

