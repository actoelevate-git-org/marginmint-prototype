import { CheckCircle2, CircleDashed, FileSpreadsheet, Plug, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { getIntegrations, type IntegrationCard } from "@/services/integrations";

export const metadata: Metadata = { title: "Integrations" };

const ICON = { demo: Sparkles, marketplace: Plug, file: FileSpreadsheet } as const;

function StatusPill({ card }: { card: IntegrationCard }) {
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

export default function IntegrationsPage() {
  const cards = getIntegrations();
  return (
    <div className="space-y-5">
      <PageHeader
        title="Integrations"
        description="Where your data comes from. External marketplaces stay “Not connected” until a real, authenticated integration exists. MarginMint will never ask for your marketplace password."
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => {
          const Icon = ICON[card.kind];
          const reasonId = `${card.id}-reason`;
          return (
            <Card key={card.id} className="flex flex-col p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                    <Icon className="size-4" aria-hidden="true" />
                  </div>
                  <h2 className="text-sm font-semibold text-ink">{card.name}</h2>
                </div>
                <StatusPill card={card} />
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
        })}
      </div>
    </div>
  );
}
