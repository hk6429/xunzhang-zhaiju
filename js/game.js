// js/game.js — 單關遊戲流程：比對、提示、學習題、星等結算
// 整合：封神密室逃脫機制、Q 版守護仙人伴隨互動、破陣 Cut-in 特寫、研墨考官、燃香/硯台 HUD、破陣封印條
import { createGrid, targetPath, pathKey } from './grid.js';
import { treasurePassives } from './treasure-passives.js';
import { buildAdaptiveQuestions } from './learnquiz.js';
import {
  applyModeToLevel,
  calculateQuizInkReward,
  clearUnfinishedRun,
  computeCultivationProgress,
  ensureDailyPlan,
  ensureRetention,
  getUnfinishedRun,
  recordDailyProgress,
  recordLevelAttempt,
  recordLevelCompletion,
  recordQuizAnswer,
  saveUnfinishedRun,
  startPlaySession,
} from './retention.js';
import {
  getArrayByLevelId,
  renderGuardianSvg,
  getRandomQuote,
  getExaminer,
} from './fengshen.js';

const FLASH_MS = 2000;
const TICK_MS = 200;
const BAGUA_RUNES = ['乾', '坤', '坎', '離', '震', '巽', '艮', '兌', '天', '地'];

const $ = (id) => document.getElementById(id);

