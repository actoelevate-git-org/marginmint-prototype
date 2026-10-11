"use client";

import * as Popover from "@radix-ui/react-popover";
import { CalendarRange, Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { NativeSelect } from "@/components/ui/input";
import { formatDayShort, PRESET_LABEL, PRESET_RANGES, type DatePreset } from "@/lib/dates";
import { MARKETPLACE_FILTERS, marketplaceFilterLabel, type MarketplaceFilter } from "@/lib/marketplaces";
import { navItemFor } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/**
 * Global date-range + marketplace filters. State lives in the URL; the server
 * re-renders the page with recalculated figures. Hidden on sections where the
 * filters would not change anything (e.g. inventory snapshot, settings).
 */
export function GlobalFilters({ today, dataStartDay }: { today: string; dataStartDay: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const item = navItemFor(pathname);

  if (!item || item.filters === "none") return null;

  const preset = (PRESET_RANGES as readonly string[]).includes(searchParams.get("range") ?? "")
    ? (searchParams.get("range") as DatePreset)
    : "30d";
  const marketplace = (MARKETPLACE_FILTERS as readonly string[]).includes(searchParams.get("marketplace") ?? "")
    ? (searchParams.get("marketplace") as MarketplaceFilter)
    : "ALL";

  const push = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("page");
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    startTransition(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2 transition-opacity", pending && "opacity-70")} aria-busy={pending}>
      <div role="radiogroup" aria-label="Date range" className="inline-flex rounded-md border border-line bg-white p-0.5 shadow-card">
        {PRESET_RANGES.filter((p) => p !== "custom").map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={preset === p}
            onClick={() => push({ range: p, start: null, end: null })}
            className={cn(
              "h-7 rounded-[5px] px-2.5 text-xs font-medium transition-colors",
              preset === p ? "bg-forest text-white" : "text-slate-600 hover:bg-slate-100 hover:text-ink",
            )}
          >
            {p === "today" ? PRESET_LABEL[p] : p.toUpperCase()}
          </button>
        ))}
        <CustomRange
          active={preset === "custom"}
          today={today}
          dataStartDay={dataStartDay}
          start={searchParams.get("start")}
          end={searchParams.get("end")}
          onApply={(start, end) => push({ range: "custom", start, end })}
        />
      </div>
      <label className="sr-only" htmlFor="marketplace-filter">
        Marketplace
      </label>
      <NativeSelect
        id="marketplace-filter"
        className="w-44"
        value={marketplace}
        onChange={(event) => push({ marketplace: event.target.value === "ALL" ? null : event.target.value })}
      >
        {MARKETPLACE_FILTERS.map((m) => (
          <option key={m} value={m}>
            {marketplaceFilterLabel(m)}
          </option>
        ))}
      </NativeSelect>
      <span className="inline-flex w-4 justify-center" aria-live="polite">
        {pending ? <Loader2 className="size-4 animate-spin text-muted" aria-label="Updating" /> : null}
      </span>
    </div>
  );
}

function CustomRange({
  active,
  today,
  dataStartDay,
  start,
  end,
  onApply,
}: {
  active: boolean;
  today: string;
  dataStartDay: string;
  start: string | null;
  end: string | null;
  onApply: (start: string, end: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(start ?? dataStartDay);
  const [to, setTo] = useState(end ?? today);
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  const label = active && start && end ? `${formatDayShort(start)} – ${formatDayShort(end)}` : "Custom";

  const apply = () => {
    if (!from || !to) return setError("Choose both a start and an end date.");
    if (from > to) return setError("The start date must be on or before the end date.");
    if (to > today) return setError("The end date cannot be in the future.");
    setError(null);
    setOpen(false);
    onApply(from, to);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          role="radio"
          aria-checked={active}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-[5px] px-2.5 text-xs font-medium transition-colors",
            active ? "bg-forest text-white" : "text-slate-600 hover:bg-slate-100 hover:text-ink",
          )}
        >
          <CalendarRange className="size-3.5" aria-hidden="true" />
          {label}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 w-72 rounded-lg border border-line bg-white p-4 shadow-popover data-[state=open]:animate-in data-[state=open]:fade-in-0"
        >
          <form
            onSubmit={(event) => {
              event.preventDefault();
              apply();
            }}
          >
            <p className="text-sm font-semibold text-ink">Custom range</p>
            <p className="mt-0.5 text-xs text-muted">
              Demo history runs from {formatDayShort(dataStartDay)} to {formatDayShort(today)}.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-xs font-medium text-slate-600" htmlFor={`${id}-from`}>
                From
                <input
                  id={`${id}-from`}
                  type="date"
                  value={from}
                  max={today}
                  onChange={(e) => setFrom(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-line px-2 text-sm text-ink"
                />
              </label>
              <label className="text-xs font-medium text-slate-600" htmlFor={`${id}-to`}>
                To
                <input
                  id={`${id}-to`}
                  type="date"
                  value={to}
                  max={today}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-line px-2 text-sm text-ink"
                />
              </label>
            </div>
            {error ? (
              <p role="alert" className="mt-2 text-xs text-loss-text">
                {error}
              </p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <Popover.Close className="h-8 rounded-md px-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-100">
                Cancel
              </Popover.Close>
              <button type="submit" className="h-8 rounded-md bg-forest px-3 text-[13px] font-medium text-white hover:bg-forest-600">
                Apply range
              </button>
            </div>
          </form>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
