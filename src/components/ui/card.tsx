import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn("min-w-0 rounded-lg border border-line bg-white shadow-card", className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  actions,
  className,
  titleAddon,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  titleAddon?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 pt-4", className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {titleAddon}
        </div>
        {description ? <p className="mt-0.5 text-[13px] text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("border-t border-line px-4 py-3 text-[13px] text-muted", className)} {...props} />;
}
