"use client";

import Link from "next/link";
import { ReasonsChart } from "@/components/reasons-chart";
import { RetentionPanel } from "@/components/retention-panel";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { RiskBadge } from "@/components/ui/RiskBadge";
import type { CustomerDetail } from "@/lib/api";
import { useApiData } from "@/lib/use-api-data";

function formatProbability(probability: number) {
  return `${(probability * 100).toFixed(2)}%`;
}

const CONTRACT_FIELDS: { label: string; value: (c: CustomerDetail) => string }[] = [
  { label: "Contract Type", value: (c) => c.contract },
  { label: "Tenure", value: (c) => `${c.tenure} ${c.tenure === 1 ? "month" : "months"}` },
  { label: "Paperless Billing", value: (c) => c.paperless_billing },
];

const BILLING_FIELDS: { label: string; value: (c: CustomerDetail) => string }[] = [
  { label: "Monthly Charges", value: (c) => c.monthly_charges.toFixed(2) },
  { label: "Total Charges", value: (c) => c.total_charges.toFixed(2) },
  { label: "Payment Method", value: (c) => c.payment_method },
];

const SERVICE_FIELDS: { label: string; value: (c: CustomerDetail) => string }[] = [
  { label: "Internet Service", value: (c) => c.internet_service },
  { label: "Phone Service", value: (c) => c.phone_service },
  { label: "Gender", value: (c) => c.gender },
];

function InfoCard({ title, fields, customer }: { title: string; fields: typeof CONTRACT_FIELDS; customer: CustomerDetail }) {
  return (
    <div className="flex flex-col gap-3 rounded-card bg-surface p-5 shadow-card">
      <h2 className="font-semibold tracking-tight text-text-primary">{title}</h2>
      <dl className="flex flex-col gap-2.5">
        {fields.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <dt className="text-text-secondary">{label}</dt>
            <dd className="font-medium text-text-primary">{value(customer)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function CustomerProfile({ customer }: { customer: CustomerDetail }) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Link href="/customers" className="self-start text-text-secondary transition-colors hover:text-text-primary">
        Back to At-Risk Customers
      </Link>

      <div className="flex flex-col gap-4 rounded-card bg-surface p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-semibold tracking-tight break-all text-text-primary">{customer.customerID}</h1>
          <RiskBadge level={customer.risk_level} />
        </div>
        <div className="text-right">
          <p className="text-text-secondary">Churn Probability</p>
          <p className="text-[32px] leading-none font-semibold tracking-tight text-accent">
            {formatProbability(customer.churn_probability)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <InfoCard title="Contract Details" fields={CONTRACT_FIELDS} customer={customer} />
        <InfoCard title="Billing" fields={BILLING_FIELDS} customer={customer} />
        <InfoCard title="Service" fields={SERVICE_FIELDS} customer={customer} />
      </div>

      <section className="flex flex-col gap-3 rounded-card bg-surface p-5 shadow-card">
        <h2 className="font-semibold tracking-tight text-text-primary">Top Reasons</h2>
        <ReasonsChart reasons={customer.top_reasons} />
      </section>

      <section className="rounded-card bg-surface p-5 shadow-card">
        <h2 className="mb-4 font-semibold tracking-tight text-text-primary">Retention Message</h2>
        <RetentionPanel customerId={customer.customerID} />
      </section>
    </div>
  );
}

export function CustomerDetailView({ id }: { id: string }) {
  const { state, retry } = useApiData<CustomerDetail>(`/customers/${encodeURIComponent(id)}`);

  if (state.status === "loading") return <LoadingSpinner label="Loading customer" />;
  if (state.status === "error") return <ErrorState message={state.message} onRetry={retry} />;
  return <CustomerProfile customer={state.data} />;
}