// iOS 的固定定位彈窗不一定會隨中文鍵盤縮小 layout viewport。
// 改以 Visual Viewport 為準，讓研墨填空欄仍留在玩家看得到的範圍內。
export function quizViewportMetrics({ innerHeight = 0, visualViewport = null } = {}) {
  const fallbackHeight = Number.isFinite(innerHeight) ? Math.max(0, innerHeight) : 0;
  const visualHeight = Number(visualViewport?.height);
  const offsetTop = Number(visualViewport?.offsetTop);
  return {
    height: Number.isFinite(visualHeight) && visualHeight > 0 ? visualHeight : fallbackHeight,
    offsetTop: Number.isFinite(offsetTop) && offsetTop > 0 ? offsetTop : 0,
  };
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * 開始一關。回傳 { destroy() }。
 */
export function startLevel(ctx) {
  const { level, phrases, phrasesById, hintEngine, collection, save } = ctx;
  const size = level.size;
  const isCross = level.layout === 'cross';
  const clueMode = level.targetDisplay === 'clue';

  // ── 封神密室陣法與守護仙人 ──────────────
  const arrayInfo = getArrayByLevelId(level.id);
  const guardian = arrayInfo.guardian || (arrayInfo.guardians && arrayInfo.guardians[0]);
  // 文林淬鍊卷（第 6–10 章）尚無專屬立繪。原本直接回空字串，四個角色位置全變空框，
  // 而後半段盤面更大、提示更少，正是最需要情緒支撐的地方。改用書法印章版位頂上。
  const hasGuardianArt = guardian.characterId !== null;
  const guardianSeal = (mood) => {
    const moodMark = { victory: '賀', thinking: '思', panic: '急' }[mood] || '文';
    return `<div class="guardian-seal-avatar" data-mood="${mood}" role="img" aria-label="${guardian.name}">`
      + `<span class="guardian-seal-glyph">${guardian.sealGlyph || guardian.shortTitle?.[0] || '文'}</span>`
      + `<span class="guardian-seal-mark">${moodMark}</span>`
      + `<span class="guardian-seal-name">${guardian.name}</span></div>`;
  };
  const guardianSvg = (mood) => (hasGuardianArt ? renderGuardianSvg(guardian.characterId || guardian.id, mood) : guardianSeal(mood));

  // 集滿的文房法寶被動。宣告要早於 targets——線索加成在建目標清單時就要用到。
  const passives = treasurePassives(ensureRetention(save));

  // ── 目標資料 ──────────────────────────
  const targets = level.targets.map((t, i) => {
    const phrase = phrasesById[t.phraseId];
    const path = phrase ? targetPath(t, phrase.text.length, size) : null;
    const clues = (phrase && Array.isArray(phrase.clues)) ? phrase.clues : [];
    const clue = clues.length ? (clues[t.clueIndex] || clues[0]) : null;
    // 引魂燈／端溪硯集滿後，每句可再翻一則不同角度的線索（不影響星等，純粹多一個切入點）
    const extraClues = clues
      .filter((c, i) => c && i !== (clues[t.clueIndex] ? t.clueIndex : 0))
      .slice(0, Math.max(0, passives.clueExtra));
    const rune = BAGUA_RUNES[i % BAGUA_RUNES.length];
    return { ...t, phrase, path, clue, extraClues, rune, key: path ? pathKey(path) : null, colorIdx: i, found: false };
  }).filter((t) => t.phrase && t.path);

  const levelKey = String(level.id);
  if (!save.levels[levelKey]) save.levels[levelKey] = { stars: 0, found: [] };
  const levelSave = save.levels[levelKey];
  const completedBefore = levelSave.stars > 0;
  const resumedRun = getUnfinishedRun(save, level.id);
  const modeConfig = applyModeToLevel(
    level,
    ctx.mode || resumedRun?.mode || save.preferences?.playMode || 'standard',
  );
  const mode = modeConfig.mode;
  const initialFound = resumedRun
    ? resumedRun.found
    : (completedBefore ? [] : levelSave.found.slice());
  if (!resumedRun) recordLevelAttempt(save, level.id);
  ensureDailyPlan(save, { phrases });
  if (!ensureRetention(save).activity.sessionStartedAt) startPlaySession(save);

  let usedHint = (resumedRun?.hintsUsed || 0) > 0;
  let usedReveal = !!resumedRun?.usedReveal;
  let selectedTargetId = null;
  let finished = false;
  let mistakes = resumedRun?.mistakes || 0;
  let quizAnsweredThisRun = 0;
  let quizCorrectThisRun = 0;
  let quizWrongStreak = 0;
  const knowledgeQueue = [];
  const runStartedAt = resumedRun?.startedAt || new Date().toISOString();

  // 連擊計數：僅本局暫存，不寫入存檔——12 秒內連續找到下一句就疊加
  const COMBO_WINDOW_MS = 12000;
  let comboCount = 0;
  let comboLastFoundAt = 0;
  let bestCombo = 0;
  const revealedPhraseIds = new Set(); // 本關被揭示的句子：結算時要告訴玩家它們會回來找他
  let comboHideTimer = null;

  // 觸覺回饋：iOS Safari 無 Vibration API，直接 no-op；不影響其他瀏覽器
  function vibrate(pattern) {
    try { navigator.vibrate?.(pattern); } catch { /* noop */ }
  }

  // ── 計時與提示限次 ────────────────────
  // 課堂模式（?lesson=）：老師帶著全班一起打，倒數只會製造焦慮與「來不及」的哭聲，一律關掉
  const lessonMode = document.body.dataset.lesson === 'on';
  const baseTimeLimit = modeConfig.timeLimit;
  const timeLimit = lessonMode || baseTimeLimit == null
    ? null
    : baseTimeLimit + passives.extraTimeSec;
  const hintCap = modeConfig.hintCap;
  let hintsUsed = resumedRun?.hintsUsed || 0;

  // 章節視覺主題：目前 10 章玩法完全相同、僅難度曲線不同，先用棋盤配色做出章節辨識度
  const boardEl = document.querySelector('.palace-jade-board');
  if (boardEl) boardEl.dataset.chapter = String(level.chapter || 1);

  // ── DOM 頂部標題與陣法徽章 ───────────
  $('game-level-title').textContent = `第 ${level.id} 關・${modeConfig.label}`;
  const learningGoal = $('level-learning-goal');
  const INK_HONOR_TARGET = 3; // 本關墨誠達標門檻：研墨答對三題
  function refreshLearningGoal() {
    if (!learningGoal) return;
    const foundCount = targets.filter((t) => t.found).length;
    const types = [...new Set(targets.map((target) => target.phrase.type))].join('、');
    const items = [
      { done: foundCount >= targets.length, label: `找出 ${foundCount}/${targets.length} 句${types || '語文素材'}` },
      { done: quizCorrectThisRun >= INK_HONOR_TARGET, label: `研墨答對 ${Math.min(quizCorrectThisRun, INK_HONOR_TARGET)}/${INK_HONOR_TARGET} 題（＝真的記住幾句）` },
    ];
    learningGoal.innerHTML = '<span class="goal-lead">本關目標</span>'
      + items.map((item) => `<span class="goal-item${item.done ? ' done' : ''}">${item.done ? '✓' : '○'} ${item.label}</span>`).join('');
  }
  // 把七階功名進度搬進關卡內（原本只在大廳看得到，動機在正在解謎時反而消失）
  function refreshCultivationHint() {
    const el = $('level-cultivation-hint');
    if (!el) return;
    const cultivation = computeCultivationProgress(save);
    el.textContent = cultivation.next
      ? `等級 ${cultivation.level}・${cultivation.current.title}，再 ${cultivation.remaining} 分升到等級 ${cultivation.level + 1}（${cultivation.next.title}）`
      : `等級 ${cultivation.level}・${cultivation.current.title}（已經是最高級）`;
  }
  refreshCultivationHint();
  refreshLearningGoal();
  const arrayBadgeEl = $('game-array-badge');
  if (arrayBadgeEl) {
    arrayBadgeEl.textContent = arrayInfo.name;
    arrayBadgeEl.style.borderColor = arrayInfo.color;
  }

  const msgEl = $('hint-msg');
  let msgTimer = null;
  function say(text) {
    msgEl.textContent = text;
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => { msgEl.textContent = ''; }, 2600);
  }

  // ── Q 版守護仙人伴隨系統 ──────────────
  const avatarWrap = $('companion-avatar-wrap');
  const companionName = $('companion-name');
  const companionText = $('companion-text');
  const companionWidget = $('fengshen-companion');
  const comicSfxTag = $('comic-sfx-tag');
  let speechTimer = null;

  function setCompanion(mood = 'idle', customText = null, isTalking = true, sfx = null) {
    if (avatarWrap) {
      avatarWrap.innerHTML = guardianSvg(mood);
    }
    if (companionName) {
      companionName.textContent = `${guardian.name}・${guardian.shortTitle}`;
    }
    if (companionText && customText) {
      companionText.textContent = customText;
    }
    if (comicSfxTag) {
      if (sfx) {
        comicSfxTag.textContent = sfx;
        comicSfxTag.classList.remove('hidden');
        comicSfxTag.classList.remove('pop-sfx');
        void comicSfxTag.offsetWidth;
        comicSfxTag.classList.add('pop-sfx');
      } else {
        comicSfxTag.classList.add('hidden');
      }
    }
    if (companionWidget && isTalking) {
      companionWidget.classList.remove('speaking');
      void companionWidget.offsetWidth;
      companionWidget.classList.add('speaking');
      clearTimeout(speechTimer);
      speechTimer = setTimeout(() => {
        if (companionWidget) companionWidget.classList.remove('speaking');
        if (comicSfxTag) comicSfxTag.classList.add('hidden');
      }, 3500);
    }
  }

  // 開場仙人問候
  setCompanion('idle', guardian.greeting, true, '陣開！');

  // 點擊仙人獲取隨機密室提示對白
  function handleCompanionClick() {
    const quote = getRandomQuote(guardian.clickQuotes);
    const moods = ['thinking', 'victory'];
    const mood = moods[Math.floor(Math.random() * moods.length)];
    setCompanion(mood, quote, true, '悟！');
  }
  if (companionWidget) {
    companionWidget.addEventListener('click', handleCompanionClick);
  }

  // ── 破陣 Cut-in 漫畫特寫動畫 ───────────
  const CUTIN_DISPLAY_MS = 3000;
  let cutinTimer = null;
  let cutinHideTimer = null;

  let cutinAfter = null;
  function dismissCutIn(fadeMs = 250) {
    const overlay = $('manga-cutin-overlay');
    if (!overlay) return;
    clearTimeout(cutinTimer);
    clearTimeout(cutinHideTimer);
    const after = cutinAfter;
    cutinAfter = null;
    if (after) setTimeout(after, fadeMs + 60);
    overlay.classList.remove('active');
    cutinHideTimer = setTimeout(() => {
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden', 'true');
    }, fadeMs);
  }

  function triggerCutIn(foundPhrase) {
    const overlay = $('manga-cutin-overlay');
    if (!overlay) return;

    const charStage = $('cutin-character-stage');
    const stamp = $('cutin-kanji-stamp');
    const sub = $('cutin-kanji-sub');
    const title = $('cutin-guardian-title');
    const speech = $('cutin-guardian-speech');

    if (charStage) {
      charStage.innerHTML = guardianSvg('victory');
    }
    if (stamp) {
      stamp.textContent = foundPhrase.text;
      const phraseLength = Array.from(foundPhrase.text).length;
      stamp.dataset.lengthTier = phraseLength >= 9 ? 'extra-long' : (phraseLength >= 6 ? 'long' : 'short');
    }
    if (sub) sub.textContent = '⚡ 陣眼勘破・真傳現世 ⚡';
    if (title) title.textContent = `${guardian.name} 讚賞`;
    if (speech) speech.textContent = getRandomQuote(guardian.findQuotes);

    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.remove('active');
    void overlay.offsetWidth;
    overlay.classList.add('active');

    clearTimeout(cutinTimer);
    clearTimeout(cutinHideTimer);
    cutinTimer = setTimeout(() => dismissCutIn(250), CUTIN_DISPLAY_MS);
  }

  // 點擊 Cut-in 可提早關閉；未點擊時保留五秒，讓玩家看清楚賀詞。
  const cutinOverlay = $('manga-cutin-overlay');
  const handleCutinDismiss = () => dismissCutIn(150);
  if (cutinOverlay) cutinOverlay.addEventListener('click', handleCutinDismiss);

  // ── 密室破陣封印條 ────────────────────
  const sealCountEl = $('seal-count');
  const sealRunesEl = $('seal-runes');

  function renderSealProgress() {
    if (!sealRunesEl) return;
    const foundCount = targets.filter((t) => t.found).length;
    const totalCount = targets.length;
    if (sealCountEl) {
      sealCountEl.textContent = `${foundCount} / ${totalCount} 陣眼已破`;
    }
    sealRunesEl.innerHTML = '';
    targets.forEach((t) => {
      const runeEl = document.createElement('div');
      runeEl.className = `seal-rune-node ${t.found ? 'unsealed' : 'locked'}`;
      runeEl.title = t.found ? `【${t.rune}】印已破：${t.phrase.text}` : `【${t.rune}】字陣眼尚未破解`;
      runeEl.innerHTML = `
        <span class="rune-symbol">${t.rune}</span>
        <span class="rune-status">${t.found ? '解' : '封'}</span>
      `;
      sealRunesEl.appendChild(runeEl);
    });
  }

  const grid = createGrid($('grid'), level.grid, {
    onSelect: handleSelect,
    onCellTap: handleCellTap,
    onInvalidSelection: () => handleInvalidSelection('direction'),
  }, {
    mode: isCross ? 'cross' : 'full',
    revealed: level.revealed || [],
  });

  // 解謎優先體感（溫和版）：線索模式關卡進場格子矇上薄紗且不可互動，
  // 必須先點過至少一張線索卡才淡入清楚——不設等待逾時自動放行的後門，
  // 純粹擋掉「不讀線索直接硬找」這條路，不影響找字判定邏輯本身
  if (clueMode && boardEl) boardEl.classList.add('grid-veiled');
  function unveilGrid() {
    boardEl?.classList.remove('grid-veiled');
  }

  function capExhausted() {
    return hintCap != null && hintsUsed >= hintCap;
  }

  function refreshInk() {
    const ink = hintEngine.getInk();
    $('ink-amount').textContent = String(ink);
    const capped = capExhausted();
    // 按鈕變灰卻沒說原因，玩家點下去沒反應會以為壞了——補上滑鼠停留可見的原因文字
    const disableReason = (tier) => {
      if (finished) return '本關已完成';
      if (capped) return '本關提示次數已用罄';
      if (!hintEngine.canSpend(tier)) return '墨水不夠，答對題目可賺更多墨水';
      return '';
    };
    for (const [id, tier] of [['btn-hint-circle', 'circle'], ['btn-hint-flash', 'flash'], ['btn-hint-reveal', 'reveal']]) {
      const btn = $(id);
      const reason = disableReason(tier);
      btn.disabled = !!reason;
      if (reason) btn.title = reason; else btn.removeAttribute('title');
    }

    const quota = $('hint-quota');
    if (hintCap == null) {
      quota.classList.add('hidden');
    } else {
      quota.classList.remove('hidden');
      const left = Math.max(0, hintCap - hintsUsed);
      quota.textContent = capped ? `提示 0/${hintCap}・本關提示已用罄` : `提示 ${left}/${hintCap}`;
      quota.classList.toggle('exhausted', capped);
    }

    // 目前可得星等：讓「要不要借提示」變成知情選擇，而不是事後才發現被扣分
    const starOutlook = $('hint-star-outlook');
    if (starOutlook) {
      const potential = Math.min(usedReveal ? 1 : (usedHint ? 2 : 3), modeConfig.maxStars);
      starOutlook.textContent = `本關目前可得 ${'★'.repeat(potential)}${'☆'.repeat(3 - potential)}`
        + (modeConfig.maxStars < 3 ? `（悟道模式上限 ${modeConfig.maxStars}★，改標準模式重打可補滿）` : '');
      starOutlook.dataset.stars = String(potential);
    }

    // 墨水節流原本完全不可見，玩家體感是「答對了卻沒給墨＝系統壞了」
    const inkNote = $('ink-daily-note');
    if (inkNote) {
      const daily = ensureDailyPlan(save, { phrases: ctx.phrases || [] });
      const rewarded = daily.quizRewardedPhraseIds?.length || 0;
      inkNote.textContent = ink >= 30 ? '墨滿（上限 30）' : `今日已研墨 ${rewarded} 句`;
    }
  }

  // ── 燃香倒數計時器 ────────────────────
  const timerEl = $('timer-display');
  const timerTimeEl = $('timer-time');
  const stickBarEl = $('incense-stick-bar');
  let remainingMs = resumedRun?.remainingMs != null
    ? resumedRun.remainingMs
    : (timeLimit != null ? timeLimit * 1000 : 0);
  let timerId = null;
  let lastTick = 0;
  let warnedLowTime = false;

  function persistActiveRun() {
    if (finished) return;
    saveUnfinishedRun(save, {
      levelId: level.id,
      mode,
      found: targets.filter((target) => target.found).map((target) => target.phraseId),
      mistakes,
      hintsUsed,
      usedReveal,
      remainingMs: timeLimit == null ? null : remainingMs,
      startedAt: runStartedAt,
      replay: completedBefore,
    });
  }

  function isAnyModalOpen() {
    return !!document.querySelector('.modal-backdrop:not(.hidden)');
  }

  function renderTimer() {
    if (timeLimit == null) return;
    const sec = Math.max(0, Math.ceil(remainingMs / 1000));
    timerTimeEl.textContent = fmtTime(sec);
    const isWarn = remainingMs <= timeLimit * 1000 * 0.2;
    timerEl.classList.toggle('warn', isWarn);
    
    // 更新燃香進度條長度 (100% -> 0%)
    if (stickBarEl) {
      const pct = Math.max(0, Math.min(100, (remainingMs / (timeLimit * 1000)) * 100));
      stickBarEl.style.height = `${pct}%`;
    }

    if (isWarn && !warnedLowTime && !finished) {
      warnedLowTime = true;
      // 角色即時變身漫畫驚慌臉（蚊香眼/冒汗）並喊出催促台詞
      setCompanion('panic', '哎呀呀！時辰將至，燃香將盡！道友速速凝神破陣！', true, '急！');
    }
  }

  function timerTick() {
    const now = performance.now();
    if (!finished && !document.hidden && !isAnyModalOpen()) remainingMs -= (now - lastTick);
    lastTick = now;
    renderTimer();
    if (isBoardStuck()) maybeGrantRescueHint({ stuckOnBoard: true });
    if (remainingMs <= 0 && !finished) handleTimeout();
  }

  function stopTimer() {
    if (timerId != null) { clearInterval(timerId); timerId = null; }
  }

  function startTimer() {
    if (timeLimit == null || finished) {
      timerEl.classList.add('hidden');
      return;
    }
    timerEl.classList.remove('hidden');
    renderTimer();
    lastTick = performance.now();
    timerId = setInterval(timerTick, TICK_MS);
  }

  // ── 超時（被困陣中・仙人救駕） ─────────
  function handleTimeout() {
    finished = true;
    stopTimer();
    remainingMs = 0;
    clearUnfinishedRun(save, level.id);
    // 已破的陣眼保留：超時是時間不夠，不是前面找到的都不算
    ctx.persist();
    renderTimer();
    refreshInk();
    setSelected(null);
    $('modal-card').classList.add('hidden');
    $('modal-quiz').classList.add('hidden');
    
    // 渲染超時救援視窗
    const rescueAvatar = $('timeout-guardian-avatar');
    if (rescueAvatar) {
      rescueAvatar.innerHTML = guardianSvg('panic');
    }
    const rescueName = $('timeout-guardian-name');
    if (rescueName) {
      rescueName.textContent = `${guardian.name} 施法救駕`;
    }
    const rescueSpeech = $('timeout-guardian-speech');
    if (rescueSpeech) {
      const kept = targets.filter((t) => t.found).length;
      rescueSpeech.textContent = kept > 0
        ? `時辰是到了，不過道友已拿下 ${kept} 句——這 ${kept} 句是真的，替你留著。`
        : getRandomQuote(guardian.timeoutQuotes);
    }

    $('modal-timeout').classList.remove('hidden');
  }

  function clearFoundForRetry() {
    if (!completedBefore) levelSave.found = [];
    clearUnfinishedRun(save, level.id);
    ctx.persist();
  }

  // ── 目標清單（線索卡） ───────────────
  function renderTargets() {
    const ul = $('target-list');
    ul.innerHTML = '';
    ul.classList.toggle('clue-cards', clueMode);
    for (const t of targets) {
      const li = document.createElement('li');
      li.className = 'target-card';
      if (t.found) {
        li.classList.add('done');
        li.innerHTML = `<span class="target-done-tag">⚡ 已破</span> ${t.phrase.text}`;
      } else if (clueMode && t.clue) {
        const tag = document.createElement('span');
        tag.className = 'clue-tag';
        tag.dataset.style = t.clue.style || '釋義';
        tag.textContent = `【${t.rune}】${t.clue.style || '釋義'}`;
        li.appendChild(tag);
        const txt = document.createElement('span');
        txt.className = 'clue-text';
        txt.textContent = t.clue.text || '';
        li.appendChild(txt);
        // 引魂燈／端溪硯的被動：多出來的線索卡收在 <details> 裡，想看才翻
        for (const extra of (t.extraClues || [])) {
          const more = document.createElement('details');
          more.className = 'clue-extra';
          const sum = document.createElement('summary');
          sum.textContent = `✦ 法寶再照一則（${extra.style || '線索'}）`;
          more.appendChild(sum);
          const body = document.createElement('p');
          body.textContent = extra.text || '';
          more.appendChild(body);
          more.addEventListener('click', (e) => e.stopPropagation());
          li.appendChild(more);
        }
      } else {
        li.textContent = `【${t.rune}】${t.phrase.text}`;
      }
      if (t.phraseId === selectedTargetId && !t.found) li.classList.add('selected');
      li.addEventListener('click', () => {
        unveilGrid();
        if (t.found) return;
        setSelected(selectedTargetId === t.phraseId ? null : t.phraseId);
      });
      ul.appendChild(li);
    }
  }

  // ── cross：選詞與輸入列 ────────────────
  function setSelected(id) {
    selectedTargetId = id;
    renderTargets();
    if (isCross) updateCrossSelection();
  }

  function updateCrossSelection() {
    const row = $('cross-input-row');
    const t = targets.find((x) => x.phraseId === selectedTargetId && !x.found);
    if (t) {
      grid.setActivePath(t.path);
      row.classList.remove('hidden');
      row.classList.remove('invalid');
      const input = $('cross-input');
      input.value = '';
      // preventScroll：手機上原生 focus 捲動行為在此頁常常過量（曾把整個字盤捲出畫面外），
      // 交叉字格輸入列本來就緊接在字盤下方，不需要瀏覽器再幫忙捲動。
      input.focus({ preventScroll: true });
    } else {
      grid.setActivePath([]);
      row.classList.add('hidden');
    }
  }

  function handleCellTap([r, c]) {
    if (finished || !isCross) return;
    const here = targets.filter((t) => !t.found
      && t.path.some(([pr, pc]) => pr === r && pc === c));
    if (!here.length) return;
    let next;
    if (here.length > 1) {
      const idx = here.findIndex((t) => t.phraseId === selectedTargetId);
      next = here[(idx + 1) % here.length];
    } else {
      next = here[0];
    }
    setSelected(next.phraseId);
  }

  function fillTargetChars(t) {
    t.path.forEach(([r, c], i) => grid.setChar(r, c, t.phrase.text[i]));
  }

  function submitCross() {
    if (finished) return;
    const t = targets.find((x) => x.phraseId === selectedTargetId && !x.found);
    if (!t) return;
    const val = $('cross-input').value.trim();
    if (!val) return;
    if (val === t.phrase.text) {
      fillTargetChars(t);
      markFound(t, { real: true });
    } else {
      mistakes += 1;
      persistActiveRun();
      const row = $('cross-input-row');
      row.classList.remove('invalid');
      void row.offsetWidth;
      row.classList.add('invalid');
      setCompanion('panic', '字句稍有出入，道友再細細思量！', true, '誤！');
    }
  }

  // ── 找到／比對（觸發 Cut-in 特寫與仙人讚賞） ───
  function markFound(t, { real }) {
    t.found = true;
    grid.markFound(t.path, t.colorIdx);
    if (!completedBefore && !levelSave.found.includes(t.phraseId)) levelSave.found.push(t.phraseId);
    if (real) {
      vibrate(30);
      const now = Date.now();
      comboCount = (comboCount > 0 && now - comboLastFoundAt <= COMBO_WINDOW_MS) ? comboCount + 1 : 1;
      comboLastFoundAt = now;
      const comboEl = $('combo-badge');
      if (comboEl) {
        clearTimeout(comboHideTimer);
        if (comboCount > bestCombo) bestCombo = comboCount;
        if (comboCount >= 2) {
          const COMBO_TIERS = { 2: '文思泉湧', 3: '筆走龍蛇' };
          comboEl.dataset.tier = String(Math.min(4, comboCount));
          comboEl.textContent = `🔥 ${COMBO_TIERS[comboCount] || '一氣呵成'} x${comboCount}`;
          comboEl.classList.remove('hidden');
          comboHideTimer = setTimeout(() => comboEl.classList.add('hidden'), 3000);
        } else {
          comboEl.classList.add('hidden');
        }
      }
      collection.add(t.phraseId);
      recordDailyProgress(save, 'phrase-found');
      knowledgeQueue.push(t.phrase);
      if (knowledgeQueue.length === 1) {
        const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (reduceMotion) {
          showKnowledgeCard(t.phrase);
        } else {
          // 特寫播完（或玩家提早點掉）才升起知識卡：原本兩者同時出現，玩家猛點會把知識卡一起關掉
          cutinAfter = () => showKnowledgeCard(t.phrase);
          triggerCutIn(t.phrase);
        }
        setCompanion('victory', getRandomQuote(guardian.findQuotes), true, '破！');
      } else {
        setCompanion('victory', `「${t.phrase.text}」已收入待研讀卷軸！`, true, '收！');
        showMiniCard(t.phrase);
      }
    }
    if (selectedTargetId === t.phraseId) selectedTargetId = null;
    renderTargets();
    renderSealProgress();
    if (typeof ctx.onProgress === 'function') ctx.onProgress(targets.filter((item) => item.found).length, targets.length);
    if (isCross) updateCrossSelection();
    refreshCultivationHint();
    refreshLearningGoal();
    persistActiveRun();
    ctx.persist();
    if (targets.every((x) => x.found)) setTimeout(finishLevel, real ? 500 : 250);
  }

  function handleSelect(path) {
    if (finished) return;
    const key = pathKey(path);
    const hit = targets.find((t) => !t.found && t.key === key);
    if (hit) {
      markFound(hit, { real: true });
    } else {
      vibrate(80);
      mistakes += 1;
      persistActiveRun();
      ctx.persist();
      grid.flashInvalid(path);
      handleInvalidSelection('content', false);
    }
  }

  function handleInvalidSelection(reason = 'content', countMistake = true) {
    if (finished) return;
    if (countMistake) {
      mistakes += 1;
      persistActiveRun();
      ctx.persist();
    }
    const text = reason === 'direction'
      ? '請從句子的第一字開始，往右或往下滑動。'
      : '這段字句尚未命中目標，請對照線索再試一次。';
    say(text);
    setCompanion('thinking', text, true, '再試！');
  }

  // ── 提示 ─────────────────────────────
  function pickHintTarget() {
    const unfound = targets.filter((t) => !t.found);
    if (!unfound.length) return null;
    return unfound.find((t) => t.phraseId === selectedTargetId) || unfound[0];
  }

  // 防呆逃生閥：墨水歸零＋連續 3 次研墨題答錯＝真卡死，仙人免費指點一字（不動 hintEngine 帳本，
  // 不違反 hints.js 凍結不變式：墨水只能由 earn 增加），避免無解僵局。
  function maybeGrantRescueHint({ stuckOnBoard = false } = {}) {
    if (finished) return;
    if (!stuckOnBoard && quizWrongStreak < 3) return;
    if (hintEngine.getInk() > 0 || capExhausted()) return;
    const t = pickHintTarget();
    if (!t) return;
    quizWrongStreak = 0;
    if (isCross) {
      if (!grid.isFilled(t.path[0][0], t.path[0][1])) grid.setChar(t.path[0][0], t.path[0][1], t.phrase.text[0]);
    } else {
      grid.circleCell(t.path[0][0], t.path[0][1]);
    }
    usedHint = true;
    say('仙人見道友多次苦思無果，心疼指點一字（不扣墨水）。');
    setCompanion('thinking', '道友莫急，且看仙人略施援手。', true, '援！');
    persistActiveRun();
    ctx.persist();
  }

  // 真正常見的卡死型態是「盤面看不懂、根本沒去開研墨題」，這種玩家永遠觸發不到連錯三題的逃生閥
  function isBoardStuck() {
    if (finished) return false;
    if (!targets.every((t) => !t.found)) return false;
    // 悟道模式與課堂模式沒有倒數，原本永遠觸發不到救援——那正好是最需要救援的兩群人。
    if (timeLimit == null) {
      const startedMs = new Date(runStartedAt).getTime();
      return Number.isFinite(startedMs) && Date.now() - startedMs >= 90000;
    }
    return 1 - (remainingMs / (timeLimit * 1000)) >= 0.6;
  }

  function useHint(tier) {
    if (finished) return;
    if (capExhausted()) {
      say('本關提示次數已用罄，墨水可留到別關使用。');
      return;
    }
    const t = pickHintTarget();
    if (!t) return;
    if (!hintEngine.canSpend(tier)) {
      say('墨用完了不打緊，去研墨檯練兩題。');
      setCompanion('thinking', '墨用完了不打緊——去研墨檯練兩題，練出來的墨最有靈氣。', true, '研！');
      return;
    }
    if (!hintEngine.spend(tier)) { refreshInk(); return; }
    usedHint = true;
    if (hintCap != null) hintsUsed += 1;
    setCompanion('thinking', getRandomQuote(guardian.hintQuotes), true, '啟！');

    if (tier === 'circle') {
      if (isCross) {
        grid.setChar(t.path[0][0], t.path[0][1], t.phrase.text[0]);
        say(`已顯示「${t.phrase.text[0]}」字。`);
      } else {
        grid.circleCell(t.path[0][0], t.path[0][1]);
        say(`已圈出「${t.phrase.text[0]}」字位置。`);
      }
    } else if (tier === 'flash') {
      if (isCross) {
        t.path.forEach(([r, c], i) => {
          if (!grid.isFilled(r, c)) grid.tempChar(r, c, t.phrase.text[i], FLASH_MS);
        });
        say('答案字閃現 2 秒，看仔細！');
      } else {
        grid.flashPath(t.path, FLASH_MS);
        say('整句路徑閃現 2 秒，看仔細！');
      }
    } else if (tier === 'reveal') {
      usedReveal = true;
      const wrongBook = ensureRetention(save).wrongBook;
      if (!wrongBook.includes(t.phraseId)) wrongBook.push(t.phraseId);
      revealedPhraseIds.add(t.phraseId);
      say(`已揭示「${t.phrase.text}」。這句記在心裡——下回研墨會先問你它。`);
      if (isCross) fillTargetChars(t);
      markFound(t, { real: false });
    }
    persistActiveRun();
    refreshInk();
    ctx.persist();
  }

  // ── 星等與通關（破陣結算・大尺寸群仙大合照） ────
  function computeStars() {
    const raw = usedReveal ? 1 : (usedHint ? 2 : 3);
    return Math.min(raw, modeConfig.maxStars);
  }

  function finishLevel() {
    if (finished) return;
    finished = true;
    const rankBefore = computeCultivationProgress(save).current.title;
    vibrate([40, 60, 40, 60, 80]);
    hideMiniCard();
    stopTimer();
    const stars = computeStars();
    const now = new Date();
    const startedMs = new Date(runStartedAt).getTime();
    const durationMs = Number.isFinite(startedMs) ? Math.max(0, now.getTime() - startedMs) : null;
    const shard = arrayInfo.treasureShard;
    const completion = recordLevelCompletion(save, {
      levelId: level.id,
      stars,
      mode,
      mistakes,
      durationMs,
      remainingMs,
      timeLimitMs: timeLimit == null ? 0 : timeLimit * 1000,
      quizCorrect: quizCorrectThisRun,
      quizAnswered: quizAnsweredThisRun,
      usedReveal,
      usedHint,
      // 代筆破關不發法寶碎片：不然 30 墨換 6 次代筆就能刷滿收集
      treasure: shard && !usedReveal ? {
        treasureId: shard.id,
        name: shard.name,
        maxFragments: 10,
      } : null,
      now,
    });
    // 法寶被動：連擊勳章門檻最低可降到 2 連（打神鞭／乾坤圈各降 1）
    const comboNeeded = Math.max(2, 4 - Math.max(0, passives.comboThreshold));
    if (bestCombo >= comboNeeded && !levelSave.badges.includes('combo')) {
      levelSave.badges.push('combo');
      (completion.newBadges || []).push('combo');
    }
    ctx.persist();
    refreshInk();
    $('modal-card').classList.add('hidden');

    // 渲染封神破陣結算視窗
    // 找完字只是「破陣」，還沒答完研墨題不算真的學會——滿版金榜慶典若不分狀態，
    // 玩家很容易誤以為已經 100% 完成而直接關掉彈窗，錯過真正鞏固記憶的研墨題。
    const quizDone = quizCorrectThisRun >= INK_HONOR_TARGET;
    const modalEl = $('modal-complete');
    if (modalEl) modalEl.classList.toggle('quiz-pending', !quizDone);

    const completeTitle = $('complete-title');
    if (completeTitle) completeTitle.textContent = quizDone ? '尋章功成・位列封神' : '尋句已得・研墨未成';

    const ribbonEl = document.querySelector('#modal-complete .group-photo-silk-ribbon');
    if (ribbonEl) {
      ribbonEl.textContent = quizDone
        ? '✨ 萬仙同慶・名列金榜 ✨'
        : `📜 字句已尋得・研墨答對 ${quizCorrectThisRun}/${INK_HONOR_TARGET} 題才算真通關`;
    }

    const arrayNameEl = $('complete-array-name');
    if (arrayNameEl) {
      arrayNameEl.textContent = `${arrayInfo.title}・第 ${level.id} 關 陣眼破解`;
    }

    const starsEl = $('complete-stars');
    starsEl.innerHTML = [0, 1, 2].map((i) => `<span class="star-slot${i < stars ? ' earned' : ''}">${i < stars ? '★' : '☆'}</span>`).join('');
    const reduceMotionStars = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    starsEl.querySelectorAll('.star-slot.earned').forEach((el, i) => {
      if (reduceMotionStars) { el.classList.add('lit'); return; }
      setTimeout(() => { el.classList.add('lit'); vibrate(20); }, i * 260);
    });

    // 破關徽章：calculateBadges() 早就算好 insight/swift/scholar，只是從沒渲染過
    const badgesEl = $('complete-badges');
    if (badgesEl) {
      const BADGE_LABELS = {
        insight: '🎯 洞察無失誤',
        swift: '⚡ 疾風破陣',
        scholar: '📖 研墨全通',
        combo: '⚡ 一氣呵成',
      };
      const labels = (completion.newBadges || []).map((code) => BADGE_LABELS[code]).filter(Boolean);
      badgesEl.innerHTML = labels.map((label) => `<span class="complete-badge-chip">${label}</span>`).join('');
      badgesEl.classList.toggle('hidden', !labels.length);
    }

    // 金榜唱名：跨過修為門檻的那一秒，原本完全沒有事情發生，玩家可能從童生升到舉人都沒察覺
    const promotionEl = $('complete-promotion');
    if (promotionEl) {
      const rankAfter = computeCultivationProgress(save).current.title;
      if (rankAfter !== rankBefore) {
        promotionEl.innerHTML = `<span class="promotion-seal">${rankAfter}</span>`
          + `<span class="promotion-text">金榜唱名——${rankBefore} 晉 ${rankAfter}。${guardian.name}：「${getRandomQuote(guardian.winQuotes)}」</span>`;
        promotionEl.classList.remove('hidden');
      } else {
        promotionEl.classList.add('hidden');
      }
    }

    // O8：最佳紀錄早就存在 level.best，從來沒有顯示過——已通關的關卡因此完全沒有重玩理由
    const bestEl = $('complete-best');
    if (bestEl) {
      const best = levelSave.best || {};
      const fmt = (ms) => (Number.isFinite(ms) ? `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}` : '—');
      if (Number.isFinite(best.durationMs)) {
        const isRecord = Number.isFinite(durationMs) && durationMs <= best.durationMs;
        bestEl.innerHTML = `本關最佳 ${fmt(best.durationMs)}・${best.mistakes ?? 0} 失誤（本次 ${fmt(durationMs)}・${mistakes} 失誤）`
          + (isRecord ? '<span class="record-chip">紀錄更新！</span>' : '');
        bestEl.classList.remove('hidden');
      } else bestEl.classList.add('hidden');
    }

    // R2：破關情緒最高點沒有給「再一關就能拿到 X」的鉤子，玩家很容易在此離站
    const nextGoalEl = $('complete-nextgoal');
    if (nextGoalEl) {
      const cultivation = computeCultivationProgress(save);
      const hints = [];
      if (cultivation.next) hints.push(`再 ${cultivation.remaining} 點修為可晉 ${cultivation.next.title}`);
      if (completion.treasure && !completion.treasure.complete) {
        hints.push(`再 ${10 - completion.treasure.total} 片可集齊${shard ? shard.name : '法寶'}`);
      }
      if (revealedPhraseIds.size) hints.push(`本關有 ${revealedPhraseIds.size} 句是請仙人代筆的，下回研墨會先問你`);
      nextGoalEl.textContent = hints.length ? `👉 ${hints[0]}` : '';
      nextGoalEl.classList.toggle('hidden', !hints.length);
    }

    // 連續挑戰紀錄：streak 資料早就有算，只是從沒顯示過——在破陣當下告訴玩家，養成回訪習慣
    const streakEl = $('complete-streak');
    if (streakEl) {
      const streak = ensureRetention(save).streak;
      const daily = ensureDailyPlan(save, { phrases });
      if (daily.completedAt) {
        streakEl.textContent = streak.current <= 1
          ? '🔥 今日三帖已達成，連續挑戰第 1 天開始！明天再訪可延續。'
          : `🔥 今日三帖已達成，連續挑戰第 ${streak.current} 天！明天再訪可延續。`;
        streakEl.classList.remove('hidden');
      } else {
        streakEl.textContent = '';
        streakEl.classList.add('hidden');
      }
    }

    const completeAvatar = $('complete-guardian-avatar');
    if (completeAvatar) {
      completeAvatar.innerHTML = guardianSvg('victory');
    }
    const completeSpeech = $('complete-guardian-speech');
    if (completeSpeech) {
      completeSpeech.textContent = getRandomQuote(guardian.winQuotes);
    }

    // 封神法寶碎片掉落展示（同關重玩不重複發放）
    if (shard) {
      const iconEl = $('treasure-icon');
      const imgEl = $('treasure-img');
      const nameEl = $('treasure-name');
      const descEl = $('treasure-desc');
      if (iconEl) iconEl.textContent = shard.icon;
      if (imgEl) {
        imgEl.src = shard.imagePath || shard.svgPath || 'assets/items/dashen-bian.svg';
        imgEl.alt = shard.name;
      }
      if (nameEl) nameEl.textContent = shard.name;
      if (descEl) {
        const fragmentStatus = completion.treasure
          ? `（${completion.treasure.total}/${10}）`
          : '';
        descEl.textContent = `${shard.desc}${fragmentStatus}`;
      }
      // 法寶集齊（10/10）是稀有里程碑，跟日常掉落用同一套視覺會被淹沒，特別標示出來
      const treasureBox = $('complete-treasure-box');
      const treasureHeader = treasureBox?.querySelector('.treasure-header');
      const treasureComplete = !!completion.treasure?.complete;
      treasureBox?.classList.toggle('treasure-complete', treasureComplete);
      if (treasureHeader) treasureHeader.textContent = treasureComplete ? '✨ 法寶集齊！' : '✨ 御賜封神法寶碎片';
    }

    $('btn-next-level').classList.toggle('hidden', !ctx.hasNext);
    if (ctx.hasNext) $('btn-next-level').textContent = ctx.getNextActionLabel?.() || '進入下一關';
    const summaryText = $('session-summary-text');
    const summaryList = $('session-summary-list');
    if (summaryText) {
      const honor = quizCorrectThisRun >= INK_HONOR_TARGET ? '答題全達標' : `答對 ${quizCorrectThisRun}/${INK_HONOR_TARGET} 題`;
      summaryText.textContent = `本關尋得 ${knowledgeQueue.length} 句，獲得 ${stars} 星・${honor}。星看你破陣的乾淨度，答題數看你真的把句子吃進去多少。`;
    }
    if (summaryList) summaryList.innerHTML = knowledgeQueue.map((phrase) => `<li><strong>${phrase.text}</strong>：${phrase.meaning || ''}</li>`).join('');
    $('modal-complete').classList.remove('hidden');
    if (typeof ctx.onComplete === 'function') ctx.onComplete(level.id, stars);
  }

  // ── 學習題（研墨答題・太乙真人/姜太公擔任考官） ────
  let quiz = null;
  let currentExaminer = null;
  const visualViewport = window.visualViewport;

  function syncQuizViewport() {
    const metrics = quizViewportMetrics({ innerHeight: window.innerHeight, visualViewport });
    document.documentElement.style.setProperty('--xzzj-visible-viewport-height', `${metrics.height}px`);
    document.documentElement.style.setProperty('--xzzj-visible-viewport-top', `${metrics.offsetTop}px`);
  }

  function keepQuizInputVisible() {
    const input = $('quiz-fill-input');
    if (!quiz || input.disabled || $('quiz-fill').classList.contains('hidden')) return;
    requestAnimationFrame(() => input.scrollIntoView({ block: 'center' }));
  }

  function handleQuizViewportChange() {
    syncQuizViewport();
    keepQuizInputVisible();
  }

  syncQuizViewport();
  window.addEventListener('resize', handleQuizViewportChange);
  if (visualViewport) {
    visualViewport.addEventListener('resize', handleQuizViewportChange);
    visualViewport.addEventListener('scroll', handleQuizViewportChange);
  }

  function openQuiz() {
    const targetIds = level.targets.map((t) => t.phraseId);
    let questions = [];
    try {
      const retention = ensureRetention(save);
      questions = buildAdaptiveQuestions(phrases, targetIds, 5, {
        mastery: retention.mastery,
        wrongBook: retention.wrongBook,
      });
    } catch {
      questions = [];
    }
    if (!questions || !questions.length) {
      say('目前沒有可用的學習題。');
      return;
    }
    currentExaminer = getExaminer(level.id);
    quiz = { questions, idx: 0, earned: 0 };

    // 渲染考官資訊
    const examAvatar = $('quiz-examiner-avatar');
    const examName = $('quiz-examiner-name');
    const examQuote = $('quiz-examiner-quote');

    if (examAvatar) {
      examAvatar.innerHTML = `<img src="${currentExaminer.avatar}" alt="${currentExaminer.name}" class="examiner-img" />`;
    }
    if (examName) examName.textContent = `${currentExaminer.name}・${currentExaminer.title}`;
    if (examQuote) examQuote.textContent = currentExaminer.speech;

    $('modal-quiz').classList.remove('hidden');
    renderQuestion();
  }

  function renderQuestion() {
    const q = quiz.questions[quiz.idx];
    $('quiz-progress').textContent = `第 ${quiz.idx + 1} / ${quiz.questions.length} 題・已賺 ${quiz.earned} 墨`;
    $('quiz-prompt').textContent = q.prompt;
    $('quiz-feedback').textContent = '';
    $('quiz-next').classList.add('hidden');
    const optBox = $('quiz-options');
    const fillBox = $('quiz-fill');
    optBox.innerHTML = '';
    if (q.type === 'choice') {
      fillBox.classList.add('hidden');
      for (const opt of q.options) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = opt;
        btn.addEventListener('click', () => answer(q, opt, btn));
        optBox.appendChild(btn);
      }
    } else {
      fillBox.classList.remove('hidden');
      const input = $('quiz-fill-input');
      input.value = '';
      input.focus({ preventScroll: true });
      keepQuizInputVisible();
    }
  }

  // 每題可用的「再想一次」次數：基礎 1 次，三尖兩刃刀／紫毫筆各再 +1
  const secondChanceCap = 1 + Math.max(0, passives.secondChance);
  const quizSecondChance = new Map();

  function answer(q, given, btnEl) {
    const correct = given === q.answer;
    // 首次答錯不結案：刪掉一個明顯的誘答並給一則線索，讓答錯變成學習機會而不是判決
    const usedChances = quizSecondChance.get(q.phraseId) || 0;
    if (!correct && q.type === 'choice' && usedChances < secondChanceCap) {
      quizSecondChance.set(q.phraseId, usedChances + 1);
      const phrase = phrasesById[q.phraseId];
      const buttons = [...$('quiz-options').querySelectorAll('button')];
      const removable = buttons.find((b) => b.textContent !== q.answer && b.textContent !== given && !b.disabled);
      if (removable) { removable.disabled = true; removable.classList.add('eliminated'); }
      if (btnEl) { btnEl.disabled = true; btnEl.classList.add('wrong'); }
      const clue = phrase?.clues?.[0]?.text || phrase?.meaning || '';
      $('quiz-feedback').textContent = `先別急——我幫你刪掉一個明顯不對的。${clue ? `再看一次線索：${clue}` : '再看一次題目。'}`;
      setCompanion('thinking', '不急。想清楚了再落筆，這才叫研墨。', false, '再！');
      return;
    }
    save.quizStats.answered += 1;
    quizAnsweredThisRun += 1;
    if (correct) quizCorrectThisRun += 1;
    const masteryResult = recordQuizAnswer(save, q.phraseId, { correct, kind: q.type === 'choice' ? 'choice' : 'fill' });
    const examAvatar = $('quiz-examiner-avatar');
    const examQuote = $('quiz-examiner-quote');

    if (correct) {
      quizWrongStreak = 0;
      save.quizStats.correct += 1;
      const kind = q.type === 'choice' ? 'choice' : 'fill';
      const gained = calculateQuizInkReward({
        currentInk: hintEngine.getInk(),
        kind,
        rewardEligible: masteryResult.rewardEligible,
      });
      if (gained === 2) hintEngine.earn('fill');
      else if (gained === 1) hintEngine.earn('choice');
      quiz.earned += gained;
      const phrase = phrasesById[q.phraseId];
      const reinforcement = phrase?.meaning ? ` 關鍵理解：${phrase.meaning}` : '';
      $('quiz-feedback').textContent = gained > 0
        ? `答對了！＋${gained} 墨。${reinforcement}`
        : `答對了！此題今日已領過墨水，已累積熟練度。${reinforcement}`;
      if (examAvatar && currentExaminer) {
        examAvatar.innerHTML = `<img src="${currentExaminer.happyAvatar}" alt="${currentExaminer.name}" class="examiner-img" />`;
      }
      if (examQuote && currentExaminer) {
        examQuote.textContent = currentExaminer.correctQuote;
      }
      setCompanion('victory', getRandomQuote(guardian.quizQuotes), false, '墨＋！');
    } else {
      quizWrongStreak += 1;
      const phrase = phrasesById[q.phraseId];
      const explanation = phrase?.meaning ? ` 判斷關鍵：${phrase.meaning}` : '';
      // 把玩家「為什麼會被那個選項騙到」講出來，否則下次還會錯同一個
      const chosen = phrases.find((item) => item.text === given);
      const contrast = chosen?.meaning ? `「${given}」講的是${chosen.meaning}；` : '';
      // 不直接印出正解——原本答錯即揭示，配上「答錯不消耗當日獎勵名額」，
      // 就成了「故意全錯抄答案→重開刷墨」的完整免試路線。改成只給判斷關鍵。
      const nudge = q.type === 'fill' ? '這一格再想想，字數與句子結構是線索。' : '再看一次線索，從語意去刪。';
      $('quiz-feedback').textContent = `${contrast}${explanation || nudge}`.trim() || nudge;
      if (examAvatar && currentExaminer) {
        examAvatar.innerHTML = `<img src="${currentExaminer.panicAvatar}" alt="${currentExaminer.name}" class="examiner-img" />`;
      }
      if (examQuote && currentExaminer) {
        examQuote.textContent = currentExaminer.wrongQuote;
      }
      setCompanion('thinking', '此題甚深，道友記住此典，下回必能答對！', false, '思！');
    }
    maybeGrantRescueHint();
    if (q.type === 'choice') {
      for (const b of $('quiz-options').querySelectorAll('button')) {
        b.disabled = true;
        // 只在答對時亮出正解。答錯就標出正解等於「答錯即揭示」，抄完重開就能刷墨。
        if (correct && b.textContent === q.answer) b.classList.add('correct');
      }
      if (!correct && btnEl) btnEl.classList.add('wrong');
    } else {
      $('quiz-fill-input').disabled = true;
      $('quiz-fill-submit').disabled = true;
    }
    refreshInk();
    refreshLearningGoal();
    ctx.persist();
    if (quiz.idx + 1 < quiz.questions.length) {
      $('quiz-next').classList.remove('hidden');
    } else {
      $('quiz-next').textContent = '完成';
      $('quiz-next').classList.remove('hidden');
    }
  }

  function nextQuestion() {
    $('quiz-fill-input').disabled = false;
    $('quiz-fill-submit').disabled = false;
    if (quiz.idx + 1 < quiz.questions.length) {
      quiz.idx += 1;
      $('quiz-next').textContent = '下一題';
      // 還原考官立繪為沉思出題
      const examAvatar = $('quiz-examiner-avatar');
      const examQuote = $('quiz-examiner-quote');
      if (examAvatar && currentExaminer) {
        examAvatar.innerHTML = `<img src="${currentExaminer.avatar}" alt="${currentExaminer.name}" class="examiner-img" />`;
      }
      if (examQuote && currentExaminer) {
        examQuote.textContent = currentExaminer.speech;
      }
      renderQuestion();
    } else {
      closeQuiz();
    }
  }

  function closeQuiz() {
    $('modal-quiz').classList.add('hidden');
    $('quiz-next').textContent = '下一題';
    $('quiz-fill-input').disabled = false;
    $('quiz-fill-submit').disabled = false;
    if (quiz && quiz.earned > 0) say(`本輪共賺得 ${quiz.earned} 墨！`);
    quiz = null;
    currentExaminer = null;
    refreshInk();
  }

  function submitFill() {
    if (!quiz) return;
    const q = quiz.questions[quiz.idx];
    if (q.type !== 'fill' || $('quiz-fill-input').disabled) return;
    const val = $('quiz-fill-input').value.trim();
    if (!val) return;
    answer(q, val, null);
  }

  // ── 知識卡 ───────────────────────────
  // ── 中間句輕量小卡：短暫彈出句子＋釋義後自動收，不中斷破陣節奏 ──
  let miniCardTimer = null;
  function showMiniCard(phrase) {
    let el = document.getElementById('mini-knowledge-card');
    if (!el) {
      el = document.createElement('div');
      el.id = 'mini-knowledge-card';
      el.setAttribute('role', 'status');
      el.addEventListener('click', hideMiniCard);
      document.body.appendChild(el);
    }
    el.innerHTML = `<strong>${phrase.text}</strong><span>${phrase.meaning || ''}</span>`;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(miniCardTimer);
    const meaningLen = Array.from(phrase.meaning || '').length;
    miniCardTimer = setTimeout(hideMiniCard, Math.min(3500, 1500 + meaningLen * 45));
  }
  function hideMiniCard() {
    clearTimeout(miniCardTimer);
    const el = document.getElementById('mini-knowledge-card');
    if (el) el.classList.remove('show');
  }

  function showKnowledgeCard(phrase) {
    $('card-badge').textContent = '摘句入集';
    $('card-review-nav')?.classList.add('hidden');
    $('card-text').textContent = phrase.text;
    const sourceEl = $('card-source');
    if (sourceEl) {
      if (phrase.author) {
        sourceEl.textContent = `—— ${phrase.dynasty ? `${phrase.dynasty}．` : ''}${phrase.author}`;
        sourceEl.classList.remove('hidden');
      } else {
        sourceEl.textContent = '';
        sourceEl.classList.add('hidden');
      }
    }
    $('card-meaning').textContent = phrase.meaning || '';
    $('card-insight').textContent = phrase.insight || '';
    $('modal-card').classList.remove('hidden');
  }

  // ── 事件掛載 ─────────────────────────
  const listeners = [];
  function on(id, ev, fn) {
    const el = $(id);
    if (!el) return;
    el.addEventListener(ev, fn);
    listeners.push([el, ev, fn]);
  }

  on('btn-hint-circle', 'click', () => useHint('circle'));
  on('btn-hint-flash', 'click', () => useHint('flash'));
  on('btn-hint-reveal', 'click', () => useHint('reveal'));
  on('btn-earn-ink', 'click', openQuiz);
  on('quiz-next', 'click', nextQuestion);
  on('quiz-fill-submit', 'click', submitFill);
  on('quiz-fill-input', 'keydown', (ev) => { if (ev.key === 'Enter') submitFill(); });
  on('cross-submit', 'click', submitCross);
  on('cross-input', 'keydown', (ev) => { if (ev.key === 'Enter') submitCross(); });
  on('btn-back-map', 'click', () => ctx.onExit());
  // 超時後保留已找到的句子接著打：時間不夠不等於前面的努力不算
  on('btn-timeout-keep', 'click', () => {
    $('modal-timeout').classList.add('hidden');
    if (typeof ctx.onRetry === 'function') ctx.onRetry();
    else ctx.onExit();
  });
  on('btn-retry-level', 'click', () => {
    clearFoundForRetry();
    $('modal-timeout').classList.add('hidden');
    if (typeof ctx.onRetry === 'function') ctx.onRetry();
    else ctx.onExit();
  });
  on('btn-timeout-map', 'click', () => {
    clearFoundForRetry();
    $('modal-timeout').classList.add('hidden');
    ctx.onExit();
  });
  on('btn-complete-map', 'click', () => {
    $('modal-complete').classList.add('hidden');
    ctx.onExit();
  });
  on('btn-next-level', 'click', () => {
    $('modal-complete').classList.add('hidden');
    if (typeof ctx.onNext === 'function') ctx.onNext();
  });

  // ── 初始化：還原本關已找到 ───────────
  $('cross-input-row').classList.add('hidden');
  for (const t of targets) {
    if (initialFound.includes(t.phraseId)) {
      t.found = true;
      if (isCross) fillTargetChars(t);
      grid.markFound(t.path, t.colorIdx);
    }
  }
  renderTargets();
  renderSealProgress();
  if (typeof ctx.onProgress === 'function') ctx.onProgress(targets.filter((item) => item.found).length, targets.length);
  refreshInk();
  msgEl.textContent = '';
  try {
    const instructionKey = `xzzj_instruction_${isCross ? 'cross' : 'full'}_v1`;
    if (!localStorage.getItem(instructionKey)) {
      const tip = $('play-instruction-tip');
      if (tip) {
        $('play-instruction-title').textContent = isCross ? '先選線索，再輸入完整句子' : '從第一字沿句子方向滑動';
        $('play-instruction-text').textContent = isCross ? '先點一則線索，再到交叉字格輸入答案。' : '電腦可拖曳，手機可以按住滑過連續字格。';
        tip.classList.remove('hidden');
        const dismiss = () => {
          tip.classList.add('hidden');
          localStorage.setItem(instructionKey, '1');
        };
        $('btn-dismiss-play-tip')?.addEventListener('click', dismiss, { once: true });
      }
    }
  } catch { /* localStorage 不可用時，不影響遊戲 */ }
  persistActiveRun();
  ctx.persist();
  if (targets.every((t) => t.found) && targets.length) {
    setTimeout(finishLevel, 0);
  }
  startTimer();

  return {
    destroy() {
      if (!finished) {
        persistActiveRun();
        ctx.persist();
      }
      stopTimer();
      clearTimeout(msgTimer);
      clearTimeout(speechTimer);
      clearTimeout(cutinTimer);
      clearTimeout(cutinHideTimer);
      clearTimeout(comboHideTimer);
      boardEl?.classList.remove('grid-veiled');
      hideMiniCard();
      if (companionWidget) companionWidget.removeEventListener('click', handleCompanionClick);
      if (cutinOverlay) cutinOverlay.removeEventListener('click', handleCutinDismiss);
      for (const [el, ev, fn] of listeners) el.removeEventListener(ev, fn);
      window.removeEventListener('resize', handleQuizViewportChange);
      if (visualViewport) {
        visualViewport.removeEventListener('resize', handleQuizViewportChange);
        visualViewport.removeEventListener('scroll', handleQuizViewportChange);
      }
      document.documentElement.style.removeProperty('--xzzj-visible-viewport-height');
      document.documentElement.style.removeProperty('--xzzj-visible-viewport-top');
      grid.destroy();
      $('cross-input-row').classList.add('hidden');
      $('timer-display').classList.add('hidden');
      $('timer-display').classList.remove('warn');
      $('hint-quota').classList.add('hidden');
      $('modal-quiz').classList.add('hidden');
      $('modal-complete').classList.add('hidden');
      $('modal-card').classList.add('hidden');
      $('modal-timeout').classList.add('hidden');
      const cutin = $('manga-cutin-overlay');
      if (cutin) {
        cutin.classList.remove('active');
        cutin.classList.add('hidden');
        cutin.setAttribute('aria-hidden', 'true');
      }
    },
  };
}
