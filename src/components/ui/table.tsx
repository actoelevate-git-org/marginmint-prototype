import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Horizontal scroll lives on this wrapper only, so the page never scrolls sideways.
 * `relative` keeps absolutely-positioned sr-only text inside the clipped area.
 */
export function TableContainer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("scrollbar-thin relative overflow-x-auto", className)} {...props} />;
}

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full border-collapse text-[13px]", className)} {...props} />;
}

export function THead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-slate-50/80 text-left", className)} {...props} />;
}

export function TBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}

export function Tr({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-b border-line last:border-b-0 hover:bg-slate-50/60", className)} {...props} />;
}

type Align = { align?: "left" | "right" | "center" };

export function Th({ className, align = "left", ...props }: ThHTMLAttributes<HTMLTableCellElement> & Align) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap border-b border-line px-3 py-2 text-2xs font-medium uppercase tracking-wide text-muted",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, align = "left", ...props }: TdHTMLAttributes<HTMLTableCellElement> & Align) {
  return (
    <td
      className={cn(
        "whitespace-nowrap px-3 py-2.5 align-middle text-ink",
        align === "right" && "num text-right",
        align === "center" && "text-center",
        className,
      )}
      {...props}
    />
  );
}
