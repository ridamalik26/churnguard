"use client";

import clsx from "clsx";
import { ErrorNotice, LoadingNotice } from "@/components/status-notice";
import type { ConfusionMatrix, MetricKey, ModelMetrics } from "@/lib/api";
import { useApiData } from "@/lib/use-api-data";

const METRIC_LABELS: { key: MetricKey; label: string }[] = [
  { key: "roc_auc", label: "ROC-AUC" },
  { key: "pr_auc", label: "PR-AUC" },
  { key: "precision", label: "Precision" },
  { key: "recall", label: "Recall" },
  { key: "f1", label: "F1" },
];

const METRIC_DECIMALS = 4;

const CORRECT_CELL = "bg-green-100 text-green-900 dark:bg-green-900/50 dark:text-green-100";
const ERROR_CELL = "bg-red-100 text-red-900 dark:bg-red-900/50 dark:text-red-100";

function formatMetric(value: number) {
  return value.toFixed(METRIC_DECIMALS);
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-ink-secondary">{description}</p>
    </div>
  );
}

function SummaryCards({ metrics }: { metrics: ModelMetrics }) {
  return (
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {METRIC_LABELS.map(({ key, label }) => (
        <div key={key} className="rounded-lg border border-line bg-surface p-4">
          <dt className="text-sm text-ink-secondary">{label}</dt>
          <dd className="mt-1 text-2xl font-semibold">{formatMetric(metrics.xgboost_test_tuned_threshold[key])}</dd>
        </div>
      ))}
    </dl>
  );
}

function MatrixCell({ label, value, correct }: { label: string; value: number; correct: boolean }) {
  return (
    <div className={clsx("rounded-md p-4 text-center", correct ? CORRECT_CELL : ERROR_CELL)}>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs">{label}</p>
    </div>
  );
}

function ConfusionMatrixGrid({ matrix }: { matrix: ConfusionMatrix }) {
  return (
    <div className="max-w-xl rounded-lg border border-line bg-surface p-4">
      <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-2 text-sm">
        <span />
        <span className="text-center font-medium text-ink-secondary">Predicted: stayed</span>
        <span className="text-center font-medium text-ink-secondary">Predicted: churned</span>

        <span className="pr-2 font-medium text-ink-secondary">Actual: stayed</span>
        <MatrixCell label="True negative" value={matrix.true_negative} correct />
        <MatrixCell label="False positive" value={matrix.false_positive} correct={false} />

        <span className="pr-2 font-medium text-ink-secondary">Actual: churned</span>
        <MatrixCell label="False negative" value={matrix.false_negative} correct={false} />
        <MatrixCell label="True positive" value={matrix.true_positive} correct />
      </div>
    </div>
  );
}

function ComparisonTable({ metrics }: { metrics: ModelMetrics }) {
  const tunedHeading = `XGBoost (threshold ${formatMetric(metrics.threshold)})`;
  const cells = "px-4 py-3 text-right tabular-nums";

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full text-sm">
        <thead className="border-b border-line text-ink-secondary">
          <tr>
            <th scope="col" className="px-4 py-3 text-left font-medium">Metric</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">Logistic Regression</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">XGBoost (default threshold)</th>
            <th scope="col" className="px-4 py-3 text-right font-medium">{tunedHeading}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {METRIC_LABELS.map(({ key, label }) => (
            <tr key={key}>
              <th scope="row" className="px-4 py-3 text-left font-medium">{label}</th>
              <td className={cells}>{formatMetric(metrics.logistic_regression_test[key])}</td>
              <td className={cells}>{formatMetric(metrics.xgboost_test_default_threshold[key])}</td>
              <td className={cells}>{formatMetric(metrics.xgboost_test_tuned_threshold[key])}</td>
            </tr>
          ))}
          <tr>
            <th scope="row" className="px-4 py-3 text-left font-medium">Cross-validated ROC-AUC</th>
            <td className={cells}>{formatMetric(metrics.cv_mean_roc_auc.logistic_regression)}</td>
            <td className={cells}>{formatMetric(metrics.cv_mean_roc_auc.xgboost)}</td>
            <td className={cells}>{formatMetric(metrics.cv_mean_roc_auc.xgboost)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function ModelMetricsPage() {
  const { state, retry } = useApiData<ModelMetrics>("/metrics");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Model Metrics</h1>
        <p className="mt-1 text-sm text-ink-secondary">Results on the held-out test set.</p>
      </div>

      {state.status === "loading" && <LoadingNotice label="Loading metrics" />}
      {state.status === "error" && <ErrorNotice message={state.message} onRetry={retry} />}
      {state.status === "ready" && (
        <>
          <section className="flex flex-col gap-4">
            <SectionHeading
              title="XGBoost at Tuned Threshold"
              description={`Decision threshold ${formatMetric(state.data.threshold)}, chosen to maximize F1 on the validation set.`}
            />
            <SummaryCards metrics={state.data} />
          </section>

          <section className="flex flex-col gap-4">
            <SectionHeading title="Confusion Matrix" description="XGBoost test set predictions at the tuned threshold." />
            <ConfusionMatrixGrid matrix={state.data.xgboost_test_tuned_confusion_matrix} />
          </section>

          <section className="flex flex-col gap-4">
            <SectionHeading title="Logistic Regression vs XGBoost" description="All saved metrics side by side." />
            <ComparisonTable metrics={state.data} />
          </section>
        </>
      )}
    </div>
  );
}
