// js/progress.js — 存檔（localStorage `xzzj_save_v1`）與進度碼匯出/匯入
// 存檔格式依 docs/SCHEMA.md：
// { v: 1, levels: { "1": { stars, found: [] } }, ink: n, collection: [], quizStats: { answered, correct } }

export const SAVE_KEY = 'xzzj_save_v1';

export function defaultSave() {
  return { v: 1, levels: {}, ink: 0, collection: [], quizStats: { answered: 0, correct: 0 } };
}

/** 驗證存檔物件形狀；合法回傳正規化後物件，否則回傳 null */
export function validateSave(obj) {
  if (!obj || typeof obj !== 'object' || obj.v !== 1) return null;
  if (!obj.levels || typeof obj.levels !== 'object' || Array.isArray(obj.levels)) return null;
  if (typeof obj.ink !== 'number' || !Number.isFinite(obj.ink) || obj.ink < 0) return null;
  if (!Array.isArray(obj.collection) || !obj.collection.every((x) => typeof x === 'string')) return null;
  const levels = {};
  for (const [k, v] of Object.entries(obj.levels)) {
    if (!/^\d+$/.test(k)) return null;
    if (!v || typeof v !== 'object') return null;
    if (typeof v.stars !== 'number' || v.stars < 0 || v.stars > 3) return null;
    if (!Array.isArray(v.found) || !v.found.every((x) => typeof x === 'string')) return null;
    levels[k] = { stars: v.stars, found: v.found.slice() };
  }
  const qs = obj.quizStats;
  const quizStats = (qs && typeof qs.answered === 'number' && typeof qs.correct === 'number')
    ? { answered: qs.answered, correct: qs.correct }
    : { answered: 0, correct: 0 };
  return { v: 1, levels, ink: Math.floor(obj.ink), collection: obj.collection.slice(), quizStats };
}

/** 讀取存檔；壞檔或不存在回傳預設存檔 */
export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    return validateSave(JSON.parse(raw)) || defaultSave();
  } catch {
    return defaultSave();
  }
}

/**
 * 寫入存檔。ink 與 collection 於存檔時向兩引擎取值（SCHEMA 整合點）。
 * @param {object} save 目前存檔物件（levels / quizStats 以此為準）
 * @param {{ serialize(): number }} hintEngine
 * @param {{ serialize(): string[] }} collection
 */
export function persistSave(save, hintEngine, collection) {
  save.ink = hintEngine.serialize();
  save.collection = collection.serialize();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // 隱私模式等寫入失敗：靜默，遊戲仍可玩
  }
  return save;
}

export function resetSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* noop */ }
}

// ── 進度碼（存檔 JSON 的 base64，支援 UTF-8） ──

export function exportCode(save) {
  const json = JSON.stringify(save);
  const bytes = new TextEncoder().encode(json);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** 解析進度碼；格式錯誤回傳 null */
export function importCode(code) {
  try {
    const bin = atob(String(code).trim());
    const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    return validateSave(JSON.parse(json));
  } catch {
    return null;
  }
}
