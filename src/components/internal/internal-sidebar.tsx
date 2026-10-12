"use client";

import { BookOpen, FileCode2, Layers, Library, Map, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type NavSection = {
  id: "delivery" | "guide" | "architecture" | "rules" | "reference";
  title: string;
  entries: { href: string; title: string; description: string }[];
};

const ICONS = { delivery: Map, guide: BookOpen, architecture: Layers, rules: FileCode2, reference: Library } as const;

/** Searchable, grouped navigation for the internal portal. */
export function InternalSidebar({ sections, onNavigate }: { sections: NavSection[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      sections
        .map((s) => ({
          ...s,
          entries: q ? s.entries.filter((e) => `${e.title} ${e.description}`.toLowerCase().includes(q)) : s.entries,
        }))
        .filter((s) => s.entries.length > 0),
    [sections, q],
  );

  return (
    <nav aria-label="Internal documentation" className="flex flex-col gap-5">
      <div className="relative">
        <label htmlFor="internal-search" className="sr-only">
          Search documentation
        </label>
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          id="internal-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search docs, rules…"
          className="h-9 w-full rounded-md border border-line bg-white pl-8 pr-8 text-sm shadow-card placeholder:text-slate-400 focus-visible:border-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald/25"
        />
        {query ? (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-ink">
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <Link
        href="/internal"
        onClick={onNavigate}
        aria-current={pathname === "/internal" ? "page" : undefined}
        className={cn(
          "rounded-md px-2.5 py-1.5 text-[13px] font-medium",
          pathname === "/internal" ? "bg-mint text-forest" : "text-slate-700 hover:bg-slate-100",
        )}
      >
        Handbook home
      </Link>

      {filtered.length === 0 ? <p className="px-2.5 text-[13px] text-muted">Nothing matches “{query}”.</p> : null}

      {filtered.map((section) => {
        const Icon = ICONS[section.id];
        return (
          <div key={section.id}>
            <p className="mb-1.5 flex items-center gap-1.5 px-2.5 text-2xs font-semibold uppercase tracking-wider text-slate-500">
              <Icon className="size-3.5" aria-hidden="true" />
              {section.title}
            </p>
            <ul className="flex flex-col gap-px">
              {section.entries.map((entry) => {
                const active = pathname === entry.href;
                return (
                  <li key={entry.href}>
                    <Link
                      href={entry.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      title={entry.description}
                      className={cn(
                        "block rounded-md border-l-2 px-2.5 py-1.5 text-[13px] leading-snug transition-colors",
                        active ? "border-emerald bg-mint/60 font-medium text-forest" : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-ink",
                      )}
                    >
                      {entry.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

/** Collapsible navigation for small screens. */
export function InternalMobileNav({ sections }: { sections: NavSection[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-medium shadow-card"
      >
        <BookOpen className="size-4" aria-hidden="true" />
        {open ? "Close menu" : "Browse handbook"}
      </button>
      {open ? (
        <div className="mt-3 rounded-lg border border-line bg-white p-4 shadow-popover">
          <InternalSidebar sections={sections} onNavigate={() => setOpen(false)} />
        </div>
      ) : null}
    </div>
  );
}
