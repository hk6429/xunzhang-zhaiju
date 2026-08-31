import { importPKCS8, jwtVerify, SignJWT } from "jose";
import { createSession, ensureUser, linkIdentity, rotateSession, sessionIsActive, type SessionBundle } from "./database";
import { verifyProviderToken, verifySession } from "./auth";
import type { IdentityProvider } from "./types";

const encoder = new TextEncoder();
const oauthCookie = "xzzj_oauth";
const accessCookie = "xzzj_access";
const refreshCookie = "xzzj_refresh";

interface OAuthState {
  provider: IdentityProvider;
  action: "signIn" | "link";
  linkUserID?: string;
  state: string;
  verifier: string;
  nonce: string;
  returnTo: string;
}

export async function startWebAuth(url: URL, env: Env, linkUserID?: string): Promise<Response> {
  const provider = parseProvider(url.searchParams.get("provider"));
  const returnTo = allowedReturnTo(url.searchParams.get("returnTo"), env);
  const state = randomToken(24);
  const verifier = randomToken(48);
  const nonce = randomToken(24);
  const challenge = await pkceChallenge(verifier);
  const callbackURL = callbackURLFor(env);
  const action = linkUserID ? "link" : "signIn";
  const stateToken = await issueOAuthState({ provider, action, linkUserID, state, verifier, nonce, returnTo }, env);
  const authorizationURL = provider === "google"
    ? googleAuthorizationURL(state, challenge, nonce, callbackURL, env)
    : appleAuthorizationURL(state, nonce, callbackURL, env);
  const headers = new Headers({ Location: authorizationURL.toString(), "Cache-Control": "no-store" });
  headers.append("Set-Cookie", serializeCookie(oauthCookie, stateToken, 600, env, "/v1/auth/web/callback"));
  return new Response(null, { status: 302, headers });
}

export async function finishWebAuth(request: Request, env: Env): Promise<Response> {
  if (Number(request.headers.get("Content-Length") ?? 0) > 32_768) {
    throw new WebAuthError(413, "OAuth callback 過大");
  }
  const values = request.method === "POST"
    ? Object.fromEntries(Array.from((await request.formData()).entries(), ([key, value]) => [key, String(value)]))
    : Object.fromEntries(new URL(request.url).searchParams.entries());
  const cookieToken = cookieValue(request, oauthCookie);
  if (!cookieToken) throw new WebAuthError(400, "OAuth 狀態 cookie 不存在");
  const oauth = await verifyOAuthState(cookieToken, env);
  if (values.state !== oauth.state) throw new WebAuthError(400, "OAuth state 驗證失敗");
  if (values.error) return redirectWithAuthResult(oauth.returnTo, "error", env);
  if (!values.code) throw new WebAuthError(400, "OAuth callback 缺少 code");

  const idToken = await exchangeAuthorizationCode(
    oauth.provider,
    values.code,
    oauth.verifier,
    callbackURLFor(env),
    env,
  );
  const identity = await verifyProviderToken(oauth.provider, idToken, oauth.nonce, env);
  if (oauth.action === "link") {
    const current = await currentWebUser(request, env);
    if (!oauth.linkUserID || current !== oauth.linkUserID) {
      throw new WebAuthError(401, "帳號連結階段已失效，請重新操作");
    }
    await linkIdentity(current, identity, env);
    return redirectWithAuthResult(oauth.returnTo, "linked", env);
  }
  const userID = await ensureUser(identity, env);
  const session = await createSession(userID, env);
  return redirectWithAuthResult(oauth.returnTo, "success", env, session);
}

export async function refreshWebSession(request: Request, env: Env): Promise<Response> {
  const refreshToken = cookieValue(request, refreshCookie);
  if (!refreshToken) throw new WebAuthError(401, "缺少 refresh cookie");
  const session = await rotateSession(refreshToken, env);
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  appendSessionCookies(headers, session, env);
  return new Response(JSON.stringify({ refreshed: true }), { status: 200, headers });
}

