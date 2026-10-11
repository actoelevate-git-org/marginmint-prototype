import { NextResponse, type NextRequest } from "next/server";
import { isSameOrigin, redirectWithResult } from "@/lib/http/request-guards";
import { integrationContext } from "@/services/integrations/context";
import { disconnect } from "@/services/integrations/oauth";
import { isProviderId } from "@/services/integrations/registry";

export const dynamic = "force-dynamic";

/** Deletes stored tokens. Synced orders are kept and stay labelled by source. */
export async function POST(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  if (!isProviderId(provider)) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const form = await request.formData().catch(() => null);
  if (form?.get("confirm") !== "yes") return redirectWithResult(request, "/integrations", { provider, result: "disconnect_unconfirmed" });

  const resolved = integrationContext(provider);
  if (!resolved.ok) return redirectWithResult(request, "/integrations", { provider, result: "not_configured" });
  try {
    await disconnect(resolved.context);
  } catch {
    return redirectWithResult(request, "/integrations", { provider, result: "server_error" });
  }
  return redirectWithResult(request, "/integrations", { provider, result: "disconnected" });
}
