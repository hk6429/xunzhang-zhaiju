// js/app.js — 入口：資料載入、視圖切換、密室大廳／地圖／圖鑑／設定
import { createHintEngine } from './hints.js';
import { treasurePassives, TREASURE_PASSIVES } from './treasure-passives.js';
import { createCollection } from './collection.js';
import { startLevel } from './game.js';
import {
  loadSave, persistSave, resetSave, exportCode, importCode, defaultSave,
} from './progress.js';
import {
  FENGSHEN_ARRAYS,
  VOLUME2_ARRAYS,
  getArrayByChapter,
  CHARACTERS,
  getCharacterById,
  getRandomQuote,
} from './fengshen.js';
import { SCENE_SYSTEM } from '../assets/art/scenes/scenes-registry.js';
import {
  createTeamCode,
  validateTeamCode,
  makeContribution,
  encodeContribution,
  decodeContribution,
  mergeContributions,
  teamMilestone,
} from './classroom.js';
import {
  availableTitles,
  savePhrasePractice,
} from './learning-profile.js';
import {
  buildWorldMapModel,
  isLevelUnlocked as isWorldLevelUnlocked,
  getBossForLevel,
  getEventForLevel,
  evaluateEndings,
  nextReachableLevels,
} from './world-map.js';
import {
  clearUnfinishedRun,
  computeCultivationProgress,
  createDailyQuickChallenge,
  ensureDailyPlan,
  ensureRetention,
  getUnfinishedRun,
  recordDailyProgress,
  recordQuickChallengeResult,
  recordQuizAnswer,
  calculateQuizInkReward,
  recordRest,
  recordSessionWrapUp,
  shouldSuggestRest,
} from './retention.js';

const $ = (id) => document.getElementById(id);
const VIEWS = ['chamber', 'map', 'game', 'collection', 'settings'];

// 唐詩/宋詞/元曲等文學類句子的 author/dynasty 資料原本就存在，只是知識卡沒顯示出處——
// 讓既有資料直接可見，不需另外編造出處（無 author 的成語/諺語類則不顯示這行）。
function setCardSource(phrase) {
  const el = $('card-source');
  if (!el) return;
  if (phrase?.author) {
    el.textContent = `—— ${phrase.dynasty ? `${phrase.dynasty}．` : ''}${phrase.author}`;
    el.classList.remove('hidden');
  } else {
    el.textContent = '';
    el.classList.add('hidden');
  }
}
const CN_NUM = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const GUARDIAN_PORTRAITS = {
  'jiang-taigong': 'assets/art/companions-v4/jiang-taigong.webp',
  nezha: 'assets/art/companions-v4/nezha.webp',
  'yang-jian': 'assets/art/companions-v4/yang-jian.webp',
  'su-daji': 'assets/art/companions-v4/su-daji.webp',
  'shen-gongbao': 'assets/art/companions-v4/shen-gongbao.webp',
  'lei-zhenzi': 'assets/art/companions-v4/lei-zhenzi.webp',
  taiyi: 'assets/art/companions-v4/taiyi-zhenren.webp',
  'taiyi-zhenren': 'assets/art/companions-v4/taiyi-zhenren.webp',
};

function guardianPortrait(g) {
  const id = g.characterId || g.id;
  return GUARDIAN_PORTRAITS[id] || 'assets/art/companions-v4/jiang-taigong.webp';
}

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
let activeColTab = 'phrases'; // 'phrases' | 'characters'
let worldStory = { chapters: [], bosses: [], treasures: [], endings: {} };
let worldEvents = { events: [], dailyEncounters: [] };

function persist() {
  persistSave(save, hintEngine, collection);
}

function ensureEngagementState() {
  if (!save.preferences || typeof save.preferences !== 'object') save.preferences = {};
  if (!save.phrasePractice || typeof save.phrasePractice !== 'object') save.phrasePractice = {};
  if (!save.daily || typeof save.daily !== 'object') save.daily = { date: '', counters: {} };
  if (!save.classroom || typeof save.classroom !== 'object') save.classroom = null;
  if (!save.world || typeof save.world !== 'object') save.world = { eventsSeen: [], treasures: [], loreUnlocked: [], chaptersSeen: [] };
  if (!save.world.bonuses || typeof save.world.bonuses !== 'object') save.world.bonuses = {};
}

function localDateKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function learningStats() {
  const completed = Object.values(save.levels || {}).filter((lv) => (lv.stars || 0) > 0);
  const ids = collection ? collection.list() : [];
  const proverbCount = ids.filter((id) => ['諺語', '俗語'].includes(phrasesById[id]?.type)).length;
  const crossWins = Object.entries(save.levels || {}).filter(([id, rec]) => rec.stars > 0 && levelsById[Number(id)]?.layout === 'cross').length;
  const answered = save.quizStats?.answered || 0;
  return {
    masteredCount: ids.length,
    proverbCount,
    crossWins,
    answered,
    accuracy: answered ? (save.quizStats?.correct || 0) / answered : 0,
    completedLevels: completed.length,
  };
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
  // 課堂模式：?lesson=on 關倒數、關連續天數壓力，改成純練習場（?lesson=1-10 另限定關卡範圍）
  const lesson = params.get('lesson');
  if (lesson) {
    document.body.dataset.lesson = 'on';
    const range = /^(\d+)-(\d+)$/.exec(lesson);
    if (range) document.body.dataset.lessonRange = `${range[1]}-${range[2]}`;
  }
  const levelsUrl = params.get('levels') || 'data/levels.json';
  const phrasesUrl = params.get('phrases') || 'data/phrases.json';
  try {
    [levelsDoc, phrases, worldStory, worldEvents] = await Promise.all([
      fetchJson(levelsUrl),
      fetchJson(phrasesUrl),
      fetchJson('data/story-lore-v2.json'),
      fetchJson('data/events.json'),
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
// 手機返回手勢／返回鍵原本會直接離開整個網站（切分頁不產生任何歷史紀錄）。
// 玩到一半習慣性右滑就整個遊戲不見了——這在手機上是最常見的意外離站原因。
let suppressHistory = false;
function pushViewHistory(name) {
  if (suppressHistory) return;
  try {
    if (history.state?.xzzjView === name) return;
    history.pushState({ xzzjView: name }, '', `#${name}`);
  } catch { /* noop */ }
}

function showView(name) {
  pushViewHistory(name);
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
  document.body.classList.toggle('map-immersive-active', name === 'map');
  if (name !== 'map' && document.fullscreenElement === $('view-map')) {
    document.exitFullscreen?.().catch(() => {});
  }
  if (name === 'chamber') renderChambers();
  if (name === 'map') {
    renderMap();
    requestAnimationFrame(() => $('btn-close-map')?.focus({ preventScroll: true }));
  }
  if (name === 'collection') renderCollection();
}

// ── 關卡解鎖判斷 ─────────────────────
function isUnlocked(id) {
  return isWorldLevelUnlocked(levelsById[id], save);
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

// ── 封神密室大廳／陣法選擇視圖（多角色互動機制） ───────
function renderChambers() {
  const box = $('chamber-list');
  if (!box) return;
  box.innerHTML = '';

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

    // 守護者清單（支援雙人駐守如萬仙陣：蘇妲己＋申公豹、誅仙陣：雷震子＋太乙真人）
    const guardiansList = arr.guardians || [arr.guardian];
    let selectedGuardianIdx = 0;

    const guardiansHtml = guardiansList.map((g, idx) => `
      <div class="guardian-avatar-item ${idx === 0 ? 'active' : ''}" data-idx="${idx}" title="點擊切換 ${g.name} 互動">
        <div class="avatar-img-box" id="ch-avatar-${arr.chapter}-${idx}">
          <img src="${guardianPortrait(g)}" alt="${g.name}的國風潑墨 Q 版生圖肖像" class="fengshen-avatar-img generated-portrait" loading="lazy" decoding="async">
        </div>
        <span class="guardian-subname">${g.name}</span>
      </div>
    `).join('');

    const initialG = guardiansList[0];
    const sceneId = ['chamber-taiji', 'chamber-huanghe', 'chamber-shijue', 'chamber-chaoge', 'chamber-wanxian'][arr.chapter - 1];
    const chamberScene = SCENE_SYSTEM.getSceneById(sceneId);

    card.innerHTML = `
      <div class="chamber-card-watermark" aria-hidden="true">${arr.name.slice(0, 2)}</div>
      <figure class="chamber-scene-figure">
        <img src="${chamberScene.path}" alt="${chamberScene.alt}" class="chamber-scene-img" loading="lazy" decoding="async">
      </figure>
      <div class="chamber-card-header">
        <div class="chamber-badge-group">
          <span class="chamber-element-badge">${arr.element}</span>
          ${statusBadge}
        </div>
        <h3 class="chamber-title">${arr.title}</h3>
        <p class="chamber-alias">${arr.alias}</p>
      </div>

      <div class="chamber-guardians-container">
        <div class="guardians-avatar-row">
          ${guardiansHtml}
        </div>
        <div class="chamber-guardian-bubble" id="ch-bubble-${arr.chapter}">
          <div class="bubble-speaker-header">
            <strong class="chamber-guardian-name" id="ch-name-${arr.chapter}">${initialG.name}</strong>
            <span class="chamber-guardian-title" id="ch-title-${arr.chapter}">${initialG.title}</span>
          </div>
          <p class="chamber-guardian-quote" id="ch-quote-${arr.chapter}">${initialG.taunt || initialG.greeting}</p>
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
        <div class="treasure-preview-icon-box">
          <img src="${arr.treasureShard.imagePath || arr.treasureShard.svgPath || 'assets/items/dashen-bian.svg'}" alt="${arr.treasureShard.name}" class="treasure-preview-img" loading="lazy" decoding="async">
          <span class="treasure-icon hidden">${arr.treasureShard.icon}</span>
        </div>
        <div class="treasure-text">
          <small>御賜破陣法寶</small>
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

    const detailsTemplate = $('chamber-details-template');
    if (detailsTemplate?.content) {
      const details = detailsTemplate.content.firstElementChild.cloneNode(true);
      details.querySelector('[data-chamber-detail="lore"]').textContent = arr.lore;
      details.querySelector('[data-chamber-detail="guardian"]').textContent = guardiansList.map((g) => g.name).join('、');
      details.querySelector('[data-chamber-detail="treasure"]').textContent = arr.treasureShard.name;
      card.querySelector('.chamber-lore')?.remove();
      card.querySelector('.chamber-treasure-preview')?.remove();
      card.querySelector('.chamber-card-actions')?.insertAdjacentElement('beforebegin', details);
    }

    // 守陣角色切換與漫畫表情切換事件
    const avatarItems = card.querySelectorAll('.guardian-avatar-item');
    const nameEl = card.querySelector(`#ch-name-${arr.chapter}`);
    const titleEl = card.querySelector(`#ch-title-${arr.chapter}`);
    const quoteEl = card.querySelector(`#ch-quote-${arr.chapter}`);
    const bubbleEl = card.querySelector(`#ch-bubble-${arr.chapter}`);

    function updateGuardianSpeech(gIdx, mood = 'idle', quoteType = 'taunt') {
      const g = guardiansList[gIdx];
      if (!g) return;
      avatarItems.forEach((it, i) => it.classList.toggle('active', i === gIdx));
      
      const avatarBox = card.querySelector(`#ch-avatar-${arr.chapter}-${gIdx}`);
      if (avatarBox) {
        const avatar = avatarBox.querySelector('img');
        if (avatar) avatar.src = guardianPortrait(g);
      }
      if (nameEl) nameEl.textContent = g.name;
      if (titleEl) titleEl.textContent = g.title;
      if (quoteEl) {
        if (quoteType === 'taunt') quoteEl.textContent = g.taunt || getRandomQuote(g.clickQuotes);
        else if (quoteType === 'cheer') quoteEl.textContent = g.cheer || getRandomQuote(g.findQuotes);
        else quoteEl.textContent = getRandomQuote(g.clickQuotes);
      }
      if (bubbleEl) {
        bubbleEl.classList.remove('pop-anim');
        void bubbleEl.offsetWidth;
        bubbleEl.classList.add('pop-anim');
      }
    }

    avatarItems.forEach((it) => {
      const idx = Number(it.dataset.idx) || 0;
      it.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedGuardianIdx = idx;
        const moods = ['thinking', 'victory', 'panic'];
        const m = moods[Math.floor(Math.random() * moods.length)];
        updateGuardianSpeech(idx, m, 'cheer');
      });
      it.addEventListener('mouseenter', () => {
        updateGuardianSpeech(idx, 'thinking', 'taunt');
      });
    });

    // 卡片懸停事件：主動切換守陣角色表情
    card.addEventListener('mouseenter', () => {
      if (isChapterUnlocked) {
        updateGuardianSpeech(selectedGuardianIdx, 'thinking', 'taunt');
      }
    });

    card.addEventListener('mouseleave', () => {
      updateGuardianSpeech(selectedGuardianIdx, isAllDone ? 'win' : 'idle', 'taunt');
    });

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
          const landmark = document.querySelector(`.chapter-landmark[data-chapter="${arr.chapter}"]`);
          if (landmark) landmark.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }, 100);
      });
    }

    box.appendChild(card);
  }

  renderVolume2();
  renderEngagementHub();
}

