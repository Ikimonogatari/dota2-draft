"use client";

import Image from "next/image";
import { Hero, heroImageUrl } from "@/lib/heroes";
import { useState } from "react";

interface HeroCardProps {
  hero: Hero;
  disabled?: boolean;
  banned?: boolean;
  picked?: boolean;
  onClick?: (hero: Hero) => void;
  onMention?: (hero: Hero) => void;
  isCaptainTurn?: boolean;
}

const ATTR_COLOR: Record<string, string> = {
  strength: "bg-dota-str",
  agility: "bg-dota-agi",
  intelligence: "bg-dota-int",
  universal: "bg-dota-uni",
};

export default function HeroCard({ hero, disabled, banned, picked, onClick, onMention, isCaptainTurn }: HeroCardProps) {
  const [imgError, setImgError] = useState(false);
  const unavailable = banned || picked;
  const cannotPick = unavailable || (isCaptainTurn === false);

  return (
    <button
      onClick={() => !disabled && !cannotPick && onClick?.(hero)}
      disabled={disabled || cannotPick}
      title={hero.displayName}
      className={[
        "relative group w-full rounded-sm overflow-hidden border select-none transition-all duration-300",
        unavailable
          ? "opacity-20 grayscale cursor-not-allowed border-transparent"
          : cannotPick
          ? "opacity-60 cursor-not-allowed border-dota-line/40"
          : disabled
          ? "opacity-50 cursor-not-allowed border-dota-line/40"
          : "border-dota-line hover:border-dota-gold/60 hover:shadow-[0_0_15px_rgba(200,162,67,0.2)] cursor-pointer bg-dota-surface",
      ].join(" ")}
    >
      <div className="relative aspect-video w-full bg-dota-surface overflow-hidden">
        {imgError ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[8px] text-dota-muted text-center px-1 font-display uppercase tracking-tight leading-tight">
              {hero.displayName}
            </span>
          </div>
        ) : (
          <Image
            src={heroImageUrl(hero.name)}
            alt={hero.displayName}
            fill
            className="object-cover object-[center_20%] transition-transform duration-500 group-hover:scale-110 group-hover:brightness-110"
            onError={() => setImgError(true)}
            unoptimized
          />
        )}

        {/* Overlays */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
        
        {/* Name */}
        <p className="absolute bottom-0 inset-x-0 px-1 pb-1 text-[9px] font-display font-black text-center text-white/90 leading-tight truncate group-hover:text-dota-gold transition-colors pointer-events-none z-10 uppercase tracking-tighter">
          {hero.displayName}
        </p>

        {/* Attribute dot */}
        <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${ATTR_COLOR[hero.attribute]} border border-black/40 shadow-sm z-10`} />

        {/* Suggest button */}
        {onMention && !banned && !picked && (
          <button
            onClick={(e) => { e.stopPropagation(); onMention(hero); }}
            className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/80 backdrop-blur-sm border border-dota-gold/30 rounded-sm px-1.5 py-0.5 text-[8px] font-display font-black text-dota-gold uppercase tracking-widest z-20 hover:bg-dota-gold/20 hover:border-dota-gold/60"
          >
            Suggest
          </button>
        )}

        {/* Ban overlay */}
        {banned && (
          <>
            <div className="absolute inset-0 bg-red-950/40" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="absolute w-full h-[1.5px] bg-red-600/80 rotate-45 shadow-[0_0_8px_rgba(220,38,38,0.6)]" />
              <div className="absolute w-full h-[1.5px] bg-red-600/80 -rotate-45 shadow-[0_0_8px_rgba(220,38,38,0.6)]" />
            </div>
          </>
        )}
      </div>
    </button>
  );
}

