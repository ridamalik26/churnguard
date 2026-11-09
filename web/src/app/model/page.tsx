"use client";

import clsx from "clsx";
import { PredictionDistributionChart } from "@/components/prediction-distribution-chart";
import { RocCurveChart } from "@/components/roc-curve-chart";
import { ModelComparisonTable, MODEL_LABELS } from "@/components/model-comparison-table";
import { CalibrationChart } from "@/components/calibration-chart";
import { ThresholdSavingsChart } from "@/components/threshold-savings-chart";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { Reveal } from "@/components/ui/Reveal";
import type { ConfusionMatrix, MetricKey, ModelMetrics } from "@/lib/api";
import { useApiData } from "@/lib/use-api-data";

const METRIC_LABELS: { key: MetricKey; label: string; borderColor: string }[] = [
  { key: "roc_auc", label: "ROC-AUC", borderColor: "var(--accent)" },
  { key: "pr_auc", label: "PR-AUC", borderColor: "var(--warning)" },
  { key: "precision", label: "Precision", borderColor: "var(--teal)" },
  { key: "recall", label: "Recall", borderColor: "var(--indigo)" },
  { key: "f1", label: "F1", borderColor: "var(--success)" },
];

const METRIC_DECIMALS = 4;
const CURRENCY = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function formatMetric(value: number) {
  return value.toFixed(METRIC_DECIMALS);
}

function modelLabel(name: string) {
  return MODEL_LABELS[name] ?? name;
}

function SectionHeading({ title, description, note }: { title: string; description?: string; note?: string }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold tracking-tight text-text-primary">{title}</h2>
        {note && <InfoTooltip text={note} />}
      </div>
      {description && <p className="mt-1 text-text-secondary">{description}</p>}
    </div>
  );
}

