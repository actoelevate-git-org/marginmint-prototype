import type { MarketplaceAdapter } from "@/integrations/types";
import { ProviderError } from "@/integrations/http";
import { constantTimeEqual, encryptToken, randomToken, sha256 } from "@/lib/crypto/token-cipher";
import type { IntegrationRepository } from "@/repositories/integration-repository";

/**
 * OAuth connect flow, hardened against CSRF and replay:
 * - `state` is 256 bits of randomness, valid for 10 minutes, single-use;
 * - only its SHA-256 hash is stored server-side;
 * - the same value is set in an httpOnly cookie, so a callback is accepted only in
 *   the browser that started the flow (prevents login-CSRF account swapping).
 */
export const STATE_TTL_MS = 10 * 60_000;

export function stateCookieName(providerId: string): string {
  return `mm_oauth_${providerId}`;
}

export type OAuthDeps = {
  repo: IntegrationRepository;
  adapter: MarketplaceAdapter;
  encryptionKey: Buffer;
  workspace: { id: string; name: string };
  now?: () => Date;
};

export async function startAuthorization(deps: OAuthDeps): Promise<{ redirectUrl: string; state: string; expiresAt: Date }> {
  const now = deps.now?.() ?? new Date();
  const state = randomToken(32);
  const expiresAt = new Date(now.getTime() + STATE_TTL_MS);
  await deps.repo.ensureWorkspace(deps.workspace.id, deps.workspace.name);
  await deps.repo.createOAuthState({ workspaceId: deps.workspace.id, provider: deps.adapter.code, stateHash: sha256(state), expiresAt });
  return { redirectUrl: deps.adapter.authorizationUrl(state), state, expiresAt };
}

/** Allow-listed outcome codes; the UI maps these to messages (raw provider text is never shown). */
export type CallbackOutcome =
  | "connected"
  | "denied"
  | "invalid_request"
  | "state_mismatch"
  | "state_expired"
  | "token_exchange_failed";

export async function completeAuthorization(
  deps: OAuthDeps & { params: URLSearchParams; stateCookie: string | undefined },
): Promise<CallbackOutcome> {
  const now = deps.now?.() ?? new Date();
  const callback = deps.adapter.parseCallback(deps.params);
  if (!callback.state) return "invalid_request";
  if (!deps.stateCookie || !constantTimeEqual(deps.stateCookie, callback.state)) return "state_mismatch";

  // Consume the state even when the seller declined, so it cannot be replayed.
  const consumed = await deps.repo.consumeOAuthState({ provider: deps.adapter.code, stateHash: sha256(callback.state), now });
  if (!consumed) return "state_expired";
  if (consumed.workspaceId !== deps.workspace.id) return "state_mismatch";
  if (!callback.ok) return callback.reason;

  let tokens;
  try {
    tokens = await deps.adapter.exchangeCode(callback.code, callback.state);
  } catch (error) {
    if (error instanceof ProviderError) return "token_exchange_failed";
    throw error;
  }
  if (!tokens.refreshToken) return "token_exchange_failed";

  await deps.repo.saveAuthorizedConnection({
    workspaceId: deps.workspace.id,
    provider: deps.adapter.code,
    externalSellerId: callback.externalSellerId,
    refreshTokenEnc: encryptToken(tokens.refreshToken, deps.encryptionKey),
    accessTokenEnc: encryptToken(tokens.accessToken, deps.encryptionKey),
    accessTokenExpiresAt: tokens.accessTokenExpiresAt,
    refreshTokenExpiresAt: tokens.refreshTokenExpiresAt,
  });
  return "connected";
}

export async function disconnect(deps: Pick<OAuthDeps, "repo" | "adapter" | "workspace">): Promise<void> {
  const existing = await deps.repo.getConnection(deps.workspace.id, deps.adapter.code);
  if (!existing) return;
  // Tokens are destroyed; synced orders are kept and stay labelled with their source.
  await deps.repo.updateConnection(deps.workspace.id, deps.adapter.code, {
    status: "DISCONNECTED",
    refreshTokenEnc: null,
    accessTokenEnc: null,
    accessTokenExpiresAt: null,
    refreshTokenExpiresAt: null,
    syncState: null,
  });
}
