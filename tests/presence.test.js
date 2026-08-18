import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { formatOnlineCount } from '../js/presence.js';
import { isAllowedOrigin } from '../presence-worker/core.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../css/fengshen-ink.css', import.meta.url), 'utf8');
const client = readFileSync(new URL('../js/presence.js', import.meta.url), 'utf8');

test('在線人數元件具備狀態語意並載入 presence controller', () => {
  assert.match(html, /id="online-presence"[^>]+role="status"[^>]+aria-live="polite"/);
  assert.match(html, /src="js\/presence\.js"/);
  assert.match(css, /\.online-presence\s*\{[\s\S]*position:\s*fixed/);
});

test('在線數字格式至少顯示目前使用者一人', () => {
  assert.equal(formatOnlineCount(8), '在線 8 人');
  assert.equal(formatOnlineCount(0), '在線 1 人');
  assert.equal(formatOnlineCount('bad'), '在線 1 人');
});

test('presence client 使用匿名分頁識別碼與定時心跳', () => {
  assert.match(client, /sessionStorage/);
  assert.match(client, /crypto\.randomUUID\(\)/);
  assert.match(client, /HEARTBEAT_INTERVAL_MS = 25_000/);
  assert.doesNotMatch(client, /localStorage/);
});

test('presence API 僅接受正式網站與本機開發來源', () => {
  assert.equal(isAllowedOrigin('https://xunzhang-zhaiju.pages.dev'), true);
  assert.equal(isAllowedOrigin('https://xunzhang-zhaiju.netlify.app'), true);
  assert.equal(isAllowedOrigin('http://localhost:4176'), true);
  assert.equal(isAllowedOrigin('https://example.com'), false);
});
