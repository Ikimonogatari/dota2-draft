"use client";

import { useState, useEffect, useRef } from "react";

export function useCountdown(step: number, duration: number, enabled: boolean) {
  const [timeLeft, setTimeLeft] = useState(duration);
  const firedRef = useRef(false);

  useEffect(() => {
    setTimeLeft(duration);
    firedRef.current = false;
  }, [step, duration]);

  useEffect(() => {
    if (!enabled) return;

    const id = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1));
    }, 1000);

    return () => clearInterval(id);
  }, [step, enabled]);

  return timeLeft;
}
