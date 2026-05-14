"use client";

import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { useState } from "react";

const DraftApp = dynamic(() => import("@/components/DraftApp"), { ssr: false });
const PlayerDraftPractice = dynamic(() => import("@/components/PlayerDraftPractice"), { ssr: false });

export default function PracticeWrapper() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") as "hero" | "player" | null;
  const [mode, setMode] = useState<"hero" | "player" | null>(initialMode);

  if (mode === "hero") return <DraftApp />;
  if (mode === "player") return <PlayerDraftPractice />;

  return (
    <div className="min-h-screen bg-dota-bg text-dota-warm flex items-center justify-center p-6 relative">
      <div className="fixed inset-0 bg-dot-grid opacity-100 pointer-events-none" />
      
      <div className="relative z-10 w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-8">
        <button 
          onClick={() => setMode("player")}
          className="panel-corners border border-white/10 bg-dota-panel/80 p-10 text-center group hover:border-dota-gold/40 transition-all shadow-2xl overflow-hidden relative"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-dota-gold/40 to-transparent -translate-y-full group-hover:translate-y-0 transition-transform" />
          <h3 className="font-display text-2xl font-black text-white uppercase tracking-widest mb-4 group-hover:text-dota-gold transition-colors">Player Draft</h3>
          <p className="text-dota-muted text-[10px] font-display tracking-[0.2em] uppercase leading-relaxed opacity-80 group-hover:opacity-100">
            Practice picking teammates from a randomized pool of players based on MMR and roles.
          </p>
        </button>

        <button 
          onClick={() => setMode("hero")}
          className="panel-corners border border-white/10 bg-dota-panel/80 p-10 text-center group hover:border-dota-gold/40 transition-all shadow-2xl overflow-hidden relative"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-transparent via-dota-gold/40 to-transparent -translate-y-full group-hover:translate-y-0 transition-transform" />
          <h3 className="font-display text-2xl font-black text-white uppercase tracking-widest mb-4 group-hover:text-dota-gold transition-colors">Hero Draft</h3>
          <p className="text-dota-muted text-[10px] font-display tracking-[0.2em] uppercase leading-relaxed opacity-80 group-hover:opacity-100">
            Practice banning and picking heroes with a live turn sequence and countdown timer.
          </p>
        </button>
      </div>
      
      <div className="absolute bottom-12 text-center w-full">
        <p className="font-display text-[8px] text-white/20 tracking-[0.5em] uppercase">Select your training session</p>
      </div>
    </div>
  );
}
