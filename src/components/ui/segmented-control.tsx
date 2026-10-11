"use client";

import { cn } from "@/lib/utils";

/** Client-side toggle group (radio semantics) for view state that is not URL-worthy. */
export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-line bg-slate-50 p-0.5">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-7 rounded-[5px] px-2.5 text-xs font-medium transition-colors",
              active ? "bg-white text-ink shadow-card" : "text-slate-500 hover:text-ink",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
