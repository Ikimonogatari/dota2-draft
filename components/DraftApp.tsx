"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Hero, HEROES, heroImageUrl } from "@/lib/heroes";
import { DraftSlot, DRAFT_SEQUENCE, initDraftSlots } from "@/lib/draft";
import { useCountdown } from "@/hooks/useCountdown";
import TeamPanel from "./TeamPanel";
import HeroGrid from "./HeroGrid";
import PhaseBar from "./PhaseBar";
import ChatPanel from "./ChatPanel";
import type { ChatMessage } from "@/lib/types";

const TIMER_DURATION = 30;

function MobileTeamStrip({
  team,
  slots,
  currentStep,
}: {
  team: "radiant" | "dire";
  slots: DraftSlot[];
  currentStep: number;
}) {
  const picks = slots.filter((s) => s.team === team && s.type === "pick");
  const bans = slots.filter((s) => s.team === team && s.type === "ban");
  const isDone = currentStep >= DRAFT_SEQUENCE.length;
  const currentSlot = !isDone ? slots[currentStep] : null;
  const isActive = currentSlot?.team === team;

  const isRadiant = team === "radiant";
  const color = isRadiant ? "text-dota-radiant" : "text-dota-dire";
  const border = isRadiant
    ? isActive ? "border-dota-radiant/60" : "border-dota-radiant/20"
    : isActive ? "border-dota-dire/60" : "border-dota-dire/20";
  const glow = isActive
    ? isRadiant ? "shadow-[0_0_12px_rgba(74,158,74,0.15)]" : "shadow-[0_0_12px_rgba(184,64,64,0.15)]"
    : "";

  return (
    <div className={`flex-1 p-1.5 rounded-sm border bg-dota-panel panel-corners ${border} ${glow} ${isActive ? "panel-corners-active" : ""} transition-all duration-300`}>
      <div className="flex items-center gap-1 mb-1">
        <span className={`text-[9px] font-display font-black tracking-[0.2em] uppercase ${color}`}>
          {isRadiant ? "RADIANT" : "DIRE"}
        </span>
        {isActive && <div className={`w-1 h-1 rounded-full glow-pulse ${isRadiant ? "bg-dota-radiant" : "bg-dota-dire"}`} />}
      </div>
      <div className="flex gap-0.5 mb-1 overflow-x-auto pb-1 scrollbar-hide">
        {picks.map((slot, i) => {
          const hero = HEROES.find((h) => h.id === slot.heroId);
          return (
            <div key={i} className="relative w-10 aspect-10/13 rounded-sm overflow-hidden bg-dota-surface border border-dota-line/40 shrink-0">
              {hero && (
                <Image src={heroImageUrl(hero.name)} alt={hero.displayName} fill className="object-cover object-[center_15%]" unoptimized />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-0.5 flex-wrap">
        {bans.map((slot, i) => {
          const hero = HEROES.find((h) => h.id === slot.heroId);
          return (
            <div key={i} className="relative w-8 aspect-video rounded-sm overflow-hidden bg-dota-surface/40 shrink-0">
              {hero && (
                <>
                  <Image src={heroImageUrl(hero.name)} alt={hero.displayName} fill className="object-cover grayscale brightness-40" unoptimized />
                  <div className="absolute inset-0 bg-red-950/40" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="absolute w-full h-px bg-red-600/60 rotate-45" />
                    <div className="absolute w-full h-px bg-red-600/60 -rotate-45" />
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DraftApp() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [slots, setSlots] = useState<DraftSlot[]>(initDraftSlots);
  const [currentStep, setCurrentStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const isDone = currentStep >= DRAFT_SEQUENCE.length;

  const bannedIds = useMemo(
    () => new Set(slots.filter((s) => s.type === "ban" && s.heroId !== null).map((s) => s.heroId as number)),
    [slots]
  );
  const pickedIds = useMemo(
    () => new Set(slots.filter((s) => s.type === "pick" && s.heroId !== null).map((s) => s.heroId as number)),
    [slots]
  );

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
    const prev = currentStep - 1;
    setSlots((s) => {
      const updated = [...s];
      updated[prev] = { ...updated[prev], heroId: null, heroName: null };
      return updated;
    });
    setCurrentStep(prev);
  }, [currentStep]);

  const handleReset = useCallback(() => {
    setSlots(initDraftSlots());
    setCurrentStep(0);
    router.replace("/");
  }, [router]);

  const handleShare = useCallback(async () => {
    const res = await fetch("/api/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slots, currentStep }),
    });
    const { id } = await res.json();
    const url = `${window.location.origin}?draft=${id}`;
    await navigator.clipboard.writeText(url);
    router.replace(`?draft=${id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [slots, currentStep, router]);

  useEffect(() => {
    const draftId = searchParams.get("draft");
    if (!draftId) return;
    fetch(`/api/draft?id=${draftId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.slots) {
          setSlots(data.slots);
          setCurrentStep(data.currentStep ?? 0);
        }
      })
      .catch(() => {});
  }, [searchParams]);

  const timeLeft = useCountdown(currentStep, TIMER_DURATION, !isDone);
  const currentAction = isDone ? null : DRAFT_SEQUENCE[currentStep];

  const handleMentionLocal = useCallback((hero: Hero) => {
    setChatMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        type: "mention",
        scope: "all",
        authorId: "local",
        authorName: "You",
        heroId: hero.id,
        heroName: hero.displayName,
        heroKey: hero.name,
        timestamp: Date.now(),
      } satisfies ChatMessage,
    ]);
  }, []);

  const handleLocalChat = useCallback((text: string) => {
    setChatMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        type: "chat",
        scope: "all",
        authorId: "local",
        authorName: "You",
        text,
        timestamp: Date.now(),
      } satisfies ChatMessage,
    ]);
  }, []);

  // Auto-select a random available hero when timer expires
  useEffect(() => {
    if (timeLeft > 0 || isDone) return;
    const usedIds = new Set(slots.filter((s) => s.heroId !== null).map((s) => s.heroId as number));
    const available = HEROES.filter((h) => !usedIds.has(h.id));
    if (available.length === 0) return;
    const hero = available[Math.floor(Math.random() * available.length)];
    handleSelectHero(hero);
  }, [timeLeft, isDone, slots, handleSelectHero]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-dota-bg text-dota-warm">
      {/* Background: dot grid + team corner glows */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-dot-grid opacity-100" />
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-dota-radiant/[0.06] to-transparent" />
        <div className="absolute inset-y-0 right-0 w-1/4 bg-linear-to-l from-dota-dire/[0.06] to-transparent" />
        <div className="absolute inset-x-0 top-0 h-48 bg-linear-to-b from-dota-gold/[0.04] to-transparent" />
      </div>

      {/* ── HEADER ── */}
      <header className="relative z-10 shrink-0 flex items-center gap-4 px-6 py-3 border-b border-dota-line/60 bg-dota-panel/95 backdrop-blur-md shadow-lg">
        {/* Logo */}
        <div className="shrink-0 flex flex-col leading-none">
          <span className="text-[10px] font-display font-black tracking-[0.5em] text-dota-muted uppercase">Dota 2</span>
          <span className="font-display text-xl font-black tracking-[0.2em] text-dota-gold uppercase leading-tight drop-shadow-sm">
            Draft
          </span>
        </div>

        {/* Divider */}
        <div className="w-px h-10 bg-dota-line/60 shrink-0" />

        {/* Turn indicator — center */}
        <div className="flex-1 flex justify-center">
          {!isDone && currentAction && (
            <div className="flex items-center gap-3">
              <div
                className={[
                  "w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_12px_rgba(255,255,255,0.2)]",
                  currentAction.team === "radiant"
                    ? "bg-dota-radiant shadow-dota-radiant/60 glow-pulse"
                    : "bg-dota-dire shadow-dota-dire/60 glow-pulse",
                ].join(" ")}
              />
              <span
                className={[
                  "font-display text-base font-black tracking-[0.25em] uppercase",
                  currentAction.team === "radiant" ? "text-dota-radiant" : "text-dota-dire",
                ].join(" ")}
              >
                {currentAction.team === "radiant" ? "RADIANT" : "DIRE"}
              </span>
              <span className="text-dota-muted text-xs font-bold uppercase tracking-widest hidden sm:inline opacity-80">
                · {currentAction.type === "ban" ? "banning" : "picking"}
              </span>
            </div>
          )}
          {isDone && (
            <span className="font-display text-base font-black text-dota-gold tracking-[0.3em] uppercase drop-shadow-sm">
              DRAFT COMPLETE
            </span>
          )}
        </div>

        {/* Controls */}
        <div className="shrink-0 flex items-center gap-2">
          <button
            onClick={handleUndo}
            disabled={currentStep === 0}
            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-sm border border-dota-line/60 text-dota-muted hover:text-dota-warm hover:border-dota-gold/40 disabled:opacity-20 disabled:cursor-not-allowed transition-all font-display"
          >
            Undo
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-sm border border-dota-line/60 text-dota-muted hover:text-dota-dire hover:border-dota-dire/50 transition-all font-display"
          >
            Reset
          </button>
          <button
            onClick={handleShare}
            className="px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-sm border border-dota-gold/40 text-dota-gold hover:bg-dota-gold/10 transition-all font-display shadow-sm"
          >
            {copied ? "Copied!" : "Share"}
          </button>
        </div>
      </header>

      {/* ── PHASE BAR ── */}
      <div className="relative z-10 shrink-0 border-b border-dota-line/40 bg-black/40">
        <PhaseBar currentStep={currentStep} timeLeft={timeLeft} />
      </div>

      {/* ── MOBILE TEAM STRIPS (< lg) ── */}
      <div className="relative z-10 lg:hidden shrink-0 flex gap-2 px-2 pt-2">
        <MobileTeamStrip team="radiant" slots={slots} currentStep={currentStep} />
        <MobileTeamStrip team="dire" slots={slots} currentStep={currentStep} />
      </div>

      {/* ── MAIN AREA ── */}
      <div className="relative z-10 flex flex-1 min-h-0 gap-3 p-3">
        {/* Radiant (desktop) */}
        <div className="hidden lg:flex w-64 shrink-0 flex-col">
          <TeamPanel team="radiant" slots={slots} currentStep={currentStep} />
        </div>

        {/* Hero grid + chat */}
        <div className="flex-1 min-w-0 flex flex-col gap-2 min-h-0">
          <div className="flex-1 min-h-0">
            <HeroGrid
              bannedIds={bannedIds}
              pickedIds={pickedIds}
              disabled={isDone}
              onSelect={handleSelectHero}
              onMention={handleMentionLocal}
              isCaptainTurn={true}
            />
          </div>
          <div className="shrink-0 h-52 border border-dota-line/40 rounded-sm bg-dota-panel/80">
            <ChatPanel
              messages={chatMessages}
              onSend={handleLocalChat}
              myTeam="radiant"
            />
          </div>
        </div>

        {/* Dire (desktop) */}
        <div className="hidden lg:flex w-64 shrink-0 flex-col">
          <TeamPanel team="dire" slots={slots} currentStep={currentStep} />
        </div>
      </div>

      {/* ── DRAFT COMPLETE OVERLAY ── */}
      {isDone && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-500">
          <div className="panel-corners panel-corners-active text-center px-16 py-10 bg-dota-panel/95 border border-dota-gold/40 rounded-sm shadow-[0_0_80px_rgba(200,162,67,0.2)]">
            {/* Decorative top line */}
            <div className="h-px w-full bg-linear-to-r from-transparent via-dota-gold/50 to-transparent mb-8" />

            <p className="font-display text-4xl font-black tracking-[0.3em] text-dota-gold uppercase mb-2">
              Draft
            </p>
            <p className="font-display text-2xl font-black tracking-[0.4em] text-dota-warm/90 uppercase mb-3">
              Complete
            </p>
            <p className="text-dota-muted text-sm font-display tracking-widest uppercase mb-8">Good luck, have fun.</p>

            {/* Decorative bottom line */}
            <div className="h-px w-full bg-linear-to-r from-transparent via-dota-gold/50 to-transparent mb-10" />

            <div className="flex gap-4 justify-center">
              <button
                onClick={handleShare}
                className="px-6 py-2.5 border border-dota-gold/30 text-dota-gold font-black uppercase tracking-[0.2em] rounded-sm text-xs hover:bg-dota-gold/10 transition-all font-display shadow-md"
              >
                {copied ? "Copied!" : "Share"}
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-2.5 bg-dota-gold hover:bg-dota-gold-light text-dota-bg font-black uppercase tracking-[0.2em] rounded-sm text-xs transition-all font-display shadow-lg shadow-dota-gold/20"
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

