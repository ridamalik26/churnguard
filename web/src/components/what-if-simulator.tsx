"use client";

import clsx from "clsx";
import { Info, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { ProbabilityGauge } from "@/components/probability-gauge";
import { apiPost, type CustomerDetail, type SimulationOverrides, type SimulationResult } from "@/lib/api";

const CONTRACT_OPTIONS = ["Month-to-month", "One year", "Two year"];
const INTERNET_OPTIONS = ["DSL", "Fiber optic", "No"];
const PAYMENT_OPTIONS = ["Bank transfer (automatic)", "Credit card (automatic)", "Electronic check", "Mailed check"];
const YES_NO_OPTIONS = ["No", "Yes"];
const SUPPORT_OPTIONS = ["No", "No internet service", "Yes"];

type Overrides = Required<SimulationOverrides>;

type SimulatorState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; result: SimulationResult };

function initialOverrides(customer: CustomerDetail): Overrides {
  return {
    Contract: customer.contract,
    tenure: customer.tenure,
    MonthlyCharges: customer.monthly_charges,
    InternetService: customer.internet_service,
    PaymentMethod: customer.payment_method,
    PaperlessBilling: customer.paperless_billing,
    TechSupport: customer.tech_support,
    OnlineSecurity: customer.online_security,
  };
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-xs font-medium text-text-secondary">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-button border border-border bg-bg px-3 py-2 text-text-primary outline-none focus-visible:border-accent"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="flex items-center justify-between text-xs font-medium text-text-secondary">
        <span>{label}</span>
        <span className="tabular-nums text-text-primary">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-border accent-accent"
      />
    </label>
  );
}

export function WhatIfSimulator({ customer }: { customer: CustomerDetail }) {
  const [overrides, setOverrides] = useState<Overrides>(() => initialOverrides(customer));
  const [state, setState] = useState<SimulatorState>({ status: "idle" });

  function updateField<K extends keyof Overrides>(field: K, value: Overrides[K]) {
    setOverrides((current) => ({ ...current, [field]: value }));
  }

  function reset() {
    setOverrides(initialOverrides(customer));
    setState({ status: "idle" });
  }

  async function runSimulation() {
    setState({ status: "loading" });
    try {
      const result = await apiPost<SimulationResult>("/simulate", {
        customer_id: customer.customerID,
        overrides,
      });
      setState({ status: "ready", result });
    } catch (error) {
      setState({ status: "error", message: (error as Error).message });
    }
  }

  const loading = state.status === "loading";

  return (
    <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 shadow-card">
      <div>
        <h2 className="font-semibold tracking-tight text-text-primary">What-if Simulator</h2>
        <p className="mt-1 text-text-secondary">Adjust this customer&rsquo;s plan details to see how the model&rsquo;s prediction would change.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SelectField label="Contract" value={overrides.Contract} options={CONTRACT_OPTIONS} onChange={(value) => updateField("Contract", value)} />
        <SelectField
          label="Internet Service"
          value={overrides.InternetService}
          options={INTERNET_OPTIONS}
          onChange={(value) => updateField("InternetService", value)}
        />
        <SelectField
          label="Payment Method"
          value={overrides.PaymentMethod}
          options={PAYMENT_OPTIONS}
          onChange={(value) => updateField("PaymentMethod", value)}
        />
        <SelectField
          label="Paperless Billing"
          value={overrides.PaperlessBilling}
          options={YES_NO_OPTIONS}
          onChange={(value) => updateField("PaperlessBilling", value)}
        />
        <SelectField
          label="Tech Support"
          value={overrides.TechSupport}
          options={SUPPORT_OPTIONS}
          onChange={(value) => updateField("TechSupport", value)}
        />
        <SelectField
          label="Online Security"
          value={overrides.OnlineSecurity}
          options={SUPPORT_OPTIONS}
          onChange={(value) => updateField("OnlineSecurity", value)}
        />
        <SliderField
          label="Tenure"
          value={overrides.tenure}
          min={0}
          max={72}
          step={1}
          format={(value) => `${value} ${value === 1 ? "month" : "months"}`}
          onChange={(value) => updateField("tenure", value)}
        />
        <SliderField
          label="Monthly Charges"
          value={overrides.MonthlyCharges}
          min={0}
          max={150}
          step={0.5}
          format={(value) => `$${value.toFixed(2)}`}
          onChange={(value) => updateField("MonthlyCharges", value)}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="solid" onClick={runSimulation} disabled={loading}>
          {loading && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
          {loading ? "Running simulation" : "Run Simulation"}
        </Button>
        <Button onClick={reset} disabled={loading}>
          Reset
        </Button>
      </div>

      {state.status === "error" && <ErrorState message={state.message} />}

      {state.status === "ready" && (
        <div className="flex flex-col gap-4 rounded-card border border-border bg-surface-raised p-4 sm:flex-row sm:items-center sm:justify-around">
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs font-medium text-text-secondary">Before</p>
            <ProbabilityGauge probability={state.result.original_probability} riskLevel={customer.risk_level} />
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs font-medium text-text-secondary">After</p>
            <ProbabilityGauge probability={state.result.new_probability} riskLevel={state.result.new_risk_level} />
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <p className="text-xs font-medium text-text-secondary">Change</p>
            <p className={clsx("text-lg font-bold", state.result.probability_change <= 0 ? "text-success" : "text-danger")}>
              {state.result.probability_change >= 0 ? "+" : ""}
              {(state.result.probability_change * 100).toFixed(2)} pp
            </p>
          </div>
        </div>
      )}

      <p className="flex items-start gap-2 text-xs text-text-muted">
        <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
        This is a hypothetical model scenario. It does not prove that changing a feature will prevent churn.
      </p>
    </section>
  );
}
