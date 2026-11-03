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

const HEADER_CELL = "px-3 py-2.5 text-right text-xs font-medium first:pl-0 first:text-left last:pr-0";
const ROW_LABEL = "py-3 pr-3 text-left font-medium";
const VALUE_CELL = "px-3 py-3 text-right tabular-nums last:pr-0";

function formatMetric(value: number) {
  return value.toFixed(METRIC_DECIMALS);
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-ink-secondary">{description}</p>
    </div>
  );
}

function SummaryCards({ metrics }: { metrics: ModelMetrics }) {
  return (
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {METRIC_LABELS.map(({ key, label }) => (
        <div key={key} className="rounded-lg bg-surface p-5 shadow-card">
          <dt className="text-ink-secondary">{label}</dt>
          <dd className="mt-2 text-[32px] leading-none font-semibold tracking-tight text-accent">
            {formatMetric(metrics.xgboost_test_tuned_threshold[key])}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function MatrixCell({ label, value, correct }: { label: string; value: number; correct: boolean }) {
  return (
    <div className={clsx("rounded-md p-4 text-center", correct ? "bg-risk-low-tint" : "bg-risk-high-tint")}>
      <p className="text-[22px] font-semibold">{value}</p>
      <p className="mt-1 text-xs">{label}</p>
    </div>
  );
}

function ConfusionMatrixGrid({ matrix }: { matrix: ConfusionMatrix }) {
  return (
    <div className="max-w-xl rounded-lg bg-surface p-5 shadow-card">
      <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-2">
        <span />
        <span className="text-center text-xs font-medium text-ink-secondary">Predicted: stayed</span>
        <span className="text-center text-xs font-medium text-ink-secondary">Predicted: churned</span>

        <span className="pr-2 text-xs font-medium text-ink-secondary">Actual: stayed</span>
        <MatrixCell label="True negative" value={matrix.true_negative} correct />
        <MatrixCell label="False positive" value={matrix.false_positive} correct={false} />

        <span className="pr-2 text-xs font-medium text-ink-secondary">Actual: churned</span>
        <MatrixCell label="False negative" value={matrix.false_negative} correct={false} />
        <MatrixCell label="True positive" value={matrix.true_positive} correct />
      </div>
    </div>
  );
}

function ComparisonTable({ metrics }: { metrics: ModelMetrics }) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full">
        <thead className="text-ink-secondary">
          <tr className="border-b border-line">
            <th scope="col" className={HEADER_CELL}>Metric</th>
            <th scope="col" className={HEADER_CELL}>Logistic Regression</th>
            <th scope="col" className={HEADER_CELL}>XGBoost (default threshold)</th>
            <th scope="col" className={HEADER_CELL}>XGBoost (threshold {formatMetric(metrics.threshold)})</th>
          </tr>
        </thead>
        <tbody>
          {METRIC_LABELS.map(({ key, label }) => (
            <tr key={key} className="border-b border-line">
              <th scope="row" className={ROW_LABEL}>{label}</th>
              <td className={VALUE_CELL}>{formatMetric(metrics.logistic_regression_test[key])}</td>
              <td className={VALUE_CELL}>{formatMetric(metrics.xgboost_test_default_threshold[key])}</td>
              <td className={VALUE_CELL}>{formatMetric(metrics.xgboost_test_tuned_threshold[key])}</td>
            </tr>
          ))}
          <tr className="border-b border-line">
            <th scope="row" className={ROW_LABEL}>Cross-validated ROC-AUC</th>
            <td className={VALUE_CELL}>{formatMetric(metrics.cv_mean_roc_auc.logistic_regression)}</td>
            <td className={VALUE_CELL}>{formatMetric(metrics.cv_mean_roc_auc.xgboost)}</td>
            <td className={VALUE_CELL}>{formatMetric(metrics.cv_mean_roc_auc.xgboost)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function ModelMetricsPage() {
  const { state, retry } = useApiData<ModelMetrics>("/metrics");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">Model Metrics</h1>
        <p className="mt-1 text-ink-secondary">Results on the held-out test set.</p>
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
