"use client";

import { Activity, AlertTriangle, TrendingUp, Users } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { StatCard } from "@/components/ui/StatCard";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Reveal } from "@/components/ui/Reveal";
import { ChurnTrendChart } from "@/components/churn-trend-chart";
import { ProbabilityDistributionChart } from "@/components/probability-distribution-chart";
import { TopChurnDriversChart } from "@/components/top-churn-drivers-chart";
import type { AtRiskCustomer, CustomerSummary, GlobalShapFeature, ModelMetrics, RiskLevel } from "@/lib/api";
import { useApiData } from "@/lib/use-api-data";
import { HIGH_RISK_DEFINITION, atRiskDefinition, isAtRisk } from "@/lib/risk";

const SAMPLE_SIZE = 50;
const TOP_CUSTOMER_COUNT = 5;

const PERCENT = new Intl.NumberFormat("en-US", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });

function formatProbability(probability: number) {
  return `${(probability * 100).toFixed(2)}%`;
}

function countByRisk(customers: AtRiskCustomer[]): Record<RiskLevel, number> {
  const counts: Record<RiskLevel, number> = { high: 0, medium: 0, low: 0 };
  for (const customer of customers) counts[customer.risk_level] += 1;
  return counts;
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

function TopChurnDrivers({ features }: { features: GlobalShapFeature[] }) {
  return (
    <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-6 shadow-card">
      <h2 className="font-semibold tracking-tight text-text-primary">Top Churn Drivers</h2>
      <TopChurnDriversChart features={features} />
    </div>
  );
}

function Dashboard({
  summary,
  customers,
  shapFeatures,
  atRiskThreshold,
}: {
  summary: CustomerSummary;
  customers: AtRiskCustomer[];
  shapFeatures: GlobalShapFeature[];
  atRiskThreshold: number;
}) {
  const riskCounts = countByRisk(customers);
  const atRiskCount = customers.filter((c) => isAtRisk(c.churn_probability, atRiskThreshold)).length;
  const avgProbability = customers.length
    ? customers.reduce((sum, c) => sum + c.churn_probability, 0) / customers.length
    : 0;
  const topCustomers = customers.slice(0, TOP_CUSTOMER_COUNT);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Dashboard" subtitle="A live view of churn risk across the active customer base." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Reveal index={0}>
          <StatCard
            label="Total Active Customers"
            value={<AnimatedNumber value={summary.total_customers} />}
            subtitle="All customers in the active dataset"
            icon={Users}
            tone="accent"
          />
        </Reveal>
        <Reveal index={1}>
          <StatCard
            label="At-Risk Customers"
            value={<AnimatedNumber value={atRiskCount} />}
            subtitle={`Above the ${(atRiskThreshold * 100).toFixed(2)}% churn threshold`}
            icon={TrendingUp}
            tone="medium"
            definition={atRiskDefinition(atRiskThreshold)}
          />
        </Reveal>
        <Reveal index={2}>
          <StatCard
            label="High-Risk Customers"
            value={<AnimatedNumber value={riskCounts.high} />}
            subtitle="Highest-urgency churn predictions"
            icon={AlertTriangle}
            tone="high"
            definition={HIGH_RISK_DEFINITION}
          />
        </Reveal>
        <Reveal index={3}>
          <StatCard
            label="Avg. Churn Probability"
            value={<AnimatedNumber value={avgProbability * 100} format={(n) => PERCENT.format(n / 100)} />}
            subtitle="Mean across the customers loaded here"
            icon={Activity}
            tone="accent"
          />
        </Reveal>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Reveal index={4}>
          <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold tracking-tight text-text-primary">Churn Risk Trend</h2>
              <InfoTooltip text="Illustrative trend based on model predictions. Simulated monthly data, not a live time series." />
            </div>
            <ChurnTrendChart />
          </section>
        </Reveal>

        <Reveal index={5}>
          <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card">
            <div>
              <h2 className="font-semibold tracking-tight text-text-primary">Churn Probability Distribution</h2>
              <p className="mt-1 text-text-secondary">Across all active customers, grouped in 10 percent bands.</p>
            </div>
            <ProbabilityDistributionChart buckets={summary.probability_distribution} />
          </section>
        </Reveal>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Reveal index={6}>
          <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card">
            <h2 className="font-semibold tracking-tight text-text-primary">Top 5 Highest Risk Customers</h2>
            <DataTable columns={TOP_CUSTOMER_COLUMNS} rows={topCustomers} rowKey={(c) => c.customerID} />
          </section>
        </Reveal>

        <Reveal index={7}>
          <TopChurnDrivers features={shapFeatures} />
        </Reveal>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const summaryState = useApiData<CustomerSummary>("/customers/summary");
  const customersState = useApiData<AtRiskCustomer[]>(`/customers/at-risk?n=${SAMPLE_SIZE}`);
  const shapState = useApiData<GlobalShapFeature[]>("/shap/global");
  const metricsState = useApiData<ModelMetrics>("/metrics");

  const states = [summaryState, customersState, shapState, metricsState];
  const loading = states.some((s) => s.state.status === "loading");
  const errored = states.find((s) => s.state.status === "error");

  function retryAll() {
    summaryState.retry();
    customersState.retry();
    shapState.retry();
    metricsState.retry();
  }

  if (loading) return <LoadingSpinner label="Loading dashboard" />;
  if (errored && errored.state.status === "error") return <ErrorState message={errored.state.message} onRetry={retryAll} />;
  if (
    summaryState.state.status !== "ready" ||
    customersState.state.status !== "ready" ||
    shapState.state.status !== "ready" ||
    metricsState.state.status !== "ready"
  ) {
    return null;
  }

  return (
    <Dashboard
      summary={summaryState.state.data}
      customers={customersState.state.data}
      shapFeatures={shapState.state.data}
      atRiskThreshold={metricsState.state.data.threshold}
    />
  );
}
