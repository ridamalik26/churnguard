"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { CUSTOMER_COLUMNS } from "@/components/customer-columns";
import { DataTable } from "@/components/ui/DataTable";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import type { AtRiskCustomer, RiskLevel } from "@/lib/api";
import { useApiData } from "@/lib/use-api-data";

const SAMPLE_SIZE = 50;

const RISK_FILTERS: { value: RiskLevel | "all"; label: string }[] = [
  { value: "all", label: "All risk levels" },
  { value: "high", label: "High risk" },
  { value: "medium", label: "Medium risk" },
  { value: "low", label: "Low risk" },
];

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2">
      <span className="font-bold text-text-primary">{value}</span>
      <span className="text-xs text-text-secondary">{label}</span>
    </div>
  );
}

function CustomersTable({ customers }: { customers: AtRiskCustomer[] }) {
  const [search, setSearch] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">("all");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customers.filter((customer) => {
      if (riskFilter !== "all" && customer.risk_level !== riskFilter) return false;
      if (query && !customer.customerID.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [customers, search, riskFilter]);

  const highRiskCount = customers.filter((c) => c.risk_level === "high").length;
  const avgProbability = customers.length
    ? customers.reduce((sum, c) => sum + c.churn_probability, 0) / customers.length
    : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <StatChip label="total shown" value={customers.length.toLocaleString()} />
        <StatChip label="high risk" value={highRiskCount.toLocaleString()} />
        <StatChip label="avg probability" value={`${(avgProbability * 100).toFixed(1)}%`} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
        <select
          value={riskFilter}
          onChange={(event) => setRiskFilter(event.target.value as RiskLevel | "all")}
          aria-label="Filter by risk level"
          className="rounded-button border border-border bg-surface px-3 py-2 text-sm text-text-primary outline-none focus-visible:border-accent"
        >
          {RISK_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={CUSTOMER_COLUMNS}
        rows={filtered}
        rowKey={(c) => c.customerID}
        paginate
        emptyMessage="No customers match your filters."
      />
    </div>
  );
}

export default function AtRiskCustomersPage() {
  const { state, retry } = useApiData<AtRiskCustomer[]>(`/customers/at-risk?n=${SAMPLE_SIZE}`);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader title="At-Risk Customers" subtitle={`The ${SAMPLE_SIZE} active customers with the highest predicted churn risk.`} />

      {state.status === "loading" && <LoadingSpinner label="Loading customers" />}
      {state.status === "error" && <ErrorState message={state.message} onRetry={retry} />}
      {state.status === "ready" && <CustomersTable customers={state.data} />}
    </div>
  );
}
