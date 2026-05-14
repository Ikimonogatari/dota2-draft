"use client";

import { DRAFT_SEQUENCE } from "@/lib/draft";

const PHASES = [
  { label: "BAN I", range: [0, 5], type: "ban" },
  { label: "PICK I", range: [6, 9], type: "pick" },
  { label: "BAN II", range: [10, 13], type: "ban" },
  { label: "PICK II", range: [14, 17], type: "pick" },
  { label: "BAN III", range: [18, 19], type: "ban" },
  { label: "FINAL", range: [20, 21], type: "pick" },
];

interface PhaseBarProps {
  currentStep: number;
  timeLeft: number;
}

export default function PhaseBar({ currentStep, timeLeft }: PhaseBarProps) {
  const isDone = currentStep >= DRAFT_SEQUENCE.length;
  const current = isDone ? null : DRAFT_SEQUENCE[currentStep];
  const isWarning = timeLeft <= 10 && !isDone;

  return (
    <div className="flex items-center gap-6 px-6 py-3 glass-panel">
      {/* Phase segments */}
      <div className="flex gap-2 flex-1">
        {PHASES.map((p) => {
          const [start, end] = p.range;
          const active = currentStep >= start && currentStep <= end;
          const done = currentStep > end;
          const isBan = p.type === "ban";
          
          return (
            <div key={p.label} className="flex-1 flex flex-col gap-2 items-center">
              <div
                className={[
                  "h-1.5 w-full rounded-full transition-all duration-700",
                  done
                    ? "bg-dota-gold/30 shadow-[0_0_8px_rgba(212,175,55,0.1)]"
                    : active
                    ? isBan
                      ? "bg-dota-dire shadow-[0_0_15px_rgba(248,113,113,0.8)]"
                      : "bg-dota-gold shadow-[0_0_15px_rgba(212,175,55,0.8)]"
                    : "bg-white/5",
                ].join(" ")}
              />
              <span
                className={[
                  "text-[10px] font-display font-black tracking-[0.2em] uppercase hidden sm:block transition-all duration-500",
                  active
                    ? isBan
                      ? "text-dota-dire drop-shadow-lg"
                      : "text-dota-gold drop-shadow-lg"
                    : done
                    ? "text-dota-muted/60"
                    : "text-dota-muted/20",
                ].join(" ")}
              >
                {p.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Separator */}
      <div className="w-px h-10 bg-white/10 shrink-0" />

      {/* Current action info */}
      {!isDone && current && (
        <div className="hidden lg:flex items-center gap-3 shrink-0 bg-black/40 px-4 py-2 rounded-sm border border-white/5 shadow-inner">
          <div className={`w-2 h-2 rounded-full glow-pulse ${current.team === "radiant" ? "bg-dota-radiant" : "bg-dota-dire"}`} />
          <span
            className={[
              "text-[11px] font-display font-black tracking-[0.3em] uppercase",
              current.team === "radiant" ? "text-dota-radiant" : "text-dota-dire",
            ].join(" ")}
          >
            {current.team === "radiant" ? "RADIANT" : "DIRE"}
          </span>
          <span className="text-white/40 text-[11px] font-bold uppercase tracking-widest">
            {current.type === "ban" ? "BANNING" : "PICKING"}
          </span>
        </div>
      )}

      {/* Timer */}
      {!isDone && (
        <div className="flex flex-col items-center justify-center shrink-0 w-16">
          <div
            className={[
              "font-display font-black text-3xl tabular-nums transition-all duration-300 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]",
              isWarning ? "text-dota-dire scale-125 animate-pulse" : "text-white",
            ].join(" ")}
          >
            {String(timeLeft).padStart(2, "0")}
          </div>
          <span className="text-[8px] text-dota-muted font-black tracking-widest uppercase opacity-60">SECONDS</span>
        </div>
      )}

      {/* Step Progress Dots */}
      <div className="hidden xl:flex gap-1.5 items-center shrink-0 ml-4 p-2 bg-black/20 rounded-full border border-white/5">
        {DRAFT_SEQUENCE.map((action, i) => (
          <div
            key={i}
            className={[
              "rounded-full transition-all duration-500",
              i < currentStep
                ? "w-1.5 h-1.5 " + (action.type === "ban" ? "bg-dota-dire/20" : "bg-dota-gold/20")
                : i === currentStep
                ? "w-2.5 h-2.5 " + (action.type === "ban" ? "bg-dota-dire shadow-[0_0_10px_rgba(248,113,113,0.6)]" : "bg-dota-gold shadow-[0_0_10px_rgba(212,175,55,0.6)]")
                : "w-1.5 h-1.5 bg-white/10",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}

