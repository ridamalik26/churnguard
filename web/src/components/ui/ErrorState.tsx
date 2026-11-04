import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="flex items-start gap-2">
        <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-danger" />
        {message}
      </p>
      {onRetry && (
        <Button onClick={onRetry} className="self-start sm:self-auto">
          Try again
        </Button>
      )}
    </div>
  );
}
