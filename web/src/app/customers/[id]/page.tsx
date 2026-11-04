import { CustomerDetailView } from "@/components/customer-detail-view";

export const instant = false;

export default async function CustomerDetailPage(props: PageProps<"/customers/[id]">) {
  const { id } = await props.params;
  return <CustomerDetailView id={id} />;
}
