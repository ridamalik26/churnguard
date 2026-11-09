"use client";

import { useReducedMotion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ProbabilityBucket } from "@/lib/api";

type TooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: ProbabilityBucket }>;
};

function BucketTooltip({ active, payload }: TooltipProps) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="rounded-card border border-border bg-surface px-3 py-2 text-xs shadow-card">
      <p className="font-medium">Churn probability {row.range}</p>
      <p className="mt-1 text-text-secondary">{row.count} customers</p>
    </div>
  );
}

export function ProbabilityDistributionChart({ buckets }: { buckets: ProbabilityBucket[] }) {
  const reduceMotion = useReducedMotion();
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={buckets} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="range"
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
            interval={1}
          />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 11 }} width={36} />
          <Tooltip cursor={{ fill: "var(--accent-light)" }} content={<BucketTooltip />} />
          <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} isAnimationActive={!reduceMotion} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
