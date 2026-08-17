// js/game.js — 單關遊戲流程：比對、提示、學習題、星等結算
// 整合：封神密室逃脫機制、Q 版守護仙人伴隨互動、破陣 Cut-in 特寫、研墨考官、燃香/硯台 HUD、破陣封印條
import { createGrid, targetPath, pathKey } from './grid.js';
import { buildQuestions } from './learnquiz.js';
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

  let usedHint = false;
  let usedReveal = false;
  let selectedTargetId = null;
  let finished = false;

  // ── 計時與提示限次 ────────────────────
  const timeLimit = (typeof level.timeLimit === 'number' && level.timeLimit > 0) ? level.timeLimit : null;
  const hintCap = (typeof level.hintCap === 'number' && level.hintCap >= 0) ? level.hintCap : null;
  let hintsUsed = 0;

  // ── DOM 頂部標題與陣法徽章 ───────────
  $('game-level-title').textContent = `第 ${level.id} 關`;
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
      avatarWrap.innerHTML = renderGuardianSvg(guardian.characterId || guardian.id, mood);
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
  let cutinTimer = null;
  function triggerCutIn(foundPhrase) {
    const overlay = $('manga-cutin-overlay');
    if (!overlay) return;

    const charStage = $('cutin-character-stage');
    const stamp = $('cutin-kanji-stamp');
    const sub = $('cutin-kanji-sub');
    const title = $('cutin-guardian-title');
    const speech = $('cutin-guardian-speech');

    if (charStage) {
      charStage.innerHTML = renderGuardianSvg(guardian.characterId || guardian.id, 'victory');
    }
    if (stamp) stamp.textContent = foundPhrase.text;
    if (sub) sub.textContent = '⚡ 陣眼勘破・真傳現世 ⚡';
    if (title) title.textContent = `${guardian.name} 讚賞`;
    if (speech) speech.textContent = getRandomQuote(guardian.findQuotes);

    overlay.classList.remove('hidden');
    overlay.classList.remove('active');
    void overlay.offsetWidth;
    overlay.classList.add('active');

    clearTimeout(cutinTimer);
    cutinTimer = setTimeout(() => {
      overlay.classList.remove('active');
      setTimeout(() => overlay.classList.add('hidden'), 250);
    }, 1350);
  }

  // 點擊 Cut-in 可快速跳過
  const cutinOverlay = $('manga-cutin-overlay');
  if (cutinOverlay) {
    cutinOverlay.addEventListener('click', () => {
      clearTimeout(cutinTimer);
      cutinOverlay.classList.remove('active');
      setTimeout(() => cutinOverlay.classList.add('hidden'), 150);
    });
  }

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
  let remainingMs = timeLimit != null ? timeLimit * 1000 : 0;
  let timerId = null;
  let lastTick = 0;
  let warnedLowTime = false;

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
    if (!finished && !isAnyModalOpen()) remainingMs -= (now - lastTick);
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
    renderTimer();
    refreshInk();
    setSelected(null);
    $('modal-card').classList.add('hidden');
    $('modal-quiz').classList.add('hidden');
    
    // 渲染超時救援視窗
    const rescueAvatar = $('timeout-guardian-avatar');
    if (rescueAvatar) {
      rescueAvatar.innerHTML = renderGuardianSvg(guardian.characterId || guardian.id, 'panic');
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
    levelSave.found = [];
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
    if (!levelSave.found.includes(t.phraseId)) levelSave.found.push(t.phraseId);
    if (real) {
      collection.add(t.phraseId);
      // 觸發破陣 Cut-in 特寫動畫
      triggerCutIn(t.phrase);
      showKnowledgeCard(t.phrase);
      setCompanion('victory', getRandomQuote(guardian.findQuotes), true, '破！');
    }
    if (selectedTargetId === t.phraseId) selectedTargetId = null;
    renderTargets();
    renderSealProgress();
    if (isCross) updateCrossSelection();
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
      grid.flashInvalid(path);
    }
  }

  // ── 提示 ─────────────────────────────
  function pickHintTarget() {
    const unfound = targets.filter((t) => !t.found);
    if (!unfound.length) return null;
    return unfound.find((t) => t.phraseId === selectedTargetId) || unfound[0];
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
    refreshInk();
    ctx.persist();
  }

  // ── 星等與通關（破陣結算・大尺寸群仙大合照） ────
  function computeStars() {
    if (usedReveal) return 1;
    if (usedHint) return 2;
    return 3;
  }

  function finishLevel() {
    if (finished) return;
    finished = true;
    stopTimer();
    const stars = computeStars();
    levelSave.stars = Math.max(levelSave.stars, stars);
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
      completeAvatar.innerHTML = renderGuardianSvg(guardian.characterId || guardian.id, 'victory');
    }
    const completeSpeech = $('complete-guardian-speech');
    if (completeSpeech) {
      completeSpeech.textContent = getRandomQuote(guardian.winQuotes);
    }

    // 封神法寶碎片掉落展示
    const shard = arrayInfo.treasureShard;
    if (shard) {
      const iconEl = $('treasure-icon');
      const imgEl = $('treasure-img');
      const nameEl = $('treasure-name');
      const descEl = $('treasure-desc');
      if (iconEl) iconEl.textContent = shard.icon;
      if (imgEl) {
        imgEl.src = shard.imagePath || shard.svgPath || 'assets/items/dashen-bian.png';
        imgEl.alt = shard.name;
      }
      if (nameEl) nameEl.textContent = shard.name;
      if (descEl) descEl.textContent = shard.desc;
    }

    $('btn-next-level').classList.toggle('hidden', !ctx.hasNext);
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
      questions = buildQuestions(phrases, targetIds, 5);
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
    const examAvatar = $('quiz-examiner-avatar');
    const examQuote = $('quiz-examiner-quote');

    if (correct) {
      save.quizStats.correct += 1;
      const kind = q.type === 'choice' ? 'choice' : 'fill';
      hintEngine.earn(kind);
      const gained = q.type === 'choice' ? 1 : 2;
      quiz.earned += gained;
      $('quiz-feedback').textContent = `答對了！＋${gained} 墨 🖋`;
      if (examAvatar && currentExaminer) {
        examAvatar.innerHTML = `<img src="${currentExaminer.happyAvatar}" alt="${currentExaminer.name}" class="examiner-img" />`;
      }
      if (examQuote && currentExaminer) {
        examQuote.textContent = currentExaminer.correctQuote;
      }
      setCompanion('victory', getRandomQuote(guardian.quizQuotes), false, '墨＋！');
    } else {
      $('quiz-feedback').textContent = `可惜，正解是「${q.answer}」。`;
      if (examAvatar && currentExaminer) {
        examAvatar.innerHTML = `<img src="${currentExaminer.panicAvatar}" alt="${currentExaminer.name}" class="examiner-img" />`;
      }
      if (examQuote && currentExaminer) {
        examQuote.textContent = currentExaminer.wrongQuote;
      }
      setCompanion('thinking', '此題甚深，道友記住此典，下回必能答對！', false, '思！');
    }
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
  function showKnowledgeCard(phrase) {
    $('card-text').textContent = phrase.text;
    $('card-meaning').textContent = phrase.meaning || '';
    $('card-insight').textContent = phrase.insight || '';
    $('card-source').textContent = `出處：${phrase.source || ''}`;
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
    if (levelSave.found.includes(t.phraseId)) {
      t.found = true;
      if (isCross) fillTargetChars(t);
      grid.markFound(t.path, t.colorIdx);
    }
  }
  renderTargets();
  renderSealProgress();
  refreshInk();
  msgEl.textContent = '';
  if (targets.every((t) => t.found) && targets.length) {
    finished = true;
    refreshInk();
  }
  startTimer();

  return {
    destroy() {
      stopTimer();
      clearTimeout(msgTimer);
      clearTimeout(speechTimer);
      clearTimeout(cutinTimer);
      if (companionWidget) companionWidget.removeEventListener('click', handleCompanionClick);
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
      }
    },
  };
}
