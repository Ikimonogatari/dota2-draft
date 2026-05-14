"use client";

import { DRAFT_SEQUENCE, getPhaseLabel } from "@/lib/draft";

interface PhaseBarProps {
  currentStep: number;
}

export default function PhaseBar({ currentStep }: PhaseBarProps) {
  const isDone = currentStep >= DRAFT_SEQUENCE.length;
  const phase = isDone ? "Draft Complete" : getPhaseLabel(currentStep);
  const current = isDone ? null : DRAFT_SEQUENCE[currentStep];

  const phases = [
    { label: "Ban 1", range: [0, 5] },
    { label: "Pick 1", range: [6, 9] },
    { label: "Ban 2", range: [10, 13] },
    { label: "Pick 2", range: [14, 17] },
    { label: "Ban 3", range: [18, 19] },
    { label: "Final", range: [20, 21] },
  ];

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Phase segments */}
      <div className="flex gap-1 w-full max-w-2xl">
        {phases.map((p) => {
          const [start, end] = p.range;
          const isActive = currentStep >= start && currentStep <= end;
          const isDonePhase = currentStep > end;
          return (
            <div key={p.label} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={[
                  "h-1.5 w-full rounded-full transition-all duration-300",
                  isDonePhase
                    ? "bg-yellow-600"
                    : isActive
                    ? "bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]"
                    : "bg-gray-700",
                ].join(" ")}
              />
              <span
                className={[
                  "text-[9px] font-bold uppercase tracking-wider",
                  isActive ? "text-yellow-400" : isDonePhase ? "text-yellow-700" : "text-gray-600",
                ].join(" ")}
              >
                {p.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Current action label */}
      <div className="flex items-center gap-3">
        <span className="text-yellow-400 font-black text-sm uppercase tracking-widest">{phase}</span>
        {current && !isDone && (
          <>
            <span className="text-gray-600">—</span>
            <span
              className={[
                "text-sm font-bold uppercase tracking-widest",
                current.team === "radiant" ? "text-emerald-400" : "text-red-400",
              ].join(" ")}
            >
              {current.team}
            </span>
            <span className="text-gray-500 text-sm">
              {current.type === "ban" ? "bans a hero" : "picks a hero"}
            </span>
          </>
        )}
        {isDone && <span className="text-gray-400 text-sm">All heroes selected</span>}
      </div>

      {/* Step counter */}
      <div className="flex gap-0.5">
        {DRAFT_SEQUENCE.map((action, i) => (
          <div
            key={i}
            className={[
              "w-2 h-2 rounded-full transition-all duration-200",
              i < currentStep
                ? action.type === "ban"
                  ? "bg-red-700"
                  : "bg-green-700"
                : i === currentStep
                ? action.type === "ban"
                  ? "bg-red-400 scale-125 shadow-[0_0_6px_rgba(248,113,113,0.8)]"
                  : "bg-green-400 scale-125 shadow-[0_0_6px_rgba(74,222,128,0.8)]"
                : "bg-gray-700",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}
