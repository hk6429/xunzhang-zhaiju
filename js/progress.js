// js/progress.js — 存檔（localStorage `xzzj_save_v1`）與進度碼匯出/匯入
// 存檔格式依 docs/SCHEMA.md：
// { v: 1, levels, ink, collection, quizStats, retention }

import { defaultRetention, ensureRetention, normalizeRetention } from './retention.js';

export const SAVE_KEY = 'xzzj_save_v1';

export function defaultSave() {
  return {
    v: 1,
    levels: {},
    ink: 0,
    collection: [],
    quizStats: { answered: 0, correct: 0 },
    retention: defaultRetention(),
    preferences: {},
    phrasePractice: {},
    daily: { date: '', counters: {} },
    classroom: null,
    world: { eventsSeen: [], treasures: [], loreUnlocked: [], chaptersSeen: [], bonuses: {} },
  };
}

function normalizeEngagementFields(obj) {
  const rawPreferences = obj.preferences && typeof obj.preferences === 'object' ? obj.preferences : {};
  const preferences = {};
  if (typeof rawPreferences.titleId === 'string') preferences.titleId = rawPreferences.titleId.slice(0, 40);
  if (['explore', 'standard', 'challenge'].includes(rawPreferences.playMode)) preferences.playMode = rawPreferences.playMode;

  const phrasePractice = {};
  if (obj.phrasePractice && typeof obj.phrasePractice === 'object' && !Array.isArray(obj.phrasePractice)) {
    for (const [phraseId, record] of Object.entries(obj.phrasePractice)) {
      if (!/^p\d{4}$/.test(phraseId) || !record || typeof record !== 'object') continue;
      const kind = ['example', 'situation', 'visual'].includes(record.kind) ? record.kind : 'example';
      const text = String(record.text || '').trim().slice(0, 80);
      if (text) phrasePractice[phraseId] = { kind, text, mastered: true };
    }
  }

  const rawDaily = obj.daily && typeof obj.daily === 'object' ? obj.daily : {};
  const counters = {};
  if (rawDaily.counters && typeof rawDaily.counters === 'object') {
    for (const [key, value] of Object.entries(rawDaily.counters)) {
      if (/^[a-z-]{1,30}$/.test(key) && Number.isFinite(value)) counters[key] = Math.max(0, Math.floor(value));
    }
  }
  const daily = { date: typeof rawDaily.date === 'string' ? rawDaily.date.slice(0, 10) : '', counters };

  let classroom = null;
  const rawClassroom = obj.classroom;
  if (rawClassroom && typeof rawClassroom === 'object' && /^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(rawClassroom.teamCode || '')) {
    classroom = {
      v: 1,
      teamCode: rawClassroom.teamCode,
      masteredCount: Math.max(0, Math.min(200, Math.floor(Number(rawClassroom.masteredCount) || 0))),
      chapter: Math.max(0, Math.min(5, Math.floor(Number(rawClassroom.chapter) || 0))),
      updatedAt: Math.max(0, Math.floor(Number(rawClassroom.updatedAt) || 0)),
    };
  }
  const rawWorld = obj.world && typeof obj.world === 'object' ? obj.world : {};
  const cleanIds = (value) => Array.isArray(value)
    ? [...new Set(value.filter((item) => typeof item === 'string').map((item) => item.slice(0, 80)))]
    : [];
  const world = {
    eventsSeen: cleanIds(rawWorld.eventsSeen),
    treasures: cleanIds(rawWorld.treasures),
    loreUnlocked: cleanIds(rawWorld.loreUnlocked),
    chaptersSeen: Array.isArray(rawWorld.chaptersSeen)
      ? [...new Set(rawWorld.chaptersSeen.filter((id) => Number.isInteger(id) && id >= 1 && id <= 5))]
      : [],
    bonuses: {},
  };
  if (rawWorld.bonuses && typeof rawWorld.bonuses === 'object' && !Array.isArray(rawWorld.bonuses)) {
    for (const [key, value] of Object.entries(rawWorld.bonuses)) {
      if (/^[a-zA-Z:-]{1,80}$/.test(key) && Number.isFinite(value)) world.bonuses[key] = Math.max(0, Math.floor(value));
    }
  }
  return { preferences, phrasePractice, daily, classroom, world };
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
    const badges = Array.isArray(v.badges)
      ? [...new Set(v.badges.filter((item) => typeof item === 'string' && item))]
      : [];
    const best = v.best && typeof v.best === 'object'
      ? {
        durationMs: Number.isFinite(v.best.durationMs) && v.best.durationMs >= 0
          ? Math.floor(v.best.durationMs) : null,
        mistakes: Number.isFinite(v.best.mistakes) && v.best.mistakes >= 0
          ? Math.floor(v.best.mistakes) : null,
        modes: Array.isArray(v.best.modes)
          ? [...new Set(v.best.modes.filter((item) => ['explore', 'standard', 'challenge'].includes(item)))]
          : [],
      }
      : { durationMs: null, mistakes: null, modes: [] };
    levels[k] = { stars: v.stars, found: v.found.slice(), badges, best };
  }
  const qs = obj.quizStats;
  const quizStats = (qs && typeof qs.answered === 'number' && typeof qs.correct === 'number')
    ? { answered: qs.answered, correct: qs.correct }
    : { answered: 0, correct: 0 };
  const engagement = normalizeEngagementFields(obj);
  return {
    v: 1,
    levels,
    ink: Math.floor(obj.ink),
    collection: obj.collection.slice(),
    quizStats,
    retention: normalizeRetention(obj.retention),
    ...engagement,
  };
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
  ensureRetention(save);
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