export function requestAccessToken(request: Request): string | undefined {
  const authorization = request.headers.get("Authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7);
  return cookieValue(request, accessCookie);
}

export function clearWebSessionCookies(headers: Headers, env: Env): void {
  headers.append("Set-Cookie", serializeCookie(accessCookie, "", 0, env));
  headers.append("Set-Cookie", serializeCookie(refreshCookie, "", 0, env));
  headers.append("Set-Cookie", serializeCookie(oauthCookie, "", 0, env, "/v1/auth/web/callback"));
}

export class WebAuthError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

function googleAuthorizationURL(
  state: string,
  challenge: string,
  nonce: string,
  callbackURL: string,
  env: Env,
): URL {
  if (!env.GOOGLE_WEB_CLIENT_ID) throw new WebAuthError(503, "Google Web OAuth 尚未設定");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: env.GOOGLE_WEB_CLIENT_ID,
    redirect_uri: callbackURL,
    response_type: "code",
    scope: "openid email",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return url;
}

function appleAuthorizationURL(
  state: string,
  nonce: string,
  callbackURL: string,
  env: Env,
): URL {
  if (!env.APPLE_WEB_CLIENT_ID) throw new WebAuthError(503, "Apple Web OAuth 尚未設定");
  const url = new URL("https://appleid.apple.com/auth/authorize");
  url.search = new URLSearchParams({
    client_id: env.APPLE_WEB_CLIENT_ID,
    redirect_uri: callbackURL,
    response_type: "code",
    response_mode: "form_post",
    scope: "email",
    state,
    nonce,
  }).toString();
  return url;
}

async function exchangeAuthorizationCode(
  provider: IdentityProvider,
  code: string,
  verifier: string,
  callbackURL: string,
  env: Env,
): Promise<string> {
  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    redirect_uri: callbackURL,
  });
  let endpoint: string;
  if (provider === "google") {
    endpoint = "https://oauth2.googleapis.com/token";
    body.set("code_verifier", verifier);
    body.set("client_id", env.GOOGLE_WEB_CLIENT_ID);
    body.set("client_secret", env.GOOGLE_WEB_CLIENT_SECRET);
  } else {
    endpoint = "https://appleid.apple.com/auth/token";
    body.set("client_id", env.APPLE_WEB_CLIENT_ID);
    body.set("client_secret", await appleClientSecret(env));
  }
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const result: unknown = await response.json();
  if (!response.ok || !isRecord(result) || typeof result.id_token !== "string") {
    throw new WebAuthError(401, `${provider} code 交換失敗`);
  }
  return result.id_token;
}

async function appleClientSecret(env: Env): Promise<string> {
  if (!env.APPLE_TEAM_ID || !env.APPLE_KEY_ID || !env.APPLE_PRIVATE_KEY) {
    throw new WebAuthError(503, "Apple Web OAuth 金鑰尚未設定");
  }
  const key = await importPKCS8(env.APPLE_PRIVATE_KEY.replaceAll("\\n", "\n"), "ES256");
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: env.APPLE_KEY_ID })
    .setIssuer(env.APPLE_TEAM_ID)
    .setSubject(env.APPLE_WEB_CLIENT_ID)
    .setAudience("https://appleid.apple.com")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(key);
}

