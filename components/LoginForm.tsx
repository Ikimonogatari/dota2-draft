"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [name, setName] = useState("");
  const [workId, setWorkId] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !workId.trim()) {
      setError("Both fields are required");
      return;
    }
    setError("");
    startTransition(async () => {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workId: workId.trim(), name: name.trim() }),
      });
      if (res.ok) router.push("/lobby");
      else setError("Authentication failed");
    });
  }

  return (
    <div className="min-h-screen bg-dota-bg flex">
      {/* Left — atmospheric backdrop */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        {/* Base gradient layers */}
        <div className="absolute inset-0 bg-crosshatch" />
        <div className="absolute inset-0 bg-linear-to-br from-dota-radiant/10 via-transparent to-dota-dire/10" />
        <div className="absolute inset-0 bg-linear-to-t from-dota-bg via-transparent to-transparent" />

        {/* Diagonal accent stripe */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-0 left-1/3 w-px h-full bg-linear-to-b from-transparent via-dota-gold/20 to-transparent" />
          <div className="absolute top-0 left-2/3 w-px h-full bg-linear-to-b from-transparent via-dota-line/60 to-transparent" />
          <div className="absolute top-1/3 left-0 right-0 h-px bg-linear-to-r from-transparent via-dota-gold/15 to-transparent" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-linear-to-r from-transparent via-dota-line/40 to-transparent" />
        </div>

        {/* Team corner glows */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-radial-[at_0%_0%] from-dota-radiant/15 to-transparent" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-radial-[at_100%_100%] from-dota-dire/15 to-transparent" />

        {/* Center content */}
        <div className="relative flex flex-col items-center justify-center w-full p-16 gap-8">
          <div className="text-center">
            <p className="font-display text-[10px] tracking-[0.6em] text-dota-muted uppercase mb-2">Dota 2</p>
            <h1 className="font-display text-6xl font-black tracking-[0.15em] text-dota-gold uppercase leading-none">
              DRAFT
            </h1>
            <div className="divider-gold mt-5 mb-5 w-32 mx-auto" />
            <p className="text-white/60 text-sm tracking-widest uppercase font-display font-medium">
              Captains Mode · 10 Players · Real-time
            </p>
          </div>

          {/* Decorative stat blocks */}
          <div className="grid grid-cols-3 gap-4 w-full max-w-xs mt-4">
            {[
              { label: "Bans", value: "12" },
              { label: "Picks", value: "10" },
              { label: "Timer", value: "30s" },
            ].map((s) => (
              <div key={s.label} className="text-center border border-dota-line rounded-sm p-3 bg-dota-surface/40">
                <div className="font-display text-xl font-black text-dota-gold">{s.value}</div>
                <div className="font-display text-[9px] text-dota-muted uppercase tracking-widest mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Phase labels */}
          <div className="flex flex-col gap-1.5 w-full max-w-xs">
            {[
              { phase: "Ban I", color: "bg-dota-dire/70", w: "w-full" },
              { phase: "Pick I", color: "bg-dota-gold/70", w: "w-4/5" },
              { phase: "Ban II", color: "bg-dota-dire/50", w: "w-3/5" },
              { phase: "Pick II", color: "bg-dota-gold/50", w: "w-2/5" },
              { phase: "Final", color: "bg-dota-gold/30", w: "w-1/5" },
            ].map((p) => (
              <div key={p.phase} className="flex items-center gap-2">
                <span className="font-display text-[9px] text-dota-muted uppercase tracking-widest w-14 shrink-0">{p.phase}</span>
                <div className={`h-1 rounded-full ${p.color} ${p.w} transition-all`} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Vertical divider */}
      <div className="hidden lg:block w-px bg-linear-to-b from-transparent via-dota-line to-transparent shrink-0" />

      {/* Right — login form */}
      <div className="w-full lg:w-[420px] shrink-0 flex flex-col items-center justify-center p-8 relative">
        <div className="absolute inset-0 bg-dot-grid opacity-60" />
        <div className="absolute top-0 left-0 right-0 h-64 bg-linear-to-b from-dota-gold/[0.03] to-transparent" />

        <div className="relative w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <p className="font-display text-[9px] tracking-[0.5em] text-dota-muted uppercase mb-1">Dota 2</p>
            <h1 className="font-display text-4xl font-black tracking-[0.15em] text-dota-gold uppercase">DRAFT</h1>
            <div className="divider-gold mt-3 w-20 mx-auto" />
          </div>

          {/* Form card */}
          <div className="panel-corners panel-corners-active relative">
            <div className="bg-dota-panel border border-dota-line rounded-sm overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.6)]">
              {/* Card header bar */}
              <div className="h-px w-full bg-linear-to-r from-transparent via-dota-gold/60 to-transparent" />
              <div className="px-8 pt-8 pb-6">
                <div className="mb-7">
                  <h2 className="font-display text-lg font-black tracking-[0.2em] text-white uppercase">
                    Enter the Draft
                  </h2>
                  <p className="text-white/50 text-xs mt-1 tracking-wide">
                    Identify yourself to join or create game drafts
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div>
                    <label className="block font-display text-[10px] text-white/60 uppercase tracking-[0.25em] mb-2 font-bold">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your in-game name"
                      maxLength={32}
                      className="input-base"
                    />
                  </div>

                  <div>
                    <label className="block font-display text-[10px] text-white/60 uppercase tracking-[0.25em] mb-2 font-bold">
                      Work ID
                    </label>
                    <input
                      type="text"
                      value={workId}
                      onChange={(e) => setWorkId(e.target.value)}
                      placeholder="e.g. EMP-1234"
                      maxLength={20}
                      className="input-base"
                    />
                    <p className="text-[10px] text-dota-muted/60 mt-1.5">Used to identify you across sessions</p>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 bg-dota-dire/10 border border-dota-dire/30 rounded-sm px-3 py-2">
                      <div className="w-1 h-1 rounded-full bg-dota-dire shrink-0" />
                      <p className="text-xs text-dota-dire">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={pending}
                    className="relative mt-2 py-3 bg-dota-gold hover:bg-dota-gold-light text-dota-bg font-display font-black text-sm uppercase tracking-[0.2em] rounded-sm transition-all disabled:opacity-50 overflow-hidden group"
                  >
                    <span className="relative z-10">{pending ? "Connecting..." : "Enter Lobby"}</span>
                    <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                  </button>
                </form>
              </div>
              <div className="h-px w-full bg-linear-to-r from-transparent via-dota-line to-transparent" />
              <div className="px-8 py-3 bg-black/20">
                <p className="text-[9px] text-dota-muted/50 text-center tracking-widest uppercase">
                  Dota 2 Draft Simulator · Captains Mode
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
