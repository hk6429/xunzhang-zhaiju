// js/game.js — 單關遊戲流程：比對、提示、學習題、星等結算
import { createGrid, targetPath, pathKey } from './grid.js';
import { buildQuestions } from './learnquiz.js';

const COST_LABEL = { circle: '圈首字', flash: '閃現整句', reveal: '直接揭示' };
const FLASH_MS = 2000;

const $ = (id) => document.getElementById(id);

/**
 * 開始一關。回傳 { destroy() }。
 * @param {object} ctx
 *   level        關卡物件（SCHEMA levels[]）
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

  // ── 目標資料 ──────────────────────────
  const targets = level.targets.map((t, i) => {
    const phrase = phrasesById[t.phraseId];
    const path = phrase ? targetPath(t, phrase.text.length, size) : null;
    return { ...t, phrase, path, key: path ? pathKey(path) : null, colorIdx: i, found: false };
  }).filter((t) => t.phrase && t.path);

  const levelKey = String(level.id);
  if (!save.levels[levelKey]) save.levels[levelKey] = { stars: 0, found: [] };
  const levelSave = save.levels[levelKey];

  let usedHint = false;
  let usedReveal = false;
  let selectedTargetId = null;
  let finished = false;

  // ── DOM ──────────────────────────────
  $('game-level-title').textContent = `第 ${level.id} 關`;
  const msgEl = $('hint-msg');
  let msgTimer = null;
  function say(text) {
    msgEl.textContent = text;
    clearTimeout(msgTimer);
    msgTimer = setTimeout(() => { msgEl.textContent = ''; }, 2600);
  }

  const grid = createGrid($('grid'), level.grid, { onSelect: handleSelect });

  function refreshInk() {
    $('ink-amount').textContent = String(hintEngine.getInk());
    $('btn-hint-circle').disabled = finished || !hintEngine.canSpend('circle');
    $('btn-hint-flash').disabled = finished || !hintEngine.canSpend('flash');
    $('btn-hint-reveal').disabled = finished || !hintEngine.canSpend('reveal');
  }

  function renderTargets() {
    const ul = $('target-list');
    ul.innerHTML = '';
    for (const t of targets) {
      const li = document.createElement('li');
      li.textContent = t.phrase.text;
      if (t.found) li.classList.add('done');
      if (t.phraseId === selectedTargetId && !t.found) li.classList.add('selected');
      li.addEventListener('click', () => {
        if (t.found) return;
        selectedTargetId = (selectedTargetId === t.phraseId) ? null : t.phraseId;
        renderTargets();
      });
      ul.appendChild(li);
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
    const t = pickHintTarget();
    if (!t) return;
    if (!hintEngine.canSpend(tier)) {
      say('墨水不足，按「賺墨水」答題補充。');
      return;
    }
    if (!hintEngine.spend(tier)) { refreshInk(); return; }
    usedHint = true;
    if (tier === 'circle') {
      grid.circleCell(t.path[0][0], t.path[0][1]);
      say(`已圈出「${t.phrase.text[0]}」字位置。`);
    } else if (tier === 'flash') {
      grid.flashPath(t.path, FLASH_MS);
      say('整句路徑閃現 2 秒，看仔細！');
    } else if (tier === 'reveal') {
      usedReveal = true;
      say(`已揭示「${t.phrase.text}」。`);
      markFound(t, { real: false });
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
  on('btn-back-map', 'click', () => ctx.onExit());
  on('btn-complete-map', 'click', () => {
    $('modal-complete').classList.add('hidden');
    ctx.onExit();
  });
  on('btn-next-level', 'click', () => {
    $('modal-complete').classList.add('hidden');
    if (typeof ctx.onNext === 'function') ctx.onNext();
  });

  // ── 初始化：還原本關已找到（含之前 session） ──
  for (const t of targets) {
    if (levelSave.found.includes(t.phraseId)) {
      t.found = true;
      grid.markFound(t.path, t.colorIdx);
    }
  }
  renderTargets();
  refreshInk();
  msgEl.textContent = '';
  if (targets.every((t) => t.found) && targets.length) {
    // 上次已全部找到但可能沒結算：直接視為完成、不再重複結算
    finished = true;
  }

  return {
    destroy() {
      clearTimeout(msgTimer);
      for (const [el, ev, fn] of listeners) el.removeEventListener(ev, fn);
      grid.destroy();
      $('modal-quiz').classList.add('hidden');
      $('modal-complete').classList.add('hidden');
      $('modal-card').classList.add('hidden');
    },
  };
}
