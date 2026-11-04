"use client";

import { Activity, AlertTriangle, TrendingUp, Users } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { StatCard } from "@/components/ui/StatCard";
import { ProbabilityDistributionChart } from "@/components/probability-distribution-chart";
import { RiskDistributionChart } from "@/components/risk-distribution-chart";
import type { AtRiskCustomer, CustomerSummary, ModelMetrics, ProbabilityBucket, RiskLevel } from "@/lib/api";
import { useApiData } from "@/lib/use-api-data";

const SAMPLE_SIZE = 50;
const TOP_CUSTOMER_COUNT = 5;
const BUCKET_SIZE = 0.1;

const PERCENT = new Intl.NumberFormat("en-US", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });

function formatProbability(probability: number) {
  return `${(probability * 100).toFixed(2)}%`;
}

function countByRisk(customers: AtRiskCustomer[]): Record<RiskLevel, number> {
  const counts: Record<RiskLevel, number> = { high: 0, medium: 0, low: 0 };
  for (const customer of customers) counts[customer.risk_level] += 1;
  return counts;
}

function probabilityBuckets(customers: AtRiskCustomer[]): ProbabilityBucket[] {
  const bucketCount = Math.round(1 / BUCKET_SIZE);
  const counts = new Array(bucketCount).fill(0);
  for (const customer of customers) {
    const index = Math.min(bucketCount - 1, Math.floor(customer.churn_probability / BUCKET_SIZE));
    counts[index] += 1;
  }
  return counts.map((count, index) => ({
    range: `${Math.round(index * BUCKET_SIZE * 100)}-${Math.round((index + 1) * BUCKET_SIZE * 100)}%`,
    count,
  }));
}

const TOP_CUSTOMER_COLUMNS: Column<AtRiskCustomer>[] = [
  { key: "customerID", header: "Customer ID", render: (c) => <span className="font-medium text-text-primary">{c.customerID}</span> },
  { key: "risk_level", header: "Risk Level", render: (c) => <RiskBadge level={c.risk_level} /> },
  {
    key: "churn_probability",
    header: "Churn Probability",
    align: "right",
    render: (c) => formatProbability(c.churn_probability),
  },
];

function ModelPerformanceSummary({ metrics }: { metrics: ModelMetrics }) {
  const tuned = metrics.xgboost_test_tuned_threshold;
  return (
    <div className="flex flex-col gap-4 rounded-card bg-surface p-5 shadow-card">
      <h2 className="font-semibold tracking-tight text-text-primary">Model Performance Summary</h2>
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {([
          ["ROC-AUC", tuned.roc_auc],
          ["Precision", tuned.precision],
          ["Recall", tuned.recall],
          ["F1", tuned.f1],
        ] as const).map(([label, value]) => (
          <div key={label}>
            <dt className="text-text-secondary">{label}</dt>
            <dd className="mt-1 text-xl font-semibold tracking-tight text-text-primary">{value.toFixed(3)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Dashboard({
  summary,
  customers,
  metrics,
}: {
  summary: CustomerSummary;
  customers: AtRiskCustomer[];
  metrics: ModelMetrics;
}) {
  const riskCounts = countByRisk(customers);
  const atRiskCount = riskCounts.high + riskCounts.medium;
  const avgProbability = customers.length
    ? customers.reduce((sum, c) => sum + c.churn_probability, 0) / customers.length
    : 0;
  const buckets = probabilityBuckets(customers);
  const topCustomers = customers.slice(0, TOP_CUSTOMER_COUNT);
  const sampleCaption = `Among the ${customers.length} highest-risk customers`;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <PageHeader title="Dashboard" subtitle="A live view of churn risk across the active customer base." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Active Customers"
          value={summary.total_customers.toLocaleString()}
          subtitle="Across the full active customer base"
          icon={Users}
        />
        <StatCard label="At-Risk Customers" value={atRiskCount.toLocaleString()} subtitle={sampleCaption} icon={TrendingUp} />
        <StatCard label="High-Risk Customers" value={riskCounts.high.toLocaleString()} subtitle={sampleCaption} icon={AlertTriangle} />
        <StatCard label="Avg. Churn Probability" value={PERCENT.format(avgProbability)} subtitle={sampleCaption} icon={Activity} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-4 rounded-card bg-surface p-5 shadow-card">
          <div>
            <h2 className="font-semibold tracking-tight text-text-primary">Risk Distribution</h2>
            <p className="mt-1 text-text-secondary">{sampleCaption}.</p>
          </div>
          <RiskDistributionChart counts={riskCounts} />
        </section>

        <section className="flex flex-col gap-4 rounded-card bg-surface p-5 shadow-card">
          <div>
            <h2 className="font-semibold tracking-tight text-text-primary">Churn Probability Distribution</h2>
            <p className="mt-1 text-text-secondary">{sampleCaption}, grouped in 10 percent bands.</p>
          </div>
          <ProbabilityDistributionChart buckets={buckets} />
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-4 rounded-card bg-surface p-5 shadow-card">
          <h2 className="font-semibold tracking-tight text-text-primary">Top 5 Highest Risk Customers</h2>
          <DataTable columns={TOP_CUSTOMER_COLUMNS} rows={topCustomers} rowKey={(c) => c.customerID} />
        </section>

        <ModelPerformanceSummary metrics={metrics} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const summaryState = useApiData<CustomerSummary>("/customers/summary");
  const customersState = useApiData<AtRiskCustomer[]>(`/customers/at-risk?n=${SAMPLE_SIZE}`);
  const metricsState = useApiData<ModelMetrics>("/metrics");

  const loading = [summaryState, customersState, metricsState].some((s) => s.state.status === "loading");
  const errored = [summaryState, customersState, metricsState].find((s) => s.state.status === "error");

  function retryAll() {
    summaryState.retry();
    customersState.retry();
    metricsState.retry();
  }

  if (loading) return <LoadingSpinner label="Loading dashboard" />;
  if (errored && errored.state.status === "error") return <ErrorState message={errored.state.message} onRetry={retryAll} />;
  if (summaryState.state.status !== "ready" || customersState.state.status !== "ready" || metricsState.state.status !== "ready") {
    return null;
  }

  return <Dashboard summary={summaryState.state.data} customers={customersState.state.data} metrics={metricsState.state.data} />;
}
