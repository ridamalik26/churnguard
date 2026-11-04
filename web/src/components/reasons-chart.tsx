"use client";

import { Bar, BarChart, ResponsiveContainer, Text, Tooltip, XAxis, YAxis } from "recharts";

const ROW_HEIGHT = 64;
const LABEL_WIDTH = 180;
const BAR_THICKNESS = 16;

type ReasonRow = {
  reason: string;
  rank: number;
  impact: number;
};

type TickProps = {
  x?: number | string;
  y?: number | string;
  payload?: { value?: string };
};

function ReasonTick({ x, y, payload }: TickProps) {
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
  payload?: ReadonlyArray<{ payload?: ReasonRow }>;
  total: number;
};

function ReasonTooltip({ active, payload, total }: TooltipProps) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="max-w-56 rounded-card border border-border bg-surface px-3 py-2 text-xs shadow-card">
      <p>{row.reason}</p>
      <p className="mt-1 text-text-secondary">
        Rank {row.rank} of {total}
      </p>
    </div>
  );
}

export function ReasonsChart({ reasons }: { reasons: string[] }) {
  const rows: ReasonRow[] = reasons.map((reason, index) => ({
    reason,
    rank: index + 1,
    impact: reasons.length - index,
  }));

  return (
    <figure>
      <div className="w-full" style={{ height: ROW_HEIGHT * rows.length }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis
              type="category"
              dataKey="reason"
              width={LABEL_WIDTH}
              interval={0}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              tick={ReasonTick}
            />
            <Tooltip cursor={{ fill: "var(--accent-light)" }} content={<ReasonTooltip total={rows.length} />} />
            <Bar dataKey="impact" fill="var(--accent)" barSize={BAR_THICKNESS} radius={[0, 4, 4, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="mt-2 text-xs text-text-secondary">
        Bars are in order of SHAP impact. Length shows rank only, not the size of the effect.
      </figcaption>
    </figure>
  );
}
