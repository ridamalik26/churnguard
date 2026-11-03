"use client";

import { Check, Copy, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/button";
import { ErrorNotice } from "@/components/status-notice";
import { apiPost, type RetentionMessage } from "@/lib/api";

const COPY_FEEDBACK_MS = 2000;

type GenerateState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; message: RetentionMessage };

function MessageCard({ message }: { message: RetentionMessage }) {
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
    <article className="rounded-lg border border-line bg-page p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-secondary">Subject</p>
          <h3 className="mt-0.5 text-sm font-semibold break-words">{message.subject}</h3>
        </div>
        <Button onClick={copyMessage} className="shrink-0">
          {copyState === "copied" ? <Check aria-hidden className="size-4" /> : <Copy aria-hidden className="size-4" />}
          {copyState === "copied" ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="mt-3 border-t border-line pt-3 text-sm break-words whitespace-pre-wrap">{message.body}</p>
      <p aria-live="polite" className="mt-2 text-xs text-red-700 empty:hidden dark:text-red-300">
        {copyState === "failed" ? "Could not copy to the clipboard. Select the text and copy it by hand." : ""}
      </p>
    </article>
  );
}

export function RetentionPanel({ customerId }: { customerId: string }) {
  const [state, setState] = useState<GenerateState>({ status: "idle" });

  async function generateMessage() {
    setState({ status: "loading" });
    try {
      const message = await apiPost<RetentionMessage>("/retention-message", { customer_id: customerId });
      setState({ status: "ready", message });
    } catch (error) {
      setState({ status: "error", message: (error as Error).message });
    }
  }

  const loading = state.status === "loading";

  return (
    <section className="flex flex-col gap-4">
      <Button variant="primary" onClick={generateMessage} disabled={loading} className="w-full">
        {loading && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
        {loading ? "Generating Message" : "Generate Retention Message"}
      </Button>
      {state.status === "error" && <ErrorNotice message={state.message} />}
      {state.status === "ready" && <MessageCard message={state.message} />}
    </section>
  );
}
