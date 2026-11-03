"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { THEME_CHANGE_EVENT, THEME_STORAGE_KEY } from "@/lib/theme";

function subscribe(onChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onChange);
}

function isDarkTheme() {
  return document.documentElement.classList.contains("dark");
}

function isDarkThemeOnServer() {
  return false;
}

export function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, isDarkTheme, isDarkThemeOnServer);

  function toggleTheme() {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // The theme still applies for this visit when storage is unavailable.
    }
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="flex size-9 items-center justify-center rounded-md border border-line text-ink-secondary transition-colors hover:bg-line hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {isDark ? <Sun aria-hidden className="size-4" /> : <Moon aria-hidden className="size-4" />}
    </button>
  );
}
