import clsx from "clsx";
import type { RiskLevel } from "@/lib/api";

const BADGE_STYLES: Record<RiskLevel, string> = {
  high: "bg-risk-high-tint text-risk-high",
  medium: "bg-risk-medium-tint text-risk-medium",
  low: "bg-risk-low-tint text-risk-low",
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={clsx("inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize", BADGE_STYLES[level])}>
      {level}
    </span>
  );
}
