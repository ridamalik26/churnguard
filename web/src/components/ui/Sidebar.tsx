"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/components/ui/nav-items";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-[220px] shrink-0 flex-col border-r border-border bg-surface md:flex">
      <p className="px-5 pt-6 pb-8 text-[18px] font-bold tracking-tight text-text-primary">ChurnGuard</p>
      <nav aria-label="Main" className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "flex items-center gap-2.5 border-l-2 py-1.5 pr-4 pl-[15px] transition-colors",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
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
      <div className="mt-auto px-3 py-4">
        <ThemeToggle />
      </div>
    </aside>
  );
}
