"use client";

import clsx from "clsx";
import { Check, Copy, Info, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { Reveal } from "@/components/ui/Reveal";
import { apiPost, type RetentionOffer, type RetentionRecommendationResult, type RetentionSource } from "@/lib/api";

const CURRENCY = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const PERCENT = new Intl.NumberFormat("en-US", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const COPY_FEEDBACK_MS = 2000;

type GenerateState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; result: RetentionRecommendationResult };

export function SourceBadge({ source }: { source: RetentionSource }) {
  return (
    <span
      className={clsx(
        "rounded-badge px-2 py-0.5 text-[10px] font-medium whitespace-nowrap",
        source === "groq" ? "bg-accent-light text-accent" : "bg-warning-tint text-warning",
      )}
    >
      {source === "groq" ? "AI generated" : "Template fallback"}
    </span>
  );
}

function DriverChips({ drivers }: { drivers: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {drivers.map((driver) => (
        <span key={driver} className="rounded-full bg-surface-raised px-3 py-1 text-xs text-text-secondary">
          {driver}
        </span>
      ))}
    </div>
  );
}

function OffersTable({ offers, recommendedId }: { offers: RetentionOffer[]; recommendedId: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-text-secondary">
          <tr className="border-b border-border">
            <th scope="col" className="py-2 pr-3 text-xs font-medium">Offer</th>
            <th scope="col" className="py-2 pr-3 text-right text-xs font-medium">Cost</th>
            <th scope="col" className="py-2 pr-3 text-right text-xs font-medium">Hypothetical Probability</th>
            <th scope="col" className="py-2 pr-3 text-right text-xs font-medium">Est. Expected Value</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((offer) => {
            const isRecommended = offer.id === recommendedId;
            return (
              <tr key={offer.id} className={clsx("border-b border-border", isRecommended ? "bg-accent-light" : "hover:bg-surface-raised")}>
                <td className="py-2 pr-3">
                  <p className={clsx("font-medium", isRecommended ? "text-accent" : "text-text-primary")}>
                    {offer.name}
                    {isRecommended && (
                      <span className="ml-2 rounded-badge bg-accent px-1.5 py-0.5 text-[9px] text-on-accent">Recommended</span>
                    )}
                  </p>
                  <p className="text-xs text-text-secondary">{offer.description}</p>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-text-primary">{CURRENCY.format(offer.cost)}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-text-primary">
                  {offer.hypothetical_new_probability === null ? "Not simulated" : PERCENT.format(offer.hypothetical_new_probability)}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-text-primary">
                  {offer.estimated_expected_value === null ? "Not estimated" : CURRENCY.format(offer.estimated_expected_value)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function RetentionRecommendationPanel({
  customerId,
  onGenerated,
}: {
  customerId: string;
  onGenerated?: () => void;
}) {
  const [state, setState] = useState<GenerateState>({ status: "idle" });
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function generate() {
    setState({ status: "loading" });
    try {
      const result = await apiPost<RetentionRecommendationResult>("/retention/recommend", { customer_id: customerId });
      setState({ status: "ready", result });
      setEmailSubject(result.recommendation.email_subject);
      setEmailBody(result.recommendation.email_body);
      onGenerated?.();
    } catch (error) {
      setState({ status: "error", message: (error as Error).message });
    }
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${emailBody}`);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    setTimeout(() => setCopyState("idle"), COPY_FEEDBACK_MS);
  }

  const loading = state.status === "loading";

  return (
    <div className="flex flex-col gap-4">
      <Button variant="solid" onClick={generate} disabled={loading} className="w-full">
        {loading && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
        {loading ? "Generating recommendation" : "Generate Recommendation"}
      </Button>

      {state.status === "error" && <ErrorState message={state.message} onRetry={generate} />}

      {state.status === "ready" && (
        <>
          <Reveal index={0}>
            <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold tracking-tight text-text-primary">Recommendation Summary</h3>
                <SourceBadge source={state.result.source} />
              </div>
              <p className="text-text-secondary">{state.result.recommendation.summary}</p>
              <DriverChips drivers={state.result.top_drivers} />
            </div>
          </Reveal>

          <Reveal index={1}>
            <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-card">
              <h3 className="font-semibold tracking-tight text-text-primary">Eligible Offers</h3>
              <OffersTable offers={state.result.eligible_offers} recommendedId={state.result.recommendation.recommended_offer_id} />
            </div>
          </Reveal>

          <Reveal index={2}>
            <div className="grid gap-3 rounded-card border border-border bg-surface p-4 shadow-card sm:grid-cols-2">
              <div>
                <h3 className="font-semibold tracking-tight text-text-primary">Strategy</h3>
                <p className="mt-1 text-text-secondary">{state.result.recommendation.strategy}</p>
              </div>
              <div className="flex flex-col gap-2 text-xs sm:items-end">
                <span className="text-text-secondary">
                  Channel: <span className="font-medium text-text-primary capitalize">{state.result.recommendation.communication_channel}</span>
                </span>
                <span className="text-text-secondary">
                  Tone: <span className="font-medium text-text-primary">{state.result.recommendation.tone}</span>
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal index={3}>
            <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold tracking-tight text-text-primary">Email</h3>
                <Button onClick={copyEmail}>
                  {copyState === "copied" ? <Check aria-hidden className="size-3.5" /> : <Copy aria-hidden className="size-3.5" />}
                  {copyState === "copied" ? "Copied" : "Copy"}
                </Button>
              </div>
              <input
                value={emailSubject}
                onChange={(event) => setEmailSubject(event.target.value)}
                aria-label="Email subject"
                className="rounded-button border border-border bg-bg px-3 py-2 text-sm font-medium text-text-primary outline-none focus-visible:border-accent"
              />
              <textarea
                value={emailBody}
                onChange={(event) => setEmailBody(event.target.value)}
                rows={8}
                aria-label="Email body"
                className="rounded-button border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus-visible:border-accent"
              />
              {copyState === "failed" && (
                <p aria-live="polite" className="text-xs text-text-secondary">
                  Could not copy to the clipboard. Select the text and copy it by hand.
                </p>
              )}
            </div>
          </Reveal>

          <p className="flex items-start gap-2 text-xs text-text-muted">
            <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            Hypothetical probabilities and expected values are model-based estimates, not guarantees.
          </p>
        </>
      )}
    </div>
  );
}
