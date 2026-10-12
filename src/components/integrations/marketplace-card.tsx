import { AlertTriangle, CheckCircle2, CircleDashed, Plug, Settings2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { MarketplaceIntegration } from "@/services/integrations/status";
import { PendingForm } from "./pending-form";

const COPY = {
  amazon: {
    name: "Amazon Seller Central",
    short: "Amazon",
    description: "Orders from Amazon.in via the Selling Partner API (Orders API 2026-01-01). Buyer names, contacts and addresses are not requested.",
    consent: "You'll approve read access on Seller Central. MarginMint never sees your Amazon password.",
  },
  flipkart: {
    name: "Flipkart Seller Hub",
    short: "Flipkart",
    description: "Orders and shipment status via the Flipkart Marketplace Seller API (Order Management v3).",
    consent: "You'll approve access on Flipkart Seller Hub. MarginMint never sees your Flipkart password.",
  },
} as const;

function StatusBadge({ integration }: { integration: MarketplaceIntegration }) {
  switch (integration.state.kind) {
    case "connected":
      return (
        <Badge tone="positive">
          <CheckCircle2 className="size-3" aria-hidden="true" /> Connected
        </Badge>
      );
    case "reauth_required":
      return (
        <Badge tone="warning">
          <AlertTriangle className="size-3" aria-hidden="true" /> Reconnect required
        </Badge>
      );
    case "not_configured":
      return (
        <Badge>
          <Settings2 className="size-3" aria-hidden="true" /> Not configured
        </Badge>
      );
    case "unavailable":
      return (
        <Badge tone="warning">
          <AlertTriangle className="size-3" aria-hidden="true" /> Database unavailable
        </Badge>
      );
    default:
      return (
        <Badge>
          <CircleDashed className="size-3" aria-hidden="true" /> Not connected
        </Badge>
      );
  }
}

export function MarketplaceCard({ integration }: { integration: MarketplaceIntegration }) {
  const copy = COPY[integration.id];
  const base = `/api/integrations/${integration.id}`;
  const state = integration.state;

  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-slate-100 text-slate-600">
            <Plug className="size-4" aria-hidden="true" />
          </div>
          <h2 className="text-sm font-semibold text-ink">{copy.name}</h2>
        </div>
        <StatusBadge integration={integration} />
      </div>
      <p className="mt-3 text-[13px] text-slate-600">{copy.description}</p>

      {state.kind === "connected" || state.kind === "reauth_required" ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div>
            <dt className="text-muted">Seller ID</dt>
            <dd className="font-mono text-ink">{state.sellerId ?? "Not provided"}</dd>
          </div>
          <div>
            <dt className="text-muted">Orders synced</dt>
            <dd className="num text-ink">{state.ordersSynced.toLocaleString("en-IN")}</dd>
          </div>
          <div>
            <dt className="text-muted">Connected</dt>
            <dd className="text-ink">{state.connectedAt}</dd>
          </div>
          <div>
            <dt className="text-muted">Last sync</dt>
            <dd className="text-ink">{state.lastSync}</dd>
          </div>
          {state.lastSyncMessage ? <p className="col-span-2 text-muted">{state.lastSyncMessage}</p> : null}
        </dl>
      ) : null}

      {state.kind === "disconnected" ? (
        <p className="mt-3 text-xs text-muted">Disconnected. {state.ordersSynced.toLocaleString("en-IN")} previously synced orders are kept.</p>
      ) : null}

      <div className="mt-auto pt-4">
        {state.kind === "not_configured" ? (
          <>
            <Button variant="secondary" size="sm" disabled aria-describedby={`${integration.id}-setup`}>
              Connect {copy.short}
            </Button>
            <p id={`${integration.id}-setup`} className="mt-2 text-xs leading-relaxed text-muted">
              Set these server environment variables to enable it:{" "}
              {state.missing.map((name, i) => (
                <span key={name}>
                  <code className="rounded bg-slate-100 px-1 font-mono text-2xs text-slate-700">{name}</code>
                  {i < state.missing.length - 1 ? ", " : ""}
                </span>
              ))}
              .
            </p>
          </>
        ) : null}

        {state.kind === "unavailable" ? (
          <p className="text-xs text-muted">The database could not be reached, so connection status is unknown. Try again shortly.</p>
        ) : null}

        {state.kind === "not_connected" || state.kind === "disconnected" || state.kind === "reauth_required" ? (
          <>
            <PendingForm
              action={`${base}/connect`}
              label={state.kind === "reauth_required" ? `Reconnect ${copy.short}` : `Connect ${copy.short}`}
              pendingLabel="Opening consent page…"
              variant="default"
            />
            <p className="mt-2 text-xs text-muted">{copy.consent}</p>
          </>
        ) : null}

        {state.kind === "connected" ? (
          <div className="flex flex-wrap items-center gap-2">
            <PendingForm action={`${base}/sync`} label="Sync orders now" pendingLabel="Syncing…" variant="default" />
            <Link href={`/orders?source=synced&marketplace=${integration.code}`} className={buttonVariants({ variant: "secondary", size: "sm" })}>
              View orders
            </Link>
            <details className="w-full text-xs">
              <summary className="cursor-pointer text-muted hover:text-ink">Disconnect…</summary>
              <div className="mt-2 rounded-md border border-line bg-slate-50 p-3">
                <p className="mb-2 text-slate-600">
                  This deletes the stored {copy.short} tokens. Synced orders are kept. You can reconnect at any time.
                </p>
                <PendingForm action={`${base}/disconnect`} label={`Disconnect ${copy.short}`} pendingLabel="Disconnecting…" hidden={{ confirm: "yes" }} />
              </div>
            </details>
          </div>
        ) : null}
      </div>
    </Card>
  );
}
