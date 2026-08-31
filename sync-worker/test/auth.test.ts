import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import { makeRefreshCredential, verifyRefreshSecret, verifySession } from "../src/auth";

describe("refresh credentials", () => {
  it("stores only a hash that verifies the matching opaque secret", async () => {
    const credential = await makeRefreshCredential("session-test-id");
    const secret = credential.token.slice(credential.token.indexOf(".") + 1);

    expect(credential.token.startsWith("session-test-id.")).toBe(true);
    expect(credential.secretHash).not.toContain(secret);
    await expect(verifyRefreshSecret(secret, credential.secretHash)).resolves.toBe(true);
    await expect(verifyRefreshSecret(`${secret}x`, credential.secretHash)).resolves.toBe(false);
  });
});

describe("access sessions", () => {
  const secret = "test-session-secret-that-is-longer-than-32-characters";
  const env = { SESSION_ISSUER: "test-issuer", WORKER_SESSION_SECRET: secret } as Env;

  it("rejects expired and wrong-audience JWTs", async () => {
    const key = new TextEncoder().encode(secret);
    const token = (audience: string, expiration: number) => new SignJWT({ scope: "progress:sync" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuer("test-issuer")
      .setAudience(audience)
      .setSubject("user-1")
      .setJti("session-1")
      .setIssuedAt()
      .setExpirationTime(expiration)
      .sign(key);

    await expect(verifySession(await token("wrong-audience", Math.floor(Date.now() / 1_000) + 60), env)).rejects.toThrow();
    await expect(verifySession(await token("xunzhang-zhaiju-clients", Math.floor(Date.now() / 1_000) - 60), env)).rejects.toThrow();
  });
});
