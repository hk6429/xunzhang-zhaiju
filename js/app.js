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

// ── 修為稱號：只跟真實學習量掛鉤（星等總和＋圖鑑收藏數），純展示不影響數值 ──
const RANKS = [
  { need: 0, title: '白丁' },
  { need: 6, title: '童生' },
  { need: 20, title: '秀才' },
  { need: 45, title: '舉人' },
  { need: 75, title: '貢士' },
  { need: 110, title: '進士' },
  { need: 140, title: '狀元' },
];
function computeRank(totalStars, collected) {
  const score = totalStars + Math.floor(collected / 10); // 每收藏 10 句折 1 星修為
  let cur = RANKS[0];
  let next = null;
  for (const r of RANKS) {
    if (score >= r.need) cur = r;
    else { next = r; break; }
  }
  return { cur, next, score };
}

function totalStarsOf(saveObj) {
  return Object.values(saveObj.levels).reduce((s, lv) => s + (lv.stars || 0), 0);
}

// 找玩家目前推進到的「前線關」：第一個已解鎖但還沒拿星的關
function frontierLevelId() {
  for (const lv of levels) {
    const rec = save.levels[String(lv.id)];
    if (isUnlocked(lv.id) && (!rec || rec.stars === 0)) return lv.id;
  }
  return levels.length ? levels[levels.length - 1].id : 1;
}

// ── 路徑式關卡節點（Candy Crush 式一關一格）──────────
const NODE_GAP = 92;   // 節點水平間距
const NODE_AMP = 30;   // 路徑上下起伏幅度
const STRIP_H = 168;   // 每章路徑帶高度
function nodePos(i) {
  return { x: 52 + i * NODE_GAP, y: STRIP_H / 2 - 8 + Math.round(NODE_AMP * Math.sin(i * 1.15)) };
}

function makePathNode(level, i, frontier) {
  const id = level.id;
  const unlocked = isUnlocked(id);
  const stars = save.levels[String(id)] ? save.levels[String(id)].stars : 0;
  const { x, y } = nodePos(i);
  const wrap = document.createElement('div');
  wrap.className = 'path-node-wrap';
  wrap.style.left = `${x}px`;
  wrap.style.top = `${y}px`;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'path-node';
  if (!unlocked) btn.classList.add('locked');
  else if (stars > 0) btn.classList.add('done');
  if (id === frontier) btn.classList.add('current');
  btn.textContent = unlocked ? String(id) : '🔒';
  const hasTime = typeof level.timeLimit === 'number' && level.timeLimit > 0;
  const hasCap = typeof level.hintCap === 'number' && level.hintCap >= 0;
  const tips = [`第 ${id} 關`];
  if (hasTime) tips.push(`⏱ 限時 ${fmtTime(level.timeLimit)}`);
  if (hasCap) tips.push(`💡 提示上限 ×${level.hintCap}`);
  if (!unlocked) tips.push('通過前一關解鎖');
  btn.title = tips.join('　');
  btn.disabled = !unlocked;
  if (unlocked) btn.addEventListener('click', () => enterLevel(id));
  wrap.appendChild(btn);

  if (id === frontier && unlocked) {
    const marker = document.createElement('span');
    marker.className = 'path-marker';
    marker.textContent = '🖌';
    wrap.appendChild(marker);
  }
  const sub = document.createElement('span');
  sub.className = 'path-stars';
  sub.textContent = unlocked ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '';
  wrap.appendChild(sub);
  if (hasTime || hasCap) {
    const badge = document.createElement('span');
    badge.className = 'path-badges';
    badge.textContent = [hasTime ? `⏱${fmtTime(level.timeLimit)}` : '', hasCap ? `💡×${level.hintCap}` : ''].filter(Boolean).join(' ');
    wrap.appendChild(badge);
  }
  return wrap;
}

function makePathStrip(list, frontier) {
  const strip = document.createElement('div');
  strip.className = 'path-strip';
  const canvas = document.createElement('div');
  canvas.className = 'path-canvas';
  const width = 52 + (list.length - 1) * NODE_GAP + 60;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${STRIP_H}px`;
  // SVG 蜿蜒路徑：以二次貝茲把相鄰節點圓心串起來
  const pts = list.map((_, i) => nodePos(i));
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i - 1].x + pts[i].x) / 2;
    d += ` Q ${mx} ${pts[i - 1].y}, ${mx} ${(pts[i - 1].y + pts[i].y) / 2}`;
    d += ` Q ${mx} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`;
  }
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'path-svg');
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(STRIP_H));
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  path.setAttribute('class', 'path-line');
  svg.appendChild(path);
  canvas.appendChild(svg);
  list.forEach((lv, i) => canvas.appendChild(makePathNode(lv, i, frontier)));
  strip.appendChild(canvas);
  return strip;
}

function renderMap() {
  const box = $('level-map');
  box.innerHTML = '';

  // 修為列：稱號隨總星數與收藏數成長（純學習量掛鉤）
  const totalStars = totalStarsOf(save);
  const collected = collection ? collection.list().length : 0;
  const { cur, next, score } = computeRank(totalStars, collected);
  const bar = document.createElement('div');
  bar.className = 'map-progress';
  const nextTxt = next ? `距「${next.title}」還差 ${next.need - score} 點修為` : '已臻化境';
  bar.innerHTML = `<span class="rank-badge">修為・${cur.title}</span>`
    + `<span class="rank-stats">★ ${totalStars}　📖 ${collected} 句</span>`
    + `<span class="rank-next muted">${nextTxt}</span>`;
  box.appendChild(bar);

  const frontier = frontierLevelId();
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
    section.appendChild(makePathStrip(entry.list.sort((a, b) => a.id - b.id), frontier));
    box.appendChild(section);
  }
  // 自動把前線關捲進視野
  requestAnimationFrame(() => {
    const curNode = box.querySelector('.path-node.current');
    if (curNode) curNode.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'auto' });
  });
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
