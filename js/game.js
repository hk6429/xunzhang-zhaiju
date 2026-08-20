// js/game.js — 單關遊戲流程：比對、提示、學習題、星等結算
// 整合：封神密室逃脫機制、Q 版守護仙人伴隨互動、破陣 Cut-in 特寫、研墨考官、燃香/硯台 HUD、破陣封印條
import { createGrid, targetPath, pathKey } from './grid.js';
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
  // 文林淬鍊卷（第 6–10 章）尚無專屬立繪，characterId 明確設為 null 以跳過生圖，只保留文字對白
  const hasGuardianArt = guardian.characterId !== null;
  const guardianSvg = (mood) => (hasGuardianArt ? renderGuardianSvg(guardian.characterId || guardian.id, mood) : '');

  // ── 目標資料 ──────────────────────────
  const targets = level.targets.map((t, i) => {
    const phrase = phrasesById[t.phraseId];
    const path = phrase ? targetPath(t, phrase.text.length, size) : null;
    const clue = (phrase && Array.isArray(phrase.clues) && phrase.clues.length)
      ? (phrase.clues[t.clueIndex] || phrase.clues[0])
      : null;
    const rune = BAGUA_RUNES[i % BAGUA_RUNES.length];
    return { ...t, phrase, path, clue, rune, key: path ? pathKey(path) : null, colorIdx: i, found: false };
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

  // ── 計時與提示限次 ────────────────────
  const timeLimit = modeConfig.timeLimit;
  const hintCap = modeConfig.hintCap;
  let hintsUsed = resumedRun?.hintsUsed || 0;

  // ── DOM 頂部標題與陣法徽章 ───────────
  $('game-level-title').textContent = `第 ${level.id} 關・${modeConfig.label}`;
  const learningGoal = $('level-learning-goal');
  if (learningGoal) {
    const types = [...new Set(targets.map((target) => target.phrase.type))].join('、');
    learningGoal.textContent = `本關學習目標：能依線索辨認 ${targets.length} 句${types || '語文素材'}，並透過研墨題理解與運用句義。`;
  }
  // 把七階功名進度搬進關卡內（原本只在大廳看得到，動機在正在解謎時反而消失）
  function refreshCultivationHint() {
    const el = $('level-cultivation-hint');
    if (!el) return;
    const cultivation = computeCultivationProgress(save);
    el.textContent = cultivation.next
      ? `修為・${cultivation.current.title}，距 ${cultivation.next.title} 尚差 ${cultivation.remaining} 點`
      : `修為・${cultivation.current.title}，已登最高境界`;
  }
  refreshCultivationHint();
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
  const CUTIN_DISPLAY_MS = 5000;
  let cutinTimer = null;
  let cutinHideTimer = null;

  function dismissCutIn(fadeMs = 250) {
    const overlay = $('manga-cutin-overlay');
    if (!overlay) return;
    clearTimeout(cutinTimer);
    clearTimeout(cutinHideTimer);
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

  function capExhausted() {
    return hintCap != null && hintsUsed >= hintCap;
  }

  function refreshInk() {
    const ink = hintEngine.getInk();
    $('ink-amount').textContent = String(ink);
    const capped = capExhausted();
    $('btn-hint-circle').disabled = finished || capped || !hintEngine.canSpend('circle');
    $('btn-hint-flash').disabled = finished || capped || !hintEngine.canSpend('flash');
    $('btn-hint-reveal').disabled = finished || capped || !hintEngine.canSpend('reveal');
    
    const quota = $('hint-quota');
    if (hintCap == null) {
      quota.classList.add('hidden');
    } else {
      quota.classList.remove('hidden');
      const left = Math.max(0, hintCap - hintsUsed);
      quota.textContent = capped ? `提示 0/${hintCap}・本關提示已用罄` : `提示 ${left}/${hintCap}`;
      quota.classList.toggle('exhausted', capped);
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
    if (!completedBefore) levelSave.found = [];
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
      rescueSpeech.textContent = getRandomQuote(guardian.timeoutQuotes);
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
      } else {
        li.textContent = `【${t.rune}】${t.phrase.text}`;
      }
      if (t.phraseId === selectedTargetId && !t.found) li.classList.add('selected');
      li.addEventListener('click', () => {
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
      input.focus();
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
      collection.add(t.phraseId);
      recordDailyProgress(save, 'phrase-found');
      knowledgeQueue.push(t.phrase);
      if (knowledgeQueue.length === 1) {
        triggerCutIn(t.phrase);
        showKnowledgeCard(t.phrase);
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
  function maybeGrantRescueHint() {
    if (finished || quizWrongStreak < 3) return;
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

  function useHint(tier) {
    if (finished) return;
    if (capExhausted()) {
      say('本關提示次數已用罄，墨水可留到別關使用。');
      return;
    }
    const t = pickHintTarget();
    if (!t) return;
    if (!hintEngine.canSpend(tier)) {
      say('墨水不足，按「賺墨水」答題補充。');
      // 墨水告急：仙人切換驚慌催促
      setCompanion('panic', '哎呀！墨水不足了，道友快按「賺墨水」研墨補充靈氣！', true, '乾！');
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
      say(`已揭示「${t.phrase.text}」。`);
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
      treasure: shard ? {
        treasureId: shard.id,
        name: shard.name,
        maxFragments: 10,
      } : null,
      now,
    });
    ctx.persist();
    refreshInk();
    $('modal-card').classList.add('hidden');

    // 渲染封神破陣結算視窗
    const completeTitle = $('complete-title');
    if (completeTitle) completeTitle.textContent = '尋章功成・位列封神';
    
    const arrayNameEl = $('complete-array-name');
    if (arrayNameEl) {
      arrayNameEl.textContent = `${arrayInfo.title}・第 ${level.id} 關 陣眼破解`;
    }

    $('complete-stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    
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
    }

    $('btn-next-level').classList.toggle('hidden', !ctx.hasNext);
    if (ctx.hasNext) $('btn-next-level').textContent = ctx.getNextActionLabel?.() || '進入下一關';
    const summaryText = $('session-summary-text');
    const summaryList = $('session-summary-list');
    if (summaryText) summaryText.textContent = `本關尋得 ${knowledgeQueue.length} 句，獲得 ${stars} 星，正式納入封神寶典。`;
    if (summaryList) summaryList.innerHTML = knowledgeQueue.map((phrase) => `<li><strong>${phrase.text}</strong>：${phrase.meaning || ''}</li>`).join('');
    $('modal-complete').classList.remove('hidden');
    if (typeof ctx.onComplete === 'function') ctx.onComplete(level.id, stars);
  }

  // ── 學習題（研墨答題・太乙真人/姜太公擔任考官） ────
  let quiz = null;
  let currentExaminer = null;

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
      input.focus();
    }
  }

  function answer(q, given, btnEl) {
    const correct = given === q.answer;
    save.quizStats.answered += 1;
    quizAnsweredThisRun += 1;
    if (correct) quizCorrectThisRun += 1;
    const masteryResult = recordQuizAnswer(save, q.phraseId, { correct });
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
      $('quiz-feedback').textContent = `你選的「${given}」與題意不合；正解是「${q.answer}」。${explanation}`;
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
        if (b.textContent === q.answer) b.classList.add('correct');
      }
      if (!correct && btnEl) btnEl.classList.add('wrong');
    } else {
      $('quiz-fill-input').disabled = true;
      $('quiz-fill-submit').disabled = true;
    }
    refreshInk();
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
        $('play-instruction-text').textContent = isCross ? '點選右側線索，來到交叉字格後輸入答案。' : '電腦可拖曳，手機可以按住滑過連續字格。';
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
      hideMiniCard();
      if (companionWidget) companionWidget.removeEventListener('click', handleCompanionClick);
      if (cutinOverlay) cutinOverlay.removeEventListener('click', handleCutinDismiss);
      for (const [el, ev, fn] of listeners) el.removeEventListener(ev, fn);
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
