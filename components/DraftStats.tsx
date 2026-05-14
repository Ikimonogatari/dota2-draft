"use client";

import Image from "next/image";
import { useState } from "react";
import { HEROES, heroImageUrl, Attribute } from "@/lib/heroes";
import type { Session } from "@/lib/types";

interface DraftStatsProps {
  session: Session;
  onNewDraft: () => void;
}

const ATTR_LABEL: Record<Attribute, string> = {
  strength: "STRENGTH",
  agility: "AGILITY",
  intelligence: "INTELLECT",
  universal: "UNIVERSAL",
};

const ATTR_COLOR: Record<Attribute, string> = {
  strength: "text-dota-str",
  agility: "text-dota-agi",
  intelligence: "text-dota-int",
  universal: "text-dota-uni",
};

function HeroPortrait({ heroId, heroName }: { heroId: number; heroName: string }) {
  const [err, setErr] = useState(false);
  const hero = HEROES.find((h) => h.id === heroId);

  return (
    <div className="flex flex-col items-center gap-2 group animate-pop-in">
      <div className="relative w-20 aspect-10/13 rounded-sm overflow-hidden border border-white/10 glass-panel shadow-2xl group-hover:scale-105 group-hover:border-dota-gold/40 transition-all duration-500">
        {hero && !err ? (
          <>
            <Image
              src={heroImageUrl(hero.name)}
              alt={heroName}
              fill
              className="object-cover object-[center_15%] transition-transform duration-700 group-hover:scale-110"
              onError={() => setErr(true)}
              unoptimized
            />
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="text-[8px] text-dota-muted text-center px-1 font-display uppercase font-bold">{heroName}</span>
          </div>
        )}
      </div>
      <div className="text-center">
        <p className="text-[10px] font-display font-black text-white uppercase tracking-wider truncate max-w-[80px] mb-0.5">
          {heroName}
        </p>
        {hero && (
          <p className={`text-[8px] font-display font-black ${ATTR_COLOR[hero.attribute]} tracking-widest uppercase opacity-80`}>
            {ATTR_LABEL[hero.attribute]}
          </p>
        )}
      </div>
    </div>
  );
}

export default function DraftStats({ session, onNewDraft }: DraftStatsProps) {
  const radiantPicks = session.slots.filter((s) => s.team === "radiant" && s.type === "pick" && s.heroId);
  const direPicks    = session.slots.filter((s) => s.team === "dire" && s.type === "pick" && s.heroId);
  const radiantBans  = session.slots.filter((s) => s.team === "radiant" && s.type === "ban" && s.heroId).length;
  const direBans     = session.slots.filter((s) => s.team === "dire" && s.type === "ban" && s.heroId).length;

  const duration = session.completedAt && session.createdAt
    ? Math.floor((session.completedAt - session.createdAt) / 1000)
    : 0;
  const durationStr = duration > 0 ? `${Math.floor(duration / 60)}m ${duration % 60}s` : "—";

  return (
    <div className="flex flex-col gap-10 max-w-5xl mx-auto w-full animate-fade-in-up">
      <div className="text-center">
        <p className="font-display text-xs text-dota-gold font-black tracking-[0.6em] mb-4 opacity-80 uppercase">DRAFT RESULTS</p>
        <h1 className="font-display text-5xl font-black tracking-widest text-white uppercase drop-shadow-2xl mb-8">DRAFT COMPLETED</h1>
        
        <div className="flex items-center justify-center gap-8 glass-panel py-4 px-12 rounded-sm border border-white/5 mx-auto w-fit">
          <div className="flex flex-col">
            <span className="text-[10px] text-dota-muted font-black uppercase tracking-widest mb-1">SESSION</span>
            <span className="text-sm text-white font-black uppercase tracking-wider">{session.name}</span>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="flex flex-col">
            <span className="text-[10px] text-dota-muted font-black uppercase tracking-widest mb-1">DURATION</span>
            <span className="text-sm text-white font-black uppercase tracking-wider">{durationStr}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Radiant */}
        <div className="glass-panel border border-dota-radiant/20 rounded-sm overflow-hidden panel-corners transition-all duration-500 hover:border-dota-radiant/40">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-dota-radiant/20 bg-linear-to-r from-dota-radiant/10 to-transparent">
            <div className="w-3 h-3 rounded-full bg-dota-radiant shadow-[0_0_15px_rgba(74,222,128,0.4)]" />
            <h2 className="font-display text-lg font-black tracking-[0.3em] text-dota-radiant uppercase">RADIANT</h2>
          </div>
          <div className="p-8">
            <div className="flex flex-wrap gap-6 justify-center mb-8">
              {radiantPicks.map((s, i) => (
                <HeroPortrait key={i} heroId={s.heroId!} heroName={s.heroName!} />
              ))}
              {Array.from({ length: 5 - radiantPicks.length }).map((_, i) => (
                <div key={i} className="w-20 aspect-10/13 rounded-sm border border-dashed border-white/10 bg-black/20" />
              ))}
            </div>
            <p className="text-[11px] font-display font-black text-dota-muted text-center uppercase tracking-[0.4em] opacity-60">
              {radiantBans} BANS
            </p>
          </div>
        </div>

        {/* Dire */}
        <div className="glass-panel border border-dota-dire/20 rounded-sm overflow-hidden panel-corners transition-all duration-500 hover:border-dota-dire/40">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-dota-dire/20 bg-linear-to-r from-dota-dire/10 to-transparent">
            <div className="w-3 h-3 rounded-full bg-dota-dire shadow-[0_0_15px_rgba(248,113,113,0.4)]" />
            <h2 className="font-display text-lg font-black tracking-[0.3em] text-dota-dire uppercase">DIRE</h2>
          </div>
          <div className="p-8">
            <div className="flex flex-wrap gap-6 justify-center mb-8">
              {direPicks.map((s, i) => (
                <HeroPortrait key={i} heroId={s.heroId!} heroName={s.heroName!} />
              ))}
              {Array.from({ length: 5 - direPicks.length }).map((_, i) => (
                <div key={i} className="w-20 aspect-10/13 rounded-sm border border-dashed border-white/10 bg-black/20" />
              ))}
            </div>
            <p className="text-[11px] font-display font-black text-dota-muted text-center uppercase tracking-[0.4em] opacity-60">
              {direBans} BANS
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-center mt-6">
        <button
          onClick={onNewDraft}
          className="dota-button px-12 py-4 bg-dota-gold text-dota-bg font-black text-sm rounded-sm shadow-[0_0_50px_rgba(212,175,55,0.3)] hover:scale-105 active:scale-95"
        >
          BACK TO LOBBY
        </button>
      </div>
    </div>
  );
}
