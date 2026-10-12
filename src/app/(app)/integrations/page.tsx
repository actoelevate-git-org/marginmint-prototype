import { CheckCircle2, CircleDashed, FileSpreadsheet, Plug, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { IntegrationResultNotice } from "@/components/integrations/result-notice";
import { MarketplaceCard } from "@/components/integrations/marketplace-card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import type { SearchParams } from "@/lib/search-params";
import { getIntegrations, type IntegrationCard } from "@/services/integration-cards";
import { getMarketplaceIntegrations } from "@/services/integrations/status";

export const metadata: Metadata = { title: "Integrations" };
export const dynamic = "force-dynamic";

const ICON = { demo: Sparkles, marketplace: Plug, file: FileSpreadsheet } as const;

function StaticStatus({ card }: { card: IntegrationCard }) {
  if (card.status === "active") {
    return (
      <Badge tone="positive">
        <CheckCircle2 className="size-3" aria-hidden="true" />
        {card.statusLabel}
      </Badge>
    );
  }
  return (
    <Badge tone="neutral">
      <CircleDashed className="size-3" aria-hidden="true" />
      {card.statusLabel}
    </Badge>
  );
}

function StaticCard({ card }: { card: IntegrationCard }) {
  const Icon = ICON[card.kind];
  const reasonId = `${card.id}-reason`;
  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-slate-100 text-slate-600">
            <Icon className="size-4" aria-hidden="true" />
          </div>
          <h2 className="text-sm font-semibold text-ink">{card.name}</h2>
        </div>
        <StaticStatus card={card} />
      </div>
      <p className="mt-3 text-[13px] text-slate-600">{card.description}</p>
      <ul className="mt-3 flex flex-wrap gap-1" aria-label="Supported data">
        {card.dataTypes.map((t) => (
          <li key={t}>
            <Badge>{t}</Badge>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">Last successful sync: {card.lastSync}</p>
      <div className="mt-auto pt-4">
        {card.action.kind === "link" ? (
          <Link href={card.action.href} className={buttonVariants({ variant: "secondary", size: "sm" })}>
            {card.action.label}
          </Link>
        ) : (
          <>
            <Button variant="secondary" size="sm" disabled aria-describedby={reasonId}>
              {card.action.label}
            </Button>
            <p id={reasonId} className="mt-2 text-xs leading-relaxed text-muted">
              {card.action.reason}
            </p>
          </>
        )}
      </div>
    </Card>
  );
}

export default async function IntegrationsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const marketplaces = await getMarketplaceIntegrations();
  const cards = getIntegrations();
  const [shopify, ...sources] = [cards.find((c) => c.id === "shopify"), ...cards.filter((c) => c.id !== "shopify")];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Integrations"
        description="Where your data comes from. A marketplace shows “Connected” only after it has issued us access tokens through its official consent flow. MarginMint never asks for your marketplace password."
      />
      <IntegrationResultNotice params={params} />
      <section aria-labelledby="marketplaces-heading" className="space-y-3">
        <h2 id="marketplaces-heading" className="text-sm font-semibold text-ink">
          Marketplaces
        </h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {marketplaces.map((integration) => (
            <MarketplaceCard key={integration.id} integration={integration} />
          ))}
          {shopify ? <StaticCard card={shopify} /> : null}
        </div>
      </section>
      <section aria-labelledby="sources-heading" className="space-y-3">
        <h2 id="sources-heading" className="text-sm font-semibold text-ink">
          Other data sources
        </h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {sources.filter((c): c is IntegrationCard => Boolean(c)).map((card) => (
            <StaticCard key={card.id} card={card} />
          ))}
        </div>
      </section>
    </div>
  );
}
