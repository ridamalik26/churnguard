"use client";

import { useReducedMotion } from "framer-motion";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CalibrationEntry } from "@/lib/api";

const METHODS = ["uncalibrated", "isotonic", "sigmoid"] as const;

const METHOD_LABELS: Record<(typeof METHODS)[number], string> = {
  uncalibrated: "Uncalibrated",
  isotonic: "Isotonic",
  sigmoid: "Sigmoid",
};

const METHOD_COLORS: Record<(typeof METHODS)[number], string> = {
  uncalibrated: "var(--text-muted)",
  isotonic: "var(--accent)",
  sigmoid: "var(--teal)",
};

const REFERENCE_DATA = [
  { mean_predicted: 0, fraction_positive: 0 },
  { mean_predicted: 1, fraction_positive: 1 },
];

type TooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ name?: string; value?: number; color?: string }>;
};

function CalibrationTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-card border border-border bg-surface px-3 py-2 text-xs shadow-card">
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-1.5 text-text-secondary">
          <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden />
          {entry.name}: {typeof entry.value === "number" ? entry.value.toFixed(3) : entry.value}
        </p>
      ))}
    </div>
  );
}

export function CalibrationChart({ calibration }: { calibration: CalibrationEntry }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart margin={{ top: 8, right: 8, bottom: 20, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="mean_predicted"
            type="number"
            domain={[0, 1]}
            allowDuplicatedCategory={false}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
            label={{ value: "Mean predicted probability", position: "insideBottom", offset: -8, fontSize: 11, fill: "var(--text-secondary)" }}
          />
          <YAxis
            dataKey="fraction_positive"
            type="number"
            domain={[0, 1]}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
            width={32}
          />
          <Tooltip content={<CalibrationTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line
            data={REFERENCE_DATA}
            name="Perfectly calibrated"
            dataKey="fraction_positive"
            stroke="var(--border)"
            strokeDasharray="5 5"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
          {METHODS.map((method) => (
            <Line
              key={method}
              data={calibration.curves[method]}
              name={METHOD_LABELS[method]}
              dataKey="fraction_positive"
              stroke={METHOD_COLORS[method]}
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive={!reduceMotion}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
