"use client";

import clsx from "clsx";
import { Check, Copy, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/ErrorState";
import { apiPost, type RetentionMessage } from "@/lib/api";

const COPY_FEEDBACK_MS = 2000;

type GenerateState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; message: RetentionMessage };

function CopyButton({ message, onLight }: { message: RetentionMessage; onLight?: boolean }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(`Subject: ${message.subject}\n\n${message.body}`);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    setTimeout(() => setCopyState("idle"), COPY_FEEDBACK_MS);
  }

  return (
    <>
      <Button
        onClick={copyMessage}
        className={onLight ? "shrink-0 border-on-accent/40 text-on-accent hover:border-on-accent hover:text-on-accent" : "shrink-0"}
      >
        {copyState === "copied" ? <Check aria-hidden className="size-3.5" /> : <Copy aria-hidden className="size-3.5" />}
        {copyState === "copied" ? "Copied" : "Copy"}
      </Button>
      {copyState === "failed" && (
        <p aria-live="polite" className="mt-2 w-full text-xs text-text-secondary">
          Could not copy to the clipboard. Select the text and copy it by hand.
        </p>
      )}
    </>
  );
}

function MessageCard({ message, variant }: { message: RetentionMessage; variant: "default" | "callout" }) {
  if (variant === "callout") {
    return (
      <article className="overflow-hidden rounded-card border border-border">
        <div className="flex items-center justify-between gap-3 bg-accent px-4 py-3">
          <h3 className="min-w-0 truncate font-semibold text-on-accent">{message.subject}</h3>
          <CopyButton message={message} onLight />
        </div>
        <div className="bg-surface p-4 break-words whitespace-pre-wrap text-text-primary">{message.body}</div>
      </article>
    );
  }

  return (
    <article className="rounded-card border border-border bg-surface-raised p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-text-secondary">Subject</p>
          <h3 className="mt-0.5 font-semibold break-words text-text-primary">{message.subject}</h3>
        </div>
        <CopyButton message={message} />
      </div>
      <p className="mt-3 border-t border-border pt-3 break-words whitespace-pre-wrap text-text-primary">{message.body}</p>
    </article>
  );
}

export function RetentionPanel({
  customerId,
  variant = "default",
  onGenerated,
}: {
  customerId: string;
  variant?: "default" | "callout";
  onGenerated?: () => void;
}) {
  const [state, setState] = useState<GenerateState>({ status: "idle" });

  async function generateMessage() {
    setState({ status: "loading" });
    try {
      const message = await apiPost<RetentionMessage>("/retention-message", { customer_id: customerId });
      setState({ status: "ready", message });
      onGenerated?.();
    } catch (error) {
      setState({ status: "error", message: (error as Error).message });
    }
  }

  const loading = state.status === "loading";

  return (
    <section className={clsx("flex flex-col gap-4", variant === "callout" && "gap-3")}>
      <Button variant="solid" onClick={generateMessage} disabled={loading} className="w-full">
        {loading && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
        {loading ? "Generating message" : "Generate retention message"}
      </Button>
      {state.status === "error" && <ErrorState message={state.message} />}
      {state.status === "ready" && <MessageCard message={state.message} variant={variant} />}
    </section>
  );
}
