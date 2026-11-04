"use client";

import clsx from "clsx";
import { Moon, Sun } from "lucide-react";
import { setDarkTheme, useIsDarkTheme } from "@/lib/theme";

export function ThemeToggle({ variant = "default" }: { variant?: "default" | "sidebar" }) {
  const isDark = useIsDarkTheme();
  const onSidebar = variant === "sidebar";

  return (
    <div
      className={clsx(
        "inline-flex w-full rounded-full border p-1",
        onSidebar ? "border-white/10" : "border-border",
      )}
    >
      <button
        type="button"
        onClick={() => setDarkTheme(false)}
        aria-pressed={!isDark}
        aria-label="Light theme"
        className={clsx(
          "flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 transition-colors",
          !isDark
            ? "bg-accent text-on-accent"
            : onSidebar
              ? "text-sidebar-text hover:text-white"
              : "text-text-secondary hover:text-text-primary",
        )}
      >
        <Sun aria-hidden className="size-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setDarkTheme(true)}
        aria-pressed={isDark}
        aria-label="Dark theme"
        className={clsx(
          "flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 transition-colors",
          isDark
            ? "bg-accent text-on-accent"
            : onSidebar
              ? "text-sidebar-text hover:text-white"
              : "text-text-secondary hover:text-text-primary",
        )}
      >
        <Moon aria-hidden className="size-3.5" />
      </button>
    </div>
  );
}
