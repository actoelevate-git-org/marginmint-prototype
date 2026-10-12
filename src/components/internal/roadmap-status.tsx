import { Ban, CheckCircle2, Clock, Hammer, Star, Telescope, type LucideIcon } from "lucide-react";
import type { StepStatus } from "@/internal/roadmap";
import { cn } from "@/lib/utils";

/** Shared by the server roadmap page and the client board (no "use client" here on purpose). */
export const STATUS_STYLE: Record<StepStatus, { label: string; icon: LucideIcon; badge: string; bar: string; dot: string }> = {
  done: { label: "Done", icon: CheckCircle2, badge: "border-emerald-200 bg-gain-soft text-gain-text", bar: "bg-emerald", dot: "bg-emerald" },
  in_progress: { label: "In progress", icon: Hammer, badge: "border-sky-200 bg-sky-50 text-sky-800", bar: "bg-sky-500", dot: "bg-sky-500" },
  next: { label: "Next pick", icon: Star, badge: "border-amber-300 bg-warning-soft text-warning-text", bar: "bg-warning", dot: "bg-warning" },
  pending: { label: "Pending", icon: Clock, badge: "border-line bg-slate-50 text-slate-700", bar: "bg-slate-300", dot: "bg-slate-400" },
  blocked: { label: "Blocked", icon: Ban, badge: "border-red-200 bg-loss-soft text-loss-text", bar: "bg-loss", dot: "bg-loss" },
  future: { label: "Future", icon: Telescope, badge: "border-dashed border-slate-300 bg-white text-slate-500", bar: "bg-slate-200", dot: "bg-slate-300" },
};

export function StatusPill({ status }: { status: StepStatus }) {
  const s = STATUS_STYLE[status];
  const Icon = s.icon;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-2xs font-semibold", s.badge)}>
      <Icon className="size-3" aria-hidden="true" />
      {s.label}
    </span>
  );
}

