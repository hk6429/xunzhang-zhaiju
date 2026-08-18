const PRESENCE_ENDPOINT = 'https://xunzhang-zhaiju-presence.hk6429.workers.dev';
const HEARTBEAT_INTERVAL_MS = 25_000;
const REQUEST_TIMEOUT_MS = 8_000;
const SESSION_KEY = 'xzzj_presence_session';

export function formatOnlineCount(count) {
  const safeCount = Number.isFinite(Number(count)) ? Math.max(1, Math.round(Number(count))) : 1;
  return `在線 ${safeCount} 人`;
}

function getSessionId() {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

async function requestPresence(method = 'POST') {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(PRESENCE_ENDPOINT, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: method === 'GET' ? undefined : JSON.stringify({ sessionId: getSessionId() }),
      cache: 'no-store',
      signal: controller.signal,
      keepalive: method === 'DELETE',
    });
    if (!response.ok) throw new Error(`Presence API ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function renderPresence(text, connected) {
  const widget = document.getElementById('online-presence');
  const label = document.getElementById('online-presence-text');
  if (!widget || !label) return;
  label.textContent = text;
  widget.classList.toggle('is-offline', !connected);
}

async function heartbeat() {
  if (document.visibilityState === 'hidden') return;
  try {
    const data = await requestPresence('POST');
    renderPresence(formatOnlineCount(data.online), true);
  } catch {
    renderPresence('在線統計暫停', false);
  }
}

function leavePresence() {
  requestPresence('DELETE').catch(() => {});
}

if (typeof document !== 'undefined') {
  heartbeat();
  const heartbeatTimer = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') heartbeat();
  });
  window.addEventListener('pagehide', leavePresence, { once: true });
  window.addEventListener('beforeunload', () => clearInterval(heartbeatTimer), { once: true });
}
