"use client";

import { useState, useMemo } from "react";
import { Player, Role, TeamName } from "@/lib/types";
import TeamRoster from "./TeamRoster";
import { useRouter } from "next/navigation";

const POOL_SIZE = 12;

const MOCK_NAMES = [
  "Miracle-", "Puppey", "Arteezy", "N0tail", "Ceb", 
  "Ana", "Topson", "JerAx", "SumaiL", "KuroKy",
  "Sneyking", "Skiter", "Malrine", "ATF", "Cr1t-",
  "Yopaj", "Raven", "Jabz", "DJ", "Abed"
];

const ROLES: Role[] = ["mid", "carry", "offlane", "support", "hard support"];

function generatePool(): Player[] {
  return Array.from({ length: POOL_SIZE }).map((_, i) => {
    const roles: Role[] = [];
    const roleCount = Math.random() > 0.7 ? 2 : 1;
    for (let r = 0; r < roleCount; r++) {
      const role = ROLES[Math.floor(Math.random() * ROLES.length)];
      if (!roles.includes(role)) roles.push(role);
    }
    
    return {
      workId: `bot-${i}`,
      name: MOCK_NAMES[i % MOCK_NAMES.length],
      mmr: Math.floor(Math.random() * 5000) + 8000, // 8k to 13k
      roles,
      team: "unassigned",
      isCaptain: false,
    };
  });
}

