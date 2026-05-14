"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { HEROES, Hero, heroImageUrl, Attribute } from "@/lib/heroes";

interface HeroGridProps {
  bannedIds: Set<number>;
  pickedIds: Set<number>;
  disabled: boolean;
  onSelect: (hero: Hero) => void;
  onMention: (hero: Hero) => void;
  isCaptainTurn: boolean;
}

const ATTR_LABELS: Record<Attribute, string> = {
  strength: "ХҮЧ",
  agility: "АВХААЛЖ",
  intelligence: "ОЮУН",
  universal: "ТҮГЭЭМЭЛ",
};

export default function HeroGrid({ bannedIds, pickedIds, disabled, onSelect, onMention, isCaptainTurn }: HeroGridProps) {
  const [search, setSearch] = useState("");
  const [attrFilter, setAttrFilter] = useState<Attribute | "all">("all");

  const filtered = useMemo(() => {
    return HEROES.filter((h) => {
      const matchSearch = h.displayName.toLowerCase().includes(search.toLowerCase());
      const matchAttr = attrFilter === "all" || h.attribute === attrFilter;
      return matchSearch && matchAttr;
    });
  }, [search, attrFilter]);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-4 glass-panel p-4 rounded-sm border border-white/5 shadow-2xl">
        <div className="relative flex-1 min-w-[240px]">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none opacity-40">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="БААТАР ХАЙХ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-10"
          />
        </div>

        <div className="flex gap-2 p-1 bg-black/40 rounded-sm border border-white/5">
          {(["all", "strength", "agility", "intelligence", "universal"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAttrFilter(a)}
              className={`px-4 py-2 rounded-sm text-[10px] font-display font-black uppercase tracking-widest transition-all ${
                attrFilter === a 
                  ? "bg-dota-gold text-dota-bg shadow-[0_0_15px_rgba(212,175,55,0.3)]" 
                  : "text-dota-muted hover:text-dota-warm hover:bg-white/5"
              }`}
            >
              {a === "all" ? "БҮГД" : ATTR_LABELS[a]}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto scrollbar-slim pr-2">
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 gap-3">
          {filtered.map((hero) => {
            const isBanned = bannedIds.has(hero.id);
            const isPicked = pickedIds.has(hero.id);
            const isUnavailable = isBanned || isPicked;
            
            return (
              <button
                key={hero.id}
                disabled={disabled || isUnavailable}
                onClick={() => onSelect(hero)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onMention(hero);
                }}
                className={`relative aspect-10/13 group transition-all duration-300 rounded-sm overflow-hidden border border-white/5 shadow-md ${
                  isUnavailable 
                    ? "opacity-20 grayscale scale-95" 
                    : "hover:scale-110 hover:z-10 hover:border-dota-gold/60 hover:shadow-[0_0_20px_rgba(212,175,55,0.2)]"
                }`}
              >
                <Image
                  src={heroImageUrl(hero.name)}
                  alt={hero.displayName}
                  fill
                  className={`object-cover object-[center_15%] transition-transform duration-500 ${!isUnavailable && "group-hover:scale-110"}`}
                  unoptimized
                />
                
                {/* Overlays */}
                <div className={`absolute inset-0 transition-opacity duration-300 ${isUnavailable ? "bg-black/60" : "bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100"}`} />
                
                {/* Status Marks */}
                {isBanned && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-px bg-dota-dire/80 rotate-45 shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
                    <div className="w-full h-px bg-dota-dire/80 -rotate-45 shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
                  </div>
                )}
                {isPicked && (
                  <div className="absolute inset-0 border-2 border-dota-gold/40 flex items-center justify-center">
                    <div className="bg-dota-gold/20 backdrop-blur-sm px-1 py-0.5 rounded-sm">
                      <span className="text-[8px] font-black text-dota-gold uppercase tracking-tighter">СОНГОСОН</span>
                    </div>
                  </div>
                )}

                {/* Hero Name Tag (Hover) */}
                {!isUnavailable && (
                  <div className="absolute inset-x-0 bottom-0 p-1.5 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-linear-to-t from-black/95 to-transparent">
                    <p className="text-[8px] font-display font-black text-white uppercase leading-none truncate tracking-tighter">
                      {hero.displayName}
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 opacity-30">
            <span className="text-4xl mb-4">🔍</span>
            <p className="font-display font-black text-lg uppercase tracking-[0.4em]">БААТАР ОЛДСОНГҮЙ</p>
          </div>
        )}
      </div>
    </div>
  );
}
