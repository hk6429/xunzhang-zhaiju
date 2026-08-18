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
  recordQuickChallengeResult,
  recordRest,
  recordSessionWrapUp,
  shouldSuggestRest,
} from './retention.js';

const $ = (id) => document.getElementById(id);
const VIEWS = ['chamber', 'map', 'game', 'collection', 'settings'];
const CN_NUM = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const GUARDIAN_PORTRAITS = {
  'jiang-taigong': 'assets/art/portraits-v2/jiang-taigong.png',
  nezha: 'assets/art/portraits-v2/nezha.png',
  'yang-jian': 'assets/art/portraits-v2/yang-jian.png',
  'su-daji': 'assets/art/portraits-v2/su-daji.png',
  'shen-gongbao': 'assets/art/portraits-v2/shen-gongbao.png',
  'lei-zhenzi': 'assets/art/portraits-v2/lei-zhenzi.png',
  taiyi: 'assets/art/portraits-v2/taiyi-zhenren.png',
  'taiyi-zhenren': 'assets/art/portraits-v2/taiyi-zhenren.png',
};

function guardianPortrait(g) {
  const id = g.characterId || g.id;
  return GUARDIAN_PORTRAITS[id] || 'assets/art/portraits-v2/jiang-taigong.png';
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

  renderEngagementHub();
}

function renderEngagementHub() {
  ensureEngagementState();
  const frontier = frontierLevelId();
  const level = levelsById[frontier];
  const resume = $('resume-quest-card');
  if (resume && level) {
    resume.classList.remove('hidden');
    $('resume-quest-summary').textContent = `前線在第 ${frontier} 關「${level.chapterTitle || '封神試煉'}」，約 5–10 分鐘可完成。`;
  }

  const activeRun = getUnfinishedRun(save);
  const unfinished = $('unfinished-quest-prompt');
  if (unfinished) {
    const canContinue = activeRun && levelsById[Number(activeRun.levelId)];
    unfinished.classList.toggle('hidden', !canContinue);
    if (canContinue) $('unfinished-quest-summary').textContent = `第 ${activeRun.levelId} 關尚未完成，可接續已找到的 ${activeRun.found?.length || 0} 句。`;
  }

  const retentionDaily = ensureDailyPlan(save, { phrases });
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
    panel.innerHTML = `<div><span class="resume-kicker">今日三帖</span><strong>${missions.filter((m) => m.done).length} / 3 完成</strong></div><ul>${missions.map((m) => `<li class="${m.done ? 'done' : ''}">${m.done ? '✓' : '○'} ${m.label} <small>${Math.min(m.value, m.target)}/${m.target}</small></li>`).join('')}</ul><button type="button" id="btn-daily-quick" class="ghost-btn">一炷香快陣${quickBest ? `・最佳 ${quickBest.score}/5` : ''}</button>`;
    panel.querySelector('#btn-daily-quick')?.addEventListener('click', openDailyQuickChallenge);
  }

  const titles = availableTitles(learningStats());
  if (!titles.some((title) => title.id === save.preferences.titleId)) save.preferences.titleId = titles.at(-1)?.id || 'traveler';
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
  output.textContent = message || `${save.classroom.teamCode} 已共同掌握 ${milestone.count} 句，距下一座班級封印還差 ${milestone.remaining} 句。`;
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

function applyWorldEffect(effect, eventId) {
  ensureEngagementState();
  if (!effect) return;
  if (effect.type === 'unlockLore' && !save.world.loreUnlocked.includes(effect.value)) save.world.loreUnlocked.push(effect.value);
  if (effect.type === 'treasureShard' && !save.world.treasures.includes(effect.value)) save.world.treasures.push(effect.value);
  if (effect.type === 'ink') {
    save.ink = Math.min(30, hintEngine.getInk() + Math.max(0, Number(effect.value) || 0));
    hintEngine = createHintEngine(save.ink);
  }
  if (effect.type === 'hintToken') {
    save.ink = Math.min(30, hintEngine.getInk() + Math.max(1, Number(effect.amount) || 1));
    hintEngine = createHintEngine(save.ink);
  }
  if (['mapReveal', 'routeBoost', 'bossBoost', 'replayBonus'].includes(effect.type)) {
    const key = `${effect.type}:${effect.value || 'active'}`;
    save.world.bonuses[key] = (save.world.bonuses[key] || 0) + Math.max(1, Number(effect.uses) || 1);
  }
  if (eventId && !save.world.eventsSeen.includes(eventId)) save.world.eventsSeen.push(eventId);
  persist();
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
        onChoose: (choice) => { applyWorldEffect(choice.effect, event.id); enterLevel(level.id); },
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
    onChoose: (choice) => { if (choice.effect) applyWorldEffect(choice.effect, `daily:${encounter.dateKey}:${encounter.id}`); renderMap(); },
  });
}

function showHiddenEndingLevel() {
  const endings = evaluateEndings(save, worldStory);
  if (endings.hiddenLevelCompleted) {
    showChoiceDialog({ id: 'modal-true-ending', kicker: '真結局', title: worldStory.endings.true.title, text: worldStory.endings.true.summary, choices: [{ id: 'close', label: '珍藏天書', primary: true }] });
    return;
  }
  showChoiceDialog({
    id: 'modal-hidden-level', kicker: '隱藏第 51 關', title: worldStory.hiddenLevel.title,
    text: '五段故事與五件法寶在空白天書上化為最後一問：文字的力量，來自唯一的標準答案，還是來自人們願意理解並使用它？',
    choices: [
      { id: 'people', label: '來自人們理解與使用', primary: true },
      { id: 'single', label: '只來自唯一答案' },
    ],
    onChoose: (choice) => {
      if (choice.id === 'people') {
        save.levels['51'] = { stars: 3, found: [], badges: ['insight'], best: { durationMs: 0, mistakes: 0, modes: ['standard'] } };
        persist();
        showHiddenEndingLevel();
      } else renderMap();
    },
  });
}

