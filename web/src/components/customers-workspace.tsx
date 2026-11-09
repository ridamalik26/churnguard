"use client";

import clsx from "clsx";
import Link from "next/link";
import { Clock, DollarSign, FileText, Search, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { ReasonsChart } from "@/components/reasons-chart";
import { ProbabilityGauge } from "@/components/probability-gauge";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Reveal } from "@/components/ui/Reveal";
import type { AtRiskCustomer, CustomerDetail, RiskLevel } from "@/lib/api";
import { useApiData } from "@/lib/use-api-data";

const SAMPLE_SIZE = 20;

type Tab = "all" | "high" | "medium";
const TABS: { value: Tab; label: string }[] = [
  { value: "all", label: "All Customers" },
  { value: "high", label: "High Risk" },
  { value: "medium", label: "Medium Risk" },
];

const RISK_DOT: Record<RiskLevel, string> = {
  high: "bg-danger",
  medium: "bg-warning",
  low: "bg-success",
};

function formatProbability(probability: number) {
  return `${(probability * 100).toFixed(2)}%`;
}

function StatChip({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2">
      <span className="font-bold text-text-primary">{value}</span>
      <span className="text-xs text-text-secondary">{label}</span>
    </div>
  );
}

function tenureRisk(tenure: number): { label: string; tone: RiskLevel } {
  if (tenure < 12) return { label: "High", tone: "high" };
  if (tenure < 36) return { label: "Medium", tone: "medium" };
  return { label: "Low", tone: "low" };
}

function chargesLevel(monthlyCharges: number): { label: string; tone: RiskLevel } {
  if (monthlyCharges > 70) return { label: "High", tone: "high" };
  if (monthlyCharges >= 30) return { label: "Medium", tone: "medium" };
  return { label: "Low", tone: "low" };
}

const SIGNAL_TONE: Record<RiskLevel, string> = {
  high: "text-danger",
  medium: "text-warning",
  low: "text-success",
};

function SignalCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone?: RiskLevel;
}) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-border bg-surface p-4 shadow-card">
      <span
        className={clsx(
          "flex size-9 shrink-0 items-center justify-center rounded-button bg-accent-light",
          tone ? SIGNAL_TONE[tone] : "text-accent",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-text-secondary">{label}</p>
        <p className={clsx("font-medium", tone ? SIGNAL_TONE[tone] : "text-text-primary")}>{value}</p>
      </div>
    </div>
  );
}

