"use client";

import { useState } from "react";
import { Button } from "@/components/button";
import { CustomerDrawer } from "@/components/customer-drawer";
import { RiskBadge } from "@/components/risk-badge";
import { ErrorNotice, LoadingNotice } from "@/components/status-notice";
import type { AtRiskCustomer } from "@/lib/api";
import { useApiData } from "@/lib/use-api-data";

const AT_RISK_COUNT = 50;

const HEADER_CELL = "px-3 py-2.5 text-xs font-medium whitespace-nowrap first:pl-0 last:pr-0";
const BODY_CELL = "px-3 py-3 first:pl-0 last:pr-0";
const NUMBER_CELL = "text-right tabular-nums";

function formatProbability(probability: number) {
  return `${(probability * 100).toFixed(2)}%`;
}

export default function AtRiskCustomersPage() {
  const { state, retry } = useApiData<AtRiskCustomer[]>(`/customers/at-risk?n=${AT_RISK_COUNT}`);
  const [selected, setSelected] = useState<AtRiskCustomer | null>(null);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight">At-Risk Customers</h1>
        <p className="mt-1 text-ink-secondary">Active customers with the highest predicted churn risk.</p>
      </div>

      {state.status === "loading" && <LoadingNotice label="Loading customers" />}
      {state.status === "error" && <ErrorNotice message={state.message} onRetry={retry} />}
      {state.status === "ready" && state.data.length === 0 && (
        <p className="py-16 text-center text-ink-secondary">No at-risk customers found.</p>
      )}
      {state.status === "ready" && state.data.length > 0 && (
        <div className="relative overflow-x-auto">
          <table className="w-full">
            <thead className="text-left text-ink-secondary">
              <tr className="border-b border-line">
                <th scope="col" className={HEADER_CELL}>Customer ID</th>
                <th scope="col" className={`${HEADER_CELL} text-right`}>Monthly Charges</th>
                <th scope="col" className={HEADER_CELL}>Risk Level</th>
                <th scope="col" className={`${HEADER_CELL} text-right`}>Churn Probability</th>
                <th scope="col" className={HEADER_CELL}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {state.data.map((customer) => (
                <tr key={customer.customerID} className="border-b border-line">
                  <td className={`${BODY_CELL} font-medium whitespace-nowrap`}>{customer.customerID}</td>
                  <td className={`${BODY_CELL} ${NUMBER_CELL}`}>{customer.monthly_charges.toFixed(2)}</td>
                  <td className={BODY_CELL}>
                    <RiskBadge level={customer.risk_level} />
                  </td>
                  <td className={`${BODY_CELL} ${NUMBER_CELL}`}>{formatProbability(customer.churn_probability)}</td>
                  <td className={`${BODY_CELL} text-right`}>
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