function openDailyQuickChallenge() {
  const daily = ensureDailyPlan(save, { phrases });
  const ids = daily.quickChallenge?.phraseIds || createDailyQuickChallenge(phrases).phraseIds;
  const items = ids.map((id) => phrasesById[id]).filter(Boolean);
  if (!items.length) return;
  const started = performance.now();
  let index = 0;
  let score = 0;
  const showQuestion = () => {
    const phrase = items[index];
    const distractors = items.filter((item) => item.id !== phrase.id).slice(0, 3).map((item) => item.text);
    const options = [phrase.text, ...distractors].sort((a, b) => a.localeCompare(b, 'zh-Hant'));
    showChoiceDialog({
      id: 'modal-daily-quick', kicker: `一炷香快陣・${index + 1}/${items.length}`, title: phrase.meaning,
      text: '選出最符合這段白話解釋的句子。',
      choices: options.map((label) => ({ id: label, label, primary: label === phrase.text })),
      onChoose: (choice) => {
        if (choice.id === phrase.text) score += 1;
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
const WORLD_MAP_W = 1180;
const WORLD_MAP_H = 664;

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

function renderMap() {
  const box = $('level-map');
  box.innerHTML = '';

  const totalStars = totalStarsOf(save);
  const collected = collection ? collection.list().length : 0;
  const titles = availableTitles(learningStats());
  const currentTitle = titles.find((title) => title.id === save.preferences?.titleId) || titles.at(-1) || { name: '文道旅人' };
  const cultivation = computeCultivationProgress(save);
  const bar = document.createElement('div');
  bar.className = 'map-progress';
  const nextTxt = cultivation.next
    ? `修為・${cultivation.current.title}，距 ${cultivation.next.title} 尚差 ${cultivation.remaining} 點`
    : `修為・${cultivation.current.title}，已登最高境界`;
  bar.innerHTML = `<span class="rank-badge">身分・${currentTitle.name}</span>`
    + `<span class="rank-stats">★ ${totalStars}　📖 ${collected} 句</span>`
    + `<span class="rank-next muted">${nextTxt}</span>`;
  box.appendChild(bar);

  const frontier = frontierLevelId();
  const orderedLevels = [...levels].sort((a, b) => a.id - b.id);
  const model = buildWorldMapModel(orderedLevels, save, worldStory, worldEvents, { date: localDateKey(), playerSeed: save.classroom?.teamCode || 'local-player' });
  const worldMap = makeWorldMap(orderedLevels, frontier);
  worldMap.querySelector('.world-map-canvas')?.classList.add(`world-repaired-${Math.floor(model.repairedPercent / 20)}`);
  box.appendChild(worldMap);

  const encounter = model.dailyEncounter;
  if (encounter) {
    const daily = document.createElement('aside');
    daily.className = 'daily-encounter-card';
    daily.innerHTML = `<span class="resume-kicker">今日奇遇・第 ${encounter.chapter} 章</span><strong>${encounter.title}</strong><p>${encounter.text}</p><button type="button" class="ghost-btn">前往查看</button>`;
    daily.querySelector('button').addEventListener('click', () => showDailyEncounter(encounter));
    box.appendChild(daily);
  }

  if (model.endings.hiddenLevelUnlocked) {
    const hidden = document.createElement('button');
    hidden.type = 'button';
    hidden.className = `hidden-level-node ${model.endings.hiddenLevelCompleted ? 'done' : ''}`;
    hidden.textContent = model.endings.hiddenLevelCompleted ? '✓ 第 51 關・天書失落之頁' : '第 51 關・天書失落之頁';
    hidden.addEventListener('click', showHiddenEndingLevel);
    box.appendChild(hidden);
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
    boss: getBossForLevel(worldStory, id),
    hasNext: !level.boss && (level.nextIds || []).length > 0,
    onExit: () => showView('map'),
    onRetry: () => enterLevel(id),
    onProgress: (found, total) => renderBossHud(getBossForLevel(worldStory, id), found, total),
    onComplete: () => {
      persist();
      const rest = shouldSuggestRest(save);
      if (rest.shouldRest) $('rest-reminder')?.classList.remove('hidden');
      if (level.boss) {
        showChapterStory(level.chapter, 'outro', () => {
          $('modal-complete')?.classList.add('hidden');
          showView('map');
        });
      }
    },
    onNext: () => {
      const next = nextReachableLevels(levels, id, save);
      if (level.boss || next.length !== 1) showView('map');
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
  $('coltab-pane-phrases').classList.toggle('hidden', activeColTab !== 'phrases');
  $('coltab-pane-characters').classList.toggle('hidden', activeColTab !== 'characters');

  if (activeColTab === 'phrases') {
    renderPhrasesTab();
  } else {
    renderCharactersTab();
  }
}

function renderPhrasesTab() {
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

function renderCharactersTab() {
  const gallery = $('characters-gallery');
  if (!gallery) return;
  gallery.innerHTML = '';

  for (const char of CHARACTERS) {
    const card = document.createElement('div');
    card.className = 'character-gallery-card';
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
