"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

const DEFAULT_DURATION_MS = 900;

function defaultFormat(value: number) {
  return Math.round(value).toLocaleString();
}

export function AnimatedNumber({
  value,
  duration = DEFAULT_DURATION_MS,
  format = defaultFormat,
}: {
  value: number;
  duration?: number;
  format?: (value: number) => string;
}) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (reduceMotion) return;
    let frame = 0;
    let startTime: number | null = null;
    function step(timestamp: number) {
      if (startTime === null) startTime = timestamp;
      const progress = Math.min(1, (timestamp - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) frame = requestAnimationFrame(step);
    }
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduceMotion]);

  return <>{format(reduceMotion ? value : display)}</>;
}
