import { NextResponse, type NextRequest } from "next/server";
import { isSameOrigin, redirectWithResult } from "@/lib/http/request-guards";
import { integrationContext } from "@/services/integrations/context";
import { isProviderId } from "@/services/integrations/registry";
import { syncOrders } from "@/services/integrations/sync";

export const dynamic = "force-dynamic";

/** Runs one bounded sync pass (resumable) and returns to the page that asked for it. */
export async function POST(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  if (!isProviderId(provider)) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await request.formData().catch(() => null);
  const back = form?.get("returnTo") === "/orders" ? "/orders" : "/integrations";

  const resolved = integrationContext(provider);
  if (!resolved.ok) return redirectWithResult(request, back, { provider, result: "not_configured" });

  try {
    const outcome = await syncOrders({ ...resolved.context, workspaceId: resolved.context.workspace.id });
    const params: Record<string, string> = { provider, result: `sync_${outcome.kind}` };
    if (outcome.kind === "completed" || outcome.kind === "partial") {
      params.created = String(outcome.created);
      params.updated = String(outcome.updated);
    }
    if (back === "/orders") params.source = "synced";
    return redirectWithResult(request, back, params);
  } catch {
    return redirectWithResult(request, back, { provider, result: "sync_failed" });
  }
}
