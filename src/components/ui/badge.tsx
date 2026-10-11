import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-[4px] border px-1.5 py-px text-2xs font-medium",
  {
    variants: {
      tone: {
        neutral: "border-line bg-slate-50 text-slate-700",
        positive: "border-emerald-200 bg-gain-soft text-gain-text",
        warning: "border-amber-200 bg-warning-soft text-warning-text",
        negative: "border-red-200 bg-loss-soft text-loss-text",
        info: "border-sky-200 bg-sky-50 text-sky-800",
        demo: "border-emerald-300/70 bg-mint text-forest",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

export function Badge({ className, tone, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
