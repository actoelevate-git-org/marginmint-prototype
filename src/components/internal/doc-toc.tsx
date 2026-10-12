import type { TocItem } from "@/internal/toc";
import { cn } from "@/lib/utils";

export function DocToc({ items }: { items: TocItem[] }) {
  if (items.length < 2) return null;
  return (
    <nav aria-label="On this page" className="text-[13px]">
      <p className="mb-2 text-2xs font-semibold uppercase tracking-wider text-slate-500">On this page</p>
      <ul className="space-y-1.5 border-l border-line">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={cn("-ml-px block border-l border-transparent pl-3 leading-snug text-slate-600 hover:border-emerald hover:text-ink", item.depth === 3 && "pl-6 text-slate-500")}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
