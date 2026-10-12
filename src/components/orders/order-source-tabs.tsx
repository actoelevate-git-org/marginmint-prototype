import { TabLinks } from "@/components/ui/tab-links";
import type { SearchParams } from "@/lib/search-params";
import { hrefWith } from "@/lib/url";

export const ORDER_SOURCES = ["synced", "demo"] as const;
export type OrderSource = (typeof ORDER_SOURCES)[number];

/** Demo and synced orders are never mixed in one list; this switch makes the source explicit. */
export function OrderSourceTabs({ params, source }: { params: SearchParams; source: OrderSource }) {
  return (
    <TabLinks
      label="Order source"
      items={[
        { label: "Synced from marketplaces", href: hrefWith("/orders", params, { source: "synced", status: null, sort: null, dir: null }), active: source === "synced" },
        { label: "Demo data", href: hrefWith("/orders", params, { source: "demo", status: null, sort: null, dir: null }), active: source === "demo" },
      ]}
    />
  );
}
