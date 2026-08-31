import { verifyProviderToken, verifySession, type AccessIdentity } from "./auth";
import {
  createSession,
  deleteAccount,
  ensureUser,
  exportAccount,
  IdentityLinkError,
  linkIdentity,
  rotateSession,
  revokeSessionFamily,
  sessionIsActive,
  SessionTokenError,
  syncProgress,
} from "./database";
import { parseAuthExchange, parseAuthRefresh, parseSyncRequest } from "./types";
import {
  clearWebSessionCookies,
  finishWebAuth,
  refreshWebSession,
  requestAccessToken,
  startWebAuth,
  WebAuthError,
} from "./web-auth";

const maxBodyBytes = 1_048_576;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    if (request.method === "OPTIONS") return corsResponse(origin, env);
    const oauthCallback = url.pathname === "/v1/auth/web/callback";
    if (!oauthCallback && !originAllowed(origin, env)) {
      return json({ error: "origin_not_allowed" }, 403, origin, env);
    }

    try {
      if (request.method === "GET" && url.pathname === "/health") {
        return json({ ok: true, service: "xunzhang-zhaiju-sync", version: 1 }, 200, origin, env);
      }
      if (request.method === "GET" && url.pathname === "/v1/auth/web/start") {
        const linkUserID = url.searchParams.get("action") === "link"
          ? (await authenticatedUser(request, env)).userID
          : undefined;
        return await startWebAuth(url, env, linkUserID);
      }
      if ((request.method === "GET" || request.method === "POST")
          && url.pathname === "/v1/auth/web/callback") {
        return await finishWebAuth(request, env);
      }
      if (request.method === "POST" && url.pathname === "/v1/auth/web/refresh") {
        return withCors(await refreshWebSession(request, env), origin);
      }
      if (request.method === "POST" && url.pathname === "/v1/auth/logout") {
        const identity = await authenticatedUser(request, env);
        await revokeSessionFamily(identity.userID, identity.sessionID, env);
        const response = json({ signedOut: true }, 200, origin, env);
        clearWebSessionCookies(response.headers, env);
        return response;
      }
      if (request.method === "POST" && url.pathname === "/v1/auth/exchange") {
        const input = parseAuthExchange(await readJsonLimited(request));
        await enforceRateLimit(env.AUTH_RATE_LIMITER, `auth:${await digestKey(input.idToken)}`);
        let identity;
        try {
          identity = await verifyProviderToken(input.provider, input.idToken, input.nonce, env);
        } catch (error) {
          console.warn(JSON.stringify({
            message: "identity token rejected",
            provider: input.provider,
            error: error instanceof Error ? error.message : "unknown",
          }));
          throw new HttpError(401, "登入憑證無效");
        }
        const userID = await ensureUser(identity, env);
        return json(await createSession(userID, env), 200, origin, env);
      }
      if (request.method === "POST" && url.pathname === "/v1/account/link") {
        const current = await authenticatedUser(request, env);
        const input = parseAuthExchange(await readJsonLimited(request));
        await enforceRateLimit(env.AUTH_RATE_LIMITER, `link:${current.userID}`);
        let identity;
        try {
          identity = await verifyProviderToken(input.provider, input.idToken, input.nonce, env);
        } catch {
          throw new HttpError(401, "第二個登入憑證無效");
        }
        await linkIdentity(current.userID, identity, env);
        return json({ linked: true, provider: identity.provider }, 200, origin, env);
      }
      if (request.method === "POST" && url.pathname === "/v1/auth/refresh") {
        const input = parseAuthRefresh(await readJsonLimited(request));
        await enforceRateLimit(env.AUTH_RATE_LIMITER, `refresh:${await digestKey(input.refreshToken)}`);
        return json(await rotateSession(input.refreshToken, env), 200, origin, env);
      }
      if (request.method === "POST" && url.pathname === "/v1/sync") {
        const identity = await authenticatedUser(request, env);
        await enforceRateLimit(env.SYNC_RATE_LIMITER, `sync:${identity.userID}`);
        const input = parseSyncRequest(await readJsonLimited(request));
        const result = await syncProgress(identity.userID, input, env);
        return json(result, 200, origin, env);
      }
      if (request.method === "GET" && url.pathname === "/v1/account/export") {
        const identity = await authenticatedUser(request, env);
        await enforceRateLimit(env.SYNC_RATE_LIMITER, `export:${identity.userID}`);
        return json(await exportAccount(identity.userID, env), 200, origin, env);
      }
      if (request.method === "DELETE" && url.pathname === "/v1/account") {
        const identity = await authenticatedUser(request, env);
        if (request.headers.get("X-Confirm-Delete") !== "DELETE") {
          throw new HttpError(400, "刪除帳號必須明確確認");
        }
        await deleteAccount(identity.userID, env);
        const response = json({ deleted: true }, 200, origin, env);
        clearWebSessionCookies(response.headers, env);
        return response;
      }
      return json({ error: "not_found" }, 404, origin, env);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status, origin, env);
      if (error instanceof WebAuthError) return json({ error: error.message }, error.status, origin, env);
      if (error instanceof SessionTokenError) return json({ error: error.message }, 401, origin, env);
      if (error instanceof IdentityLinkError) return json({ error: error.message }, 409, origin, env);
      if (error instanceof TypeError || error instanceof SyntaxError) {
        return json({ error: error.message }, 400, origin, env);
      }
      console.error(JSON.stringify({
        message: "request failed",
        path: url.pathname,
        error: error instanceof Error ? error.message : "unknown",
      }));
      return json({ error: "internal_server_error" }, 500, origin, env);
    }
  },
} satisfies ExportedHandler<Env>;