// ── 第二卷「文林淬鍊卷」（第 51–100 關）：獨立呈現，不進封神山河圖 ───────
function renderVolume2() {
  const section = $('volume2-section');
  const box = $('volume2-list');
  if (!section || !box) return;

  const volume1Done = levels.filter((l) => l.chapter <= 5)
    .every((l) => (save.levels[String(l.id)]?.stars || 0) > 0);
  section.classList.toggle('hidden', !volume1Done && !VOLUME2_ARRAYS.some((arr) => isUnlocked(arr.levelRange[0])));

  box.innerHTML = '';
  for (const arr of VOLUME2_ARRAYS) {
    const [startId, endId] = arr.levelRange;
    const chapterLevels = levels.filter((l) => l.id >= startId && l.id <= endId);
    const completedLevels = chapterLevels.filter((l) => (save.levels[String(l.id)]?.stars || 0) > 0);
    const chapterStars = chapterLevels.reduce((sum, l) => sum + (save.levels[String(l.id)]?.stars || 0), 0);
    const maxStars = chapterLevels.length * 3;
    const chapterUnlocked = isUnlocked(startId);
    const isAllDone = chapterLevels.length > 0 && completedLevels.length === chapterLevels.length;
    const frontierInArray = chapterLevels.find((l) => isUnlocked(l.id) && !(save.levels[String(l.id)]?.stars > 0))?.id || startId;

    const card = document.createElement('div');
    card.className = `volume2-card ${isAllDone ? 'done' : ''} ${chapterUnlocked ? '' : 'locked'}`;
    card.style.setProperty('--chamber-color', arr.color);
    card.style.setProperty('--chamber-accent', arr.accentColor);
    card.innerHTML = `
      <h3 class="volume2-card-title">${chapterUnlocked ? '' : '🔒 '}${arr.title}</h3>
      <p class="volume2-card-alias">${arr.alias}</p>
      <div class="volume2-card-progress-bar"><div class="volume2-card-progress-fill" style="width:${chapterLevels.length ? (completedLevels.length / chapterLevels.length) * 100 : 0}%"></div></div>
      <div class="volume2-card-stats"><span>${completedLevels.length} / ${chapterLevels.length} 關</span><span>${chapterStars} / ${maxStars} ★</span></div>
      <button type="button" class="${chapterUnlocked ? 'primary-btn' : 'ghost-btn'} volume2-enter-btn" ${chapterUnlocked ? '' : 'disabled'}>
        ${!chapterUnlocked ? '🔒 通關上一章解鎖' : isAllDone ? '重探本章' : `進入（第 ${frontierInArray} 關）`}
      </button>
    `;
    if (chapterUnlocked) {
      card.querySelector('.volume2-enter-btn')?.addEventListener('click', () => enterLevel(frontierInArray));
    }
    box.appendChild(card);
  }
}

function renderEngagementHub() {
  ensureEngagementState();
  const frontier = frontierLevelId();
  const level = levelsById[frontier];
  const activeRun = getUnfinishedRun(save);
  const hasProgress = Object.values(save.levels || {}).some((item) =>
    (Number(item?.stars) || 0) > 0 || (Array.isArray(item?.found) && item.found.length > 0));
  const resume = $('resume-quest-card');
  if (resume && level) {
    resume.classList.toggle('hidden', !!activeRun);
    if (!activeRun) {
      const kicker = resume.querySelector('.resume-kicker');
      const title = $('resume-quest-title');
      const button = $('btn-resume-quest');
      if (hasProgress) {
        if (kicker) kicker.textContent = '上回破陣進度';
        if (title) title.textContent = '繼續未完的封神試煉';
        if (button) button.textContent = '繼續闖關';
        $('resume-quest-summary').textContent = `前線在第 ${frontier} 關「${level.chapterTitle || '封神試煉'}」，約 5–10 分鐘可完成。`;
      } else {
        if (kicker) kicker.textContent = '初次破陣';
        if (title) title.textContent = '開始封神試煉';
        if (button) button.textContent = '開始第一關';
        $('resume-quest-summary').textContent = '從第一關認識操作，約 5–10 分鐘完成第一次尋章摘句。';
      }
    }
  }

  const unfinished = $('unfinished-quest-prompt');
  if (unfinished) {
    const canContinue = activeRun && levelsById[Number(activeRun.levelId)];
    unfinished.classList.toggle('hidden', !canContinue);
    if (canContinue) $('unfinished-quest-summary').textContent = `第 ${activeRun.levelId} 關尚未完成，可接續已找到的 ${activeRun.found?.length || 0} 句。`;
  }

  const retentionDaily = ensureDailyPlan(save, { phrases: quickChallengePool() });
  const missions = retentionDaily.quests.map((quest) => ({
    ...quest,
    value: quest.progress,
    done: quest.completed,
  }));
  let panel = $('daily-missions-panel');
  if (!panel && resume) {
    panel = document.createElement('aside');
    panel.id = 'daily-missions-panel';
    panel.className = 'daily-missions-panel';
    resume.insertAdjacentElement('afterend', panel);
  }
  if (panel) {
    const quickBest = retentionDaily.quickChallenge?.best;
    const streak = ensureRetention(save).streak;
    const streakBadge = streak.current > 0
      ? `<p class="home-streak-badge">🔥 連續挑戰 ${streak.current} 天</p>`
      : '';
    panel.innerHTML = `<div><span class="resume-kicker">今日三帖（今天的 3 個任務）</span><strong>${missions.filter((m) => m.done).length} / 3 完成</strong></div>${streakBadge}<ul>${missions.map((m) => `<li class="${m.done ? 'done' : ''}">${m.done ? '✓' : '○'} ${m.label} <small>${Math.min(m.value, m.target)}/${m.target}</small></li>`).join('')}</ul><button type="button" id="btn-daily-quick" class="ghost-btn">一炷香快陣${quickBest ? `・最佳 ${quickBest.score}/5` : ''}</button>`;
    panel.querySelector('#btn-daily-quick')?.addEventListener('click', openDailyQuickChallenge);
  }

  const titles = availableTitles(learningStats());
  if (!titles.some((title) => title.id === save.preferences.titleId)) save.preferences.titleId = titles[titles.length - 1]?.id || 'traveler';
  const title = titles.find((item) => item.id === save.preferences.titleId) || titles[0];
  if (resume && title) resume.dataset.identityTitle = title.name;

  const classPanel = $('class-coop-panel');
  if (classPanel) classPanel.classList.remove('hidden');
  renderClassroomProgress();
}

