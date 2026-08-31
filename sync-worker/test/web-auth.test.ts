import { describe, expect, it } from "vitest";
import { startWebAuth, WebAuthError } from "../src/web-auth";

const env = {
  ALLOWED_ORIGINS: "https://app.xzzj.test",
  PUBLIC_BASE_URL: "https://sync.xzzj.test",
  SESSION_ISSUER: "test-issuer",
  WORKER_SESSION_SECRET: "test-session-secret-that-is-longer-than-32-characters",
  GOOGLE_WEB_CLIENT_ID: "google-web-client-id",
  APPLE_WEB_CLIENT_ID: "apple-web-client-id",
  WEB_COOKIE_SAME_SITE: "None",
} as unknown as Env;

describe("web OAuth start", () => {
  it("creates Google authorization code + PKCE navigation without exposing tokens", async () => {
    const url = new URL("https://sync.xzzj.test/v1/auth/web/start?provider=google&returnTo=https%3A%2F%2Fapp.xzzj.test%2Fsettings");
    const response = await startWebAuth(url, env);
    const location = new URL(response.headers.get("Location")!);

    expect(response.status).toBe(302);
    expect(location.origin).toBe("https://accounts.google.com");
    expect(location.searchParams.get("response_type")).toBe("code");
    expect(location.searchParams.get("code_challenge_method")).toBe("S256");
    expect(location.searchParams.get("code_challenge")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(response.headers.get("Set-Cookie")).toContain("HttpOnly; Secure; SameSite=None");
  });

  it("rejects an open-redirect return URL", async () => {
    const url = new URL("https://sync.xzzj.test/v1/auth/web/start?provider=apple&returnTo=https%3A%2F%2Fevil.test");
    await expect(startWebAuth(url, env)).rejects.toMatchObject<WebAuthError>({ status: 400 });
  });
});
