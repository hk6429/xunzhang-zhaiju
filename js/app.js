// js/app.js — 入口：資料載入、視圖切換、密室大廳／地圖／圖鑑／設定
import { createHintEngine } from './hints.js';
import { createCollection } from './collection.js';
import { startLevel } from './game.js';
import {
  loadSave, persistSave, resetSave, exportCode, importCode, defaultSave,
} from './progress.js';
import {
  FENGSHEN_ARRAYS,
  getArrayByChapter,
  renderGuardianSvg,
} from './fengshen.js';

const $ = (id) => document.getElementById(id);
const VIEWS = ['chamber', 'map', 'game', 'collection', 'settings'];
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
  for (const v of VIEWS) {
    const el = $(`view-${v}`);
    if (el) el.classList.toggle('hidden', v !== name);
  }
  for (const btn of document.querySelectorAll('.nav-btn')) {
    btn.classList.toggle('active', btn.dataset.view === name);
  }
  if (name === 'chamber') renderChambers();
  if (name === 'map') renderMap();
  if (name === 'collection') renderCollection();
}

// ── 關卡解鎖判斷 ─────────────────────
function isUnlocked(id) {
  if (id === 1) return true;
  const prev = save.levels[String(id - 1)];
  return !!(prev && prev.stars >= 1);
}

// ── 修為稱號 ─────────────────────────
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
  const score = totalStars + Math.floor(collected / 10);
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

// 找玩家目前推進到的「前線關」
function frontierLevelId() {
  for (const lv of levels) {
    const rec = save.levels[String(lv.id)];
    if (isUnlocked(lv.id) && (!rec || rec.stars === 0)) return lv.id;
  }
  return levels.length ? levels[levels.length - 1].id : 1;
}

// ── 封神密室大廳／陣法選擇視圖 ───────
function renderChambers() {
  const box = $('chamber-list');
  if (!box) return;
  box.innerHTML = '';

  const totalStars = totalStarsOf(save);
  const collected = collection ? collection.list().length : 0;
  const { cur } = computeRank(totalStars, collected);

  for (const arr of FENGSHEN_ARRAYS) {
    const [startId, endId] = arr.levelRange;
    const chapterLevels = levels.filter((l) => l.id >= startId && l.id <= endId);
    const completedLevels = chapterLevels.filter((l) => save.levels[String(l.id)] && save.levels[String(l.id)].stars > 0);
    const chapterStars = chapterLevels.reduce((sum, l) => sum + (save.levels[String(l.id)]?.stars || 0), 0);
    const maxStars = chapterLevels.length * 3;
    const isChapterUnlocked = isUnlocked(startId);
    const isAllDone = chapterLevels.length > 0 && completedLevels.length === chapterLevels.length;

    // 尋找此陣法的前線關
    const frontierInArray = chapterLevels.find((l) => isUnlocked(l.id) && (!save.levels[String(l.id)] || save.levels[String(l.id)].stars === 0))?.id || startId;

    const card = document.createElement('div');
    card.className = `chamber-card ${isChapterUnlocked ? (isAllDone ? 'done' : 'active') : 'locked'}`;
    card.style.setProperty('--chamber-color', arr.color);
    card.style.setProperty('--chamber-accent', arr.accentColor);

    const statusBadge = isAllDone
      ? '<span class="chamber-status-badge win">👑 陣法已破</span>'
      : isChapterUnlocked
      ? '<span class="chamber-status-badge open">🔓 破陣試煉中</span>'
      : '<span class="chamber-status-badge lock">🔒 封印未啟</span>';

    card.innerHTML = `
      <div class="chamber-card-header">
        <div class="chamber-badge-group">
          <span class="chamber-element-badge">${arr.element}</span>
          ${statusBadge}
        </div>
        <h3 class="chamber-title">${arr.title}</h3>
        <p class="chamber-alias">${arr.alias}</p>
      </div>

      <div class="chamber-guardian-section">
        <div class="chamber-guardian-avatar">
          ${renderGuardianSvg(arr.guardian.id, isAllDone ? 'win' : 'idle')}
        </div>
        <div class="chamber-guardian-info">
          <strong class="chamber-guardian-name">${arr.guardian.name}</strong>
          <span class="chamber-guardian-title">${arr.guardian.title}</span>
          <p class="chamber-guardian-quote">「${arr.guardian.clickQuotes[0]}」</p>
        </div>
      </div>

      <p class="chamber-lore">${arr.lore}</p>

      <div class="chamber-progress-box">
        <div class="chamber-progress-text">
          <span>破陣進度：${completedLevels.length} / ${chapterLevels.length} 關</span>
          <span>${chapterStars} / ${maxStars} ★</span>
        </div>
        <div class="chamber-progress-bar">
          <div class="chamber-progress-fill" style="width: ${chapterLevels.length ? (completedLevels.length / chapterLevels.length) * 100 : 0}%"></div>
        </div>
      </div>

      <div class="chamber-treasure-preview">
        <span class="treasure-icon">${arr.treasureShard.icon}</span>
        <div class="treasure-text">
          <small>破陣法寶</small>
          <strong>${arr.treasureShard.name}</strong>
        </div>
      </div>

      <div class="chamber-card-actions">
        <button type="button" class="primary-btn chamber-enter-btn" ${!isChapterUnlocked ? 'disabled' : ''}>
          ${isAllDone ? '重探陣法' : (isChapterUnlocked ? `進入陣法（第 ${frontierInArray} 關）` : '🔒 通關上一陣法解鎖')}
        </button>
        <button type="button" class="ghost-btn chamber-map-btn">
          地圖路徑
        </button>
      </div>
    `;

    // 進入按鈕
    const enterBtn = card.querySelector('.chamber-enter-btn');
    if (enterBtn && isChapterUnlocked) {
      enterBtn.addEventListener('click', () => enterLevel(frontierInArray));
    }

    // 地圖按鈕
    const mapBtn = card.querySelector('.chamber-map-btn');
    if (mapBtn) {
      mapBtn.addEventListener('click', () => {
        showView('map');
        setTimeout(() => {
          const sec = document.querySelector(`.chapter-section[data-chapter="${arr.chapter}"]`);
          if (sec) sec.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      });
    }

    box.appendChild(card);
  }
}

// ── 路徑式關卡節點 ───────────────────
const NODE_GAP = 92;
const NODE_AMP = 30;
const STRIP_H = 168;
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
    const arrInfo = getArrayByChapter(ch);
    const section = document.createElement('section');
    section.className = 'chapter-section';
    section.dataset.chapter = String(ch);

    const h = document.createElement('h3');
    h.className = 'chapter-title';
    const cn = CN_NUM[ch] || String(ch);
    h.innerHTML = `
      <span class="chapter-num">第${cn}章</span>
      <span class="chapter-name">${entry.title ? entry.title : ''}</span>
      <span class="chapter-array-tag" style="background:${arrInfo.color}">${arrInfo.name}</span>
      <span class="chapter-guardian-tag">${arrInfo.guardian.name}護陣</span>
    `;
    section.appendChild(h);
    section.appendChild(makePathStrip(entry.list.sort((a, b) => a.id - b.id), frontier));
    box.appendChild(section);
  }

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
    onExit: () => showView('chamber'),
    onRetry: () => enterLevel(id),
    onComplete: () => persist(),
    onNext: () => {
      if (levelsById[id + 1] && isUnlocked(id + 1)) enterLevel(id + 1);
      else showView('chamber');
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
    renderChambers();
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
    renderChambers();
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
  showView('chamber');
}

main();
