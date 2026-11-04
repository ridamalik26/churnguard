import clsx from "clsx";
import type { RiskLevel } from "@/lib/api";

const BADGE_STYLES: Record<RiskLevel, string> = {
  high: "bg-danger-tint text-danger",
  medium: "bg-warning-tint text-warning",
  low: "bg-success-tint text-success",
};

export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className={clsx("inline-flex rounded-badge px-2 py-0.5 text-xs font-medium capitalize", BADGE_STYLES[level])}>
      {level}
    </span>
  );
}
