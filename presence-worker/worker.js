import { DurableObject } from 'cloudflare:workers';
import { ACTIVE_WINDOW_MS, isAllowedOrigin } from './core.js';

const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin(origin) ? origin : 'https://xunzhang-zhaiju.pages.dev',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    Vary: 'Origin',
  };
}

function json(origin, body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(origin) });
}

async function readSessionId(request) {
  try {
    const body = await request.json();
    return SESSION_ID_PATTERN.test(body?.sessionId || '') ? body.sessionId : null;
  } catch {
    return null;
  }
}

export class PresenceRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS presence (
      session_id TEXT PRIMARY KEY,
      last_seen INTEGER NOT NULL
    )`);
  }

  async fetch(request) {
    const { method, sessionId } = await request.json();
    const now = Date.now();
    this.sql.exec('DELETE FROM presence WHERE last_seen < ?', now - ACTIVE_WINDOW_MS);
    if (method === 'POST') {
      this.sql.exec(`INSERT INTO presence (session_id, last_seen) VALUES (?, ?)
        ON CONFLICT(session_id) DO UPDATE SET last_seen = excluded.last_seen`, sessionId, now);
    } else if (method === 'DELETE') {
      this.sql.exec('DELETE FROM presence WHERE session_id = ?', sessionId);
    }
    const [row] = [...this.sql.exec('SELECT COUNT(*) AS online FROM presence')];
    return Response.json({ online: Number(row?.online || 0) });
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (!isAllowedOrigin(origin)) return json(origin, { error: 'Origin not allowed' }, 403);
    if (!['GET', 'POST', 'DELETE'].includes(request.method)) {
      return json(origin, { error: 'Method not allowed' }, 405);
    }

    let sessionId = null;
    if (request.method !== 'GET') {
      sessionId = await readSessionId(request);
      if (!sessionId) return json(origin, { error: 'Invalid session' }, 400);
    }

    const room = env.PRESENCE_ROOM.getByName('global');
    const roomResponse = await room.fetch('https://presence.internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: request.method, sessionId }),
    });
    const { online } = await roomResponse.json();
    return json(origin, { online, windowSeconds: ACTIVE_WINDOW_MS / 1000 });
  },
};
