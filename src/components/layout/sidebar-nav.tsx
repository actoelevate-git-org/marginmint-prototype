"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { GLOBAL_FILTER_KEYS, NAV_GROUP_LABEL, NAV_ITEMS, navItemFor, type NavItem } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/**
 * Primary navigation. Links to filter-aware sections carry the active date range
 * and marketplace along, so switching sections keeps the same view of the business.
 */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = navItemFor(pathname);

  const hrefFor = (item: NavItem) => {
    if (item.filters === "none") return item.href;
    const query = new URLSearchParams();
    for (const key of GLOBAL_FILTER_KEYS) {
      const value = searchParams.get(key);
      if (value) query.set(key, value);
    }
    const qs = query.toString();
    return qs ? `${item.href}?${qs}` : item.href;
  };

  const groups = (["analyse", "operate", "workspace"] as const).map((group) => ({
    group,
    items: NAV_ITEMS.filter((item) => item.group === group),
  }));

  return (
    <nav aria-label="Primary" className="flex flex-col gap-5 px-3 py-4">
      {groups.map(({ group, items }) => (
        <div key={group}>
          <p className="px-2.5 pb-1.5 text-2xs font-medium uppercase tracking-wider text-emerald-100/45">{NAV_GROUP_LABEL[group]}</p>
          <ul className="flex flex-col gap-0.5">
            {items.map((item) => {
              const active = current?.href === item.href;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={hrefFor(item)}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                      active ? "bg-white/[0.12] text-white" : "text-emerald-50/75 hover:bg-white/[0.06] hover:text-white",
                    )}
                  >
                    <Icon className={cn("size-4 shrink-0", active ? "text-emerald-300" : "text-emerald-100/50")} aria-hidden="true" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