async function authenticatedUser(request: Request, env: Env): Promise<AccessIdentity> {
  const token = requestAccessToken(request);
  if (!token) throw new HttpError(401, "缺少登入憑證");
  try {
    const identity = await verifySession(token, env);
    if (!await sessionIsActive(identity.userID, identity.sessionID, env)) throw new Error("session 已撤銷");
    return identity;
  } catch {
    throw new HttpError(401, "登入憑證已失效");
  }
}

async function readJsonLimited(request: Request): Promise<unknown> {
  const announced = Number(request.headers.get("Content-Length") ?? 0);
  if (announced > maxBodyBytes) throw new HttpError(413, "請求內容過大");
  if (!request.body) throw new TypeError("缺少請求內容");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBodyBytes) {
      await reader.cancel();
      throw new HttpError(413, "請求內容過大");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

function originAllowed(origin: string | null, env: Env): boolean {
  if (origin === null) return true;
  const allowed = env.ALLOWED_ORIGINS.split(",").map((item) => item.trim()).filter(Boolean);
  return allowed.includes(origin);
}

function corsResponse(origin: string | null, env: Env): Response {
  if (!originAllowed(origin, env)) return new Response(null, { status: 403 });
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

function json(body: unknown, status: number, origin: string | null, env: Env): Response {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  if (originAllowed(origin, env)) {
    for (const [key, value] of Object.entries(corsHeaders(origin))) headers.set(key, value);
  }
  return Response.json(body, { status, headers });
}

function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Confirm-Delete",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Vary": "Origin",
  };
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  if (origin) headers["Access-Control-Allow-Credentials"] = "true";
  return headers;
}

function withCors(response: Response, origin: string | null): Response {
  for (const [key, value] of Object.entries(corsHeaders(origin))) response.headers.set(key, value);
  return response;
}

async function enforceRateLimit(limiter: RateLimit, key: string): Promise<void> {
  const result = await limiter.limit({ key });
  if (!result.success) throw new HttpError(429, "請求過於頻繁，請稍後再試");
}

async function digestKey(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest).slice(0, 16), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}
