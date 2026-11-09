"use client";

import { useReducedMotion } from "framer-motion";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const POINT_COUNT = 21;

// Approximates a ROC curve shape whose area matches the model's real ROC-AUC. The underlying
// per-threshold points are not saved by training, so the curve itself is illustrative.
function buildRocPoints(auc: number) {
  const clampedAuc = Math.min(0.995, Math.max(0.505, auc));
  const k = clampedAuc / (1 - clampedAuc);
  return Array.from({ length: POINT_COUNT }, (_, i) => {
    const fpr = i / (POINT_COUNT - 1);
    const tpr = Math.pow(fpr, 1 / k);
    return {
      fpr: fpr.toFixed(2),
      tpr: Number(tpr.toFixed(3)),
      reference: fpr,
    };
  });
}

type TooltipProps = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: { fpr: string; tpr: number } }>;
};

function RocTooltip({ active, payload }: TooltipProps) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="rounded-card border border-border bg-surface px-3 py-2 text-xs shadow-card">
      <p className="text-text-secondary">FPR: {row.fpr}</p>
      <p className="text-text-secondary">TPR: {row.tpr}</p>
    </div>
  );
}

export function RocCurveChart({ rocAuc }: { rocAuc: number }) {
  const data = buildRocPoints(rocAuc);
  const reduceMotion = useReducedMotion();

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="fpr"
            type="category"
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
            interval={4}
            label={{ value: "False Positive Rate", position: "insideBottom", offset: -4, fontSize: 11, fill: "var(--text-secondary)" }}
          />
          <YAxis
            domain={[0, 1]}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
            width={32}
            label={{ value: "True Positive Rate", angle: -90, position: "insideLeft", fontSize: 11, fill: "var(--text-secondary)" }}
          />
          <Tooltip content={<RocTooltip />} />
          <Line type="monotone" dataKey="reference" stroke="var(--text-muted)" strokeWidth={1.5} strokeDasharray="5 5" dot={false} isAnimationActive={!reduceMotion} />
          <Line type="monotone" dataKey="tpr" name="ROC Curve" stroke="var(--teal)" strokeWidth={2} dot={false} isAnimationActive={!reduceMotion} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
