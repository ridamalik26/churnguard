import { CustomersWorkspace } from "@/components/customers-workspace";
import { PageHeader } from "@/components/ui/PageHeader";

export const instant = false;

export default async function AtRiskCustomersPage(props: PageProps<"/customers">) {
  const searchParams = await props.searchParams;
  const customer = searchParams.customer;
  const initialCustomerId = typeof customer === "string" ? customer : null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <PageHeader title="At-Risk Customers" subtitle="Browse at-risk customers, review their churn drivers, and send a retention message." />
      <CustomersWorkspace initialCustomerId={initialCustomerId} />
    </div>
  );
}
