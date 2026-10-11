import { NextResponse, type NextRequest } from "next/server";
import { readEnv } from "@/lib/env";

/**
 * Rejects cross-site POSTs (basic CSRF defence for state-changing routes).
 * Browsers always send Origin on POST; it must match APP_URL or the request host.
 */
export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const allowed = new Set([request.nextUrl.origin]);
  const appUrl = readEnv().APP_URL;
  if (appUrl) allowed.add(new URL(appUrl).origin);
  return allowed.has(origin);
}

/** Redirect back into the app with an allow-listed result code. Never echoes provider text. */
export function redirectWithResult(request: NextRequest, path: "/integrations" | "/orders", params: Record<string, string>): NextResponse {
  const url = new URL(path, request.nextUrl.origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const response = NextResponse.redirect(url, 303);
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "no-store");
  return response;
}
