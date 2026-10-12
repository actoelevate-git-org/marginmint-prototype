import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { constantTimeEqual, decryptToken, encryptToken, parseEncryptionKey, sha256 } from "./token-cipher";

const key = randomBytes(32);

describe("token cipher", () => {
  it("round-trips and never contains the plaintext", () => {
    const secret = "Atzr|IwEBIExampleRefreshToken";
    const sealed = encryptToken(secret, key);
    expect(sealed).not.toContain(secret);
    expect(sealed.startsWith("v1.")).toBe(true);
    expect(decryptToken(sealed, key)).toBe(secret);
  });

  it("uses a fresh IV each time", () => {
    expect(encryptToken("same", key)).not.toBe(encryptToken("same", key));
  });

  it("rejects tampered ciphertext and the wrong key", () => {
    const sealed = encryptToken("secret", key);
    const parts = sealed.split(".");
    const data = Buffer.from(parts[3] ?? "", "base64url");
    data[0] = (data[0] ?? 0) ^ 1;
    const tampered = [parts[0], parts[1], parts[2], data.toString("base64url")].join(".");
    expect(() => decryptToken(tampered, key)).toThrow();
    expect(() => decryptToken(sealed, randomBytes(32))).toThrow();
  });

  it("validates the key", () => {
    expect(() => parseEncryptionKey(undefined)).toThrow(/not configured/);
    expect(() => parseEncryptionKey(Buffer.alloc(16).toString("base64"))).toThrow(/32 bytes/);
    expect(parseEncryptionKey(key.toString("base64")).equals(key)).toBe(true);
  });

  it("hashes and compares safely", () => {
    expect(sha256("abc")).toHaveLength(64);
    expect(constantTimeEqual("abc", "abc")).toBe(true);
    expect(constantTimeEqual("abc", "abd")).toBe(false);
    expect(constantTimeEqual("abc", "abcd")).toBe(false);
  });
});