function renderClassroomProgress(message = '') {
  const output = $('class-coop-progress');
  if (!output) return;
  if (!save.classroom) {
    output.textContent = message || '尚未加入匿名隊伍；留空班級代碼即可建立新隊伍。';
    return;
  }
  const milestone = teamMilestone(save.classroom.masteredCount || 0);
  // 協力封印要「看得見在長」：純文字的隊伍進度沒有人會盯，進度條才會。
  const MILESTONES = [50, 100, 200, 300, 409];
  const pct = Math.min(100, Math.round((milestone.count / milestone.next) * 100));
  output.innerHTML = `<p>${message || `${save.classroom.teamCode} 隊內最高進度為 ${milestone.count} 句，距下一座協力封印還差 ${milestone.remaining} 句。`}</p>`
    + `<div class="team-seal-bar"><span style="width:${pct}%"></span></div>`
    + '<ol class="team-seal-marks">'
    + MILESTONES.map((mark) => `<li class="${milestone.count >= mark ? 'lit' : ''}">${mark >= 409 ? '滿卷' : mark}</li>`).join('')
    + '</ol>';
}

function chapterReached() {
  const completedIds = Object.entries(save.levels || {}).filter(([, rec]) => rec.stars > 0).map(([id]) => Number(id));
  if (!completedIds.length) return 0;
  return Math.min(5, Math.ceil(Math.max(...completedIds) / 10));
}

function showChoiceDialog({ id, kicker, title, text, choices, onChoose }) {
  document.getElementById(id)?.remove();
  const backdrop = document.createElement('div');
  backdrop.id = id;
  backdrop.className = 'modal-backdrop world-dialog';
  backdrop.setAttribute('role', 'dialog');
  backdrop.setAttribute('aria-modal', 'true');
  backdrop.setAttribute('aria-labelledby', `${id}-title`);
  backdrop.innerHTML = `<div class="modal world-event-modal" tabindex="-1"><p class="card-badge">${kicker}</p><h2 id="${id}-title">${title}</h2><p>${text}</p><div class="world-choice-list"></div></div>`;
  const list = backdrop.querySelector('.world-choice-list');
  choices.forEach((choice) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = choice.primary ? 'primary-btn' : 'ghost-btn';
    button.textContent = choice.label;
    button.addEventListener('click', () => {
      backdrop.remove();
      onChoose?.(choice);
    });
    list.appendChild(button);
  });
  document.body.appendChild(backdrop);
  requestAnimationFrame(() => backdrop.querySelector('button')?.focus());
}

/**
 * 套用世界事件效果。
 * - 冪等：同一 eventId 只生效一次，避免「回大廳再開地圖」重複領取（原本先發獎勵、最後才記 eventsSeen）。
 * - 支援單一效果或效果陣列（主線事件兩個選項都會給關鍵獎勵，差異放在次要效果）。
 * - 不再直接發墨水：墨水只能靠答對研墨題賺。事件改發 study（免費研墨機會），由呼叫端開題。
 * @returns {{studyCount: number}} 需要開幾題免費研墨
 */
function applyWorldEffect(effect, eventId) {
  ensureEngagementState();
  if (eventId && save.world.eventsSeen.includes(eventId)) return { studyCount: 0 };
  const effects = Array.isArray(effect) ? effect.filter(Boolean) : (effect ? [effect] : []);
  let studyCount = 0;
  for (const item of effects) {
    if (item.type === 'unlockLore' && !save.world.loreUnlocked.includes(item.value)) save.world.loreUnlocked.push(item.value);
    if (item.type === 'treasureShard' && !save.world.treasures.includes(item.value)) save.world.treasures.push(item.value);
    if (item.type === 'study') studyCount += Math.max(1, Number(item.amount) || 1);
    if (['mapReveal', 'routeBoost', 'bossBoost', 'replayBonus'].includes(item.type)) {
      const key = `${item.type}:${item.value || 'active'}`;
      save.world.bonuses[key] = (save.world.bonuses[key] || 0) + Math.max(1, Number(item.uses) || 1);
    }
  }
  if (eventId && !save.world.eventsSeen.includes(eventId)) save.world.eventsSeen.push(eventId);
  persist();
  return { studyCount };
}

// ── 免費研墨機會（事件獎勵的唯一墨水來源：仍然必須答對才有墨） ──
function pickStudyPhrases(count) {
  const retention = ensureRetention(save);
  const now = Date.now();
  const seen = new Set();
  const queue = [];
  const push = (id) => {
    const phrase = phrasesById[id];
    if (!phrase || seen.has(id)) return;
    seen.add(id); queue.push(phrase);
  };
  for (const id of retention.wrongBook) push(id);
  for (const [id, item] of Object.entries(retention.mastery)) {
    if (item?.nextReviewAt && Date.parse(item.nextReviewAt) <= now) push(id);
  }
  for (const id of (collection ? collection.list() : [])) push(id);
  for (const phrase of phrases) push(phrase.id);
  return queue.slice(0, Math.max(1, count));
}

function openStudySession(count, onDone) {
  const items = pickStudyPhrases(count);
  if (!items.length) { onDone?.(); return; }
  let index = 0;
  let earned = 0;
  const ask = () => {
    const phrase = items[index];
    const sameLevel = phrases.filter((item) => item.id !== phrase.id
      && item.type === phrase.type && item.level === phrase.level);
    const pool = sameLevel.length >= 3
      ? sameLevel
      : phrases.filter((item) => item.id !== phrase.id && item.type === phrase.type);
    const distractors = seededPick(pool, 3, `study|${phrase.id}|${index}`).map((item) => item.text);
    const options = seededPick([phrase.text, ...distractors], 4, `study-order|${phrase.id}`);
    showChoiceDialog({
      id: 'modal-study', kicker: `仙人指路・研墨 ${index + 1}/${items.length}`, title: phrase.meaning,
      text: '選出最符合這段白話解釋的句子。答對才有墨——墨水從來只能自己研出來。',
      choices: options.map((label) => ({ id: label, label })),
      onChoose: (choice) => {
        const correct = choice.id === phrase.text;
        const result = recordQuizAnswer(save, phrase.id, { correct });
        if (correct) {
          const gained = calculateQuizInkReward({
            currentInk: hintEngine.getInk(), kind: 'choice', rewardEligible: result.rewardEligible,
          });
          if (gained === 1) { hintEngine.earn('choice'); earned += 1; }
        }
        index += 1;
        persist();
        if (index < items.length) ask();
        else {
          showChoiceDialog({
            id: 'modal-study-done', kicker: '研墨畢', title: earned > 0 ? `研得 ${earned} 點墨` : '這回沒研出墨',
            text: earned > 0 ? '墨已入池，去破陣吧。' : '答錯與今日領過的句子都不生墨，但熟練度都記下了——它們晚點會再來找你。',
            choices: [{ id: 'ok', label: '收下', primary: true }],
            onChoose: () => onDone?.(),
          });
        }
      },
    });
  };
  ask();
}

