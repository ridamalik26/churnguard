"use client";

import { useReducedMotion } from "framer-motion";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ThresholdCurvePoint } from "@/lib/api";

const CURRENCY = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

type TooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: ThresholdCurvePoint }>;
};

function SavingsTooltip({ active, payload }: TooltipProps) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="rounded-card border border-border bg-surface px-3 py-2 text-xs shadow-card">
      <p className="font-medium text-text-primary">Threshold {row.threshold.toFixed(2)}</p>
      <p className="mt-1 text-text-secondary">Expected savings {CURRENCY.format(row.expected_savings)}</p>
    </div>
  );
}

export function ThresholdSavingsChart({
  curve,
  f1Threshold,
  businessThreshold,
}: {
  curve: ThresholdCurvePoint[];
  f1Threshold: number;
  businessThreshold: number;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={curve} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="threshold"
            type="number"
            domain={[0.05, 0.95]}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
            width={56}
            tickFormatter={(value: number) => CURRENCY.format(value)}
          />
          <Tooltip content={<SavingsTooltip />} />
          <ReferenceLine
            x={f1Threshold}
            stroke="var(--warning)"
            strokeDasharray="4 4"
            label={{ value: "F1 threshold", position: "top", fontSize: 11, fill: "var(--warning)" }}
          />
          <ReferenceLine
            x={businessThreshold}
            stroke="var(--accent)"
            strokeDasharray="4 4"
            label={{ value: "Business threshold", position: "top", fontSize: 11, fill: "var(--accent)" }}
          />
          <Line
            type="monotone"
            dataKey="expected_savings"
            name="Expected savings"
            stroke="var(--teal)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={!reduceMotion}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
