import type { RiskLevel } from "@/lib/api";

export function isAtRisk(probability: number, atRiskThreshold: number) {
  return probability > atRiskThreshold;
}

export function isHighRisk(level: RiskLevel) {
  return level === "high";
}

export function atRiskDefinition(atRiskThreshold: number) {
  return `A customer counts as at risk when their predicted churn probability is above ${(atRiskThreshold * 100).toFixed(2)}%, the deployed model's tuned classification threshold.`;
}

export const HIGH_RISK_DEFINITION =
  "A customer counts as high risk when their predicted churn probability is above 50%, the model's highest urgency band.";