/** 以字串種子做穩定抽樣，避免 Math.random 造成同一天結果不一致 */
function seededPick(list, count, seedText) {
  const arr = list.slice();
  let hash = 2166136261;
  for (let i = 0; i < seedText.length; i += 1) { hash ^= seedText.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  for (let i = arr.length - 1; i > 0; i -= 1) {
    hash = Math.imul(hash ^ (hash >>> 15), 2246822507);
    const j = (hash >>> 0) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

function showChapterStory(chapter, phase, onDone) {
  const story = worldStory.chapters?.find((item) => item.id === chapter);
  if (!story) { onDone?.(); return; }
  const lines = phase === 'outro' ? story.outro : story.intro;
  showChoiceDialog({
    id: 'modal-chapter-story',
    kicker: phase === 'outro' ? '章回功成' : `第 ${chapter} 章`,
    title: story.title,
    text: (lines || []).join(' '),
    choices: [{ id: 'continue', label: phase === 'outro' ? '返回山河圖' : '入陣尋章', primary: true }],
    onChoose: onDone,
  });
}

function enterWorldNode(level) {
  ensureEngagementState();
  const continueToLevel = () => {
    const event = getEventForLevel(worldEvents, level);
    if (event && !save.world.eventsSeen.includes(event.id)) {
      showChoiceDialog({
        id: 'modal-world-event', kicker: `${event.speaker}・非戰鬥事件`, title: event.title, text: event.text,
        choices: event.choices.map((choice, index) => ({ ...choice, primary: index === 0 })),
        onChoose: (choice) => {
          const { studyCount } = applyWorldEffect(choice.effect, event.id);
          if (studyCount) openStudySession(studyCount, () => enterLevel(level.id));
          else enterLevel(level.id);
        },
      });
      return;
    }
    enterLevel(level.id);
  };
  if (!save.world.chaptersSeen.includes(level.chapter)) {
    save.world.chaptersSeen.push(level.chapter);
    persist();
    showChapterStory(level.chapter, 'intro', continueToLevel);
  } else {
    continueToLevel();
  }
}

function showDailyEncounter(encounter) {
  showChoiceDialog({
    id: 'modal-daily-encounter', kicker: `今日奇遇・第 ${encounter.chapter} 章`, title: encounter.title, text: encounter.text,
    choices: [{ id: 'accept', label: '收下今日機緣', effect: encounter.effect, primary: true }, { id: 'leave', label: '今日先略過' }],
    onChoose: (choice) => {
      if (!choice.effect) { renderMap(); return; }
      const { studyCount } = applyWorldEffect(choice.effect, `daily:${encounter.dateKey}:${encounter.id}`);
      if (studyCount) openStudySession(studyCount, renderMap);
      else renderMap();
    },
  });
}

function showHiddenEndingLevel() {
  const endings = evaluateEndings(save, worldStory);
  if (endings.hiddenLevelCompleted) {
    showChoiceDialog({ id: 'modal-true-ending', kicker: '真結局', title: worldStory.endings.true.title, text: worldStory.endings.true.summary, choices: [{ id: 'close', label: '珍藏天書', primary: true }] });
    return;
  }
  showChoiceDialog({
    id: 'modal-hidden-level', kicker: '隱藏一頁', title: worldStory.hiddenLevel.title,
    text: '五段故事與五件法寶在空白天書上化為最後一問：文字的力量，來自唯一的標準答案，還是來自人們願意理解並使用它？',
    choices: [
      { id: 'people', label: '來自人們理解與使用', primary: true },
      { id: 'single', label: '只來自唯一答案' },
    ],
    onChoose: (choice) => {
      if (choice.id === 'people') {
        // 存成 world.hiddenEnding：真實第 51 關是漢賦十九首，寫 levels['51'] 會白送整關並反向誤觸真結局
        save.world.hiddenEnding = { choice: 'people', answeredAt: Date.now() };
        persist();
        showHiddenEndingLevel();
      } else renderMap();
    },
  });
}

/**
 * 一炷香快陣的出題池。
 * 這是首頁第二顯眼的按鈕，很多人第一次玩就先按它——原本直接從全庫抽，
 * 新玩家開局第一題就是〈子虛賦〉，四個選項一個字都看不懂，當場勸退。
 * 改成：優先出已收藏的句子；還沒收滿 20 句的新手只出常用成語／諺語／俗語。
 */
function quickChallengePool() {
  const owned = new Set(collection ? collection.list() : []);
  const ownedPhrases = phrases.filter((item) => owned.has(item.id));
  if (ownedPhrases.length >= 20) return ownedPhrases;
  const starter = phrases.filter((item) => item.level === '常用'
    && ['成語', '諺語', '俗語'].includes(item.type));
  const pool = [...ownedPhrases];
  for (const item of starter) if (!owned.has(item.id)) pool.push(item);
  return pool.length >= 5 ? pool : phrases;
}

function openDailyQuickChallenge() {
  const daily = ensureDailyPlan(save, { phrases: quickChallengePool() });
  const ids = daily.quickChallenge?.phraseIds || createDailyQuickChallenge(phrases).phraseIds;
  const items = ids.map((id) => phrasesById[id]).filter(Boolean);
  if (!items.length) return;
  const started = performance.now();
  let index = 0;
  let score = 0;
  const showQuestion = () => {
    const phrase = items[index];
    // 誘答改抽全庫同類（原本固定取當日前三句，五題來回都同一批），選項洗牌且不標 primary——
    // 原本 primary 會把正解畫成唯一的實心按鈕，等於直接把答案指給玩家看。
    const sameLevel = phrases.filter((item) => item.id !== phrase.id
      && item.type === phrase.type && item.level === phrase.level);
    const pool = sameLevel.length >= 3
      ? sameLevel
      : phrases.filter((item) => item.id !== phrase.id && item.type === phrase.type);
    const distractors = seededPick(pool, 3, `quick|${daily.dateKey}|${phrase.id}`).map((item) => item.text);
    const options = seededPick([phrase.text, ...distractors], 4, `quick-order|${daily.dateKey}|${index}`);
    showChoiceDialog({
      id: 'modal-daily-quick', kicker: `一炷香快陣・${index + 1}/${items.length}`, title: phrase.meaning,
      text: '選出最符合這段白話解釋的句子。',
      choices: options.map((label) => ({ id: label, label })),
      onChoose: (choice) => {
        const correct = choice.id === phrase.text;
        if (correct) score += 1;
        // 快陣是最容易被點開的複習入口，之前完全不寫回熟練度／錯題本，等於白練
        recordQuizAnswer(save, phrase.id, { correct });
        index += 1;
        if (index < items.length) showQuestion();
        else {
          recordQuickChallengeResult(save, { score, durationMs: Math.round(performance.now() - started) });
          persist();
          showChoiceDialog({ id: 'modal-daily-result', kicker: '快陣完成', title: `${score} / ${items.length} 題答對`, text: '最佳成績只存於這台裝置，可隨時再來挑戰。', choices: [{ id: 'done', label: '收下成績', primary: true }], onChoose: renderChambers });
        }
      },
    });
  };
  showQuestion();
}

// ── 山河圖式關卡節點 ─────────────────
const WORLD_MAP_W = 2600;
const WORLD_MAP_H = 900;

function worldNodePos(i, level = null) {
  if (level?.mapPosition) {
    return {
      x: Math.round((Number(level.mapPosition.x) / 100) * WORLD_MAP_W),
      y: Math.round((Number(level.mapPosition.y) / 100) * WORLD_MAP_H),
    };
  }
  const chapter = Math.floor(i / 10);
  const local = i % 10;
  const rowBase = Math.floor(local / 2);
  const row = chapter % 2 === 0 ? rowBase : 4 - rowBase;
  const column = local % 2;
  return {
    x: 62 + chapter * 222 + column * 86,
    y: 188 + row * 78 + (column ? 20 : -12),
  };
}

function makePathNode(level, i, frontier) {
  const id = level.id;
  const unlocked = isUnlocked(id);
  const stars = save.levels[String(id)] ? save.levels[String(id)].stars : 0;
  const { x, y } = worldNodePos(i, level);
  const wrap = document.createElement('div');
  wrap.className = 'path-node-wrap';
  wrap.style.left = `${x}px`;
  wrap.style.top = `${y}px`;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'path-node';
  btn.classList.add(`route-${level.routeType || 'main'}`);
  if (level.boss) btn.classList.add('boss');
  if (level.eventId) btn.classList.add('event');
  if (!unlocked) btn.classList.add('locked');
  else if (stars > 0) btn.classList.add('done');
  if (id === frontier) btn.classList.add('current');
  btn.textContent = unlocked ? String(id) : '🔒';
  const hasTime = typeof level.timeLimit === 'number' && level.timeLimit > 0;
  const hasCap = typeof level.hintCap === 'number' && level.hintCap >= 0;
  const routeName = level.routeType === 'lore' ? '典故支線' : level.routeType === 'treasure' ? '法寶支線' : '主線';
  const tips = [`第 ${id} 關・${routeName}`];
  if (hasTime) tips.push(`⏱ 限時 ${fmtTime(level.timeLimit)}`);
  if (hasCap) tips.push(`💡 提示上限 ×${level.hintCap}`);
  if (!unlocked) tips.push(level.lockPreview?.hint || '完成前置節點解鎖');
  btn.title = tips.join('　');
  btn.setAttribute('aria-label', `${tips.join('，')}，${stars ? `${stars} 星` : '尚未通關'}`);
  btn.disabled = !unlocked;
  if (unlocked) btn.addEventListener('click', () => enterWorldNode(level));
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

function makeWorldMap(list, frontier) {
  const shell = document.createElement('div');
  shell.className = 'world-map-shell';
  shell.setAttribute('aria-label', '封神山河闖關圖，可左右捲動探索五大陣法');
  const canvas = document.createElement('div');
  canvas.className = 'world-map-canvas';
  canvas.style.width = `${WORLD_MAP_W}px`;
  canvas.style.height = `${WORLD_MAP_H}px`;

  const byId = new Map(list.map((level, index) => [level.id, { level, point: worldNodePos(index, level) }]));
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'path-svg');
  svg.setAttribute('width', String(WORLD_MAP_W));
  svg.setAttribute('height', String(WORLD_MAP_H));
  for (const { level, point: from } of byId.values()) {
    for (const nextId of level.nextIds || []) {
      const to = byId.get(nextId)?.point;
      if (!to) continue;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const mx = (from.x + to.x) / 2;
      path.setAttribute('d', `M ${from.x} ${from.y} C ${mx} ${from.y}, ${mx} ${to.y}, ${to.x} ${to.y}`);
      path.setAttribute('class', `path-line route-line-${level.routeType || 'main'}`);
      svg.appendChild(path);
    }
  }
  canvas.appendChild(svg);
  list.forEach((lv, i) => canvas.appendChild(makePathNode(lv, i, frontier)));

  for (let chapter = 1; chapter <= 5; chapter += 1) {
    const arrInfo = getArrayByChapter(chapter);
    const landmark = document.createElement('div');
    landmark.className = 'chapter-landmark';
    landmark.dataset.chapter = String(chapter);
    const storyChapter = worldStory.chapters?.find((entry) => entry.id === chapter);
    landmark.style.left = `${Math.round(((storyChapter?.position?.x || (chapter * 18 - 5)) / 100) * WORLD_MAP_W)}px`;
    landmark.innerHTML = `<span>第${CN_NUM[chapter]}章</span><strong>${arrInfo.name}</strong>`;
    canvas.appendChild(landmark);
  }

  shell.appendChild(canvas);
  return shell;
}

/** 收筆卡：不只結算今天，更要留一個明天非回來不可的鉤子 */
function renderClosingCard(progress) {
  const list = $('session-summary-list');
  if (!list) return;
  const retention = ensureRetention(save);
  const streak = retention.streak?.current || 0;
  const due = dueForReview(99).length;
  const nextLevel = levels.find((level) => level.id === progress.nextLevelId);
  const cultivation = computeCultivationProgress(save);
  const rows = [
    `今日連續第 <b>${Math.max(1, streak)}</b> 天研墨・修為 <b>${cultivation.current.title}</b>`,
    `已破 <b>${progress.levelsCompleted}</b> 關・典藏 <b>${progress.phrasesFound}</b> 句`,
  ];
  const hooks = [];
  if (nextLevel) hooks.push(`明天第一件事：第 ${nextLevel.id} 關「${nextLevel.chapterTitle || '未名之陣'}」在等你`);
  if (due) hooks.push(`有 ${due} 句到了複習時辰，明天不練就會從記憶裡溜走`);
  if (cultivation.next) hooks.push(`距 ${cultivation.next.title} 只差 ${cultivation.remaining} 點`);
  list.innerHTML = rows.map((row) => `<li>${row}</li>`).join('')
    + (hooks.length ? `<li class="closing-hook">${hooks[0]}${hooks[1] ? `<br><small>${hooks[1]}</small>` : ''}</li>` : '');
}

/** 把 evaluateRequirements 的 failures 翻成玩家看得懂的一句話 */
function describeTrueEndingGaps(failures) {
  const lines = [];
  for (const fail of failures) {
    if (fail.type === 'completedAll') lines.push(`打通第 ${(fail.expected || []).join('、')} 關`);
    else if (fail.type === 'completedAny') lines.push(`至少打通第 ${(fail.expected || []).join(' 或 ')} 關其中一關`);
    else if (fail.type === 'minTotalStars') lines.push(`累積 ${fail.expected} 顆星（目前 ${totalStarsOf(save)} 顆）`);
    else if (fail.type === 'eventsSeenAll') lines.push('把山河圖上的奇遇都走過一遍');
    else if (fail.type === 'treasuresAll') lines.push('集齊五件文房法寶');
    else if (fail.type === 'bossMinStars') lines.push(`章末大陣（第 ${(fail.levelIds || []).join('、')} 關）各拿到 ${fail.expected} 星`);
  }
  return lines;
}

/** 稱號自選：解鎖了卻不能挑，等於沒有身分感 */
function openTitlePicker(titles) {
  showChoiceDialog({
    id: 'dlg-title-picker',
    kicker: '自報名號',
    title: '你想以什麼身分行走文道？',
    text: '稱號依你的練功軌跡解鎖，隨時可以換。',
    choices: titles.map((item) => ({
      id: item.id,
      label: `${item.name}${item.id === save.preferences?.titleId ? '（目前）' : ''}`,
      primary: item.id === save.preferences?.titleId,
    })),
    onChoose: (choice) => {
      if (!choice?.id) return;
      save.preferences.titleId = choice.id;
      persist();
      renderEngagementHub();
      renderMap();
    },
  });
}

function renderMap() {
  const box = $('level-map');
  box.innerHTML = '';

  const totalStars = totalStarsOf(save);
  const collected = collection ? collection.list().length : 0;
  const titles = availableTitles(learningStats());
  const currentTitle = titles.find((title) => title.id === save.preferences?.titleId) || titles[titles.length - 1] || { name: '文道旅人' };
  const cultivation = computeCultivationProgress(save);
  const bar = document.createElement('div');
  bar.className = 'map-progress';
  const nextTxt = cultivation.next
    ? `等級 ${cultivation.level}・${cultivation.current.title}，再 ${cultivation.remaining} 分升到等級 ${cultivation.level + 1}（${cultivation.next.title}）`
    : `等級 ${cultivation.level}・${cultivation.current.title}（已經是最高級）`;
  // 山河復原度：全 100 關的整體完成率，讓「還剩多少」隨時看得到（不再只有本章進度）
  const clearedAll = levels.filter((level) => (save.levels[String(level.id)]?.stars || 0) > 0).length;
  const donePct = Math.round((clearedAll / Math.max(1, levels.length)) * 100);
  bar.innerHTML = '<button type="button" class="rank-badge" id="btn-pick-title" '
    + `title="換一個稱號">身分・${currentTitle.name} ▾</button>`
    + `<span class="rank-stats">★ ${totalStars}　📖 ${collected} 句</span>`
    + `<span class="world-repair-ring" style="--repair:${donePct}"><b>${donePct}%</b><small>山河復原</small></span>`
    + `<span class="rank-next muted">${nextTxt}</span>`;
  box.appendChild(bar);
  bar.querySelector('#btn-pick-title')?.addEventListener('click', () => openTitlePicker(titles));

  // 課堂模式橫幅：老師投影時要一眼看出「這台沒有倒數、也不算連續天數」
  if (document.body.dataset.lesson === 'on') {
    const range = document.body.dataset.lessonRange;
    const banner = document.createElement('aside');
    banner.className = 'lesson-mode-banner';
    banner.innerHTML = `<strong>課堂模式</strong><span>已關閉倒數計時${range ? `・本節範圍第 ${range.replace('-', '–')} 關` : ''}，慢慢想沒關係。</span>`;
    box.appendChild(banner);
  }

  const frontier = frontierLevelId();
  // 封神山河圖只涵蓋原始 5 章 50 關；第 51–100 關（文林淬鍊卷）獨立呈現於密室大廳，不進此圖
  const orderedLevels = levels.filter((l) => l.chapter <= 5).sort((a, b) => a.id - b.id);
  const model = buildWorldMapModel(orderedLevels, save, worldStory, worldEvents, { date: localDateKey(), playerSeed: save.classroom?.teamCode || 'local-player' });
  const worldMap = makeWorldMap(orderedLevels, frontier);
  worldMap.querySelector('.world-map-canvas')?.classList.add(`world-repaired-${Math.floor(model.repairedPercent / 20)}`);
  box.appendChild(worldMap);

  const encounter = model.dailyEncounter;
  if (encounter) {
    const claimed = save.world?.eventsSeen?.includes(`daily:${encounter.dateKey}:${encounter.id}`);
    const daily = document.createElement('aside');
    daily.className = `daily-encounter-card${claimed ? ' claimed' : ''}`;
    daily.innerHTML = `<span class="resume-kicker">今日奇遇・第 ${encounter.chapter} 章</span><strong>${encounter.title}</strong><p>${encounter.text}</p>`
      + (claimed
        ? '<p class="muted">今日機緣已收下，明日再來。</p>'
        : '<button type="button" class="ghost-btn">查看今日奇遇</button>');
    daily.querySelector('button')?.addEventListener('click', () => showDailyEncounter(encounter));
    box.appendChild(daily);
  }

  // 真結局進度提示：以前條件全藏在資料裡，玩家根本不知道自己差什麼
  if (!model.endings.hiddenLevelUnlocked) {
    const missing = describeTrueEndingGaps(model.endings.missingForTrue || []);
    if (missing.length) {
      const hint = document.createElement('aside');
      hint.className = 'true-ending-hint';
      hint.innerHTML = '<span class="resume-kicker">天書失落之頁</span>'
        + '<p>山河圖角落有一頁沒人翻開過。要讓它現形，還差：</p>'
        + `<ul>${missing.map((line) => `<li>${line}</li>`).join('')}</ul>`;
      box.appendChild(hint);
    }
  }

  if (model.endings.hiddenLevelUnlocked) {
    const hidden = document.createElement('button');
    hidden.type = 'button';
    hidden.className = `hidden-level-node ${model.endings.hiddenLevelCompleted ? 'done' : ''}`;
    hidden.textContent = model.endings.hiddenLevelCompleted ? '✓ 天書失落之頁' : '天書失落之頁';
    hidden.addEventListener('click', showHiddenEndingLevel);
    box.appendChild(hidden);
  }

  // iOS in-app 瀏覽器（FB/LINE WebView）的 scrollIntoView 對巢狀捲動容器常常不動作，
  // 玩家會停在山河圖左上角的空白雲海以為地圖壞了；改為手動置中目前節點。
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const shell = box.querySelector('.world-map-shell');
    const curNode = box.querySelector('.path-node.current');
    if (!shell || !curNode) return;
    const wrap = curNode.closest('.path-node-wrap') || curNode;
    shell.scrollLeft = Math.max(0, wrap.offsetLeft - shell.clientWidth / 2);
    shell.scrollTop = Math.max(0, wrap.offsetTop - shell.clientHeight / 2);
  }));
}

