import { NextResponse, type NextRequest } from "next/server";
import { redirectWithResult } from "@/lib/http/request-guards";
import { integrationContext } from "@/services/integrations/context";
import { completeAuthorization, stateCookieName } from "@/services/integrations/oauth";
import { isProviderId } from "@/services/integrations/registry";

export const dynamic = "force-dynamic";

/** OAuth redirect target registered with Amazon / Flipkart. */
export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  if (!isProviderId(provider)) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });

  const resolved = integrationContext(provider);
  let result: string;
  if (!resolved.ok) {
    result = "not_configured";
  } else {
    try {
      result = await completeAuthorization({
        ...resolved.context,
        params: request.nextUrl.searchParams,
        stateCookie: request.cookies.get(stateCookieName(provider))?.value,
      });
    } catch {
      result = "server_error";
    }
  }
  const response = redirectWithResult(request, "/integrations", { provider, result });
  // The state is single-use either way; remove the browser binding.
  response.cookies.set(stateCookieName(provider), "", { path: `/api/integrations/${provider}/callback`, maxAge: 0 });
  return response;
}
