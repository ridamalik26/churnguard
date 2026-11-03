"use client";

import { useState } from "react";
import { Button } from "@/components/button";
import { CustomerDrawer } from "@/components/customer-drawer";
import { RiskBadge } from "@/components/risk-badge";
import { ErrorNotice, LoadingNotice } from "@/components/status-notice";
import type { AtRiskCustomer } from "@/lib/api";
import { useApiData } from "@/lib/use-api-data";

const AT_RISK_COUNT = 50;

const HEADER_CELL = "px-4 py-3 font-medium whitespace-nowrap";
const NUMBER_CELL = "text-right tabular-nums";

function formatProbability(probability: number) {
  return `${(probability * 100).toFixed(2)}%`;
}

export default function AtRiskCustomersPage() {
  const { state, retry } = useApiData<AtRiskCustomer[]>(`/customers/at-risk?n=${AT_RISK_COUNT}`);
  const [selected, setSelected] = useState<AtRiskCustomer | null>(null);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">At-Risk Customers</h1>
        <p className="mt-1 text-sm text-ink-secondary">Active customers with the highest predicted churn risk.</p>
      </div>

      {state.status === "loading" && <LoadingNotice label="Loading customers" />}
      {state.status === "error" && <ErrorNotice message={state.message} onRetry={retry} />}
      {state.status === "ready" && state.data.length === 0 && (
        <p className="rounded-lg border border-line bg-surface px-4 py-12 text-center text-sm text-ink-secondary">
          No at-risk customers found.
        </p>
      )}
      {state.status === "ready" && state.data.length > 0 && (
        <div className="relative overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full text-sm">
            <thead className="border-b border-line text-left text-ink-secondary">
              <tr>
                <th scope="col" className={HEADER_CELL}>Customer ID</th>
                <th scope="col" className={`${HEADER_CELL} text-right`}>Monthly Charges</th>
                <th scope="col" className={HEADER_CELL}>Risk Level</th>
                <th scope="col" className={`${HEADER_CELL} text-right`}>Churn Probability</th>
                <th scope="col" className={HEADER_CELL}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {state.data.map((customer) => (
                <tr key={customer.customerID}>
                  <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{customer.customerID}</td>
                  <td className={`px-4 py-3 ${NUMBER_CELL}`}>{customer.monthly_charges.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <RiskBadge level={customer.risk_level} />
                  </td>
                  <td className={`px-4 py-3 ${NUMBER_CELL}`}>{formatProbability(customer.churn_probability)}</td>
                  <td className="px-4 py-2 text-right">
                    <Button onClick={() => setSelected(customer)}>View Details</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && <CustomerDrawer key={selected.customerID} customer={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