async function issueOAuthState(value: OAuthState, env: Env): Promise<string> {
  return new SignJWT({
    provider: value.provider,
    action: value.action,
    linkUserID: value.linkUserID,
    state: value.state,
    verifier: value.verifier,
    nonce: value.nonce,
    returnTo: value.returnTo,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(`${env.SESSION_ISSUER}:oauth`)
    .setAudience("xunzhang-zhaiju-web")
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(cookieKey(env));
}

async function verifyOAuthState(token: string, env: Env): Promise<OAuthState> {
  const verified = await jwtVerify(token, cookieKey(env), {
    algorithms: ["HS256"],
    issuer: `${env.SESSION_ISSUER}:oauth`,
    audience: "xunzhang-zhaiju-web",
  });
  const payload = verified.payload;
  const provider = parseProvider(typeof payload.provider === "string" ? payload.provider : null);
  const action = payload.action === "link" ? "link" : "signIn";
  if (typeof payload.state !== "string" || typeof payload.verifier !== "string"
      || typeof payload.nonce !== "string" || typeof payload.returnTo !== "string") {
    throw new WebAuthError(400, "OAuth 狀態內容不完整");
  }
  const linkUserID = typeof payload.linkUserID === "string" ? payload.linkUserID : undefined;
  if (action === "link" && !linkUserID) throw new WebAuthError(400, "OAuth 連結狀態不完整");
  return { provider, action, linkUserID, state: payload.state, verifier: payload.verifier, nonce: payload.nonce, returnTo: payload.returnTo };
}

async function currentWebUser(request: Request, env: Env): Promise<string> {
  const token = requestAccessToken(request);
  if (!token) throw new WebAuthError(401, "帳號連結需要有效登入階段");
  try {
    const identity = await verifySession(token, env);
    if (!await sessionIsActive(identity.userID, identity.sessionID, env)) {
      throw new WebAuthError(401, "帳號連結登入階段已失效");
    }
    return identity.userID;
  } catch (error) {
    if (error instanceof WebAuthError) throw error;
    throw new WebAuthError(401, "帳號連結登入階段無效");
  }
}

function redirectWithAuthResult(returnTo: string, result: string, env: Env, session?: SessionBundle): Response {
  const url = new URL(returnTo);
  url.searchParams.set("auth", result);
  const headers = new Headers({ Location: url.toString(), "Cache-Control": "no-store" });
  headers.append("Set-Cookie", serializeCookie(oauthCookie, "", 0, env, "/v1/auth/web/callback"));
  if (session) appendSessionCookies(headers, session, env);
  return new Response(null, { status: 302, headers });
}

function appendSessionCookies(headers: Headers, session: SessionBundle, env: Env): void {
  headers.append("Set-Cookie", serializeCookie(accessCookie, session.accessToken, session.expiresIn, env));
  headers.append("Set-Cookie", serializeCookie(refreshCookie, session.refreshToken, session.refreshExpiresIn, env));
}

function serializeCookie(name: string, value: string, maxAge: number, env: Env, path = "/"): string {
  const sameSite = String(env.WEB_COOKIE_SAME_SITE) === "Lax" ? "Lax" : "None";
  return `${name}=${encodeURIComponent(value)}; Path=${path}; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=${sameSite}`;
}

function cookieValue(request: Request, name: string): string | undefined {
  for (const item of (request.headers.get("Cookie") ?? "").split(";")) {
    const [key, ...parts] = item.trim().split("=");
    if (key === name) return decodeURIComponent(parts.join("="));
  }
  return undefined;
}

function parseProvider(value: string | null): IdentityProvider {
  if (value === "apple" || value === "google") return value;
  throw new WebAuthError(400, "OAuth provider 必須是 apple 或 google");
}

function allowedReturnTo(value: string | null, env: Env): string {
  if (!value) throw new WebAuthError(400, "缺少 returnTo");
  const url = new URL(value);
  const allowed = env.ALLOWED_ORIGINS.split(",").map((item) => item.trim()).filter(Boolean);
  if (!allowed.includes(url.origin) || url.protocol !== "https:") {
    throw new WebAuthError(400, "returnTo 不在允許清單");
  }
  return url.toString();
}

function callbackURLFor(env: Env): string {
  const base = new URL(env.PUBLIC_BASE_URL);
  if (base.protocol !== "https:" || base.hostname.includes("example")) {
    throw new WebAuthError(503, "PUBLIC_BASE_URL 尚未設定");
  }
  return new URL("/v1/auth/web/callback", base).toString();
}

function randomToken(byteCount: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteCount));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(verifier));
  let binary = "";
  for (const byte of new Uint8Array(digest)) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function cookieKey(env: Env): Uint8Array {
  if (env.WORKER_SESSION_SECRET.length < 32) throw new WebAuthError(503, "session secret 長度不足");
  return encoder.encode(env.WORKER_SESSION_SECRET);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
