"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useCallback } from "react";
import { heroImageUrl } from "@/lib/heroes";
import type { ChatMessage } from "@/lib/types";

type Scope = "all" | "radiant" | "dire";

interface ChatPanelProps {
  messages: ChatMessage[];
  /** Multiplayer mode: session id to POST to */
  sessionId?: string;
  /** Practice / local mode: called instead of API */
  onSend?: (text: string, scope: Scope) => void;
  myTeam: "radiant" | "dire" | "spectator";
  disabled?: boolean;
}

async function postChat(sessionId: string, text: string, scope: Scope) {
  await fetch(`/api/sessions/${sessionId}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "chat", payload: { text, scope } }),
  });
}

const SCOPE_ACTIVE: Record<Scope, string> = {
  all: "bg-dota-gold/10 border-dota-gold/50 text-dota-gold",
  radiant: "bg-dota-radiant/10 border-dota-radiant/50 text-dota-radiant",
  dire: "bg-dota-dire/10 border-dota-dire/50 text-dota-dire",
};

const SCOPE_BADGE: Record<Scope, string> = {
  all: "bg-dota-gold/20 text-dota-gold",
  radiant: "bg-dota-radiant/20 text-dota-radiant",
  dire: "bg-dota-dire/20 text-dota-dire",
};

const SCOPE_NAME_COLOR: Record<Scope, string> = {
  all: "text-dota-gold",
  radiant: "text-dota-radiant",
  dire: "text-dota-dire",
};

export default function ChatPanel({ messages, sessionId, onSend, myTeam, disabled }: ChatPanelProps) {
  const teamScope: Scope | null = myTeam === "spectator" ? null : myTeam;
  const [tab, setTab] = useState<Scope>("all");
  const [sendScope, setSendScope] = useState<Scope>("all");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const visible = messages.filter((m) => {
    if (tab === "all") {
      if (m.type === "system") return true;
      if (m.scope === "all") return true;
      if (m.scope === myTeam) return true;
      return false;
    }
    return m.scope === tab;
  });

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || disabled) return;
    setSending(true);
    setInput("");
    if (onSend) {
      onSend(text, sendScope);
    } else if (sessionId) {
      await postChat(sessionId, text, sendScope);
    }
    setSending(false);
    inputRef.current?.focus();
  }, [input, sending, disabled, sessionId, onSend, sendScope]);

  const handleKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const tabs: Scope[] = teamScope ? ["all", teamScope] : ["all"];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Tab bar */}
      <div className="shrink-0 flex items-center gap-1 px-3 pt-2 pb-1.5 border-b border-white/10">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "px-2.5 py-1 rounded-sm text-[9px] font-display font-black tracking-[0.15em] uppercase border transition-all duration-200",
              tab === t ? SCOPE_ACTIVE[t] : "border-white/10 text-white/30 hover:text-white/60 hover:border-white/20",
            ].join(" ")}
          >
            {t === "all" ? "All Chat" : `${t === "radiant" ? "Radiant" : "Dire"} Team`}
          </button>
        ))}
        <div className="flex-1" />
        <span className="text-[8px] text-white/20 font-display font-black tracking-widest uppercase">{visible.length}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 scrollbar-slim px-3 py-2 flex flex-col gap-1.5">
        {visible.length === 0 && (
          <div className="flex items-center justify-center h-full text-white/20 text-[10px] font-display font-black uppercase tracking-[0.2em] text-center px-4">
            No messages yet
          </div>
        )}
        {visible.map((msg) => {
          if (msg.type === "system") {
            return (
              <div key={msg.id} className="flex items-center gap-3 py-1 shrink-0">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-[9px] text-white/30 font-display font-black uppercase tracking-[0.15em] shrink-0">{msg.text}</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>
            );
          }

          if (msg.type === "mention") {
            return (
              <div key={msg.id} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-sm px-2.5 py-1.5 animate-pop-in shrink-0">
                {msg.heroKey && (
                  <div className="relative w-10 aspect-video shrink-0 rounded-sm overflow-hidden border border-white/10">
                    <Image src={heroImageUrl(msg.heroKey)} alt={msg.heroName ?? ""} fill className="object-cover" unoptimized />
                  </div>
                )}
                <div className="flex flex-col leading-tight min-w-0 flex-1">
                  <span className="text-[9px] text-white/50 font-display truncate">
                    <span className="text-white font-black">{msg.authorName}</span> suggests
                  </span>
                  <span className="text-[9px] font-display font-black text-dota-gold truncate uppercase tracking-wider">{msg.heroName}</span>
                </div>
                <span className={`shrink-0 px-1.5 py-0.5 rounded-sm text-[7px] font-display font-black uppercase tracking-widest ${SCOPE_BADGE[msg.scope]}`}>
                  {msg.scope === "all" ? "ALL" : msg.scope.toUpperCase()}
                </span>
              </div>
            );
          }

          // chat message
          return (
            <div key={msg.id} className="flex items-start gap-2 shrink-0 group animate-fade-in-up">
              <div className="flex flex-col leading-tight min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`text-[8px] font-display font-black tracking-wide ${SCOPE_NAME_COLOR[msg.scope]}`}>
                    {msg.authorName}
                  </span>
                  <span className={`px-1 py-px rounded-sm text-[7px] font-display font-black uppercase tracking-widest ${SCOPE_BADGE[msg.scope]}`}>
                    {msg.scope === "all" ? "ALL" : msg.scope.toUpperCase()}
                  </span>
                  <span className="ml-auto text-[7px] text-white/20 font-mono shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-[11px] text-white/80 leading-snug break-words">{msg.text}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      {!disabled && myTeam !== "spectator" && (
        <div className="shrink-0 border-t border-white/10 px-3 py-2 space-y-1.5">
          <div className="flex gap-1">
            {(["all", ...(teamScope ? [teamScope] : [])] as Scope[]).map((s) => (
              <button
                key={s}
                onClick={() => setSendScope(s)}
                className={[
                  "px-2 py-0.5 rounded-sm text-[8px] font-display font-black tracking-[0.15em] uppercase border transition-all",
                  sendScope === s ? SCOPE_ACTIVE[s] : "border-white/10 text-white/25 hover:text-white/50",
                ].join(" ")}
              >
                {s === "all" ? "All" : `${s === "radiant" ? "Radiant" : "Dire"} Team`}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              maxLength={200}
              placeholder={sendScope === "all" ? "Message all..." : `Message ${sendScope} team...`}
              className="flex-1 bg-white/5 border border-white/10 rounded-sm px-2.5 py-1.5 text-[11px] text-white placeholder-white/20 focus:outline-none focus:border-dota-gold/40 focus:ring-1 focus:ring-dota-gold/10 transition-all"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="px-3 py-1.5 bg-dota-gold/20 hover:bg-dota-gold/30 border border-dota-gold/30 text-dota-gold rounded-sm text-[9px] font-display font-black disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              ↵
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
