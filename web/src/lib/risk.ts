import type { RiskLevel } from "@/lib/api";

export const AT_RISK_THRESHOLD = 0.4672;

export function isAtRisk(probability: number) {
  return probability > AT_RISK_THRESHOLD;
}

export function isHighRisk(level: RiskLevel) {
  return level === "high";
}

export const AT_RISK_DEFINITION =
  `A customer counts as at risk when their predicted churn probability is above ${(AT_RISK_THRESHOLD * 100).toFixed(2)}%, the model's tuned classification threshold.`;

export const HIGH_RISK_DEFINITION =
  "A customer counts as high risk when their predicted churn probability is above 50%, the model's highest urgency band.";
