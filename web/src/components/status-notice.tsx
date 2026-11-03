import { CircleAlert, LoaderCircle } from "lucide-react";
import { Button } from "@/components/button";

export function LoadingNotice({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-ink-secondary">
      <LoaderCircle aria-hidden className="size-4 animate-spin text-accent" />
      {label}
    </div>
  );
}

export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2">
        <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-secondary" />
        {message}
      </p>
      {onRetry && (
        <Button onClick={onRetry} className="self-start sm:self-auto">
          Try Again
        </Button>
      )}
    </div>
  );
}
