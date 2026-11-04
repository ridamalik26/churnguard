"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { NAV_ITEMS } from "@/components/ui/nav-items";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function TopNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface md:hidden">
      <div className="flex items-center justify-between py-2 pr-2 pl-5">
        <p className="text-[18px] font-bold tracking-tight text-text-primary">ChurnGuard</p>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className="flex size-9 items-center justify-center rounded-button text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {open ? <X aria-hidden className="size-5" /> : <Menu aria-hidden className="size-5" />}
        </button>
      </div>
      {open && (
        <div id="mobile-menu" className="border-t border-border pt-3 pb-2">
          <nav aria-label="Main" className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "flex items-center gap-2.5 border-l-2 py-1.5 pr-4 pl-[18px] transition-colors",
                    active
                      ? "border-accent bg-accent-light font-medium text-accent"
                      : "border-transparent text-text-secondary hover:text-text-primary",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-2 px-3">
            <ThemeToggle />
          </div>
        </div>
      )}
    </header>
  );
}
