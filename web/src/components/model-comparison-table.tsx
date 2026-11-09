import clsx from "clsx";
import type { ModelComparison } from "@/lib/api";

export const MODEL_LABELS: Record<string, string> = {
  logistic_regression: "Logistic Regression",
  random_forest: "Random Forest",
  xgboost: "XGBoost",
  lightgbm: "LightGBM",
};

const HEADER_CELL = "px-3 py-2.5 text-right text-xs font-medium first:pl-0 first:text-left last:pr-0";
const ROW_LABEL = "py-3 pr-3 text-left font-medium";
const VALUE_CELL = "px-3 py-3 text-right tabular-nums last:pr-0";

function formatMetric(value: number) {
  return value.toFixed(4);
}

function formatSeconds(value: number) {
  return value < 1 ? `${(value * 1000).toFixed(1)} ms` : `${value.toFixed(2)} s`;
}

export function ModelComparisonTable({ comparison, winner }: { comparison: ModelComparison; winner: string }) {
  const rows = Object.entries(comparison);

  return (
    <div className="relative overflow-x-auto">
      <table className="w-full">
        <thead className="text-text-secondary">
          <tr className="border-b border-border">
            <th scope="col" className={HEADER_CELL}>Model</th>
            <th scope="col" className={HEADER_CELL}>ROC-AUC</th>
            <th scope="col" className={HEADER_CELL}>PR-AUC</th>
            <th scope="col" className={HEADER_CELL}>Precision</th>
            <th scope="col" className={HEADER_CELL}>Recall</th>
            <th scope="col" className={HEADER_CELL}>F1</th>
            <th scope="col" className={HEADER_CELL}>Fit Time</th>
            <th scope="col" className={HEADER_CELL}>Predict Time</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, result]) => {
            const isWinner = name === winner;
            return (
              <tr
                key={name}
                className={clsx(
                  "border-b border-border transition-colors",
                  isWinner ? "bg-accent-light" : "hover:bg-surface-raised",
                )}
              >
                <th scope="row" className={clsx(ROW_LABEL, isWinner ? "text-accent" : "text-text-primary")}>
                  {MODEL_LABELS[name] ?? name}
                  {isWinner && <span className="ml-2 rounded-badge bg-accent px-2 py-0.5 text-[10px] font-medium text-on-accent">Selected</span>}
                </th>
                <td className={clsx(VALUE_CELL, "text-text-primary")}>{formatMetric(result.roc_auc)}</td>
                <td className={clsx(VALUE_CELL, "text-text-primary")}>{formatMetric(result.pr_auc)}</td>
                <td className={clsx(VALUE_CELL, "text-text-primary")}>{formatMetric(result.precision)}</td>
                <td className={clsx(VALUE_CELL, "text-text-primary")}>{formatMetric(result.recall)}</td>
                <td className={clsx(VALUE_CELL, "text-text-primary")}>{formatMetric(result.f1)}</td>
                <td className={clsx(VALUE_CELL, "text-text-secondary")}>{formatSeconds(result.fit_time_seconds)}</td>
                <td className={clsx(VALUE_CELL, "text-text-secondary")}>{formatSeconds(result.predict_time_seconds_per_row)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
