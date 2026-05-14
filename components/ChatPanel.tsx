"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { heroImageUrl } from "@/lib/heroes";
import type { ChatMessage } from "@/lib/types";

interface ChatPanelProps {
  messages: ChatMessage[];
}

export default function ChatPanel({ messages }: ChatPanelProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-dota-muted text-[11px] font-display font-black uppercase tracking-[0.3em] opacity-40">
        Санал болон үйл явдлууд энд харагдана
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 overflow-y-auto h-full scrollbar-slim px-2">
      {messages.map((msg) => {
        if (msg.type === "system") {
          return (
            <div key={msg.id} className="flex items-center gap-4 py-2">
              <div className="flex-1 h-px bg-linear-to-r from-transparent to-white/10" />
              <span className="text-[10px] text-dota-muted font-display font-black uppercase tracking-[0.2em] shrink-0">{msg.text}</span>
              <div className="flex-1 h-px bg-linear-to-l from-transparent to-white/10" />
            </div>
          );
        }

        return (
          <div key={msg.id} className="flex items-center gap-4 bg-white/3 border border-white/5 rounded-sm px-4 py-2 animate-pop-in">
            {msg.heroKey && (
              <div className="relative w-14 aspect-video shrink-0 rounded-sm overflow-hidden border border-white/10 shadow-lg">
                <Image
                  src={heroImageUrl(msg.heroKey)}
                  alt={msg.heroName ?? ""}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[10px] text-dota-muted font-display font-bold uppercase tracking-wider truncate mb-1">
                <span className="text-white font-black">{msg.authorName}</span> санал болгов
              </span>
              <span className="text-xs font-display font-black text-dota-gold truncate uppercase tracking-widest">{msg.heroName}</span>
            </div>
            <span className="ml-auto text-[9px] text-dota-muted font-mono shrink-0 opacity-60">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
