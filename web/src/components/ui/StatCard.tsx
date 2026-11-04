import clsx from "clsx";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { ComponentType } from "react";

type Tone = "accent" | "high" | "medium" | "low";

type StatCardProps = {
  label: string;
  value: string;
  subtitle: string;
  icon?: ComponentType<{ className?: string }>;
  tone?: Tone;
  leftBorderTone?: "high" | "medium" | "low";
  trend?: number;
};

const TONE_STYLES: Record<Tone, string> = {
  accent: "bg-accent-light text-accent",
  high: "bg-danger-tint text-danger",
  medium: "bg-warning-tint text-warning",
  low: "bg-success-tint text-success",
};

const LEFT_BORDER_STYLES: Record<"high" | "medium" | "low", string> = {
  high: "border-l-4 border-l-danger",
  medium: "border-l-4 border-l-warning",
  low: "border-l-4 border-l-success",
};

export function StatCard({ label, value, subtitle, icon: Icon, tone = "accent", leftBorderTone, trend }: StatCardProps) {
  const trendUp = typeof trend === "number" && trend >= 0;
  return (
    <div
      className={clsx(
        "flex flex-col gap-3 rounded-card border border-border bg-surface p-6 shadow-card",
        leftBorderTone && LEFT_BORDER_STYLES[leftBorderTone],
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-text-secondary">{label}</p>
        {Icon && (
          <span className={clsx("flex size-8 shrink-0 items-center justify-center rounded-button", TONE_STYLES[tone])}>
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className="text-[32px] leading-none font-bold tracking-tight text-text-primary">{value}</p>
      <div className="flex items-center gap-2">
        <p className="text-xs text-text-secondary">{subtitle}</p>
        {typeof trend === "number" && (
          <span className={clsx("flex items-center gap-0.5 text-xs font-medium", trendUp ? "text-success" : "text-danger")}>
            {trendUp ? <ArrowUp aria-hidden className="size-3" /> : <ArrowDown aria-hidden className="size-3" />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}
