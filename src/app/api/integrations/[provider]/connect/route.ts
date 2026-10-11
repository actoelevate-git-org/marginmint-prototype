import { NextResponse, type NextRequest } from "next/server";
import { isSameOrigin, redirectWithResult } from "@/lib/http/request-guards";
import { integrationContext } from "@/services/integrations/context";
import { STATE_TTL_MS, startAuthorization, stateCookieName } from "@/services/integrations/oauth";
import { isProviderId } from "@/services/integrations/registry";

export const dynamic = "force-dynamic";

/** Starts the marketplace consent flow. POST-only so link prefetching can never create OAuth state. */
export async function POST(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  if (!isProviderId(provider)) return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const resolved = integrationContext(provider);
  if (!resolved.ok) return redirectWithResult(request, "/integrations", { provider, result: "not_configured" });

  let started: Awaited<ReturnType<typeof startAuthorization>>;
  try {
    started = await startAuthorization(resolved.context);
  } catch {
    return redirectWithResult(request, "/integrations", { provider, result: "server_error" });
  }
  const { redirectUrl, state } = started;
  const response = NextResponse.redirect(redirectUrl, 303);
  response.cookies.set(stateCookieName(provider), state, {
    httpOnly: true,
    secure: request.nextUrl.protocol === "https:",
    sameSite: "lax",
    path: `/api/integrations/${provider}/callback`,
    maxAge: Math.floor(STATE_TTL_MS / 1000),
  });
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "no-store");
  return response;
}
