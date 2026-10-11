import {
  BarChart3,
  Boxes,
  CircleDollarSign,
  FileSpreadsheet,
  LayoutDashboard,
  Megaphone,
  Plug,
  Settings,
  ShoppingCart,
  Undo2,
  type LucideIcon,
} from "lucide-react";

/** Which global filters (top bar) apply to a section. */
export type FilterSupport = "range-and-marketplace" | "none";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  filters: FilterSupport;
  group: "analyse" | "operate" | "workspace";
};

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard, filters: "range-and-marketplace", group: "analyse" },
  { href: "/profitability", label: "Profit Analytics", icon: BarChart3, filters: "range-and-marketplace", group: "analyse" },
  { href: "/reports", label: "Reports", icon: FileSpreadsheet, filters: "range-and-marketplace", group: "analyse" },
  { href: "/orders", label: "Orders", icon: ShoppingCart, filters: "range-and-marketplace", group: "operate" },
  { href: "/products", label: "Products & Inventory", icon: Boxes, filters: "none", group: "operate" },
  { href: "/settlements", label: "Settlements", icon: CircleDollarSign, filters: "range-and-marketplace", group: "operate" },
  { href: "/returns", label: "Returns", icon: Undo2, filters: "range-and-marketplace", group: "operate" },
  { href: "/advertising", label: "Advertising", icon: Megaphone, filters: "range-and-marketplace", group: "operate" },
  { href: "/integrations", label: "Integrations", icon: Plug, filters: "none", group: "workspace" },
  { href: "/settings", label: "Settings", icon: Settings, filters: "none", group: "workspace" },
];

export const NAV_GROUP_LABEL: Record<NavItem["group"], string> = {
  analyse: "Analyse",
  operate: "Operate",
  workspace: "Workspace",
};

/** Search params that represent global filters and travel between sections. */
export const GLOBAL_FILTER_KEYS = ["range", "start", "end", "marketplace"] as const;

export function navItemFor(pathname: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}
