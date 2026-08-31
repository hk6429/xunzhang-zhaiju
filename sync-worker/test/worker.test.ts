import { SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";

describe("sync worker", () => {
  it("returns a bounded no-store health response", async () => {
    const response = await SELF.fetch("https://example.test/health");

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    await expect(response.json()).resolves.toMatchObject({ ok: true, version: 1 });
  });

  it("rejects browser origins outside the allowlist", async () => {
    const response = await SELF.fetch("https://example.test/health", {
      headers: { Origin: "https://attacker.example" },
    });

    expect(response.status).toBe(403);
  });

  it("rejects malformed auth input before any upstream request", async () => {
    const response = await SELF.fetch("https://example.test/v1/auth/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "email", idToken: "no" }),
    });

    expect(response.status).toBe(400);
  });

  it("requires a nonce for Apple sign-in", async () => {
    const response = await SELF.fetch("https://example.test/v1/auth/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "apple", idToken: "x".repeat(24) }),
    });

    expect(response.status).toBe(400);
  });

  it("rejects malformed refresh tokens without touching the database", async () => {
    const response = await SELF.fetch("https://example.test/v1/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: "short" }),
    });

    expect(response.status).toBe(400);
  });

  it("requires authentication for account export", async () => {
    const response = await SELF.fetch("https://example.test/v1/account/export");
    expect(response.status).toBe(401);
  });
});
