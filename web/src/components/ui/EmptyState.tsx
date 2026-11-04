import { Inbox } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
}: {
  title: string;
  description?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center text-text-secondary">
      <Icon aria-hidden className="size-8 text-text-muted" />
      <p className="font-medium text-text-primary">{title}</p>
      {description && <p>{description}</p>}
    </div>
  );
}
