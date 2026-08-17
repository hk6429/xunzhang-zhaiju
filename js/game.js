// js/game.js — 單關遊戲流程：比對、提示、學習題、星等結算
// v2：目標清單線索化（targetDisplay:"clue"）＋ cross 填字互動
import { createGrid, targetPath, pathKey } from './grid.js';
import { buildQuestions } from './learnquiz.js';

const FLASH_MS = 2000;
const TICK_MS = 200;

const $ = (id) => document.getElementById(id);

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * 開始一關。回傳 { destroy() }。
 * @param {object} ctx
 *   level        關卡物件（SCHEMA levels[]；v2 支援 layout:"cross" 與 targetDisplay:"clue"）
 *   phrases      全語料陣列
 *   phrasesById  Map/Object：phraseId → phrase
 *   hintEngine   js/hints.js createHintEngine 實例
 *   collection   js/collection.js createCollection 實例
 *   save         存檔物件（本模組更新 save.levels / save.quizStats）
 *   persist()    要求 app 寫檔
 *   onExit()     返回地圖
 *   onComplete(levelId, stars)  通關後（app 更新地圖/解鎖）
 *   hasNext      是否還有下一關可去
 *   onNext()     前往下一關
 */
export function startLevel(ctx) {
  const { level, phrases, phrasesById, hintEngine, collection, save } = ctx;
  const size = level.size;
  const isCross = level.layout === 'cross';
  // targetDisplay 相容：v1 "text"（fixtures fallback）與 v2 "clue"
  const clueMode = level.targetDisplay === 'clue';

  // ── 目標資料 ──────────────────────────
  const targets = level.targets.map((t, i) => {
    const phrase = phrasesById[t.phraseId];
    const path = phrase ? targetPath(t, phrase.text.length, size) : null;
    const clue = (phrase && Array.isArray(phrase.clues) && phrase.clues.length)
      ? (phrase.clues[t.clueIndex] || phrase.clues[0])
      : null;
    return { ...t, phrase, path, clue, key: path ? pathKey(path) : null, colorIdx: i, found: false };
  }).filter((t) => t.phrase && t.path);

  const levelKey = String(level.id);
  if (!save.levels[levelKey]) save.levels[levelKey] = { stars: 0, found: [] };
  const levelSave = save.levels[levelKey];

  let usedHint = false;
  let usedReveal = false;
  let selectedTargetId = null;
  let finished = false;

  // ── v3：計時與提示限次（關卡內暫態；v2 資料缺欄位視為 null） ──
  const timeLimit = (typeof level.timeLimit === 'number' && level.timeLimit > 0) ? level.timeLimit : null;
  const hintCap = (typeof level.hintCap === 'number' && level.hintCap >= 0) ? level.hintCap : null;
  let hintsUsed = 0;

  // ── DOM ──────────────────────────────
  $('game-level-title').textContent = `第 ${level.id} 關`;
  const msgEl = $('hint-msg');
  let msgTimer = null;
  function say(text) {
    msgEl.textContent = text;
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => { msgEl.textContent = ''; }, 2600);
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
    $('ink-amount').textContent = String(hintEngine.getInk());
    const capped = capExhausted();
    $('btn-hint-circle').disabled = finished || capped || !hintEngine.canSpend('circle');
    $('btn-hint-flash').disabled = finished || capped || !hintEngine.canSpend('flash');
    $('btn-hint-reveal').disabled = finished || capped || !hintEngine.canSpend('reveal');
    // 提示限次顯示（三種合計）；hintCap null＝不顯示（行為同 v2）
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

  // ── v3：倒數計時 ──────────────────────
  // 暫停原則：計時器每 TICK_MS 醒來一次，只有在「當下沒有任何 modal 開啟」時
  // 才把上次醒來到現在的實際流逝時間（performance.now 差值）扣進剩餘時間；
  // modal 開啟期間每次醒來仍會把 lastTick 推到 now，等於那段時間被丟棄——
  // 不是「開著 modal 仍在扣」的假暫停，誤差上限僅一個 tick（200ms）。
  const timerEl = $('timer-display');
  const timerTimeEl = $('timer-time');
  let remainingMs = timeLimit != null ? timeLimit * 1000 : 0;
  let timerId = null;
  let lastTick = 0;

  function isAnyModalOpen() {
    return !!document.querySelector('.modal-backdrop:not(.hidden)');
  }

  function renderTimer() {
    if (timeLimit == null) return;
    const sec = Math.max(0, Math.ceil(remainingMs / 1000));
    timerTimeEl.textContent = fmtTime(sec);
    timerEl.classList.toggle('warn', remainingMs <= timeLimit * 1000 * 0.2);
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

  // ── v3：超時 ─────────────────────────
  function handleTimeout() {
    finished = true;
    stopTimer();
    remainingMs = 0;
    renderTimer();
    refreshInk();
    setSelected(null);
    $('modal-card').classList.add('hidden');
    $('modal-quiz').classList.add('hidden');
    $('modal-timeout').classList.remove('hidden');
  }

  function clearFoundForRetry() {
    // SCHEMA v3：重新挑戰＝本關 found 清空並落盤；已入圖鑑收藏不回收
    levelSave.found = [];
    ctx.persist();
  }

  // ── 目標清單（v2：線索卡） ─────────────
  function renderTargets() {
    const ul = $('target-list');
    ul.innerHTML = '';
    ul.classList.toggle('clue-cards', clueMode);
    for (const t of targets) {
      const li = document.createElement('li');
      li.className = 'target-card';
      if (t.found) {
        // 翻面：顯示成語＋劃線
        li.classList.add('done');
        li.textContent = t.phrase.text;
      } else if (clueMode && t.clue) {
        const tag = document.createElement('span');
        tag.className = 'clue-tag';
        tag.dataset.style = t.clue.style || '釋義';
        tag.textContent = t.clue.style || '釋義';
        li.appendChild(tag);
        const txt = document.createElement('span');
        txt.className = 'clue-text';
        txt.textContent = t.clue.text || '';
        li.appendChild(txt);
      } else {
        li.textContent = t.phrase.text;
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
      // 一格屬兩詞：再點一次切換詞
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
      fillTargetChars(t); // 整詞填入（含帶動交叉格）
      markFound(t, { real: true });
    } else {
      const row = $('cross-input-row');
      row.classList.remove('invalid');
      void row.offsetWidth; // 重觸發動畫
      row.classList.add('invalid');
    }
  }

  // ── 找到／比對 ────────────────────────
  function markFound(t, { real }) {
    t.found = true;
    grid.markFound(t.path, t.colorIdx);
    if (!levelSave.found.includes(t.phraseId)) levelSave.found.push(t.phraseId);
    if (real) {
      collection.add(t.phraseId); // SCHEMA：只有真實找到才入集
      showKnowledgeCard(t.phrase);
    }
    if (selectedTargetId === t.phraseId) selectedTargetId = null;
    renderTargets();
    if (isCross) updateCrossSelection();
    ctx.persist();
    if (targets.every((x) => x.found)) setTimeout(finishLevel, real ? 350 : 250);
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
      return;
    }
    if (!hintEngine.spend(tier)) { refreshInk(); return; }
    usedHint = true;
    if (hintCap != null) hintsUsed += 1; // 三種提示合計，spend 成功才計次
    if (tier === 'circle') {
      if (isCross) {
        // cross：永久顯示該詞首格的字
        grid.setChar(t.path[0][0], t.path[0][1], t.phrase.text[0]);
        say(`已顯示「${t.phrase.text[0]}」字。`);
      } else {
        grid.circleCell(t.path[0][0], t.path[0][1]);
        say(`已圈出「${t.phrase.text[0]}」字位置。`);
      }
    } else if (tier === 'flash') {
      if (isCross) {
        // cross：未填格暫顯答案字 2 秒
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
      if (isCross) fillTargetChars(t); // 整詞直接填入
      markFound(t, { real: false }); // 維持 1★ 與不入圖鑑
    }
    refreshInk();
    ctx.persist();
  }

  // ── 星等與通關 ────────────────────────
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
    $('modal-card').classList.add('hidden'); // 通關時關閉殘留的知識卡，避免疊在結算視窗底下
    $('complete-stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    $('btn-next-level').classList.toggle('hidden', !ctx.hasNext);
    $('modal-complete').classList.remove('hidden');
    if (typeof ctx.onComplete === 'function') ctx.onComplete(level.id, stars);
  }

  // ── 學習題（賺墨水） ──────────────────
  let quiz = null; // { questions, idx, earned }

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
    quiz = { questions, idx: 0, earned: 0 };
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
    if (correct) {
      save.quizStats.correct += 1;
      const kind = q.type === 'choice' ? 'choice' : 'fill';
      hintEngine.earn(kind);
      const gained = q.type === 'choice' ? 1 : 2;
      quiz.earned += gained;
      $('quiz-feedback').textContent = `答對了！＋${gained} 墨 🖋`;
    } else {
      $('quiz-feedback').textContent = `可惜，正解是「${q.answer}」。`;
    }
    // 鎖定作答並標示正誤
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
    if (typeof ctx.onRetry === 'function') ctx.onRetry(); // 重進本關＝盤面/計時/提示次數/星等狀態全重置
    else ctx.onExit();
  });
  on('btn-timeout-map', 'click', () => {
    clearFoundForRetry(); // 超時離場同樣清空，避免「回地圖再進」帶著半完成盤面重置計時
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

  // ── 初始化：還原本關已找到（含之前 session） ──
  $('cross-input-row').classList.add('hidden');
  for (const t of targets) {
    if (levelSave.found.includes(t.phraseId)) {
      t.found = true;
      if (isCross) fillTargetChars(t);
      grid.markFound(t.path, t.colorIdx);
    }
  }
  renderTargets();
  refreshInk();
  msgEl.textContent = '';
  if (targets.every((t) => t.found) && targets.length) {
    // 上次已全部找到但可能沒結算：直接視為完成、不再重複結算
    finished = true;
    refreshInk();
  }
  startTimer(); // timeLimit null 或已完成＝隱藏不計時

  return {
    destroy() {
      stopTimer(); // 離開關卡必清計時器
      clearTimeout(msgTimer);
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
    },
  };
}
