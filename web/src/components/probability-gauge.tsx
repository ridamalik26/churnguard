"use client";

import { RadialBar, RadialBarChart } from "recharts";
import type { RiskLevel } from "@/lib/api";

const TONE_COLOR: Record<RiskLevel, string> = {
  high: "var(--danger)",
  medium: "var(--warning)",
  low: "var(--success)",
};

export function ProbabilityGauge({ probability, riskLevel }: { probability: number; riskLevel: RiskLevel }) {
  const percent = Math.round(probability * 100);
  const data = [{ value: percent, fill: TONE_COLOR[riskLevel] }];

  return (
    <div className="relative size-28 shrink-0">
      <RadialBarChart
        width={112}
        height={112}
        cx="50%"
        cy="50%"
        innerRadius="78%"
        outerRadius="100%"
        barSize={10}
        data={data}
        startAngle={90}
        endAngle={-270}
      >
        <RadialBar dataKey="value" cornerRadius={6} background={{ fill: "var(--border)" }} isAnimationActive={false} />
      </RadialBarChart>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold text-text-primary">{percent}%</span>
      </div>
    </div>
  );
}
