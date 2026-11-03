"use client";

import clsx from "clsx";
import { ChartColumn, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "At-Risk Customers", icon: Users },
  { href: "/metrics", label: "Model Metrics", icon: ChartColumn },
] as const;

export function NavLinks({ layout }: { layout: "vertical" | "horizontal" }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className={clsx("flex gap-1", layout === "vertical" ? "flex-col" : "flex-row")}>
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              active ? "bg-accent text-accent-ink" : "text-ink-secondary hover:bg-line hover:text-ink",
            )}
          >
            <Icon aria-hidden className="size-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