// ── 進入關卡 ─────────────────────────
function enterLevel(id) {
  const level = levelsById[id];
  if (!level) return;
  // 第 6–10 章沒有山河圖節點，章回開場白（含文林淬鍊卷的開卷儀式）要在這裡補上，
  // 否則整個第二卷玩下來一句故事都沒有，玩家只覺得「關卡變多而已」。
  ensureEngagementState();
  if (level.chapter > 5 && !save.world.chaptersSeen.includes(level.chapter)) {
    save.world.chaptersSeen.push(level.chapter);
    persist();
    showChapterStory(level.chapter, 'intro', () => enterLevel(id));
    return;
  }
  if (currentGame) currentGame.destroy();
  // 封神山河圖只涵蓋第 1–5 章；第 6–10 章（文林淬鍊卷）沒有山河圖節點，
  // 離開／通關後要回密室大廳，而非山河圖，否則玩家找不到回文林淬鍊卷的路。
  const homeView = level.chapter <= 5 ? 'map' : 'chamber';
  showView('game');
  currentGame = startLevel({
    level,
    phrases,
    phrasesById,
    hintEngine,
    collection,
    save,
    persist,
    boss: getBossForLevel(worldStory, id),
    hasNext: !level.boss && (level.nextIds || []).length > 0,
    getNextActionLabel: () => {
      if (level.chapter > 5) return (level.nextIds || []).length ? '進入下一關' : '返回密室大廳';
      const next = nextReachableLevels(levels, id, save);
      return next.length === 1 ? '進入下一關' : '回地圖選關';
    },
    onExit: () => showView(homeView),
    onRetry: () => enterLevel(id),
    onProgress: (found, total) => renderBossHud(getBossForLevel(worldStory, id), found, total),
    onComplete: () => {
      persist();
      const rest = shouldSuggestRest(save);
      if (rest.shouldRest) $('rest-reminder')?.classList.remove('hidden');
      if (level.boss) {
        showChapterStory(level.chapter, 'outro', () => {
          $('modal-complete')?.classList.add('hidden');
          showView(homeView);
        });
      }
    },
    onNext: () => {
      if (level.chapter > 5) {
        const nextId = (level.nextIds || [])[0];
        if (level.boss || !nextId) showView(homeView);
        else enterLevel(nextId);
        return;
      }
      const next = nextReachableLevels(levels, id, save);
      if (level.boss || next.length !== 1) showView(homeView);
      else enterWorldNode(next[0]);
    },
  });
  renderBossHud(getBossForLevel(worldStory, id), 0, level.targets.length);
}

