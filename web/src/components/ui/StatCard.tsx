import clsx from "clsx";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { ComponentType } from "react";

type StatCardProps = {
  label: string;
  value: string;
  subtitle: string;
  icon?: ComponentType<{ className?: string }>;
  trend?: number;
};

export function StatCard({ label, value, subtitle, icon: Icon, trend }: StatCardProps) {
  const trendUp = typeof trend === "number" && trend >= 0;
  return (
    <div className="flex flex-col gap-3 rounded-card bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between">
        <p className="text-text-secondary">{label}</p>
        {Icon && (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-button bg-accent-light text-accent">
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className="text-[28px] leading-none font-semibold tracking-tight text-text-primary">{value}</p>
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
