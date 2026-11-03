"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLinks } from "@/components/nav-links";
import { ThemeToggle } from "@/components/theme-toggle";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-surface md:hidden">
      <div className="flex items-center justify-between py-2 pr-2 pl-5">
        <p className="text-[18px] font-bold tracking-tight">ChurnGuard</p>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className="flex size-9 items-center justify-center rounded-md text-ink-secondary transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
        </button>
      </div>
      {open && (
        <div id="mobile-menu" className="border-t border-line pt-3 pb-2">
          <NavLinks onNavigate={() => setOpen(false)} />
          <div className="mt-2 px-3">
            <ThemeToggle />
          </div>
        </div>
      )}
    </header>
  );
}
