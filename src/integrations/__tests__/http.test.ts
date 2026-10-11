import { describe, expect, it, vi } from "vitest";
import { ProviderError, requestJson, type FetchLike } from "../http";

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
const noSleep = async () => {};
const caught = (promise: Promise<unknown>) => promise.then(() => null, (e: unknown) => (e instanceof ProviderError ? e : null));

describe("requestJson", () => {
  it("retries 429 honouring Retry-After, then succeeds", async () => {
    const sleep = vi.fn(noSleep);
    const fetchImpl = vi.fn<FetchLike>()
      .mockResolvedValueOnce(json(429, {}, { "retry-after": "2" }))
      .mockResolvedValueOnce(json(200, { ok: true }));
    await expect(requestJson("https://x.test", {}, { provider: "amazon", fetchImpl, sleep })).resolves.toEqual({ ok: true });
    expect(sleep).toHaveBeenCalledWith(2000);
  });

  it("does not retry 401 and classifies it", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(json(401, { error: "access_token=SECRET" }));
    const error = await caught(requestJson("https://x.test", {}, { provider: "amazon", fetchImpl, sleep: noSleep }));
    expect(error).toBeInstanceOf(ProviderError);
    expect(error?.kind).toBe("unauthorized");
    expect(String(error?.message)).not.toContain("SECRET");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("gives up after bounded retries on network failure", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockRejectedValue(new TypeError("fetch failed"));
    const error = await caught(requestJson("https://x.test", {}, { provider: "flipkart", fetchImpl, sleep: noSleep, retries: 2 }));
    expect(error?.kind).toBe("network");
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("flags non-JSON success bodies", async () => {
    const fetchImpl = vi.fn<FetchLike>().mockResolvedValue(new Response("<html>", { status: 200 }));
    await expect(requestJson("https://x.test", {}, { provider: "amazon", fetchImpl, sleep: noSleep })).rejects.toMatchObject({ kind: "bad_response" });
  });
});
