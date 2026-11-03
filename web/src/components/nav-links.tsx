"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "At-Risk Customers" },
  { href: "/metrics", label: "Model Metrics" },
] as const;

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {LINKS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "border-l-2 py-1.5 pr-4 pl-[18px] transition-colors",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent",
              active ? "border-accent font-medium text-accent" : "border-transparent text-ink-secondary hover:text-ink",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
