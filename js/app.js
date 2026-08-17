// js/app.js — 入口：資料載入、視圖切換、地圖／圖鑑／設定
import { createHintEngine } from './hints.js';
import { createCollection } from './collection.js';
import { startLevel } from './game.js';
import {
  loadSave, persistSave, resetSave, exportCode, importCode, defaultSave,
} from './progress.js';

const $ = (id) => document.getElementById(id);
const VIEWS = ['map', 'game', 'collection', 'settings'];
const CN_NUM = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ── 全域狀態 ─────────────────────────
let phrases = [];
let phrasesById = {};
let levels = [];
let levelsById = {};
let save = defaultSave();
let hintEngine = null;
let collection = null;
let currentGame = null; // startLevel 回傳的 handle

function persist() {
  persistSave(save, hintEngine, collection);
}

// ── 資料載入（失敗 fallback fixtures） ──
async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

async function loadData() {
  let demo = false;
  let levelsDoc;
  // 本機測試可用 ?levels=…&phrases=… 指定替代資料（如 v2 假關卡）
  const params = new URLSearchParams(window.location.search);
  const levelsUrl = params.get('levels') || 'data/levels.json';
  const phrasesUrl = params.get('phrases') || 'data/phrases.json';
  try {
    [levelsDoc, phrases] = await Promise.all([
      fetchJson(levelsUrl),
      fetchJson(phrasesUrl),
    ]);
  } catch {
    demo = true;
    [levelsDoc, phrases] = await Promise.all([
      fetchJson('data/fixtures/level.sample.json'),
      fetchJson('data/fixtures/phrases.sample.json'),
    ]);
  }
  levels = levelsDoc.levels || [];
  levelsById = {};
  for (const lv of levels) levelsById[lv.id] = lv;
  phrasesById = {};
  for (const p of phrases) phrasesById[p.id] = p;
  $('demo-badge').classList.toggle('hidden', !demo);
}

// ── 視圖切換 ─────────────────────────
function showView(name) {
  if (currentGame && name !== 'game') {
    currentGame.destroy();
    currentGame = null;
  }
  for (const v of VIEWS) $(`view-${v}`).classList.toggle('hidden', v !== name);
  for (const btn of document.querySelectorAll('.nav-btn')) {
    btn.classList.toggle('active', btn.dataset.view === name);
  }
  if (name === 'map') renderMap();
  if (name === 'collection') renderCollection();
}

// ── 關卡地圖 ─────────────────────────
function isUnlocked(id) {
  if (id === 1) return true;
  const prev = save.levels[String(id - 1)];
  return !!(prev && prev.stars >= 1);
}

function makeLevelCard(level) {
  const id = level.id;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'level-card';
  const unlocked = isUnlocked(id);
  const stars = save.levels[String(id)] ? save.levels[String(id)].stars : 0;
  const name = document.createElement('span');
  name.className = 'lv-name';
  name.textContent = `第 ${id} 關`;
  btn.appendChild(name);
  // v3 小徽章：時限 ⏱mm:ss、提示限次 💡×N（v2 資料缺欄位視為 null＝不顯示）
  const hasTime = typeof level.timeLimit === 'number' && level.timeLimit > 0;
  const hasCap = typeof level.hintCap === 'number' && level.hintCap >= 0;
  if (hasTime || hasCap) {
    const badges = document.createElement('span');
    badges.className = 'lv-badges';
    if (hasTime) {
      const b = document.createElement('span');
      b.className = 'lv-badge';
      b.textContent = `⏱${fmtTime(level.timeLimit)}`;
      badges.appendChild(b);
    }
    if (hasCap) {
      const b = document.createElement('span');
      b.className = 'lv-badge';
      b.textContent = `💡×${level.hintCap}`;
      badges.appendChild(b);
    }
    btn.appendChild(badges);
  }
  const sub = document.createElement('span');
  if (!unlocked) {
    sub.className = 'lv-lock';
    sub.textContent = '🔒 通過前一關解鎖';
  } else {
    sub.className = 'lv-stars';
    sub.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  }
  btn.appendChild(sub);
  btn.disabled = !unlocked;
  if (unlocked) btn.addEventListener('click', () => enterLevel(id));
  return btn;
}

