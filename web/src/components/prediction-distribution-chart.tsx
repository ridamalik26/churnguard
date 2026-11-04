"use client";

import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const POINT_COUNT = 51;

function gaussian(x: number, mean: number, std: number) {
  return Math.exp(-((x - mean) ** 2) / (2 * std * std));
}

// Illustrative bell-curve shaped densities, not derived from the model's actual predictions.
const DATA = Array.from({ length: POINT_COUNT }, (_, i) => {
  const probability = i / (POINT_COUNT - 1);
  return {
    probability: probability.toFixed(2),
    retained: Number(gaussian(probability, 0.22, 0.14).toFixed(3)),
    churned: Number(gaussian(probability, 0.68, 0.16).toFixed(3)),
  };
});

type TooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ name?: string; value?: number; color?: string }>;
  label?: string;
};

function DensityTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-card border border-border bg-surface px-3 py-2 text-xs shadow-card">
      <p className="font-medium text-text-primary">Probability {label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="mt-1 flex items-center gap-1.5 text-text-secondary">
          <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden />
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export function PredictionDistributionChart() {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={DATA} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="probability"
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
            interval={9}
          />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 11 }} width={28} />
          <Tooltip content={<DensityTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Area
            type="monotone"
            dataKey="churned"
            name="Churned"
            stroke="#EF4444"
            fill="#EF4444"
            fillOpacity={0.3}
            strokeWidth={2}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="retained"
            name="Retained"
            stroke="#3B82F6"
            fill="#3B82F6"
            fillOpacity={0.3}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
