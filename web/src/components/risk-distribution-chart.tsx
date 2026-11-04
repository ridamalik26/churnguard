"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { RiskLevel } from "@/lib/api";

const SEGMENT_ORDER: { level: RiskLevel; label: string; color: string }[] = [
  { level: "high", label: "High risk", color: "var(--danger)" },
  { level: "medium", label: "Medium risk", color: "var(--warning)" },
  { level: "low", label: "Low risk", color: "var(--success)" },
];

type TooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: { label: string; count: number } }>;
  total: number;
};

function DistributionTooltip({ active, payload, total }: TooltipProps) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="rounded-card border border-border bg-surface px-3 py-2 text-xs shadow-card">
      <p className="font-medium">{row.label}</p>
      <p className="mt-1 text-text-secondary">
        {row.count} of {total} customers
      </p>
    </div>
  );
}

export function RiskDistributionChart({ counts }: { counts: Record<RiskLevel, number> }) {
  const total = counts.high + counts.medium + counts.low;
  const segments = SEGMENT_ORDER.map(({ level, label, color }) => ({
    label,
    color,
    count: counts[level],
  })).filter((segment) => segment.count > 0);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="h-[180px] w-full shrink-0 sm:w-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segments}
              dataKey="count"
              nameKey="label"
              innerRadius="62%"
              outerRadius="100%"
              paddingAngle={segments.length > 1 ? 2 : 0}
              stroke="var(--surface)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {segments.map((segment) => (
                <Cell key={segment.label} fill={segment.color} />
              ))}
            </Pie>
            <Tooltip content={<DistributionTooltip total={total} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex flex-col gap-2.5">
        {SEGMENT_ORDER.map(({ level, label, color }) => (
          <li key={level} className="flex items-center gap-2.5 text-sm">
            <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
            <span className="text-text-secondary">{label}</span>
            <span className="font-medium tabular-nums text-text-primary">{counts[level]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
