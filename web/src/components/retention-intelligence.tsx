"use client";

import clsx from "clsx";
import { Mail, MailOpen, Search, TrendingUp, TriangleAlert, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { ReasonsChart } from "@/components/reasons-chart";
import { RetentionPanel } from "@/components/retention-panel";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { StatCard } from "@/components/ui/StatCard";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Reveal } from "@/components/ui/Reveal";
import type { AtRiskCustomer } from "@/lib/api";
import { useApiData } from "@/lib/use-api-data";
import { AT_RISK_DEFINITION, HIGH_RISK_DEFINITION, isAtRisk, isHighRisk } from "@/lib/risk";

const SAMPLE_SIZE = 20;
const PERCENT = new Intl.NumberFormat("en-US", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });

function formatProbability(probability: number) {
  return `${(probability * 100).toFixed(2)}%`;
}

function CustomerPicker({
  customers,
  selected,
  onSelect,
}: {
  customers: AtRiskCustomer[];
  selected: AtRiskCustomer | null;
  onSelect: (customer: AtRiskCustomer) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? customers.filter((customer) => customer.customerID.toLowerCase().includes(query)) : customers;
  }, [customers, search]);

  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 shadow-card lg:w-[360px]">
      <h2 className="font-semibold tracking-tight text-text-primary">At-Risk Customers</h2>
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
      <ul className="flex max-h-[480px] flex-col overflow-y-auto">
        {filtered.length === 0 && <li className="py-8 text-center text-text-secondary">No customers match.</li>}
        {filtered.map((customer) => {
          const isSelected = selected?.customerID === customer.customerID;
          return (
            <li key={customer.customerID}>
              <button
                type="button"
                onClick={() => onSelect(customer)}
                className={clsx(
                  "flex h-12 w-full items-center gap-2 border-l-[3px] pr-2 pl-2 text-left transition-colors",
                  isSelected
                    ? "border-l-accent bg-accent-light font-medium text-accent"
                    : "border-l-transparent text-text-primary hover:bg-surface-raised",
                )}
              >
                <span className="min-w-0 flex-1 whitespace-nowrap">{customer.customerID}</span>
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

function CustomerDetail({ customer, onGenerated }: { customer: AtRiskCustomer | null; onGenerated: () => void }) {
  if (!customer) {
    return (
      <div className="flex min-h-[300px] flex-1 items-center justify-center rounded-card border border-border bg-surface p-5 shadow-card">
        <EmptyState
          icon={MailOpen}
          size="large"
          title="No customer selected"
          description="Pick a customer from the list to see their churn drivers and generate a retention message."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 rounded-card border border-border bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold tracking-tight break-all text-text-primary">{customer.customerID}</h2>
        <RiskBadge level={customer.risk_level} />
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="text-text-secondary">Why this customer is at risk</h3>
        <ReasonsChart reasons={customer.top_reasons} />
      </section>

      <RetentionPanel key={customer.customerID} customerId={customer.customerID} variant="callout" onGenerated={onGenerated} />
    </div>
  );
}

function RetentionIntelligence({ customers, initialSelectedId }: { customers: AtRiskCustomer[]; initialSelectedId: string | null }) {
  const preselected = initialSelectedId ? customers.find((c) => c.customerID === initialSelectedId) : undefined;
  const [selected, setSelected] = useState<AtRiskCustomer | null>(preselected ?? customers[0] ?? null);
  const [messagesGenerated, setMessagesGenerated] = useState(0);

  const atRiskCount = customers.filter((c) => isAtRisk(c.churn_probability)).length;
  const highRiskCount = customers.filter((c) => isHighRisk(c.risk_level)).length;
  const avgProbability = customers.length
    ? customers.reduce((sum, c) => sum + c.churn_probability, 0) / customers.length
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Reveal index={0}>
          <StatCard
            label="At-Risk Customers"
            value={<AnimatedNumber value={atRiskCount} />}
            subtitle="Candidates for a retention message"
            icon={TrendingUp}
            tone="accent"
            definition={AT_RISK_DEFINITION}
          />
        </Reveal>
        <Reveal index={1}>
          <StatCard
            label="High Risk"
            value={<AnimatedNumber value={highRiskCount} />}
            subtitle="Most urgent to reach out to"
            icon={TriangleAlert}
            tone="high"
            definition={HIGH_RISK_DEFINITION}
          />
        </Reveal>
        <Reveal index={2}>
          <StatCard
            label="Avg. Churn Probability"
            value={<AnimatedNumber value={avgProbability * 100} format={(n) => PERCENT.format(n / 100)} />}
            subtitle="Mean across the customers loaded here"
            icon={Users}
            tone="accent"
          />
        </Reveal>
        <Reveal index={3}>
          <StatCard
            label="Messages Generated"
            value={<AnimatedNumber value={messagesGenerated} />}
            subtitle="This session"
            icon={Mail}
            tone="accent"
          />
        </Reveal>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        <Reveal index={4}>
          <CustomerPicker customers={customers} selected={selected} onSelect={setSelected} />
        </Reveal>
        <Reveal index={5} className="flex min-w-0 flex-1">
          <CustomerDetail customer={selected} onGenerated={() => setMessagesGenerated((count) => count + 1)} />
        </Reveal>
      </div>
    </div>
  );
}

export function RetentionIntelligenceWorkspace({ initialSelectedId }: { initialSelectedId: string | null }) {
  const { state, retry } = useApiData<AtRiskCustomer[]>(`/customers/at-risk?n=${SAMPLE_SIZE}`);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Retention Intelligence"
        subtitle="Pick an at-risk customer to see their churn drivers and generate an AI retention message."
      />

      {state.status === "loading" && <LoadingSpinner label="Loading customers" />}
      {state.status === "error" && <ErrorState message={state.message} onRetry={retry} />}
      {state.status === "ready" && <RetentionIntelligence customers={state.data} initialSelectedId={initialSelectedId} />}
    </div>
  );
}
