import { AmazonAdapter } from "@/integrations/amazon/adapter";
import { FlipkartAdapter } from "@/integrations/flipkart/adapter";
import type { FetchLike } from "@/integrations/http";
import type { MarketplaceAdapter, ProviderCode } from "@/integrations/types";
import { callbackUrl, missingConfig, readEnv, type IntegrationProviderId, type ServerEnv } from "@/lib/env";

export const PROVIDER_IDS = ["amazon", "flipkart"] as const satisfies readonly IntegrationProviderId[];

export const PROVIDER_CODE: Record<IntegrationProviderId, ProviderCode> = { amazon: "AMAZON", flipkart: "FLIPKART" };

export function isProviderId(value: string): value is IntegrationProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(value);
}

export type AdapterResolution =
  | { configured: true; adapter: MarketplaceAdapter }
  | { configured: false; missing: string[] };

/** Builds an adapter from server env, or reports which variables are missing (names only). */
export function resolveAdapter(provider: IntegrationProviderId, env: ServerEnv = readEnv(), fetchImpl?: FetchLike): AdapterResolution {
  const missing = missingConfig(provider, env);
  if (missing.length > 0) return { configured: false, missing };
  const redirectUri = callbackUrl(provider, env);
  if (provider === "amazon") {
    return {
      configured: true,
      adapter: new AmazonAdapter(
        {
          appId: env.AMAZON_SPAPI_APP_ID ?? "",
          clientId: env.AMAZON_LWA_CLIENT_ID ?? "",
          clientSecret: env.AMAZON_LWA_CLIENT_SECRET ?? "",
          redirectUri,
          draftApp: env.AMAZON_SPAPI_DRAFT_APP !== "false",
        },
        fetchImpl,
      ) as MarketplaceAdapter,
    };
  }
  return {
    configured: true,
    adapter: new FlipkartAdapter(
      {
        clientId: env.FLIPKART_CLIENT_ID ?? "",
        clientSecret: env.FLIPKART_CLIENT_SECRET ?? "",
        redirectUri,
        apiHost: env.FLIPKART_API_HOST,
      },
      fetchImpl,
    ) as MarketplaceAdapter,
  };
}
