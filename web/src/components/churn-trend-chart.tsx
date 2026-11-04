"use client";

import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Illustrative simulated series, not derived from live predictions. Values stay within a
// realistic 15-25% band to suggest typical month-to-month movement for this chart's purpose.
const HIGH_RISK_RATE = [18.2, 19.1, 17.8, 20.3, 21.5, 19.8, 22.1, 23.4, 21.9, 20.6, 22.8, 24.1];
const OVERALL_PROBABILITY = [16.5, 17.2, 16.8, 18.1, 19.0, 17.9, 19.5, 20.2, 19.1, 18.4, 19.8, 20.9];

const DATA = MONTHS.map((month, index) => ({
  month,
  highRiskRate: HIGH_RISK_RATE[index],
  overallProbability: OVERALL_PROBABILITY[index],
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

export function ChurnTrendChart() {
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={DATA} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="month" tickLine={false} axisLine={{ stroke: "var(--border)" }} tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
          <YAxis
            domain={[10, 30]}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
            width={32}
            unit="%"
          />
          <Tooltip content={<TrendTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="highRiskRate" name="High Risk Rate" stroke="#EF4444" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line
            type="monotone"
            dataKey="overallProbability"
            name="Overall Churn Probability"
            stroke="#7C6EF5"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
