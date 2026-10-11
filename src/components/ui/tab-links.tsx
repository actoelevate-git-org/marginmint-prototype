import Link from "next/link";
import { cn } from "@/lib/utils";

/** Link-based segmented filter (URL is the state, so it works without JS and is shareable). */
export function TabLinks({ label, items }: { label: string; items: { href: string; label: string; active: boolean; count?: number }[] }) {
  return (
    <nav aria-label={label} className="scrollbar-thin -mx-1 flex gap-1 overflow-x-auto px-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium transition-colors",
            item.active ? "bg-ink text-white" : "text-slate-600 hover:bg-slate-100 hover:text-ink",
          )}
        >
          {item.label}
          {item.count !== undefined ? (
            <span className={cn("num text-2xs", item.active ? "text-white/70" : "text-slate-400")}>{item.count}</span>
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
