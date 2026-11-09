import { RetentionIntelligenceWorkspace } from "@/components/retention-intelligence";

export const instant = false;

export default async function RetentionIntelligencePage(props: PageProps<"/retention">) {
  const searchParams = await props.searchParams;
  const customer = searchParams.customer;
  const initialSelectedId = typeof customer === "string" ? customer : null;

  return <RetentionIntelligenceWorkspace initialSelectedId={initialSelectedId} />;
}
