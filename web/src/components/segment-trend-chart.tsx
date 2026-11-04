"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

// Illustrative simulated series, not derived from live predictions.
const HIGH_RISK = [24.1, 25.6, 23.8, 26.3, 27.1, 28.4];
const MEDIUM_RISK = [12.4, 13.1, 12.8, 13.6, 14.0, 13.5];
const LOW_RISK = [3.2, 3.0, 3.4, 2.9, 3.1, 2.8];

const DATA = MONTHS.map((month, index) => ({
  month,
  high: HIGH_RISK[index],
  medium: MEDIUM_RISK[index],
  low: LOW_RISK[index],
}));

type TooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ name?: string; value?: number; color?: string }>;
  label?: string;
};

function TrendTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-card border border-border bg-surface px-3 py-2 text-xs shadow-card">
      <p className="font-medium text-text-primary">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="mt-1 flex items-center gap-1.5 text-text-secondary">
          <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden />
          {entry.name}: {entry.value}%
        </p>
      ))}
    </div>
  );
}

export function SegmentTrendChart() {
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={DATA} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: "var(--border)" }} tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 11 }} width={32} unit="%" />
          <Tooltip content={<TrendTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="high" name="High Risk" stroke="#EF4444" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="medium" name="Medium Risk" stroke="#F59E0B" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="low" name="Low Risk" stroke="#22C55E" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
