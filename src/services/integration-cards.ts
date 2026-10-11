import { demoDataset } from "@/data/demo/seed";
import type { DemoDataset } from "@/data/demo/types";
import { formatInstantIst } from "@/lib/dates";

/**
 * Static cards for data sources that are not live marketplace connections
 * (demo data, CSV, Shopify placeholder). Amazon and Flipkart status is computed
 * from stored connections in `services/integrations/status.ts`.
 */
export type IntegrationStatus = "active" | "not-connected" | "planned";

export type IntegrationCard = {
  id: string;
  name: string;
  kind: "demo" | "marketplace" | "file";
  status: IntegrationStatus;
  statusLabel: string;
  description: string;
  dataTypes: string[];
  lastSync: string;
  action:
    | { kind: "link"; label: string; href: string }
    | { kind: "unavailable"; label: string; reason: string };
};

export function getIntegrations(dataset: DemoDataset = demoDataset): IntegrationCard[] {
  return [
    {
      id: "demo",
      name: "Demo dataset",
      kind: "demo",
      status: "active",
      statusLabel: "Active",
      description: `Simulated records for ${dataset.workspace.name}, generated from a fixed seed so every figure is reproducible.`,
      dataTypes: ["Orders", "Products & stock", "Settlements", "Returns", "Advertising", "Expenses"],
      lastSync: `Seeded · data as of ${formatInstantIst(dataset.workspace.lastSyncedAt)}`,
      action: { kind: "link", label: "View overview", href: "/overview" },
    },
    {
      id: "shopify",
      name: "Shopify",
      kind: "marketplace",
      status: "not-connected",
      statusLabel: "Not available yet",
      description: "Orders, products and payouts from your Shopify store via the Admin API.",
      dataTypes: ["Orders", "Products", "Payouts"],
      lastSync: "Never",
      action: {
        kind: "unavailable",
        label: "Connect Shopify",
        reason: "The Shopify adapter is not built yet. Amazon and Flipkart connections are available above.",
      },
    },
    {
      id: "csv-import",
      name: "CSV import",
      kind: "file",
      status: "planned",
      statusLabel: "Planned",
      description: "Upload order, settlement and advertising exports with column mapping, validation and duplicate detection.",
      dataTypes: ["Orders", "Settlements", "Advertising"],
      lastSync: "No imports yet",
      action: {
        kind: "unavailable",
        label: "Import CSV",
        reason: "Imports must be stored, validated and de-duplicated in the database, which arrives in the next phase.",
      },
    },
    {
      id: "csv-export",
      name: "CSV export",
      kind: "file",
      status: "active",
      statusLabel: "Available",
      description: "Download any report as CSV. Cells are escaped against spreadsheet formula injection.",
      dataTypes: ["P&L", "Products", "Marketplaces", "Inventory", "Settlements", "Returns", "Advertising", "Orders"],
      lastSync: "On demand",
      action: { kind: "link", label: "Open reports", href: "/reports" },
    },
  ];
}
