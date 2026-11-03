import { CircleAlert, LoaderCircle } from "lucide-react";
import { Button } from "@/components/button";

export function LoadingNotice({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 rounded-lg border border-line bg-surface px-4 py-12 text-sm text-ink-secondary">
      <LoaderCircle aria-hidden className="size-5 animate-spin" />
      {label}
    </div>
  );
}

export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between dark:border-red-900 dark:bg-red-950/50 dark:text-red-100">
      <p className="flex items-start gap-2">
        <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
        {message}
      </p>
      {onRetry && <Button onClick={onRetry}>Try Again</Button>}
    </div>
  );
}
