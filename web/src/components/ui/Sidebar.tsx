"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HostLabel } from "@/components/ui/HostLabel";
import { NAV_SECTIONS } from "@/components/ui/nav-items";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen overflow-y-auto bg-sidebar-bg md:flex md:w-[240px] md:flex-shrink-0 md:flex-col">
      <div className="flex items-center gap-2 px-5 pt-6 pb-5">
        <span className="size-4 shrink-0 rounded-[4px] bg-accent" aria-hidden />
        <p className="text-[16px] font-bold tracking-tight text-white">ChurnGuard</p>
      </div>
      <div className="mx-5 border-t border-white/10" />

      <nav aria-label="Main" className="mt-4 flex flex-1 flex-col gap-5 px-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="flex flex-col gap-1">
            <p className="px-3 pb-1 text-[10px] font-medium tracking-widest text-sidebar-muted uppercase">{section.label}</p>
            {section.items.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={clsx(
                    "flex h-9 items-center gap-2 rounded-r-button border-l-2 px-3 transition-colors",
                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
                    active
                      ? "border-l-sidebar-active-border bg-sidebar-active-bg text-sidebar-active-text"
                      : "border-l-transparent text-sidebar-text hover:text-white",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-3 px-3 py-4">
        <ThemeToggle />
        <p className="px-1 text-[11px] text-sidebar-muted">
          <HostLabel />
        </p>
      </div>
    </aside>
  );
}
