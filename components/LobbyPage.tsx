"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { SessionSummary, User } from "@/lib/types";

const STATUS: Record<string, { label: string; color: string; dot: string; glow: string }> = {
  waiting:   { label: "Waiting",  color: "text-dota-muted",   dot: "bg-dota-muted",   glow: "" },
  ready:     { label: "Ready",    color: "text-dota-gold",    dot: "bg-dota-gold",    glow: "shadow-[0_0_6px_rgba(200,162,67,0.6)]" },
  drafting:  { label: "Live",     color: "text-dota-radiant", dot: "bg-dota-radiant", glow: "shadow-[0_0_6px_rgba(61,158,74,0.7)] status-pulse" },
  completed: { label: "Ended",    color: "text-dota-dire",    dot: "bg-dota-dire",    glow: "" },
};

interface Props {
  user: User;
  history: Array<{ id: string; name: string; radiant: (string|null)[]; dire: (string|null)[]; completedAt?: number }>;
}

export default function LobbyPage({ user, history }: Props) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [newName, setNewName] = useState("");
  const [mode, setMode] = useState<"free" | "draft">("draft");
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const fetchSessions = useCallback(async () => {
    const res = await fetch("/api/sessions");
    if (res.ok) setSessions(await res.json());
  }, []);

  useEffect(() => {
    fetchSessions();
    const id = setInterval(fetchSessions, 3000);
    return () => clearInterval(id);
  }, [fetchSessions]);

  async function createSession() {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), mode }),
    });
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/draft/${id}`);
    }
    setCreating(false);
  }

  async function joinSession(id: string) {
    await fetch(`/api/sessions/${id}/join`, { method: "POST" });
    router.push(`/draft/${id}`);
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-dota-bg text-dota-warm">
      {/* Background */}
      <div className="fixed inset-0 bg-crosshatch pointer-events-none opacity-70" />
      <div className="fixed inset-0 bg-linear-to-b from-dota-gold/[0.03] via-transparent to-transparent pointer-events-none" />

      {/* ── HEADER ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-dota-line bg-dota-panel/95 backdrop-blur-md">
        <div className="h-px w-full bg-linear-to-r from-transparent via-dota-gold/40 to-transparent" />
        <div className="max-w-6xl mx-auto px-6 py-0 flex items-stretch gap-6">
          {/* Logo */}
          <div className="flex flex-col justify-center py-3 border-r border-dota-line pr-6 shrink-0">
            <span className="font-display text-[8px] tracking-[0.5em] text-dota-muted uppercase">Dota 2</span>
            <span className="font-display text-xl font-black tracking-[0.15em] text-dota-gold uppercase leading-tight">Draft</span>
          </div>

          {/* Nav */}
          <div className="flex items-center gap-1">
            <span className="font-display text-[10px] text-dota-gold font-black uppercase tracking-widest px-3 py-1.5 border border-dota-gold/40 rounded-sm bg-dota-gold/10">
              Lobby
            </span>
            <a href="/practice" className="font-display text-[10px] text-white/60 hover:text-white uppercase tracking-widest px-3 py-1.5 border border-transparent hover:border-dota-line rounded-sm transition-all">
              Practice
            </a>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* User */}
          <div className="flex items-center gap-3 border-l border-dota-line pl-6">
            <div className="text-right">
              <p className="text-sm font-bold text-dota-warm leading-none">{user.name}</p>
              <p className="text-[10px] text-dota-muted font-mono mt-0.5">{user.workId}</p>
            </div>
            <div className="w-8 h-8 rounded-sm bg-dota-gold/10 border border-dota-gold/30 flex items-center justify-center shrink-0">
              <span className="font-display text-xs font-black text-dota-gold">{user.name[0]?.toUpperCase()}</span>
            </div>
            <button
              onClick={logout}
              className="font-display text-[10px] text-white/60 hover:text-dota-dire uppercase tracking-widest border border-dota-line px-2.5 py-1.5 rounded-sm transition-all hover:border-dota-dire/40"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN ──────────────────────────────────────────── */}
      <div className="relative max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">

          {/* Left column — sessions */}
          <div className="flex flex-col gap-6">

            {/* Create section */}
            <div className="panel-corners relative">
              <div className="border border-dota-line rounded-sm bg-dota-panel overflow-hidden">
                <div className="flex items-center gap-3 px-5 py-3 border-b border-dota-line bg-black/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-dota-gold shadow-[0_0_8px_rgba(212,175,55,0.4)]" />
                  <span className="font-display text-[11px] font-black uppercase tracking-[0.25em] text-white/70">
                    New Game Draft
                  </span>
                </div>
                <div className="p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && createSession()}
                        placeholder="Name your draft (e.g. Office Finals)"
                        autoComplete="off"
                        className="input-base flex-1"
                      />
                      <button
                        onClick={createSession}
                        disabled={creating || !newName.trim()}
                        className="shrink-0 px-6 py-2.5 bg-dota-gold hover:bg-dota-gold-light text-dota-bg font-display font-black text-xs uppercase tracking-[0.15em] rounded-sm transition-all disabled:opacity-40 relative overflow-hidden group"
                      >
                        <span className="relative z-10">Create</span>
                        <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                      </button>
                    </div>
                    
                    <div className="flex gap-4 items-center">
                      <span className="font-display text-[9px] text-white/50 uppercase tracking-widest">LOBBY MODE:</span>
                      <div className="flex bg-black/40 border border-white/5 rounded-sm p-1">
                        <button
                          onClick={() => setMode("draft")}
                          className={`px-4 py-1.5 text-[10px] font-display font-black uppercase tracking-widest transition-all rounded-sm ${
                            mode === "draft" ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/70"
                          }`}
                        >
                          Player Draft
                        </button>
                        <button
                          onClick={() => setMode("free")}
                          className={`px-4 py-1.5 text-[10px] font-display font-black uppercase tracking-widest transition-all rounded-sm ${
                            mode === "free" ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/70"
                          }`}
                        >
                          Free Mode
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sessions list */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-display text-[11px] font-black uppercase tracking-[0.25em] text-white/70">
                  Active Drafts
                </span>
                <span className="text-[9px] text-dota-muted font-mono">
                  {sessions.length} session{sessions.length !== 1 ? "s" : ""}
                </span>
              </div>

              {sessions.length === 0 ? (
                <div className="border border-dashed border-dota-line rounded-sm py-14 flex flex-col items-center gap-3">
                  <div className="grid grid-cols-3 gap-1">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} className="w-2 h-2 rounded-full bg-dota-line" />
                    ))}
                  </div>
                  <p className="text-dota-muted text-sm tracking-wide">No active drafts</p>
                  <p className="text-dota-muted/50 text-xs">Create one above to get started</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {sessions.map((s) => {
                    const st = STATUS[s.status] ?? STATUS.waiting;
                    const pct = Math.round((s.playerCount / 10) * 100);
                    return (
                      <div
                        key={s.id}
                        className="panel-corners group border border-dota-line rounded-sm bg-dota-panel hover:border-dota-line/80 hover:bg-dota-surface/30 transition-all duration-200 overflow-hidden"
                      >
                        <div className="flex items-center gap-5 px-5 py-4">
                          {/* Status indicator */}
                          <div className="shrink-0 flex flex-col items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${st.dot} ${st.glow}`} />
                            <span className={`font-display text-[8px] font-black uppercase tracking-widest ${st.color}`}>
                              {st.label}
                            </span>
                          </div>

                          {/* Divider */}
                          <div className="w-px h-10 bg-dota-line shrink-0" />

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 mb-2">
                              <span className="font-black text-sm text-white tracking-wide truncate">{s.name}</span>
                              <span className="text-white/30 text-[9px] uppercase tracking-widest px-1.5 py-0.5 border border-white/10 rounded-sm">
                                {s.mode === "free" ? "Free" : "Draft"}
                              </span>
                              <span className="text-white/40 text-[10px] shrink-0 ml-auto">by {s.adminName}</span>
                            </div>
                            {/* Player bar */}
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1 bg-dota-line rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-dota-gold/60 rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="font-mono text-[10px] text-dota-muted shrink-0">
                                {s.playerCount}/10
                              </span>
                            </div>
                          </div>

                          {/* Action */}
                          <button
                            onClick={() => joinSession(s.id)}
                            disabled={s.status === "completed"}
                            className="shrink-0 px-4 py-2 font-display font-black text-[10px] uppercase tracking-widest border rounded-sm transition-all disabled:opacity-25 disabled:cursor-not-allowed
                              border-dota-gold/40 text-dota-gold hover:bg-dota-gold/10 hover:border-dota-gold/70"
                          >
                            {s.status === "drafting" ? "Watch" : "Join"}
                          </button>
                        </div>
                        {/* Bottom accent */}
                        <div className={`h-px w-full ${
                          s.status === "drafting" ? "bg-linear-to-r from-transparent via-dota-radiant/40 to-transparent" :
                          s.status === "ready"    ? "bg-linear-to-r from-transparent via-dota-gold/30 to-transparent" :
                          "bg-transparent"
                        }`} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right column — sidebar */}
          <div className="flex flex-col gap-6">
            {/* Player card */}
            <div className="border border-dota-line rounded-sm bg-dota-panel overflow-hidden">
              <div className="h-12 bg-linear-to-br from-dota-gold/10 to-transparent border-b border-dota-line flex items-center px-4 gap-3">
                <div className="w-6 h-6 rounded-sm bg-dota-gold/20 border border-dota-gold/40 flex items-center justify-center">
                  <span className="font-display text-xs font-black text-dota-gold">{user.name[0]?.toUpperCase()}</span>
                </div>
                <span className="font-display text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">My Profile</span>
              </div>
              <div className="p-4 flex flex-col gap-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-white/40 uppercase tracking-widest font-display font-bold">Name</span>
                  <span className="text-sm font-black text-white">{user.name}</span>
                </div>

              </div>
            </div>

            {/* How it works */}
            <div className="border border-dota-line rounded-sm bg-dota-panel overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-dota-line bg-black/20">
                <div className="w-1.5 h-1.5 rounded-full bg-dota-gold/40" />
                <span className="font-display text-[11px] font-black uppercase tracking-[0.25em] text-white/70">How It Works</span>
              </div>
              <div className="p-4 flex flex-col gap-3">
                {[
                  { n: "01", t: "Create or join a draft" },
                  { n: "02", t: "Set team captains" },
                  { n: "03", t: "Admin starts the draft" },
                  { n: "04", t: "Captains pick & ban heroes" },
                  { n: "05", t: "Good luck, have fun" },
                ].map((s) => (
                  <div key={s.n} className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-dota-gold font-bold shrink-0 w-5">{s.n}</span>
                    <span className="text-[11px] text-white/60 font-medium tracking-wide">{s.t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* History */}
            {history.length > 0 && (
              <div className="border border-dota-line rounded-sm bg-dota-panel overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-dota-line bg-black/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-dota-gold/40" />
                  <span className="font-display text-[11px] font-black uppercase tracking-[0.25em] text-white/70">History</span>
                </div>
                <div className="flex flex-col divide-y divide-dota-line">
                  {history.slice(0, 5).map((h) => (
                    <button
                      key={h.id}
                      onClick={() => router.push(`/draft/${h.id}`)}
                      className="px-4 py-3 text-left hover:bg-dota-surface/40 transition-colors group"
                    >
                      <p className="text-xs font-bold text-dota-warm/60 group-hover:text-dota-warm transition-colors mb-1.5 truncate">{h.name}</p>
                      <div className="flex gap-3 text-[9px]">
                        <span className="text-dota-radiant">R: {h.radiant.filter(Boolean).slice(0, 2).join(", ") || "—"}</span>
                        <span className="text-dota-dire">D: {h.dire.filter(Boolean).slice(0, 2).join(", ") || "—"}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