function renderMap() {
  const box = $('level-map');
  box.innerHTML = '';
  // 依 chapter 分區塊；每區顯示章名（chapterTitle 缺省＝只顯「第Ｎ章」）
  const chapters = new Map();
  for (const lv of levels) {
    const ch = typeof lv.chapter === 'number' ? lv.chapter : 1;
    if (!chapters.has(ch)) chapters.set(ch, { title: null, list: [] });
    const entry = chapters.get(ch);
    if (!entry.title && lv.chapterTitle) entry.title = lv.chapterTitle;
    entry.list.push(lv);
  }
  const ordered = [...chapters.entries()].sort((a, b) => a[0] - b[0]);
  for (const [ch, entry] of ordered) {
    const section = document.createElement('section');
    section.className = 'chapter-section';
    const h = document.createElement('h3');
    h.className = 'chapter-title';
    const cn = CN_NUM[ch] || String(ch);
    h.textContent = entry.title ? `第${cn}章・${entry.title}` : `第${cn}章`;
    section.appendChild(h);
    const grid = document.createElement('div');
    grid.className = 'chapter-levels';
    for (const lv of entry.list.sort((a, b) => a.id - b.id)) {
      grid.appendChild(makeLevelCard(lv));
    }
    section.appendChild(grid);
    box.appendChild(section);
  }
}

// ── 進入關卡 ─────────────────────────
function enterLevel(id) {
  const level = levelsById[id];
  if (!level) return;
  if (currentGame) currentGame.destroy();
  showView('game');
  currentGame = startLevel({
    level,
    phrases,
    phrasesById,
    hintEngine,
    collection,
    save,
    persist,
    hasNext: !!levelsById[id + 1],
    onExit: () => showView('map'),
    onRetry: () => enterLevel(id),
    onComplete: () => persist(),
    onNext: () => {
      if (levelsById[id + 1] && isUnlocked(id + 1)) enterLevel(id + 1);
      else showView('map');
    },
  });
}

// ── 圖鑑 ─────────────────────────────
function renderCollection() {
  const ids = collection.list();
  $('collection-empty').classList.toggle('hidden', ids.length > 0);
  const ul = $('collection-list');
  ul.innerHTML = '';
  for (const pid of ids) {
    const phrase = phrasesById[pid];
    if (!phrase) continue;
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = phrase.text;
    btn.addEventListener('click', () => {
      $('card-text').textContent = phrase.text;
      $('card-meaning').textContent = phrase.meaning || '';
      $('card-insight').textContent = phrase.insight || '';
      $('card-source').textContent = `出處：${phrase.source || ''}`;
      $('modal-card').classList.remove('hidden');
    });
    li.appendChild(btn);
    ul.appendChild(li);
  }
}

// ── 設定 ─────────────────────────────
function settingsSay(text) {
  const el = $('settings-msg');
  el.textContent = text;
  setTimeout(() => { if (el.textContent === text) el.textContent = ''; }, 3000);
}

function bindSettings() {
  $('btn-export').addEventListener('click', () => {
    persist();
    $('export-code').value = exportCode(save);
    settingsSay('進度碼已產生，可複製保存。');
  });
  $('btn-copy-export').addEventListener('click', async () => {
    const code = $('export-code').value;
    if (!code) { settingsSay('請先產生進度碼。'); return; }
    try {
      await navigator.clipboard.writeText(code);
      settingsSay('已複製到剪貼簿。');
    } catch {
      $('export-code').select();
      settingsSay('請手動複製（已全選）。');
    }
  });
  $('btn-import').addEventListener('click', () => {
    const imported = importCode($('import-code').value);
    if (!imported) {
      settingsSay('進度碼格式錯誤，匯入失敗。');
      return;
    }
    save = imported;
    hintEngine = createHintEngine(save.ink);
    collection = createCollection(save.collection);
    persist();
    settingsSay('匯入成功！');
    renderMap();
  });
  $('btn-reset').addEventListener('click', () => {
    if (!window.confirm('確定要清除全部進度嗎？此動作無法復原。')) return;
    resetSave();
    save = defaultSave();
    hintEngine = createHintEngine(save.ink);
    collection = createCollection(save.collection);
    $('export-code').value = '';
    $('import-code').value = '';
    settingsSay('已重置進度。');
    renderMap();
  });
}

// ── 全域事件 ─────────────────────────
function bindGlobal() {
  for (const btn of document.querySelectorAll('.nav-btn')) {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  }
  for (const btn of document.querySelectorAll('.modal-close')) {
    btn.addEventListener('click', () => $(btn.dataset.close).classList.add('hidden'));
  }
  // 點知識卡背景關閉（quiz/complete 不設，避免誤觸）
  $('modal-card').addEventListener('click', (ev) => {
    if (ev.target === $('modal-card')) $('modal-card').classList.add('hidden');
  });
}

// ── 啟動 ─────────────────────────────
async function main() {
  save = loadSave();
  hintEngine = createHintEngine(save.ink);
  collection = createCollection(save.collection);
  bindGlobal();
  bindSettings();
  try {
    await loadData();
  } catch (err) {
    document.querySelector('main').innerHTML =
      '<p class="muted">資料載入失敗，請確認 data/ 檔案存在後重新整理。</p>';
    console.error(err);
    return;
  }
  showView('map');
}

main();
