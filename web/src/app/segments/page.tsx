"use client";

import clsx from "clsx";
import { Search } from "lucide-react";
import { useState } from "react";
import { CUSTOMER_COLUMNS } from "@/components/customer-columns";
import { SegmentTrendChart } from "@/components/segment-trend-chart";
import { DataTable } from "@/components/ui/DataTable";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import type { AtRiskCustomer, CustomerSummary, RiskLevel } from "@/lib/api";
import { useApiData } from "@/lib/use-api-data";

const SAMPLE_SIZE = 50;
const SEGMENTS: { level: RiskLevel; label: string }[] = [
  { level: "high", label: "High Risk" },
  { level: "medium", label: "Medium Risk" },
  { level: "low", label: "Low Risk" },
];

function SegmentTabs({ active, onChange, counts }: { active: RiskLevel; onChange: (level: RiskLevel) => void; counts: Record<RiskLevel, number> }) {
  return (
    <div role="tablist" aria-label="Customer segment" className="flex gap-2 border-b border-border">
      {SEGMENTS.map(({ level, label }) => (
        <button
          key={level}
          type="button"
          role="tab"
          aria-selected={active === level}
          onClick={() => onChange(level)}
          className={clsx(
            "flex items-center gap-2 border-b-2 px-3 py-2.5 transition-colors",
            active === level ? "border-accent font-medium text-accent" : "border-transparent text-text-secondary hover:text-text-primary",
          )}
        >
          {label}
          <span className="rounded-full bg-accent-light px-2 py-0.5 text-xs tabular-nums text-accent">{counts[level]}</span>
        </button>
      ))}
    </div>
  );
}

function SegmentCustomers({ level, sampleSize }: { level: RiskLevel; sampleSize: number }) {
  const [search, setSearch] = useState("");
  const { state, retry } = useApiData<AtRiskCustomer[]>(`/customers/by-risk?level=${level}&n=${sampleSize}`);

  if (state.status === "loading") return <LoadingSpinner label="Loading segment" />;
  if (state.status === "error") return <ErrorState message={state.message} onRetry={retry} />;

  const filtered = state.data.filter((customer) => customer.customerID.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full sm:max-w-xs">
        <Search aria-hidden className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-secondary" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search customer ID"
          aria-label="Search customer ID"
          className="w-full rounded-button border border-border bg-surface py-2 pl-9 pr-3 text-sm text-text-primary outline-none focus-visible:border-accent"
        />
      </div>
      <DataTable
        columns={CUSTOMER_COLUMNS}
        rows={filtered}
        rowKey={(c) => c.customerID}
        emptyMessage={`No ${level}-risk customers found.`}
      />
    </div>
  );
}

function Segments({ summary, sampleSize }: { summary: CustomerSummary; sampleSize: number }) {
  const [active, setActive] = useState<RiskLevel>("high");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <PageHeader title="Customer Segments" subtitle={`${summary.total_customers} active customers grouped by churn risk.`} />

      <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card">
        <div>
          <h2 className="font-semibold tracking-tight text-text-primary">Monthly Churn Rate by Segment</h2>
          <p className="mt-1 text-text-secondary">Illustrative simulated trend, 6 months, not a live time series.</p>
        </div>
        <SegmentTrendChart />
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {SEGMENTS.map(({ level, label }) => (
          <StatCard
            key={level}
            label={label}
            value={summary.risk_counts[level].toLocaleString()}
            subtitle={`${((summary.risk_counts[level] / summary.total_customers) * 100).toFixed(1)}% of customers`}
            leftBorderTone={level}
          />
        ))}
      </section>

      <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card">
        <SegmentTabs active={active} onChange={setActive} counts={summary.risk_counts} />
        <SegmentCustomers key={active} level={active} sampleSize={sampleSize} />
      </section>
    </div>
  );
}

export default function SegmentsPage() {
  const { state, retry } = useApiData<CustomerSummary>("/customers/summary");

  if (state.status === "loading") return <LoadingSpinner label="Loading segments" />;
  if (state.status === "error") return <ErrorState message={state.message} onRetry={retry} />;
  return <Segments summary={state.data} sampleSize={SAMPLE_SIZE} />;
}
