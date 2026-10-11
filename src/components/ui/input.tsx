import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-9 rounded-md border border-line bg-white text-sm text-ink shadow-card placeholder:text-slate-400 focus-visible:border-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald/25";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClass, "w-full px-3", className)} {...props} />;
}

/** Native select: fully keyboard/screen-reader accessible, styled to match. */
export function NativeSelect({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn("relative", className)}>
      <select className={cn(fieldClass, "w-full appearance-none pl-3 pr-8")} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
    </div>
  );
}
