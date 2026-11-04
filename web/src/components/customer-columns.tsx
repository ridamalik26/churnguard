import Link from "next/link";
import { Button } from "@/components/ui/Button";
import type { Column } from "@/components/ui/DataTable";
import { RiskBadge } from "@/components/ui/RiskBadge";
import type { AtRiskCustomer } from "@/lib/api";

function formatProbability(probability: number) {
  return `${(probability * 100).toFixed(2)}%`;
}

export const CUSTOMER_COLUMNS: Column<AtRiskCustomer>[] = [
  {
    key: "customerID",
    header: "Customer ID",
    sortValue: (c) => c.customerID,
    render: (c) => <span className="font-medium text-text-primary">{c.customerID}</span>,
  },
  {
    key: "monthly_charges",
    header: "Monthly Charges",
    align: "right",
    sortValue: (c) => c.monthly_charges,
    render: (c) => `$${c.monthly_charges.toFixed(2)}`,
  },
  { key: "risk_level", header: "Risk Level", render: (c) => <RiskBadge level={c.risk_level} /> },
  {
    key: "churn_probability",
    header: "Churn Probability",
    align: "right",
    sortValue: (c) => c.churn_probability,
    render: (c) => formatProbability(c.churn_probability),
  },
  {
    key: "actions",
    header: "",
    align: "right",
    render: (c) => (
      <Link href={`/customers?customer=${encodeURIComponent(c.customerID)}`}>
        <Button variant="outline-accent">View Profile</Button>
      </Link>
    ),
  },
];