function SummaryCards({ metrics }: { metrics: ModelMetrics }) {
  return (
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {METRIC_LABELS.map(({ key, label, borderColor }) => (
        <div
          key={key}
          className="rounded-card border border-border bg-surface p-5 shadow-card"
          style={{ borderTopWidth: 3, borderTopColor: borderColor }}
        >
          <dt className="text-xs font-medium text-text-secondary">{label}</dt>
          <dd className="mt-2 text-[32px] leading-none font-semibold tracking-tight text-text-primary">
            {formatMetric(metrics.xgboost_test_tuned_threshold[key])}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function MatrixCell({ label, value, correct }: { label: string; value: number; correct: boolean }) {
  return (
    <div
      className={clsx(
        "flex min-h-[120px] min-w-[120px] flex-col items-center justify-center rounded-button p-4 text-center text-text-primary",
        correct ? "bg-success-tint" : "bg-danger-tint",
      )}
    >
      <p className="text-[36px] font-extrabold">{value}</p>
      <p className="mt-1 text-xs">{label}</p>
    </div>
  );
}

function ConfusionMatrixGrid({ matrix }: { matrix: ConfusionMatrix }) {
  return (
    <div className="max-w-xl rounded-card border border-border bg-surface p-5 shadow-card">
      <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-2">
        <span />
        <span className="text-center text-xs font-medium text-text-secondary">Predicted: stayed</span>
        <span className="text-center text-xs font-medium text-text-secondary">Predicted: churned</span>

        <span className="pr-2 text-xs font-medium text-text-secondary">Actual: stayed</span>
        <MatrixCell label="True negative" value={matrix.true_negative} correct />
        <MatrixCell label="False positive" value={matrix.false_positive} correct={false} />

        <span className="pr-2 text-xs font-medium text-text-secondary">Actual: churned</span>
        <MatrixCell label="False negative" value={matrix.false_negative} correct={false} />
        <MatrixCell label="True positive" value={matrix.true_positive} correct />
      </div>
    </div>
  );
}

function SelectedModelCard({ metrics }: { metrics: ModelMetrics }) {
  const selected = metrics.selected_model;
  return (
    <div className="flex flex-col gap-3 rounded-card border border-accent bg-accent-light p-5 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold tracking-tight text-text-primary">Selected Model: {modelLabel(selected.name)}</h2>
        <span className="rounded-badge bg-accent px-2 py-0.5 text-[10px] font-medium text-on-accent">Deployed</span>
      </div>
      <p className="text-text-secondary">{selected.rule}</p>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <dt className="text-xs text-text-secondary">CV PR-AUC</dt>
          <dd className="font-semibold text-text-primary">{formatMetric(selected.cv_pr_auc)}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-secondary">CV ROC-AUC</dt>
          <dd className="font-semibold text-text-primary">{formatMetric(selected.cv_roc_auc)}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-secondary">Best Calibration</dt>
          <dd className="font-semibold text-text-primary capitalize">{selected.calibration_best_method}</dd>
        </div>
        <div>
          <dt className="text-xs text-text-secondary">Best Brier Score</dt>
          <dd className="font-semibold text-text-primary">{formatMetric(selected.calibration_best_brier)}</dd>
        </div>
      </dl>
      <p className="text-xs text-text-secondary">{selected.note}</p>
    </div>
  );
}

export default function ModelPerformancePage() {
  const { state, retry } = useApiData<ModelMetrics>("/metrics");

  return (
    <div className="flex flex-col gap-10">
      <PageHeader title="Model Performance" subtitle="Results on the held-out test set." />

      {state.status === "loading" && <LoadingSpinner label="Loading metrics" />}
      {state.status === "error" && <ErrorState message={state.message} onRetry={retry} />}
      {state.status === "ready" && (
        <>
          <Reveal index={0}>
            <SelectedModelCard metrics={state.data} />
          </Reveal>

          <Reveal index={1}>
            <section className="flex flex-col gap-4">
              <SectionHeading
                title={`${modelLabel(state.data.selected_model.name)} at Tuned Classification Threshold`}
                description={`A prediction counts as churn when its probability exceeds ${formatMetric(state.data.threshold)}, a threshold chosen to maximize F1 on the validation set.`}
              />
              <SummaryCards metrics={state.data} />
            </section>
          </Reveal>

          <section className="grid gap-4 lg:grid-cols-2">
            <Reveal index={2}>
              <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card">
                <SectionHeading
                  title="Prediction Distribution"
                  note="Illustrative bell-curve densities, not the model's actual per-customer predictions."
                />
                <PredictionDistributionChart />
              </div>
            </Reveal>
            <Reveal index={3}>
              <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card">
                <SectionHeading
                  title="ROC Curve"
                  description={`Shaped to match the model's real ROC-AUC of ${formatMetric(state.data.xgboost_test_tuned_threshold.roc_auc)}.`}
                  note="Illustrative curve. Per-threshold points are not saved by training, so the curve itself is simulated."
                />
                <RocCurveChart rocAuc={state.data.xgboost_test_tuned_threshold.roc_auc} />
              </div>
            </Reveal>
          </section>

          <Reveal index={4}>
            <section className="flex flex-col gap-4">
              <SectionHeading title="Confusion Matrix" description="Test set predictions at the tuned threshold." />
              <ConfusionMatrixGrid matrix={state.data.xgboost_test_tuned_confusion_matrix} />
            </section>
          </Reveal>

          <Reveal index={5}>
            <section className="flex flex-col gap-4">
              <SectionHeading
                title="Model Comparison"
                description="Stratified 5-fold cross-validation on the training set, for all 4 benchmarked algorithms."
              />
              <div className="rounded-card border border-border bg-surface p-5 shadow-card">
                <ModelComparisonTable comparison={state.data.model_comparison} winner={state.data.selected_model.name} />
              </div>
            </section>
          </Reveal>

          <Reveal index={6}>
            <section className="flex flex-col gap-4">
              <SectionHeading
                title="Probability Calibration"
                description={`How well ${modelLabel(state.data.selected_model.name)}'s predicted probabilities match real outcomes, on the held-out validation split.`}
                note="Lower Brier score is better. Isotonic and sigmoid calibration are evaluated for transparency; the deployed model keeps raw probabilities so SHAP explanations stay straightforward."
              />
              <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card lg:flex-row lg:items-center">
                <div className="flex-1">
                  <CalibrationChart calibration={state.data.calibration[state.data.selected_model.name]} />
                </div>
                <dl className="flex flex-row gap-6 lg:flex-col lg:gap-3">
                  {Object.entries(state.data.calibration[state.data.selected_model.name].brier_score).map(([method, value]) => (
                    <div key={method}>
                      <dt className="text-xs text-text-secondary capitalize">{method}</dt>
                      <dd className="font-semibold text-text-primary">{formatMetric(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
          </Reveal>

          <Reveal index={7}>
            <section className="flex flex-col gap-4">
              <SectionHeading
                title="Business Threshold Optimization"
                description="Expected net savings from contacting at-risk customers, across classification thresholds."
                note="Assumes a configurable cost of contact, cost of a retention offer, revenue lost per churned customer, and offer success rate. See src/business_config.json."
              />
              <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card">
                <ThresholdSavingsChart
                  curve={state.data.business_threshold.curve}
                  f1Threshold={state.data.business_threshold.f1_threshold}
                  businessThreshold={state.data.business_threshold.business_threshold}
                />
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <dt className="text-xs text-text-secondary">F1 Threshold</dt>
                    <dd className="font-semibold text-text-primary">{formatMetric(state.data.business_threshold.f1_threshold)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-secondary">Business Threshold</dt>
                    <dd className="font-semibold text-text-primary">{formatMetric(state.data.business_threshold.business_threshold)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-secondary">Savings at F1 Threshold</dt>
                    <dd className="font-semibold text-text-primary">
                      {CURRENCY.format(state.data.business_threshold.expected_savings_test_at_f1_threshold)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-text-secondary">Savings at Business Threshold</dt>
                    <dd className="font-semibold text-text-primary">
                      {CURRENCY.format(state.data.business_threshold.expected_savings_test_at_business_threshold)}
                    </dd>
                  </div>
                </div>
              </div>
            </section>
          </Reveal>
        </>
      )}
    </div>
  );
}
