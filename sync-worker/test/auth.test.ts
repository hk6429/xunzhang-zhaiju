import { describe, expect, it } from "vitest";
import { makeRefreshCredential, verifyRefreshSecret } from "../src/auth";

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
