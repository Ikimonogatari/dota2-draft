"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Session, User } from "@/lib/types";
import type { Hero } from "@/lib/heroes";
import { DRAFT_SEQUENCE } from "@/lib/draft";
import TeamPanel from "./TeamPanel";
import HeroGrid from "./HeroGrid";
import PhaseBar from "./PhaseBar";
import TeamRoster from "./TeamRoster";
import ChatPanel from "./ChatPanel";
import DraftStats from "./DraftStats";

interface DraftRoomProps {
  sessionId: string;
  user: User;
}

function useServerTimer(timerEndsAt: number | null): number {
  const [timeLeft, setTimeLeft] = useState(30);
  useEffect(() => {
    if (!timerEndsAt) { setTimeLeft(30); return; }
    const update = () => setTimeLeft(Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000)));
    update();
    const id = setInterval(update, 500);
    return () => clearInterval(id);
  }, [timerEndsAt]);
  return timeLeft;
}

async function sendAction(sessionId: string, type: string, payload: Record<string, unknown> = {}) {
  await fetch(`/api/sessions/${sessionId}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, payload }),
  });
}

export default function DraftRoom({ sessionId, user }: DraftRoomProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(`/api/sessions/${sessionId}/stream`);
    esRef.current = es;
    es.onmessage = (e) => { try { setSession(JSON.parse(e.data)); } catch {} };
    es.onerror = () => setError("Connection lost. Please refresh to reconnect.");
    return () => es.close();
  }, [sessionId]);

  const action = useCallback((type: string, payload?: Record<string, unknown>) => {
    sendAction(sessionId, type, payload ?? {});
  }, [sessionId]);

  const handlePickOrBan = useCallback((hero: Hero) => {
    if (!session || session.status !== "drafting") return;
    action(DRAFT_SEQUENCE[session.currentStep].type, { heroId: hero.id });
  }, [session, action]);

  const handleMention = useCallback((hero: Hero) => {
    action("mention", { heroId: hero.id });
  }, [action]);

  const timeLeft = useServerTimer(session?.timerEndsAt ?? null);

  if (error) {
    return (
      <div className="min-h-screen bg-dota-bg flex items-center justify-center">
        <div className="glass-panel panel-corners p-8 text-center max-w-md animate-pop-in">
          <p className="text-dota-dire font-display text-lg font-black uppercase tracking-widest mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="dota-button px-8 py-3 bg-dota-dire/20 border border-dota-dire/40 text-dota-dire hover:bg-dota-dire/30 rounded-sm"
          >
            REFRESH
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-dota-bg flex items-center justify-center flex-col gap-4">
        <div className="w-12 h-12 border-4 border-dota-gold/20 border-t-dota-gold rounded-full animate-spin" />
        <span className="text-dota-gold font-display text-sm font-black uppercase tracking-[0.4em] animate-pulse">Connecting</span>
      </div>
    );
  }

  const isDone     = session.status === "completed";
  const isDrafting = session.status === "drafting";
  const isAdmin    = user.workId === session.adminId;
  const me         = session.players.find((p) => p.workId === user.workId);

  const currentAction     = isDrafting && !isDone ? DRAFT_SEQUENCE[session.currentStep] : null;
  const currentTeamCaptain = currentAction
    ? (currentAction.team === "radiant" ? session.radiantCaptain : session.direCaptain)
    : null;
  const iAmCaptain  = currentTeamCaptain === user.workId;
  const isCaptainTurn = iAmCaptain || isAdmin;

  const radiantPlayers = session.players.filter((p) => p.team === "radiant");
  const direPlayers    = session.players.filter((p) => p.team === "dire");
  const bannedIds      = new Set(session.slots.filter((s) => s.type === "ban"  && s.heroId).map((s) => s.heroId!));
  const pickedIds      = new Set(session.slots.filter((s) => s.type === "pick" && s.heroId).map((s) => s.heroId!));

  /* ── WAITING ROOM ──────────────────────────────────────── */
  if (session.status === "waiting" || session.status === "ready") {
    const isReady = session.status === "ready";
    return (
      <div className="min-h-screen bg-dota-bg text-dota-warm flex flex-col relative overflow-hidden">
        <div className="fixed inset-0 bg-crosshatch opacity-40 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-px bg-linear-to-r from-transparent via-dota-gold/40 to-transparent" />

        {/* Header */}
        <header className="relative z-10 glass-panel border-b border-white/5">
          <div className="flex items-center gap-6 px-8 py-4">
            <button
              onClick={() => router.push("/lobby")}
              className="dota-button text-[10px] text-dota-muted hover:text-dota-gold border border-white/10 px-4 py-2 rounded-sm transition-all"
            >
              ← LOBBY
            </button>
            <div className="w-px h-8 bg-white/10 shrink-0" />
            <h1 className="font-display text-xl font-black text-white tracking-[0.25em] uppercase flex-1 text-center drop-shadow-2xl">
              {session.name}
            </h1>
            <div className="flex items-center gap-3 px-4 py-2 bg-black/40 border border-white/5 rounded-sm">
              <div className={`w-2.5 h-2.5 rounded-full ${isReady ? "bg-dota-gold glow-pulse" : "bg-white/20"}`} />
              <span className="font-display text-[10px] font-black text-white uppercase tracking-widest">
                {isReady ? "READY" : "WAITING"} · {session.players.length}/10
              </span>
            </div>
          </div>
        </header>

        <div className="relative flex-1 flex flex-col lg:flex-row gap-8 p-8 max-w-6xl mx-auto w-full z-10">
          {/* Team rosters */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-6 lg:w-72 shrink-0">
            <TeamRoster
              team="radiant"
              players={radiantPlayers}
              captain={session.radiantCaptain}
              myWorkId={user.workId}
              isAdmin={isAdmin}
              sessionStatus={session.status}
              onBecomeCaptain={(t) => action("setCaptain", { targetWorkId: t })}
              onTransferCaptain={(t) => action("setCaptain", { targetWorkId: t })}
              onResignCaptain={() => action("resignCaptain")}
              onSwap={(t) => action("swapPlayer", { targetWorkId: t })}
            />
            <TeamRoster
              team="dire"
              players={direPlayers}
              captain={session.direCaptain}
              myWorkId={user.workId}
              isAdmin={isAdmin}
              sessionStatus={session.status}
              onBecomeCaptain={(t) => action("setCaptain", { targetWorkId: t })}
              onTransferCaptain={(t) => action("setCaptain", { targetWorkId: t })}
              onResignCaptain={() => action("resignCaptain")}
              onSwap={(t) => action("swapPlayer", { targetWorkId: t })}
            />
          </div>

          {/* Center command panel */}
          <div className="flex-1 glass-panel panel-corners flex flex-col items-center justify-center gap-10 p-12 shadow-2xl min-h-[500px]">
            <div className="text-center animate-fade-in-up">
              <p className="font-display text-[11px] text-dota-gold font-black uppercase tracking-[0.6em] mb-4 opacity-80">GAME DRAFT</p>
              <h2 className="font-display text-5xl font-black text-white tracking-wider uppercase mb-8 drop-shadow-lg">{session.name}</h2>
              <div className="divider-gold mb-8 w-48 mx-auto" />

              {/* Player count display */}
              <div className="flex flex-col items-center gap-4">
                <div className="flex gap-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full transition-all duration-700 ${
                        i < session.players.length
                          ? "bg-dota-gold shadow-[0_0_15px_rgba(212,175,55,0.6)]"
                          : "bg-white/10"
                      }`}
                    />
                  ))}
                </div>
                <p className="font-display text-sm text-dota-warm font-black uppercase tracking-[0.3em]">
                  {session.players.length} / 10 PLAYERS CONNECTED
                </p>
              </div>
            </div>

            {/* Admin controls */}
            {isAdmin && (
              <div className="flex flex-col gap-6 items-center w-full max-w-sm animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                {isReady && (
                  <button
                    onClick={() => action("startDraft")}
                    className="dota-button w-full py-5 bg-dota-gold text-dota-bg font-black text-lg rounded-sm shadow-[0_0_50px_rgba(212,175,55,0.3)] hover:scale-105 active:scale-95"
                  >
                    START DRAFT
                  </button>
                )}
                {!isReady && session.players.length >= 2 && (
                  <button
                    onClick={() => action("startDraft")}
                    className="dota-button w-full py-3 border border-dota-gold/40 text-dota-gold hover:bg-dota-gold/10 rounded-sm text-xs"
                  >
                    FORCE START (DEV)
                  </button>
                )}
                <button
                  onClick={() => action("endSession")}
                  className="font-display text-[10px] text-dota-dire font-black uppercase tracking-widest hover:brightness-125 transition-all mt-4 opacity-60 hover:opacity-100"
                >
                  END SESSION
                </button>
              </div>
            )}

            {!isAdmin && (
              <div className="flex flex-col items-center gap-4 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                <div className="w-10 h-1 bg-dota-gold/30 rounded-full overflow-hidden">
                  <div className="h-full bg-dota-gold w-1/2 animate-[scan_2s_linear_infinite]" />
                </div>
                <p className="text-white font-display font-black text-sm uppercase tracking-widest animate-pulse">
                  Waiting for admin to start...
                </p>
              </div>
            )}

            {/* My status */}
            {me && (
              <div className="mt-4 px-6 py-3 bg-white/10 border border-white/20 rounded-sm flex items-center gap-4 font-display text-xs uppercase tracking-widest">
                <span className="text-dota-warm font-bold">TEAM:</span>
                <span className={me.team === "radiant" ? "text-dota-radiant font-black" : "text-dota-dire font-black"}>
                  {me.team === "radiant" ? "RADIANT" : "DIRE"}
                </span>
                {me.isCaptain && (
                  <>
                    <div className="w-px h-4 bg-white/20" />
                    <span className="text-dota-gold font-black">♛ CAPTAIN</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat strip */}
        <div className="relative z-20 shrink-0 border-t border-white/10 glass-panel px-8 py-4 h-32">
          <ChatPanel messages={session.chat} />
        </div>

        {/* Footer info */}
        <footer className="relative z-10 px-8 py-4 flex justify-between items-center text-footer">
          <span className="opacity-80">DOTA 2 DRAFT SIMULATOR © 2026</span>
          <div className="flex gap-6">
            <span className="hover:text-dota-gold cursor-default transition-colors">VERSION 2.0 PREMIUM</span>
            <span className="hover:text-dota-gold cursor-default transition-colors">BUILT FOR PROS</span>
          </div>
        </footer>
      </div>
    );
  }

  /* ── COMPLETED ──────────────────────────────────────────── */
  if (isDone) {
    return (
      <div className="min-h-screen bg-dota-bg text-dota-warm overflow-y-auto flex flex-col">
        <div className="fixed inset-0 bg-crosshatch opacity-30 pointer-events-none" />
        <header className="relative z-10 glass-panel border-b border-white/10">
          <div className="h-px w-full bg-linear-to-r from-transparent via-dota-gold/50 to-transparent" />
          <div className="px-8 py-4 flex items-center">
            <span className="font-display text-lg font-black text-dota-gold tracking-[0.3em] uppercase flex-1 text-center">
              {session.name} — DRAFT COMPLETED
            </span>
          </div>
        </header>
        <div className="relative p-8 flex-1">
          <DraftStats session={session} onNewDraft={() => router.push("/lobby")} />
        </div>
      </div>
    );
  }

  /* ── ACTIVE DRAFT ───────────────────────────────────────── */
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-dota-bg text-dota-warm relative font-sans">
      <div className="fixed inset-0 bg-crosshatch opacity-40 pointer-events-none z-0" />
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-y-0 left-0 w-1/4 bg-linear-to-r from-dota-radiant/[0.12] to-transparent" />
        <div className="absolute inset-y-0 right-0 w-1/4 bg-linear-to-l from-dota-dire/[0.12] to-transparent" />
      </div>

      {/* Header */}
      <header className="relative z-10 shrink-0 glass-panel border-b border-white/10">
        <div className="h-px w-full bg-linear-to-r from-transparent via-dota-gold/40 to-transparent" />
        <div className="flex items-center gap-6 px-6 py-3">
          <div className="shrink-0 flex flex-col leading-tight">
            <span className="font-display text-[10px] font-black tracking-[0.5em] text-dota-gold uppercase opacity-80">DOTA 2</span>
            <span className="font-display text-lg font-black text-white tracking-[0.1em] uppercase truncate max-w-[200px]">
              {session.name}
            </span>
          </div>

          <div className="w-px h-10 bg-white/10 shrink-0" />

          {/* Turn indicator */}
          {currentAction && (
            <div className="flex items-center gap-4 flex-1 justify-center animate-fade-in-up">
              <div className={`w-3 h-3 rounded-full glow-pulse shadow-2xl ${
                currentAction.team === "radiant"
                  ? "bg-dota-radiant text-dota-radiant"
                  : "bg-dota-dire text-dota-dire"
              }`} />
              <span className={`font-display text-xl font-black tracking-[0.3em] uppercase drop-shadow-lg ${
                currentAction.team === "radiant" ? "text-dota-radiant" : "text-dota-dire"
              }`}>
                {currentAction.team === "radiant" ? "RADIANT" : "DIRE"}
              </span>
              <span className="text-dota-warm text-sm font-bold uppercase tracking-widest hidden sm:inline opacity-80">
                · {currentAction.type === "ban" ? "BANNING" : "PICKING"}
              </span>

              {iAmCaptain && (
                <div className="ml-6 px-4 py-1.5 bg-dota-gold/20 border border-dota-gold/50 rounded-sm shadow-[0_0_20px_rgba(212,175,55,0.2)]">
                  <span className="font-display text-[11px] font-black text-dota-gold uppercase tracking-widest">
                    ♛ YOUR TURN
                  </span>
                </div>
              )}
              {!isCaptainTurn && (
                <span className="text-[11px] text-dota-muted font-display font-black uppercase tracking-widest ml-4 hidden sm:inline">
                  Captain is picking...
                </span>
              )}
            </div>
          )}

          {/* Controls */}
          <div className="shrink-0 flex items-center gap-3">
            <button
              onClick={() => router.push("/lobby")}
              className="dota-button text-[10px] text-dota-warm border border-white/10 px-4 py-2 rounded-sm"
            >
              LOBBY
            </button>
            {isAdmin && (
              <button
                onClick={() => action("endSession")}
                className="dota-button text-[10px] text-dota-dire border border-dota-dire/20 px-4 py-2 rounded-sm"
              >
                END
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Phase bar */}
      <div className="relative z-10 shrink-0 bg-black/40 border-b border-white/5">
        <PhaseBar currentStep={session.currentStep} timeLeft={timeLeft} />
      </div>

      {/* Main layout */}
      <div className="relative z-10 flex flex-1 min-h-0 gap-4 p-4">
        {/* Radiant panel */}
        <div className="hidden lg:flex w-72 shrink-0 flex-col">
          <TeamPanel team="radiant" slots={session.slots} currentStep={session.currentStep} />
        </div>

        {/* Center area */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {!isCaptainTurn && isDrafting && (
            <div className="shrink-0 text-center py-2 bg-black/60 border border-white/5 rounded-sm shadow-inner glass-panel">
              <span className="font-display text-[10px] font-black text-dota-muted uppercase tracking-[0.3em]">
                WAITING FOR {currentAction?.team === "radiant" ? "RADIANT" : "DIRE"} CAPTAIN...
              </span>
            </div>
          )}

          <div className="flex-1 min-h-0">
            <HeroGrid
              bannedIds={bannedIds}
              pickedIds={pickedIds}
              disabled={!isDrafting || isDone || !isCaptainTurn}
              onSelect={handlePickOrBan}
              onMention={handleMention}
              isCaptainTurn={isCaptainTurn}
            />
          </div>

          {/* Chat area */}
          <div className="shrink-0 h-32 glass-panel border border-white/10 rounded-sm p-4 shadow-2xl">
            <ChatPanel messages={session.chat} />
          </div>
        </div>

        {/* Dire panel */}
        <div className="hidden lg:flex w-72 shrink-0 flex-col">
          <TeamPanel team="dire" slots={session.slots} currentStep={session.currentStep} />
        </div>
      </div>
    </div>
  );
}
