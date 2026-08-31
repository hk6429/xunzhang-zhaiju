import { issueSession, verifyProviderToken, verifySession } from "./auth";
import { ensureUser, SyncConflictError, syncProgress } from "./database";
import { parseAuthExchange, parseSyncRequest } from "./types";

const maxBodyBytes = 1_048_576;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    if (request.method === "OPTIONS") return corsResponse(origin, env);
    if (!originAllowed(origin, env)) return json({ error: "origin_not_allowed" }, 403, origin, env);

    try {
      if (request.method === "GET" && url.pathname === "/health") {
        return json({ ok: true, service: "xunzhang-zhaiju-sync", version: 1 }, 200, origin, env);
      }
      if (request.method === "POST" && url.pathname === "/v1/auth/exchange") {
        const input = parseAuthExchange(await readJsonLimited(request));
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
        const sessionToken = await issueSession(userID, env);
        return json({ sessionToken, userID, expiresIn: 2_592_000 }, 200, origin, env);
      }
      if (request.method === "POST" && url.pathname === "/v1/sync") {
        const userID = await authenticatedUser(request, env);
        const input = parseSyncRequest(await readJsonLimited(request));
        const result = await syncProgress(userID, input, env);
        return json(result, 200, origin, env);
      }
      return json({ error: "not_found" }, 404, origin, env);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status, origin, env);
      if (error instanceof SyncConflictError) return json({ error: error.message }, 409, origin, env);
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

async function authenticatedUser(request: Request, env: Env): Promise<string> {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) throw new HttpError(401, "缺少登入憑證");
  try {
    return await verifySession(authorization.slice(7), env);
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
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Vary": "Origin",
  };
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

class HttpError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}
