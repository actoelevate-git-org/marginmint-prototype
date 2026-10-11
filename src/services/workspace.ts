import { demoDataset } from "@/data/demo/seed";
import type { DemoDataset } from "@/data/demo/types";
import { formatInstantIst } from "@/lib/dates";

/**
 * Phase 1 serves a single in-memory demo workspace. When authentication and
 * persistence land, this is where workspace membership must be verified
 * server-side before any data is returned.
 */
export function getCurrentWorkspace(dataset: DemoDataset = demoDataset) {
  const ws = dataset.workspace;
  return {
    id: ws.id,
    name: ws.name,
    ownerName: ws.ownerName,
    currency: ws.currency,
    isDemo: ws.isDemo,
    today: ws.today,
    dataStartDay: ws.dataStartDay,
    lastSyncedAt: ws.lastSyncedAt,
    lastSyncedLabel: formatInstantIst(ws.lastSyncedAt),
  };
}
