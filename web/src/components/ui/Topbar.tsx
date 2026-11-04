"use client";

import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/components/ui/nav-items";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

function pageTitle(pathname: string) {
  const match = NAV_ITEMS.find((item) => (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)));
  if (match) return match.label;
  if (pathname.startsWith("/customers/")) return "Customer Profile";
  return "ChurnGuard";
}

export function Topbar() {
  const pathname = usePathname();

  return (
    <header className="hidden h-14 shrink-0 items-center justify-between border-b border-border bg-bg px-10 md:flex">
      <p className="font-semibold text-text-primary">{pageTitle(pathname)}</p>
      <ThemeToggle />
    </header>
  );
}
