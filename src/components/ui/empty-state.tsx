import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-4 py-10 text-center", className)}>
      {Icon ? (
        <div className="mb-3 flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Icon className="size-4" aria-hidden="true" />
        </div>
      ) : null}
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-[13px] text-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
