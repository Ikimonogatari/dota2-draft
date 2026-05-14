"use client";

import Image from "next/image";
import { Hero, heroImageUrl } from "@/lib/heroes";
import { useState } from "react";

interface HeroCardProps {
  hero: Hero;
  disabled?: boolean;
  banned?: boolean;
  picked?: boolean;
  onClick?: (hero: Hero) => void;
}

const attributeColors: Record<string, string> = {
  strength: "border-red-600",
  agility: "border-green-500",
  intelligence: "border-blue-500",
  universal: "border-purple-500",
};

export default function HeroCard({ hero, disabled, banned, picked, onClick }: HeroCardProps) {
  const [imgError, setImgError] = useState(false);

  const isUnavailable = banned || picked;

  return (
    <button
      onClick={() => !disabled && !isUnavailable && onClick?.(hero)}
      disabled={disabled || isUnavailable}
      className={[
        "relative group flex flex-col items-center overflow-hidden rounded transition-all duration-200 select-none",
        "border-2",
        attributeColors[hero.attribute],
        isUnavailable
          ? "opacity-30 cursor-not-allowed grayscale"
          : disabled
          ? "opacity-50 cursor-not-allowed"
          : "cursor-pointer hover:scale-105 hover:brightness-125 hover:z-10 hover:shadow-[0_0_16px_rgba(200,162,67,0.6)]",
      ].join(" ")}
    >
      {imgError ? (
        <div className="w-full aspect-[3/4] bg-gray-800 flex items-center justify-center text-gray-500 text-xs">
          {hero.displayName}
        </div>
      ) : (
        <Image
          src={heroImageUrl(hero.name)}
          alt={hero.displayName}
          width={128}
          height={72}
          className="w-full object-cover"
          onError={() => setImgError(true)}
          unoptimized
        />
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-1 py-0.5">
        <p className="text-[9px] font-semibold text-white leading-tight text-center truncate">
          {hero.displayName}
        </p>
      </div>
      {banned && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-0.5 bg-red-500 rotate-45 absolute" />
          <div className="w-full h-0.5 bg-red-500 -rotate-45 absolute" />
        </div>
      )}
    </button>
  );
}
