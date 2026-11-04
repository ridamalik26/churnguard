"use client";

import clsx from "clsx";
import { Moon, Sun } from "lucide-react";
import { setDarkTheme, useIsDarkTheme } from "@/lib/theme";

export function ThemeToggle() {
  const isDark = useIsDarkTheme();

  return (
    <button
      type="button"
      onClick={() => setDarkTheme(!isDark)}
      aria-pressed={isDark}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="relative h-8 w-20 shrink-0 rounded-full bg-toggle-track transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span
        className={clsx(
          "absolute top-1 size-6 rounded-full bg-white shadow transition-all duration-200",
          isDark ? "left-[52px]" : "left-1",
        )}
        aria-hidden
      />
      <Sun
        aria-hidden
        className={clsx(
          "absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 transition-colors",
          !isDark ? "text-[#1E2130]" : "text-[#6B7280]",
        )}
      />
      <Moon
        aria-hidden
        className={clsx(
          "absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 transition-colors",
          isDark ? "text-[#1E2130]" : "text-[#6B7280]",
        )}
      />
    </button>
  );
}