function CustomerList({
  customers,
  selectedId,
  onSelect,
}: {
  customers: AtRiskCustomer[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<Tab>("all");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customers.filter((customer) => {
      if (tab !== "all" && customer.risk_level !== tab) return false;
      if (query && !customer.customerID.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [customers, search, tab]);

  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-card lg:w-[340px]">
      <div className="flex gap-1 overflow-x-auto">
        {TABS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setTab(option.value)}
            aria-pressed={tab === option.value}
            className={clsx(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
              tab === option.value ? "bg-accent text-on-accent" : "text-text-secondary hover:text-text-primary",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search aria-hidden className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-secondary" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search customer ID"
          aria-label="Search customer ID"
          className="w-full rounded-button border border-border bg-bg py-2 pl-9 pr-3 text-sm text-text-primary outline-none focus-visible:border-accent"
        />
      </div>

      <ul className="flex max-h-[520px] flex-col overflow-y-auto">
        {filtered.length === 0 && <li className="py-8 text-center text-text-secondary">No customers match.</li>}
        {filtered.map((customer) => {
          const selected = customer.customerID === selectedId;
          return (
            <li key={customer.customerID}>
              <button
                type="button"
                onClick={() => onSelect(customer.customerID)}
                className={clsx(
                  "flex h-11 w-full items-center gap-2 border-l-[3px] pr-2 pl-2 text-left transition-colors",
                  selected ? "border-l-accent bg-accent-light" : "border-l-transparent hover:bg-surface-raised",
                )}
              >
                <span className={clsx("size-2 shrink-0 rounded-full", RISK_DOT[customer.risk_level])} aria-hidden />
                <span className={clsx("min-w-0 flex-1 whitespace-nowrap", selected ? "font-medium text-accent" : "text-text-primary")}>
                  {customer.customerID}
                </span>
                <RiskBadge level={customer.risk_level} />
                <span className="w-16 shrink-0 text-right tabular-nums text-text-secondary">
                  {formatProbability(customer.churn_probability)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function InfoCard({ title, rows }: { title: string; rows: { label: string; value: string }[] }) {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-card">
      <h3 className="font-semibold tracking-tight text-text-primary">{title}</h3>
      <dl className="flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
            <dt className="text-text-secondary">{row.label}</dt>
            <dd className="font-medium text-text-primary">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function CustomerWorkspace({ id }: { id: string }) {
  const { state, retry } = useApiData<CustomerDetail>(`/customers/${encodeURIComponent(id)}`);

  if (state.status === "loading") {
    return (
      <div className="rounded-card border border-border bg-surface p-5 shadow-card lg:col-span-2">
        <LoadingSpinner label="Loading customer" />
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="lg:col-span-2">
        <ErrorState message={state.message} onRetry={retry} />
      </div>
    );
  }

  const customer = state.data;
  const tenure = tenureRisk(customer.tenure);
  const charges = chargesLevel(customer.monthly_charges);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4 lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-light text-accent">
              <UserRound className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-tight break-all text-text-primary">{customer.customerID}</h2>
              <RiskBadge level={customer.risk_level} />
            </div>
          </div>
          <ProbabilityGauge probability={customer.churn_probability} riskLevel={customer.risk_level} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <InfoCard
            title="Contract"
            rows={[
              { label: "Contract Type", value: customer.contract },
              { label: "Tenure", value: `${customer.tenure} ${customer.tenure === 1 ? "month" : "months"}` },
              { label: "Paperless Billing", value: customer.paperless_billing },
            ]}
          />
          <InfoCard
            title="Billing"
            rows={[
              { label: "Monthly Charges", value: `$${customer.monthly_charges.toFixed(2)}` },
              { label: "Total Charges", value: `$${customer.total_charges.toFixed(2)}` },
              { label: "Payment Method", value: customer.payment_method },
            ]}
          />
          <InfoCard
            title="Service"
            rows={[
              { label: "Internet Service", value: customer.internet_service },
              { label: "Phone Service", value: customer.phone_service },
              { label: "Gender", value: customer.gender },
            ]}
          />
        </div>

        <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card">
          <h2 className="font-semibold tracking-tight text-text-primary">SHAP Churn Drivers</h2>
          <ReasonsChart reasons={customer.top_reasons} />
        </section>

        <Link href={`/retention?customer=${encodeURIComponent(customer.customerID)}`} className="w-full">
          <Button variant="solid" className="w-full">
            Generate Retention Message
          </Button>
        </Link>
      </div>

      <div className="flex w-full flex-col gap-3 lg:w-[220px]">
        <h2 className="font-semibold tracking-tight text-text-primary">Risk Signals</h2>
        <SignalCard icon={FileText} label="Contract Type" value={customer.contract} />
        <SignalCard icon={Clock} label="Tenure Risk" value={tenure.label} tone={tenure.tone} />
        <SignalCard icon={DollarSign} label="Charges Level" value={charges.label} tone={charges.tone} />
      </div>
    </div>
  );
}

function CustomersWorkspacePage({
  customers,
  initialSelectedId,
}: {
  customers: AtRiskCustomer[];
  initialSelectedId: string | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? customers[0]?.customerID ?? null);
  const highRiskCount = customers.filter((c) => c.risk_level === "high").length;
  const avgProbability = customers.length
    ? customers.reduce((sum, c) => sum + c.churn_probability, 0) / customers.length
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <Reveal index={0}>
        <div className="flex flex-wrap gap-3">
          <StatChip label="total shown" value={<AnimatedNumber value={customers.length} />} />
          <StatChip label="high risk" value={<AnimatedNumber value={highRiskCount} />} />
          <StatChip
            label="avg probability"
            value={<AnimatedNumber value={avgProbability * 100} format={(n) => `${n.toFixed(1)}%`} />}
          />
        </div>
      </Reveal>

      <div className="flex flex-col gap-4 lg:flex-row">
        <Reveal index={1}>
          <CustomerList customers={customers} selectedId={selectedId} onSelect={setSelectedId} />
        </Reveal>

        <Reveal index={2} className="flex min-w-0 flex-1">
          {selectedId ? (
            <CustomerWorkspace key={selectedId} id={selectedId} />
          ) : (
            <div className="flex min-h-[300px] flex-1 items-center justify-center rounded-card border border-border bg-surface p-5 shadow-card">
              <EmptyState
                icon={UserRound}
                size="large"
                title="No customer selected"
                description="Pick a customer from the list to see their full profile, churn drivers, and retention tools."
              />
            </div>
          )}
        </Reveal>
      </div>
    </div>
  );
}

export function CustomersWorkspace({ initialCustomerId }: { initialCustomerId: string | null }) {
  const high = useApiData<AtRiskCustomer[]>(`/customers/by-risk?level=high&n=${SAMPLE_SIZE}`);
  const medium = useApiData<AtRiskCustomer[]>(`/customers/by-risk?level=medium&n=${SAMPLE_SIZE}`);

  const loading = high.state.status === "loading" || medium.state.status === "loading";
  const errored = high.state.status === "error" ? high.state : medium.state.status === "error" ? medium.state : null;

  function retryAll() {
    high.retry();
    medium.retry();
  }

  const customers =
    high.state.status === "ready" && medium.state.status === "ready" ? [...high.state.data, ...medium.state.data] : null;

  if (loading) return <LoadingSpinner label="Loading customers" />;
  if (errored) return <ErrorState message={errored.message} onRetry={retryAll} />;
  if (!customers) return null;
  return <CustomersWorkspacePage customers={customers} initialSelectedId={initialCustomerId} />;
}
