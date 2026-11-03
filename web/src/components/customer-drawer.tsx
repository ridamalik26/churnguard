"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type MouseEvent } from "react";
import { ReasonsChart } from "@/components/reasons-chart";
import { RetentionPanel } from "@/components/retention-panel";
import { RiskBadge } from "@/components/risk-badge";
import type { AtRiskCustomer } from "@/lib/api";

type CustomerDrawerProps = {
  customer: AtRiskCustomer;
  onClose: () => void;
};

export function CustomerDrawer({ customer, onClose }: CustomerDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  function closeOnBackdropClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) dialogRef.current?.close();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={closeOnBackdropClick}
      aria-labelledby="drawer-title"
      className="drawer fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full max-w-md border-l border-line bg-surface text-ink backdrop:bg-black/40"
    >
      <div className="flex min-h-full flex-col gap-6 p-6">
        <header className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h2 id="drawer-title" className="font-mono text-lg font-semibold break-all">
              {customer.customerID}
            </h2>
            <RiskBadge level={customer.risk_level} />
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close details"
            className="flex size-9 shrink-0 items-center justify-center rounded-md border border-line text-ink-secondary transition-colors hover:bg-line hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <X aria-hidden className="size-4" />
          </button>
        </header>

        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">Top Reasons</h3>
          <ReasonsChart reasons={customer.top_reasons} />
        </section>

        <RetentionPanel customerId={customer.customerID} />
      </div>
    </dialog>
  );
}
