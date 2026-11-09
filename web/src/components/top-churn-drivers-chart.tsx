"use client";

import { useReducedMotion } from "framer-motion";
import { Bar, BarChart, ResponsiveContainer, Text, Tooltip, XAxis, YAxis } from "recharts";
import type { GlobalShapFeature } from "@/lib/api";

const ROW_HEIGHT = 56;
const LABEL_WIDTH = 160;
const BAR_THICKNESS = 14;

type TickProps = {
  x?: number | string;
  y?: number | string;
  payload?: { value?: string };
};

function FeatureTick({ x, y, payload }: TickProps) {
  return (
    <Text
      x={Number(x)}
      y={Number(y)}
      dx={-8}
      width={LABEL_WIDTH - 16}
      textAnchor="end"
      verticalAnchor="middle"
      fill="var(--text-primary)"
      fontSize={12}
    >
      {payload?.value}
    </Text>
  );
}

type TooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: GlobalShapFeature }>;
};

function FeatureTooltip({ active, payload }: TooltipProps) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="max-w-56 rounded-card border border-border bg-surface px-3 py-2 text-xs shadow-card">
      <p>{row.label}</p>
      <p className="mt-1 text-text-secondary">{(row.share * 100).toFixed(1)}% of total SHAP impact</p>
    </div>
  );
}

export function TopChurnDriversChart({ features }: { features: GlobalShapFeature[] }) {
  const reduceMotion = useReducedMotion();

  return (
    <figure>
      <div className="w-full" style={{ height: ROW_HEIGHT * features.length }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={features} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis
              type="category"
              dataKey="label"
              width={LABEL_WIDTH}
              interval={0}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              tick={FeatureTick}
            />
            <Tooltip cursor={{ fill: "var(--accent-light)" }} content={<FeatureTooltip />} />
            <Bar dataKey="importance" fill="var(--accent)" barSize={BAR_THICKNESS} radius={[0, 4, 4, 0]} isAnimationActive={!reduceMotion} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 text-xs text-text-secondary">
        Mean absolute SHAP impact across a sample of active customers.
      </figcaption>
    </figure>
  );
}
