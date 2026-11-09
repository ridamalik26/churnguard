"use client";

import { useReducedMotion } from "framer-motion";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ShapWaterfall } from "@/lib/api";

const INCREASE_COLOR = "var(--danger)";
const DECREASE_COLOR = "#3B82F6";
const NEUTRAL_COLOR = "var(--text-muted)";

type RowKind = "base" | "increase" | "decrease" | "final";

type Row = {
  name: string;
  base: number;
  height: number;
  display: number;
  labelText: string;
  kind: RowKind;
};

function formatSigned(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;
}

function buildRows(data: ShapWaterfall): Row[] {
  const rows: Row[] = [
    {
      name: "Base rate",
      base: 0,
      height: data.base_value,
      display: data.base_value,
      labelText: data.base_value.toFixed(3),
      kind: "base",
    },
  ];

  let cumulative = data.base_value;
  for (const feature of data.features) {
    const start = cumulative;
    const end = cumulative + feature.contribution;
    rows.push({
      name: feature.label,
      base: Math.min(start, end),
      height: Math.abs(end - start),
      display: feature.contribution,
      labelText: formatSigned(feature.contribution),
      kind: feature.contribution >= 0 ? "increase" : "decrease",
    });
    cumulative = end;
  }

  rows.push({
    name: "Prediction",
    base: 0,
    height: data.final_model_output,
    display: data.final_model_output,
    labelText: data.final_model_output.toFixed(3),
    kind: "final",
  });

  return rows;
}

function colorFor(kind: RowKind) {
  if (kind === "increase") return INCREASE_COLOR;
  if (kind === "decrease") return DECREASE_COLOR;
  return NEUTRAL_COLOR;
}

type TooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: Row }>;
};

function WaterfallTooltip({ active, payload }: TooltipProps) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="rounded-card border border-border bg-surface px-3 py-2 text-xs shadow-card">
      <p className="font-medium text-text-primary">{row.name}</p>
      <p className="mt-1 text-text-secondary">{row.labelText} (log-odds)</p>
    </div>
  );
}

export function summarizeTopDriver(waterfall: ShapWaterfall) {
  const top = waterfall.features.find((feature) => feature.feature !== "other_features");
  if (!top) return "No single feature stands out as the main driver for this customer.";
  const direction = top.contribution >= 0 ? "increasing" : "decreasing";
  const valueText = top.value === null || top.value === undefined ? "" : ` (${top.value})`;
  return `${top.label}${valueText} is the biggest factor ${direction} this customer's churn risk.`;
}

export function ShapWaterfallChart({ waterfall }: { waterfall: ShapWaterfall }) {
  const reduceMotion = useReducedMotion();
  const rows = buildRows(waterfall);

  return (
    <div className="h-[380px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 24, right: 8, bottom: 70, left: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="name"
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={80}
          />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "var(--text-secondary)", fontSize: 11 }} width={40} />
          <Tooltip content={<WaterfallTooltip />} cursor={false} />
          <ReferenceLine y={waterfall.base_value} stroke="var(--text-muted)" strokeDasharray="4 4" />
          <ReferenceLine y={waterfall.final_model_output} stroke="var(--accent)" strokeDasharray="4 4" />
          <Bar dataKey="base" stackId="waterfall" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="height" stackId="waterfall" radius={[3, 3, 3, 3]} isAnimationActive={!reduceMotion} animationDuration={700}>
            {rows.map((row) => (
              <Cell key={row.name} fill={colorFor(row.kind)} />
            ))}
            <LabelList dataKey="labelText" position="top" style={{ fontSize: 10, fill: "var(--text-primary)" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
