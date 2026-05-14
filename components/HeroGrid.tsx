"use client";

import { useState, useMemo } from "react";
import { Hero, HEROES, Attribute } from "@/lib/heroes";
import HeroCard from "./HeroCard";

interface HeroGridProps {
  bannedIds: Set<number>;
  pickedIds: Set<number>;
  disabled: boolean;
  onSelect: (hero: Hero) => void;
}

const ATTRIBUTES: { value: Attribute | "all"; label: string; color: string }[] = [
  { value: "all", label: "All", color: "text-white" },
  { value: "strength", label: "STR", color: "text-red-400" },
  { value: "agility", label: "AGI", color: "text-green-400" },
  { value: "intelligence", label: "INT", color: "text-blue-400" },
  { value: "universal", label: "UNI", color: "text-purple-400" },
];

export default function HeroGrid({ bannedIds, pickedIds, disabled, onSelect }: HeroGridProps) {
  const [search, setSearch] = useState("");
  const [attrFilter, setAttrFilter] = useState<Attribute | "all">("all");

  const filtered = useMemo(() => {
    return HEROES.filter((h) => {
      const matchSearch = h.displayName.toLowerCase().includes(search.toLowerCase());
      const matchAttr = attrFilter === "all" || h.attribute === attrFilter;
      return matchSearch && matchAttr;
    });
  }, [search, attrFilter]);

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search hero..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-black/60 border border-gray-700 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-600 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {/* Attribute filter */}
      <div className="flex gap-1">
        {ATTRIBUTES.map((a) => (
          <button
            key={a.value}
            onClick={() => setAttrFilter(a.value)}
            className={[
              "flex-1 py-1 rounded text-[11px] font-bold uppercase tracking-wider border transition-all",
              attrFilter === a.value
                ? `${a.color} border-current bg-white/5`
                : "text-gray-600 border-gray-800 hover:text-gray-400",
            ].join(" ")}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Hero count */}
      <div className="text-[10px] text-gray-600 text-right">
        {filtered.length} heroes
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1 scrollbar-thin">
        <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6 lg:grid-cols-7">
          {filtered.map((hero) => (
            <HeroCard
              key={hero.id}
              hero={hero}
              banned={bannedIds.has(hero.id)}
              picked={pickedIds.has(hero.id)}
              disabled={disabled}
              onClick={onSelect}
            />
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="flex items-center justify-center h-24 text-gray-600 text-sm">
            No heroes found
          </div>
        )}
      </div>
    </div>
  );
}
