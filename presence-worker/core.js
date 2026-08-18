export const ACTIVE_WINDOW_MS = 75_000;

const ALLOWED_ORIGINS = new Set([
  'https://xunzhang-zhaiju.pages.dev',
  'https://xunzhang-zhaiju.netlify.app',
]);

export function isAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.has(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}
