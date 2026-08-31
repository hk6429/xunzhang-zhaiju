import { createRemoteJWKSet, jwtVerify, SignJWT } from "jose";
import type { IdentityProvider, VerifiedIdentity } from "./types";

const appleKeys = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));
const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const encoder = new TextEncoder();

export async function verifyProviderToken(
  provider: IdentityProvider,
  token: string,
  nonce: string | undefined,
  env: Env,
): Promise<VerifiedIdentity> {
  const audiences = parseList(provider === "apple" ? env.APPLE_CLIENT_IDS : env.GOOGLE_CLIENT_IDS);
  if (audiences.length === 0) throw new Error(`${provider} client ID 尚未設定`);
  const verified = provider === "apple"
    ? await jwtVerify(token, appleKeys, {
        issuer: "https://appleid.apple.com",
        audience: audiences,
      })
    : await jwtVerify(token, googleKeys, {
        issuer: ["accounts.google.com", "https://accounts.google.com"],
        audience: audiences,
      });
  if (!verified.payload.sub) throw new Error("身分權杖缺少 subject");
  if (nonce !== undefined && verified.payload.nonce !== nonce) {
    throw new Error("nonce 驗證失敗");
  }
  return {
    provider,
    subject: verified.payload.sub,
    email: typeof verified.payload.email === "string" ? verified.payload.email : undefined,
  };
}

export async function issueSession(userID: string, env: Env): Promise<string> {
  return new SignJWT({ scope: "progress:sync" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(env.SESSION_ISSUER)
    .setAudience("xunzhang-zhaiju-clients")
    .setSubject(userID)
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(sessionKey(env));
}

export async function verifySession(token: string, env: Env): Promise<string> {
  const verified = await jwtVerify(token, sessionKey(env), {
    algorithms: ["HS256"],
    issuer: env.SESSION_ISSUER,
    audience: "xunzhang-zhaiju-clients",
  });
  if (!verified.payload.sub) throw new Error("session 缺少 subject");
  return verified.payload.sub;
}

function sessionKey(env: Env): Uint8Array {
  if (env.WORKER_SESSION_SECRET.length < 32) {
    throw new Error("WORKER_SESSION_SECRET 至少需要 32 個字元");
  }
  return encoder.encode(env.WORKER_SESSION_SECRET);
}

function parseList(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}
