"use client";

import { useState, useMemo, useCallback } from "react";
import { Hero } from "@/lib/heroes";
import { DraftSlot, DRAFT_SEQUENCE, initDraftSlots } from "@/lib/draft";
import TeamPanel from "./TeamPanel";
import HeroGrid from "./HeroGrid";
import PhaseBar from "./PhaseBar";

export default function DraftApp() {
  const [slots, setSlots] = useState<DraftSlot[]>(initDraftSlots);
  const [currentStep, setCurrentStep] = useState(0);

  const isDone = currentStep >= DRAFT_SEQUENCE.length;

  const bannedIds = useMemo(() => {
    return new Set(slots.filter((s) => s.type === "ban" && s.heroId !== null).map((s) => s.heroId as number));
  }, [slots]);

  const pickedIds = useMemo(() => {
    return new Set(slots.filter((s) => s.type === "pick" && s.heroId !== null).map((s) => s.heroId as number));
  }, [slots]);

  const handleSelectHero = useCallback(
    (hero: Hero) => {
      if (isDone) return;
      setSlots((prev) => {
        const updated = [...prev];
        updated[currentStep] = { ...updated[currentStep], heroId: hero.id, heroName: hero.displayName };
        return updated;
      });
      setCurrentStep((s) => s + 1);
    },
    [currentStep, isDone]
  );

  const handleUndo = useCallback(() => {
    if (currentStep === 0) return;
    const prevStep = currentStep - 1;
    setSlots((prev) => {
      const updated = [...prev];
      updated[prevStep] = { ...updated[prevStep], heroId: null, heroName: null };
      return updated;
    });
    setCurrentStep(prevStep);
  }, [currentStep]);

  const handleReset = useCallback(() => {
    setSlots(initDraftSlots());
    setCurrentStep(0);
  }, []);

  const currentAction = isDone ? null : DRAFT_SEQUENCE[currentStep];

  return (
    <div className="flex flex-col h-screen bg-[#06060a] text-white overflow-hidden">
      {/* Background art */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            radial-gradient(ellipse 80% 50% at 50% -10%, rgba(200,162,67,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 40% 30% at 15% 50%, rgba(16,185,129,0.05) 0%, transparent 50%),
            radial-gradient(ellipse 40% 30% at 85% 50%, rgba(239,68,68,0.05) 0%, transparent 50%)
          `,
        }}
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-3 border-b border-gray-800/60 bg-black/40 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Dota 2 logo text */}
          <div className="flex flex-col leading-none">
            <span className="text-[10px] font-bold tracking-[0.4em] text-gray-500 uppercase">Dota 2</span>
            <span className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-500">
              DRAFT SIMULATOR
            </span>
          </div>
        </div>

        {/* Current turn indicator */}
        {!isDone && currentAction && (
          <div className="flex items-center gap-2 px-4 py-1.5 rounded border border-gray-700 bg-black/50">
            <div
              className={[
                "w-2.5 h-2.5 rounded-full animate-pulse",
                currentAction.team === "radiant" ? "bg-emerald-400" : "bg-red-400",
              ].join(" ")}
            />
            <span
              className={[
                "text-sm font-bold uppercase tracking-widest",
                currentAction.team === "radiant" ? "text-emerald-400" : "text-red-400",
              ].join(" ")}
            >
              {currentAction.team}
            </span>
            <span className="text-gray-500 text-xs">
              is {currentAction.type === "ban" ? "banning" : "picking"}
            </span>
          </div>
        )}

        {isDone && (
          <div className="px-4 py-1.5 rounded border border-yellow-700 bg-yellow-900/20">
            <span className="text-yellow-400 font-bold text-sm tracking-wider">Draft Complete</span>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-2">
          <button
            onClick={handleUndo}
            disabled={currentStep === 0}
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            Undo
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded border border-gray-700 text-gray-400 hover:text-red-400 hover:border-red-800 transition-all"
          >
            Reset
          </button>
        </div>
      </header>

      {/* Phase bar */}
      <div className="relative z-10 px-6 py-3 border-b border-gray-800/40 bg-black/20 flex-shrink-0">
        <PhaseBar currentStep={currentStep} />
      </div>

      {/* Main draft area */}
      <div className="relative z-10 flex flex-1 gap-3 px-3 py-3 min-h-0 overflow-hidden">
        {/* Radiant panel */}
        <div className="w-52 flex-shrink-0">
          <TeamPanel team="radiant" slots={slots} currentStep={currentStep} totalSteps={DRAFT_SEQUENCE.length} />
        </div>

        {/* Hero grid */}
        <div className="flex-1 min-w-0">
          <HeroGrid
            bannedIds={bannedIds}
            pickedIds={pickedIds}
            disabled={isDone}
            onSelect={handleSelectHero}
          />
        </div>

        {/* Dire panel */}
        <div className="w-52 flex-shrink-0">
          <TeamPanel team="dire" slots={slots} currentStep={currentStep} totalSteps={DRAFT_SEQUENCE.length} />
        </div>
      </div>

      {/* Done overlay */}
      {isDone && (
        <div className="fixed inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="text-center pointer-events-auto">
            <div className="inline-block px-10 py-6 bg-black/90 border border-yellow-700 rounded-xl shadow-2xl">
              <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200 tracking-widest mb-2">
                DRAFT COMPLETE
              </p>
              <p className="text-gray-400 text-sm mb-4">Good luck, have fun!</p>
              <button
                onClick={handleReset}
                className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-black uppercase tracking-widest rounded transition-colors text-sm"
              >
                New Draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