export default function PlayerDraftPractice() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>(generatePool());
  const [turn, setTurn] = useState<TeamName>("radiant");
  const [isComplete, setIsComplete] = useState(false);

  const radiantPlayers = useMemo(() => players.filter(p => p.team === "radiant"), [players]);
  const direPlayers = useMemo(() => players.filter(p => p.team === "dire"), [players]);
  const unassignedPlayers = useMemo(() => players.filter(p => p.team === "unassigned"), [players]);

  const radiantAvgMmr = useMemo(() => 
    radiantPlayers.length ? radiantPlayers.reduce((sum, p) => sum + p.mmr, 0) / radiantPlayers.length : 0
  , [radiantPlayers]);

  const direAvgMmr = useMemo(() => 
    direPlayers.length ? direPlayers.reduce((sum, p) => sum + p.mmr, 0) / direPlayers.length : 0
  , [direPlayers]);

  let radiantPct = 50;
  if (radiantAvgMmr > 0 || direAvgMmr > 0) {
    radiantPct = (radiantAvgMmr / (radiantAvgMmr + direAvgMmr)) * 100;
  }
  const direPct = 100 - radiantPct;

  const handlePick = (workId: string) => {
    if (isComplete) return;
    
    setPlayers(prev => prev.map(p => {
      if (p.workId === workId) {
        return { ...p, team: turn };
      }
      return p;
    }));

    const nextTurn = turn === "radiant" ? "dire" : "radiant";
    const nextRadiantCount = turn === "radiant" ? radiantPlayers.length + 1 : radiantPlayers.length;
    const nextDireCount = turn === "dire" ? direPlayers.length + 1 : direPlayers.length;

    if (nextRadiantCount === 5 && nextDireCount === 5) {
      setIsComplete(true);
    } else {
      setTurn(nextTurn);
    }
  };

  const handleReset = () => {
    setPlayers(generatePool());
    setTurn("radiant");
    setIsComplete(false);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-dota-bg text-dota-warm">
      <div className="fixed inset-0 pointer-events-none z-0 bg-dot-grid opacity-100" />
      
      {/* Header */}
      <header className="relative z-10 shrink-0 flex flex-col items-center border-b border-dota-line/60 bg-dota-panel/95 backdrop-blur-md shadow-lg py-4">
        <div className="flex items-center gap-4 px-6 w-full max-w-6xl">
          <div className="shrink-0 flex flex-col leading-none">
            <span className="text-[10px] font-display font-black tracking-[0.5em] text-dota-muted uppercase">Practice</span>
            <span className="font-display text-xl font-black tracking-[0.2em] text-dota-gold uppercase leading-tight">Player Draft</span>
          </div>
          <div className="flex-1 flex flex-col items-center gap-2">
            <span className="font-display text-[9px] text-white/50 tracking-[0.3em] uppercase">Rank Distribution</span>
            <div className="flex items-center gap-4 px-5 py-2 bg-black/40 border border-white/10 rounded-full shadow-inner">
              <div className="flex items-center gap-2">
                <span className="text-dota-radiant font-black text-xs tracking-widest">RADIANT</span>
                <span className="text-white font-bold text-[11px]">{radiantPct.toFixed(1)}%</span>
              </div>
              <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden flex">
                <div className="h-full bg-dota-radiant transition-all duration-500" style={{ width: `${radiantPct}%` }} />
                <div className="h-full bg-dota-dire transition-all duration-500" style={{ width: `${direPct}%` }} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-[11px]">{direPct.toFixed(1)}%</span>
                <span className="text-dota-dire font-black text-xs tracking-widest">DIRE</span>
              </div>
            </div>
          </div>
          <div className="shrink-0">
            <button
              onClick={() => router.push("/lobby")}
              className="px-4 py-2 border border-dota-line/60 text-dota-muted hover:text-white transition-all font-display text-[10px] uppercase tracking-widest"
            >
              Exit Practice
            </button>
          </div>
        </div>
      </header>

      {/* Main Area */}
      <div className="relative z-10 flex flex-1 min-h-0 gap-8 p-8 max-w-[1400px] mx-auto w-full">
        {/* Radiant */}
        <div className="w-72 shrink-0">
          <TeamRoster
            team="radiant"
            players={radiantPlayers}
            captain={null}
            myWorkId="practice"
            isAdmin={true}
            sessionStatus="waiting"
            sessionMode="draft"
            onBecomeCaptain={() => {}}
            onTransferCaptain={() => {}}
            onResignCaptain={() => {}}
            onSwap={() => {}}
          />
        </div>

        {/* Center: Unassigned Pool */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          <div className="bg-dota-panel/80 border border-white/5 rounded-sm overflow-hidden flex flex-col h-full glass-panel shadow-2xl">
            <div className="px-6 py-4 border-b border-white/5 bg-black/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full glow-pulse ${turn === "radiant" ? "bg-dota-radiant" : "bg-dota-dire"}`} />
                <span className={`font-display text-sm font-black uppercase tracking-widest ${turn === "radiant" ? "text-dota-radiant" : "text-dota-dire"}`}>
                  {turn === "radiant" ? "Radiant" : "Dire"} Turn to Pick
                </span>
              </div>
              <span className="text-[10px] text-white/40 font-display font-black uppercase tracking-widest">
                {unassignedPlayers.length} Players Available
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-dota">
              <div className="grid grid-cols-1 gap-3">
                {unassignedPlayers.map((p) => (
                  <div
                    key={p.workId}
                    className="group flex items-center gap-6 p-4 bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/8 transition-all rounded-sm"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-sm font-display font-black text-white uppercase tracking-wider">{p.name}</span>
                        <span className="text-[10px] font-mono text-dota-gold font-bold">{p.mmr} MMR</span>
                      </div>
                      <div className="flex gap-2">
                        {p.roles.map(r => (
                          <span key={r} className="text-[9px] uppercase tracking-widest text-white/40 px-1.5 py-0.5 bg-black/40 border border-white/5 rounded-sm">
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => handlePick(p.workId)}
                      disabled={isComplete}
                      className={`px-6 py-2.5 rounded-sm font-display text-[11px] font-black uppercase tracking-widest transition-all ${
                        turn === "radiant"
                          ? "bg-dota-radiant hover:bg-dota-radiant/80 text-white shadow-[0_0_15px_rgba(74,158,74,0.3)]"
                          : "bg-dota-dire hover:bg-dota-dire/80 text-white shadow-[0_0_15px_rgba(184,64,64,0.3)]"
                      } disabled:opacity-30 disabled:shadow-none`}
                    >
                      Draft
                    </button>
                  </div>
                ))}

                {unassignedPlayers.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center py-20 opacity-40">
                    <p className="font-display text-xl font-black uppercase tracking-widest mb-2 text-white">Draft Complete</p>
                    <button
                      onClick={handleReset}
                      className="text-dota-gold hover:text-white transition-all font-display text-xs font-black uppercase tracking-widest border-b border-dota-gold/40 pb-1"
                    >
                      Restart Practice
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Dire */}
        <div className="w-72 shrink-0">
          <TeamRoster
            team="dire"
            players={direPlayers}
            captain={null}
            myWorkId="practice"
            isAdmin={true}
            sessionStatus="waiting"
            sessionMode="draft"
            onBecomeCaptain={() => {}}
            onTransferCaptain={() => {}}
            onResignCaptain={() => {}}
            onSwap={() => {}}
          />
        </div>
      </div>

      {/* Complete Overlay */}
      {isComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="text-center p-12 bg-dota-panel border border-dota-gold/40 rounded-sm shadow-2xl panel-corners-active">
            <h2 className="font-display text-4xl font-black text-dota-gold uppercase tracking-[0.3em] mb-2">Practice Done</h2>
            <p className="text-white/60 font-display text-xs uppercase tracking-widest mb-8">All players have been drafted.</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleReset}
                className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-display font-black uppercase tracking-widest text-xs rounded-sm transition-all border border-white/10"
              >
                Restart
              </button>
              <button
                onClick={() => router.push("/lobby")}
                className="px-8 py-3 bg-dota-gold hover:bg-dota-gold-light text-dota-bg font-display font-black uppercase tracking-widest text-xs rounded-sm transition-all"
              >
                Back to Lobby
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
