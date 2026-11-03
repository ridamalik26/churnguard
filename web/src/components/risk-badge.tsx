import clsx from "clsx";
import type { RiskLevel } from "@/lib/api";

const BADGE_STYLES: Record<RiskLevel, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-100",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-100",
  low: "bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-100",
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={clsx("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", BADGE_STYLES[level])}>
      {level}
    </span>
  );
}