function renderBossHud(boss, found, total) {
  document.getElementById('boss-phase-hud')?.remove();
  if (!boss) return;
  const phaseIndex = Math.min((boss.phases || []).length - 1, Math.floor((Math.max(0, found) / Math.max(1, total)) * (boss.phases || []).length));
  const phase = boss.phases?.[Math.max(0, phaseIndex)];
  const hud = document.createElement('aside');
  hud.id = 'boss-phase-hud';
  hud.className = 'boss-phase-hud';
  hud.setAttribute('aria-live', 'polite');
  hud.innerHTML = `<span>章末首領・${boss.name}</span><strong>${phase?.name || '最終陣眼'}</strong><p>${phase?.rule || '破解陣眼，完成本章試煉。'}</p>`;
  $('game-level-title')?.insertAdjacentElement('afterend', hud);
}

// ── 圖鑑介面（摘句典藏 ＋ 封神群仙錄） ───────────────
function renderCollection() {
  // 渲染分頁按鈕狀態
  for (const btn of document.querySelectorAll('.col-tab-btn')) {
    btn.classList.toggle('active', btn.dataset.coltab === activeColTab);
  }
  for (const tab of ['phrases', 'wrongbook', 'treasures', 'badges', 'characters']) {
    $(`coltab-pane-${tab}`)?.classList.toggle('hidden', activeColTab !== tab);
  }

  if (activeColTab === 'phrases') renderPhrasesTab();
  else if (activeColTab === 'wrongbook') renderWrongBookTab();
  else if (activeColTab === 'treasures') renderTreasureTab();
  else if (activeColTab === 'badges') renderBadgeTab();
  else renderCharactersTab();
}

/** 待複習清單：依 SRS 到期時間與錯題本排序，取代原本的純亂數抽 5 句 */
function dueForReview(limit = 5) {
  const retention = ensureRetention(save);
  // 澄心堂紙／廷珪墨集滿可加開複習名額
  limit += treasurePassives(retention).reviewSlots;
  const now = Date.now();
  const owned = new Set(collection.list());
  const score = (id) => {
    if (retention.wrongBook.includes(id)) return 0;
    const due = Date.parse(retention.mastery[id]?.nextReviewAt || '');
    return Number.isFinite(due) && due <= now ? 1 : 2;
  };
  return [...owned]
    .filter((id) => phrasesById[id])
    .sort((a, b) => score(a) - score(b))
    .filter((id) => score(id) < 2)
    .slice(0, limit);
}

/** 待補的字：wrongBook 與 mastery 是全站最有教學價值的資料，原本完全沒有 UI */
function renderWrongBookTab() {
  const retention = ensureRetention(save);
  const ids = retention.wrongBook.filter((id) => phrasesById[id]);
  const ul = $('wrongbook-list');
  const empty = $('wrongbook-empty');
  const drill = $('btn-wrongbook-drill');
  if (!ul) return;
  ul.innerHTML = '';
  empty?.classList.toggle('hidden', ids.length > 0);
  drill?.classList.toggle('hidden', ids.length === 0);
  for (const id of ids) {
    const phrase = phrasesById[id];
    const stat = retention.mastery[id] || {};
    const li = document.createElement('li');
    li.className = 'wrongbook-item';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML = `<strong>${phrase.text}</strong><small>答錯 ${stat.wrong || 1} 次</small>`;
    btn.addEventListener('click', () => {
      $('card-badge').textContent = '待補的字';
      $('card-review-nav')?.classList.add('hidden');
      $('card-text').textContent = phrase.text;
      setCardSource(phrase);
      $('card-meaning').textContent = phrase.meaning || '';
      $('card-insight').textContent = phrase.insight || '';
      $('modal-card').classList.remove('hidden');
    });
    li.appendChild(btn);
    ul.appendChild(li);
  }
}

/** 法寶閣：五件法寶各十片碎片的陳列櫃，並第一次把 ability 描述顯示出來 */
function renderTreasureTab() {
  const box = $('treasure-gallery');
  if (!box) return;
  const retention = ensureRetention(save);
  const catalog = worldStory?.treasures || [];
  const shardsByChapter = [...FENGSHEN_ARRAYS, ...VOLUME2_ARRAYS]
    .map((arr) => arr.treasureShard)
    .filter(Boolean);
  box.innerHTML = shardsByChapter.map((shard) => {
    const item = retention.treasures[shard.id] || { sources: [], maxFragments: 10 };
    const got = item.sources.length;
    const max = item.maxFragments || 10;
    const complete = got >= max;
    const lore = catalog.find((t) => shard.id.startsWith(t.id));
    return `<article class="treasure-card${complete ? ' complete' : ''}">`
      + `<img src="${shard.imagePath || shard.svgPath}" alt="${shard.name}" class="treasure-card-img" loading="lazy">`
      + `<h4>${shard.icon} ${shard.name}</h4>`
      + `<div class="shard-row">${Array.from({ length: max }, (_, i) => `<span class="shard-dot${i < got ? ' got' : ''}"></span>`).join('')}</div>`
      + `<p class="muted">${got}/${max}${complete && lore ? `・${lore.description}` : ''}</p>`
      + `<p class="treasure-card-desc">${shard.desc}</p>`
      + (TREASURE_PASSIVES[shard.id]
        ? `<p class="treasure-ability${complete ? ' active' : ''}">${complete ? '✦ 已生效：' : '集滿後：'}${TREASURE_PASSIVES[shard.id].desc}</p>`
        : '<p class="treasure-ability muted">純收藏：集滿只為好看，不影響戰力。</p>')
      + '</article>';
  }).join('');
}

/** 破陣勳章牆：每關三枚，缺哪一枚一目瞭然——這是重玩舊關最強的誘因 */
function renderBadgeTab() {
  const wall = $('badge-wall');
  if (!wall) return;
  const LABELS = { insight: '🎯', swift: '⚡', scholar: '📖', combo: '🔥' };
  const cleared = levels.filter((level) => (save.levels[String(level.id)]?.stars || 0) > 0);
  const total = cleared.reduce((sum, level) => sum + (save.levels[String(level.id)]?.badges?.length || 0), 0);
  wall.innerHTML = `<p class="badge-wall-count">已得勳章 ${total} 枚・已破 ${cleared.length}/${levels.length} 關</p>`
    + '<div class="badge-grid">'
    + levels.map((level) => {
      const rec = save.levels[String(level.id)];
      const badges = rec?.badges || [];
      const done = (rec?.stars || 0) > 0;
      const marks = ['insight', 'swift', 'scholar'].map((code) => `<span class="badge-dot${badges.includes(code) ? ' got' : ''}" title="${code}">${LABELS[code]}</span>`).join('');
      return `<div class="badge-cell${done ? '' : ' locked'}" title="第 ${level.id} 關"><span class="badge-cell-id">${level.id}</span>${done ? marks : '<span class="badge-dot">·</span>'}</div>`;
    }).join('')
    + '</div>';
}

