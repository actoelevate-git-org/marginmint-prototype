import { CheckCircle2 } from "lucide-react";
import { Notice } from "@/components/ui/notice";
import { first, type SearchParams } from "@/lib/search-params";

const PROVIDER_NAME: Record<string, string> = { amazon: "Amazon", flipkart: "Flipkart" };

/** Allow-listed result codes from the integration routes → user-facing copy. */
const RESULTS: Record<string, { tone: "success" | "warning"; text: (p: string, created: string, updated: string) => string }> = {
  connected: { tone: "success", text: (p) => `${p} is connected. Run a sync to import your recent orders.` },
  denied: { tone: "warning", text: (p) => `${p} authorisation was cancelled. Nothing was connected.` },
  invalid_request: { tone: "warning", text: (p) => `${p} returned an incomplete authorisation response. Please try connecting again.` },
  state_mismatch: { tone: "warning", text: () => "This authorisation was started in a different browser session, so it was rejected for your safety. Start again from this page." },
  state_expired: { tone: "warning", text: () => "This authorisation link expired or was already used. Start again — the whole flow must finish within 10 minutes." },
  token_exchange_failed: { tone: "warning", text: (p) => `${p} did not issue access tokens. Check that the redirect URI and app credentials match your developer console, then retry.` },
  not_configured: { tone: "warning", text: (p) => `${p} is not configured on the server yet.` },
  server_error: { tone: "warning", text: () => "Something went wrong on our side. Nothing was saved; please try again." },
  sync_completed: { tone: "success", text: (p, c, u) => `${p} sync complete: ${c} new and ${u} updated orders.` },
  sync_partial: { tone: "success", text: (p, c, u) => `${p} synced ${c} new and ${u} updated orders. More remain — run sync again to continue.` },
  sync_already_running: { tone: "warning", text: (p) => `A ${p} sync is already running. Try again in a few minutes.` },
  sync_reauth_required: { tone: "warning", text: (p) => `${p} rejected our access. Reconnect the account to resume syncing.` },
  sync_rate_limited: { tone: "warning", text: (p) => `${p} rate limit reached. Your progress was saved; try again in a few minutes.` },
  sync_not_connected: { tone: "warning", text: (p) => `${p} is not connected.` },
  sync_failed: { tone: "warning", text: (p) => `${p} sync failed. Progress up to the last page was saved; try again.` },
  disconnected: { tone: "success", text: (p) => `${p} disconnected. Stored tokens were deleted; previously synced orders are kept.` },
  disconnect_unconfirmed: { tone: "warning", text: () => "Disconnect was not confirmed." },
};

export function IntegrationResultNotice({ params }: { params: SearchParams }) {
  const result = RESULTS[first(params.result) ?? ""];
  if (!result) return null;
  const provider = PROVIDER_NAME[first(params.provider) ?? ""] ?? "The marketplace";
  const count = (v: string | undefined) => (v && /^\d{1,6}$/.test(v) ? v : "0");
  const text = result.text(provider, count(first(params.created)), count(first(params.updated)));
  if (result.tone === "success") {
    return (
      <div role="status" className="flex gap-2.5 rounded-lg border border-emerald-200 bg-gain-soft px-3.5 py-2.5 text-[13px] text-emerald-900">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gain-text" aria-hidden="true" />
        {text}
      </div>
    );
  }
  return (
    <div role="alert">
      <Notice tone="warning">{text}</Notice>
    </div>
  );
}
