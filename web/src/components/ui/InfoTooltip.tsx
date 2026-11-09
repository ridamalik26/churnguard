"use client";

import { Info } from "lucide-react";
import { useId } from "react";

export function InfoTooltip({ text, className }: { text: string; className?: string }) {
  const id = useId();

  return (
    <span className={`group relative inline-flex ${className ?? ""}`}>
      <button
        type="button"
        aria-describedby={id}
        className="flex size-4 items-center justify-center rounded-full text-text-muted transition-colors hover:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Info aria-hidden className="size-3.5" />
      </button>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-card border border-border bg-surface p-2 text-xs text-text-secondary opacity-0 shadow-card transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