function renderPhrasesTab() {
  const ids = collection.list();
  $('collection-empty').classList.toggle('hidden', ids.length > 0);

  const retention = ensureRetention(save);
  const due = dueForReview(5);
  const reviewBtn = $('btn-collection-review');
  if (reviewBtn) {
    reviewBtn.classList.toggle('hidden', ids.length < 2);
    reviewBtn.textContent = due.length ? `🔁 今日待複習 ${due.length} 句` : '🔁 今日已複習完畢';
    reviewBtn.disabled = due.length === 0;
  }

  const overview = $('collection-overview');
  if (overview) {
    const mastered = Object.values(retention.mastery).filter((item) => item?.mastered).length;
    const pct = Math.round((ids.length / Math.max(1, phrases.length)) * 100);
    overview.innerHTML = `<strong>摘句典藏 ${ids.length} / ${phrases.length}</strong>`
      + `<span class="overview-bar"><span style="width:${pct}%"></span></span>`
      + `<small>其中 ${mastered} 句已練熟・待補 ${retention.wrongBook.length} 句</small>`;
  }

  // 依 type 分桶算正確率：學生答錯原本只知道「錯一題」，不知道自己是哪一類垮掉
  const bars = $('collection-typebars');
  if (bars) {
    const buckets = new Map();
    for (const phrase of phrases) {
      const key = phrase.type || '其他';
      if (!buckets.has(key)) buckets.set(key, { total: 0, owned: 0, answered: 0, correct: 0 });
      const bucket = buckets.get(key);
      bucket.total += 1;
      if (ids.includes(phrase.id)) bucket.owned += 1;
      const stat = retention.mastery[phrase.id];
      if (stat) { bucket.answered += stat.answered || 0; bucket.correct += stat.correct || 0; }
    }
    bars.innerHTML = [...buckets.entries()].map(([key, bucket]) => {
      const rate = bucket.answered ? Math.round((bucket.correct / bucket.answered) * 100) : null;
      const pct = Math.round((bucket.owned / bucket.total) * 100);
      return `<div class="typebar"><span class="typebar-name">${key}</span>`
        + `<span class="typebar-track"><span class="typebar-fill" style="width:${pct}%"></span></span>`
        + `<span class="typebar-num">${bucket.owned}/${bucket.total}${rate === null ? '' : `・答對率 ${rate}%`}</span></div>`;
    }).join('');
  }
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
      $('card-badge').textContent = '摘句入集';
      $('card-review-nav')?.classList.add('hidden');
      $('card-text').textContent = phrase.text;
      setCardSource(phrase);
      $('card-meaning').textContent = phrase.meaning || '';
      $('card-insight').textContent = phrase.insight || '';
      $('modal-card').classList.remove('hidden');
    });
    li.appendChild(btn);
    const practice = save.phrasePractice?.[pid];
    const practiceBox = document.createElement('details');
    practiceBox.className = 'phrase-practice';
    practiceBox.innerHTML = `
      <summary>${practice ? '✓ 真正會用' : '把這句變成自己的'}</summary>
      <label>練習方式
        <select>
          <option value="example" ${practice?.kind === 'example' ? 'selected' : ''}>我的例句</option>
          <option value="situation" ${practice?.kind === 'situation' ? 'selected' : ''}>使用情境</option>
          <option value="visual" ${practice?.kind === 'visual' ? 'selected' : ''}>一圖記憶</option>
        </select>
      </label>
      <label>只存於這台裝置
        <input type="text" maxlength="80" value="${practice?.text ? practice.text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;') : ''}" placeholder="寫下自己的例子或記憶線索">
      </label>
      <button type="button" class="ghost-btn">儲存練習</button>
    `;
    practiceBox.querySelector('button').addEventListener('click', () => {
      const kind = practiceBox.querySelector('select').value;
      const text = practiceBox.querySelector('input').value;
      save.phrasePractice = savePhrasePractice(save.phrasePractice, pid, kind, text);
      save.daily.counters.practices = Object.keys(save.phrasePractice).length;
      persist();
      renderPhrasesTab();
    });
    li.appendChild(practiceBox);
    ul.appendChild(li);
  }
}

/** 群仙錄解鎖：仙人要「在他的陣裡破過一關」才會現身，否則只留剪影 */
function unlockedCharacterIds() {
  const ids = new Set();
  for (const arr of [...FENGSHEN_ARRAYS, ...VOLUME2_ARRAYS]) {
    const [from, to] = arr.levelRange || [];
    if (!from) continue;
    const cleared = Object.entries(save.levels || {})
      .some(([id, rec]) => (rec?.stars || 0) > 0 && Number(id) >= from && Number(id) <= to);
    if (!cleared) continue;
    for (const g of [arr.guardian, ...(arr.guardians || [])]) {
      if (g?.characterId) ids.add(g.characterId);
    }
  }
  return ids;
}

function renderCharactersTab() {
  const gallery = $('characters-gallery');
  if (!gallery) return;
  gallery.innerHTML = '';

  const unlocked = unlockedCharacterIds();
  const desc = document.querySelector('#coltab-pane-characters .characters-tab-desc');
  if (desc) desc.textContent = `太極玄門群仙，已現身 ${[...unlocked].filter((id) => CHARACTERS.some((c) => c.id === id)).length} / ${CHARACTERS.length} 位。破過他鎮守的陣，剪影才會化為真身。`;

  for (const char of CHARACTERS) {
    const isUnlocked = unlocked.has(char.id);
    const card = document.createElement('div');
    card.className = `character-gallery-card${isUnlocked ? '' : ' locked'}`;
    if (!isUnlocked) {
      const arr = [...FENGSHEN_ARRAYS, ...VOLUME2_ARRAYS]
        .find((a) => [a.guardian, ...(a.guardians || [])].some((g) => g?.characterId === char.id));
      const range = arr?.levelRange;
      card.innerHTML = `<div class="char-gallery-avatar-box locked-silhouette">`
        + `<img src="${char.artImage || char.expressions.idle}" alt="尚未現身的仙人" class="char-gallery-img" loading="lazy">`
        + '<span class="lock-glyph">？</span></div>'
        + '<div class="char-gallery-info"><h3 class="char-gallery-name">？？？</h3>'
        + `<p class="char-gallery-desc">${range ? `破開第 ${range[0]}–${range[1]} 關其中一關，他就會現身。` : '走到他鎮守的陣前，他才會現身。'}</p></div>`;
      gallery.appendChild(card);
      continue;
    }
    card.style.setProperty('--char-theme', char.themeColor || '#0284c7');
    card.style.setProperty('--char-accent', char.accentColor || '#facc15');

    card.innerHTML = `
      <div class="char-gallery-avatar-box" id="gallery-avatar-${char.id}">
        <img src="${char.artImage || char.expressions.idle}" alt="${char.name}" class="char-gallery-img" id="gallery-img-${char.id}" />
        <span class="char-ratio-tag">${char.ratio} Q版</span>
      </div>

      <div class="char-gallery-info">
        <h3 class="char-gallery-name">${char.name}</h3>
        <span class="char-gallery-title">${char.title}</span>
        <p class="char-gallery-desc">${char.desc}</p>
      </div>

      <div class="char-mood-controls">
        <button type="button" class="mood-tab-btn active" data-char="${char.id}" data-mood="idle">待機</button>
        <button type="button" class="mood-tab-btn" data-char="${char.id}" data-mood="thinking">沉思</button>
        <button type="button" class="mood-tab-btn" data-char="${char.id}" data-mood="victory">破陣</button>
        <button type="button" class="mood-tab-btn" data-char="${char.id}" data-mood="panic">驚慌</button>
      </div>

      <div class="char-gallery-bubble" id="gallery-bubble-${char.id}">
        <p class="char-gallery-quote" id="gallery-quote-${char.id}">「${char.quotes.idle}」</p>
      </div>
    `;

    // 綁定表情切換
    const moodBtns = card.querySelectorAll('.mood-tab-btn');
    moodBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mood = btn.dataset.mood;
        moodBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        const imgEl = card.querySelector(`#gallery-img-${char.id}`);
        const quoteEl = card.querySelector(`#gallery-quote-${char.id}`);
        const bubbleBox = card.querySelector(`#gallery-bubble-${char.id}`);

        if (imgEl && char.expressions[mood]) {
          imgEl.src = char.expressions[mood];
        }
        if (quoteEl && char.quotes[mood]) {
          quoteEl.textContent = `「${char.quotes[mood]}」`;
        }
        if (bubbleBox) {
          bubbleBox.classList.remove('pop-anim');
          void bubbleBox.offsetWidth;
          bubbleBox.classList.add('pop-anim');
        }
      });
    });

    gallery.appendChild(card);
  }
}

// ── 導覽列吉祥物（墨靈仙童）互動 ───────
function bindMascotInteraction() {
  const mascotEl = $('brand-interactive');
  const bubbleEl = $('mascot-speech-bubble');
  const textEl = $('mascot-speech-text');
  const imgEl = $('header-mascot-img');
  if (!mascotEl || !bubbleEl || !textEl) return;

  const moling = getCharacterById('moling');
  const mascotQuotes = [
    '道友！今日文運亨通，破陣指日可待！🖋️',
    '墨靈在此！隨時為道友研墨提筆！✨',
    '遇到難題別慌，研墨答題可得滿滿靈氣！💡',
    '筆落驚風雨，詩成泣鬼神！加油！🔥',
    '太極生兩儀，字字藏玄機，細細尋覓吧！📜',
    '道友功力深厚，封神榜上必有大名！👑'
  ];
  let quoteIdx = 0;
  let bubbleTimer = null;

  function triggerMascot() {
    quoteIdx = (quoteIdx + 1) % mascotQuotes.length;
    textEl.textContent = mascotQuotes[quoteIdx];
    bubbleEl.classList.remove('hidden');
    bubbleEl.classList.remove('pop-in');
    void bubbleEl.offsetWidth;
    bubbleEl.classList.add('pop-in');

    if (imgEl) {
      imgEl.classList.remove('bounce-wobble');
      void imgEl.offsetWidth;
      imgEl.classList.add('bounce-wobble');
    }

    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => {
      bubbleEl.classList.add('hidden');
    }, 4500);
  }

  mascotEl.addEventListener('click', triggerMascot);
  mascotEl.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      triggerMascot();
    }
  });
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

