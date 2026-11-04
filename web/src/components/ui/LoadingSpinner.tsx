import { LoaderCircle } from "lucide-react";

export function LoadingSpinner({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-text-secondary">
      <LoaderCircle aria-hidden className="size-4 animate-spin text-accent" />
      {label}
    </div>
  );
}
