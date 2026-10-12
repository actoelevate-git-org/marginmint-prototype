/**
 * Access policy for /internal (pure so it can run in middleware and be tested).
 * - development: open
 * - production without INTERNAL_DOCS_PASSWORD: hidden (404)
 * - production with INTERNAL_DOCS_PASSWORD: HTTP Basic auth, any username
 */
export type InternalAccess = "allow" | "challenge" | "not_found";

function constantTimeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let diff = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return diff === 0;
}

export function decideInternalAccess(args: { nodeEnv: string | undefined; password: string | undefined; authorization: string | null }): InternalAccess {
  if (args.nodeEnv === "development") return "allow";
  if (!args.password) return "not_found";
  const header = args.authorization ?? "";
  if (!header.startsWith("Basic ")) return "challenge";
  let decoded = "";
  try {
    decoded = atob(header.slice(6).trim());
  } catch {
    return "challenge";
  }
  const supplied = decoded.slice(decoded.indexOf(":") + 1);
  return decoded.includes(":") && constantTimeEqual(supplied, args.password) ? "allow" : "challenge";
}