function bindEngagement() {
  ensureEngagementState();

  $('btn-resume-quest')?.addEventListener('click', () => enterLevel(frontierLevelId()));
  $('btn-continue-unfinished')?.addEventListener('click', () => {
    const id = Number(getUnfinishedRun(save)?.levelId);
    if (levelsById[id]) enterLevel(id);
  });
  $('btn-restart-unfinished')?.addEventListener('click', () => {
    const id = Number(getUnfinishedRun(save)?.levelId);
    clearUnfinishedRun(save);
    persist();
    if (levelsById[id]) enterLevel(id);
    else renderChambers();
  });

  try { save.preferences.playMode = localStorage.getItem('xzzj_play_mode_v1') || save.preferences.playMode || 'standard'; } catch { save.preferences.playMode ||= 'standard'; }
  window.addEventListener('xzzj:play-mode-change', (event) => {
    save.preferences.playMode = event.detail?.mode || 'standard';
    persist();
  });

  const classBody = document.querySelector('.class-coop-body');
  if (classBody && !$('class-share-code')) {
    const exchange = document.createElement('div');
    exchange.className = 'class-code-exchange';
    exchange.innerHTML = `
      <label for="class-share-code">匿名協力碼（不含姓名與答錯紀錄）</label>
      <textarea id="class-share-code" class="code-area" rows="3" placeholder="加入後可產生，或貼上同隊協力碼"></textarea>
      <div class="settings-actions"><button type="button" id="btn-export-class" class="ghost-btn">產生協力碼</button><button type="button" id="btn-import-class" class="ghost-btn">合併同隊成果</button></div>`;
    classBody.appendChild(exchange);
  }
  $('btn-join-class-coop')?.addEventListener('click', () => {
    const input = $('class-room-code');
    const code = validateTeamCode(input.value) || createTeamCode();
    input.value = code;
    const contribution = makeContribution({ teamCode: code, masteredCount: collection.list().length, chapter: chapterReached() });
    save.classroom = mergeContributions(save.classroom, contribution);
    persist();
    renderClassroomProgress(`已匿名加入 ${code}；系統不會儲存真實姓名或公開個人成績。`);
  });
  $('btn-export-class')?.addEventListener('click', () => {
    if (!save.classroom) { renderClassroomProgress('請先建立或加入匿名隊伍。'); return; }
    const contribution = makeContribution({ teamCode: save.classroom.teamCode, masteredCount: Math.max(save.classroom.masteredCount || 0, collection.list().length), chapter: Math.max(save.classroom.chapter || 0, chapterReached()) });
    $('class-share-code').value = encodeContribution(contribution) || '';
    save.classroom = contribution;
    persist();
  });
  $('btn-import-class')?.addEventListener('click', () => {
    const incoming = decodeContribution($('class-share-code').value);
    if (!incoming) { renderClassroomProgress('協力碼格式不正確。'); return; }
    if (save.classroom && save.classroom.teamCode !== incoming.teamCode) { renderClassroomProgress('這是不同隊伍的協力碼，未合併。'); return; }
    save.classroom = mergeContributions(save.classroom, incoming);
    $('class-room-code').value = save.classroom.teamCode;
    persist();
    renderClassroomProgress('同隊彙總成果已安全合併。');
  });

  $('btn-end-session')?.addEventListener('click', () => {
    const progress = recordSessionWrapUp(save, {
      levelsCompleted: Object.values(save.levels || {}).filter((item) => item.stars > 0).length,
      phrasesFound: collection.list().length,
      quizCorrect: save.quizStats?.correct || 0,
      nextLevelId: frontierLevelId(),
    });
    if ($('session-summary-text')) $('session-summary-text').textContent = `本次收筆：已掌握 ${progress.phrasesFound} 句，前線停在第 ${progress.nextLevelId} 關。`;
    renderClosingCard(progress);
    persist();
    $('modal-complete')?.classList.add('hidden');
    showView('chamber');
  });

  $('btn-rest-dismiss')?.addEventListener('click', () => {
    recordRest(save);
    persist();
    $('rest-reminder')?.classList.add('hidden');
  });
  setInterval(() => {
    if (shouldSuggestRest(save).shouldRest) $('rest-reminder')?.classList.remove('hidden');
  }, 60 * 1000);
}

// ── 全域事件 ─────────────────────────
function bindGlobal() {
  window.addEventListener('popstate', (event) => {
    const target = event.state?.xzzjView;
    if (!target || !VIEWS.includes(target)) return;
    suppressHistory = true;
    showView(target);
    suppressHistory = false;
  });
  for (const btn of document.querySelectorAll('.nav-btn')) {
    btn.addEventListener('click', () => {
      showView(btn.dataset.view);
      if (btn.dataset.view === 'map') requestMapFullscreen();
    });
  }
  $('btn-close-map')?.addEventListener('click', closeMapView);
  $('btn-map-fullscreen')?.addEventListener('click', () => {
    if (document.fullscreenElement === $('view-map')) document.exitFullscreen?.().catch(() => {});
    else requestMapFullscreen();
  });
  document.addEventListener('fullscreenchange', syncMapFullscreenControl);
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || document.querySelector('.modal-backdrop:not(.hidden)')) return;
    if (!$('view-map')?.classList.contains('hidden') && !document.fullscreenElement) closeMapView();
  });
  for (const btn of document.querySelectorAll('.modal-close')) {
    btn.addEventListener('click', () => $(btn.dataset.close).classList.add('hidden'));
  }
  $('modal-card').addEventListener('click', (ev) => {
    if (ev.target === $('modal-card')) $('modal-card').classList.add('hidden');
  });

  // 圖鑑分頁切換
  for (const btn of document.querySelectorAll('.col-tab-btn')) {
    btn.addEventListener('click', () => {
      activeColTab = btn.dataset.coltab;
      renderCollection();
    });
  }

  // 摘句圖鑑「隨機複習」：收藏了就沒下文，讓已收藏成語能被重新利用複習
  let reviewQueue = [];
  let reviewIdx = 0;
  // 複習改成提取練習：先遮住釋義自己想，翻牌後自評，結果餵回間隔複習排程。
  // 原本是「攤開來重讀」——效果最差的複習方式，而且完全不更新 mastery。
  function showReviewCard() {
    const phrase = phrasesById[reviewQueue[reviewIdx]];
    if (!phrase) return;
    $('card-badge').textContent = '複習時間';
    $('card-text').textContent = phrase.text;
    setCardSource(phrase);
    $('card-meaning').textContent = '';
    $('card-insight').textContent = '';
    $('card-review-nav').classList.remove('hidden');
    $('card-review-selfcheck').classList.remove('hidden');
    $('card-review-rate').classList.add('hidden');
    $('card-review-progress').textContent = `第 ${reviewIdx + 1} / ${reviewQueue.length} 句`;
    $('modal-card').classList.remove('hidden');
  }

  function advanceReview() {
    reviewIdx += 1;
    if (reviewIdx < reviewQueue.length) showReviewCard();
    else {
      $('modal-card').classList.add('hidden');
      renderCollection();
    }
  }
  $('btn-collection-review')?.addEventListener('click', () => {
    reviewQueue = dueForReview(5);
    reviewIdx = 0;
    if (reviewQueue.length) showReviewCard();
  });
  // 待補的字：直接開一輪研墨，答對兩次才會離開錯題本
  $('btn-wrongbook-drill')?.addEventListener('click', () => {
    const ids = ensureRetention(save).wrongBook.filter((id) => phrasesById[id]);
    if (ids.length) openStudySession(Math.min(5, ids.length), () => { renderCollection(); });
  });
  $('btn-card-review-flip')?.addEventListener('click', () => {
    const phrase = phrasesById[reviewQueue[reviewIdx]];
    if (!phrase) return;
    $('card-meaning').textContent = phrase.meaning || '';
    $('card-insight').textContent = phrase.insight || '';
    $('card-review-selfcheck').classList.add('hidden');
    $('card-review-rate').classList.remove('hidden');
  });
  for (const btn of document.querySelectorAll('#card-review-rate button')) {
    btn.addEventListener('click', () => {
      const phraseId = reviewQueue[reviewIdx];
      // 自評結果直接進 SRS：想得出來＝答對，其餘進錯題本等它再來找你
      if (phraseId) recordQuizAnswer(save, phraseId, { correct: btn.dataset.rate === 'good' });
      persist();
      advanceReview();
    });
  }
}

function closeMapView() {
  showView('chamber');
  requestAnimationFrame(() => {
    const buttons = [...document.querySelectorAll('.nav-btn[data-view="chamber"]')];
    buttons.find((button) => button.offsetWidth && button.offsetHeight)?.focus({ preventScroll: true });
  });
}

function syncMapFullscreenControl() {
  const active = document.fullscreenElement === $('view-map');
  const button = $('btn-map-fullscreen');
  if (!button) return;
  button.setAttribute('aria-pressed', String(active));
  button.textContent = active ? '離開全螢幕' : '進入全螢幕';
}

function requestMapFullscreen() {
  const mapView = $('view-map');
  if (!mapView || typeof mapView.requestFullscreen !== 'function' || document.fullscreenElement) return;
  // 手機（≤760px）地圖刻意走一般頁面流，不進原生全螢幕：瀏覽器一旦真的進入
  // Fullscreen，會把 #view-map 強制蓋成 UA 的 position:fixed 頂層，蓋住下方
  // 固定在螢幕底部的 #mobile-tabbar（寶典/設定分頁因此完全點不到），跟這裡
  // CSS 假設的手機版面完全對不上。桌機（>760px）才需要沉浸式全螢幕地圖。
  if (!window.matchMedia('(min-width: 761px)').matches) return;
  mapView.requestFullscreen({ navigationUI: 'hide' }).catch(() => {
    // iOS 或瀏覽器拒絕原生全螢幕時，仍保留 CSS 沉浸式視窗。
  });
}

// ── 啟動 ─────────────────────────────
async function main() {
  save = loadSave();
  hintEngine = createHintEngine(save.ink);
  collection = createCollection(save.collection);
  bindGlobal();
  bindMascotInteraction();
  bindSettings();
  try {
    await loadData();
  } catch (err) {
    document.querySelector('main').innerHTML =
      '<p class="muted">資料載入失敗，請確認 data/ 檔案存在後重新整理。</p>';
    console.error(err);
    return;
  }
  bindEngagement();
  showView('chamber');
}

main();
