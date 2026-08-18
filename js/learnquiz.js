// js/learnquiz.js — 學習題產生器（零 DOM、零 fetch、零外部依賴）
// 介面凍結於 docs/SCHEMA.md：buildQuestions(phrases, targetIds, count, rng = Math.random)
// 全程只用傳入的 rng 取隨機（預設參數除外）。

const BLANK = '［　］'; // 全形括號＋全形空格

// Fisher–Yates，回傳新陣列，不改動原陣列；只用 rng。
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildChoice(phrase, phrases, rng) {
  // 干擾選項：同 type、非正解、text 彼此不重複（也不與正解重複）。
  const pool = phrases.filter(
    (p) => p.type === phrase.type && p.id !== phrase.id && p.text !== phrase.text
  );
  const seen = new Set();
  const candidates = [];
  for (const p of pool) {
    if (!seen.has(p.text)) {
      seen.add(p.text);
      candidates.push(p.text);
    }
  }
  if (candidates.length < 3) return null; // 語料不足，無法出 choice
  const distractors = shuffle(candidates, rng).slice(0, 3);
  const options = shuffle([phrase.text, ...distractors], rng);
  return {
    type: 'choice',
    prompt: phrase.meaning,
    options,
    answer: phrase.text,
    phraseId: phrase.id,
  };
}

function buildFill(phrase, rng) {
  const chars = Array.from(phrase.text);
  const idx = Math.min(chars.length - 1, Math.floor(rng() * chars.length));
  const answer = chars[idx];
  const prompt = chars
    .map((c, i) => (i === idx ? BLANK : c))
    .join('');
  return {
    type: 'fill',
    prompt,
    answer,
    phraseId: phrase.id,
  };
}

export function buildQuestions(phrases, targetIds, count, rng = Math.random) {
  if (!Array.isArray(phrases) || !Number.isFinite(count) || count <= 0) return [];

  const targetSet = new Set(targetIds || []);
  const targets = phrases.filter((p) => targetSet.has(p.id));
  const rest = phrases.filter((p) => !targetSet.has(p.id));

  // 題源優先：targetIds 洗牌後在前，不足 count 才輪到其餘語料（也洗牌）。
  const ordered = [...shuffle(targets, rng), ...shuffle(rest, rng)];
  const n = Math.min(count, ordered.length);

  const questions = [];
  for (let i = 0; i < n; i++) {
    const phrase = ordered[i];
    const wantChoice = i % 2 === 0; // 輪流出 choice / fill 兩型
    let q = null;
    if (wantChoice) q = buildChoice(phrase, phrases, rng);
    if (!q) q = buildFill(phrase, rng); // 語料不足無法出 choice → 退化為 fill
    questions.push(q);
  }
  return questions;
}

/**
 * 依錯題與間隔複習狀態排序出題。既有 buildQuestions 介面與輸出規則保持不變。
 * profile: { mastery: { [phraseId]: { nextReviewAt, mastered } }, wrongBook: [] }
 */
export function buildAdaptiveQuestions(
  phrases,
  targetIds,
  count,
  profile = {},
  rng = Math.random,
  now = new Date(),
) {
  if (!Array.isArray(phrases) || !Number.isFinite(count) || count <= 0) return [];
  const targetSet = new Set(Array.isArray(targetIds) ? targetIds : []);
  const wrongSet = new Set(Array.isArray(profile.wrongBook) ? profile.wrongBook : []);
  const mastery = profile.mastery && typeof profile.mastery === 'object' ? profile.mastery : {};
  const nowMs = new Date(now).getTime();
  const due = (phrase) => {
    const item = mastery[phrase.id];
    if (!item || !item.nextReviewAt) return !item?.mastered;
    const dueMs = new Date(item.nextReviewAt).getTime();
    return !Number.isFinite(dueMs) || dueMs <= nowMs;
  };

  const groups = [
    phrases.filter((p) => targetSet.has(p.id) && wrongSet.has(p.id)),
    phrases.filter((p) => targetSet.has(p.id) && !wrongSet.has(p.id) && due(p)),
    phrases.filter((p) => targetSet.has(p.id) && !wrongSet.has(p.id) && !due(p)),
    phrases.filter((p) => !targetSet.has(p.id) && wrongSet.has(p.id)),
    phrases.filter((p) => !targetSet.has(p.id) && !wrongSet.has(p.id) && due(p)),
    phrases.filter((p) => !targetSet.has(p.id) && !wrongSet.has(p.id) && !due(p)),
  ];
  const seen = new Set();
  const ordered = [];
  for (const group of groups) {
    for (const phrase of shuffle(group, rng)) {
      if (!phrase?.id || seen.has(phrase.id)) continue;
      seen.add(phrase.id);
      ordered.push(phrase);
    }
  }

  const questions = [];
  for (let i = 0; i < Math.min(count, ordered.length); i++) {
    const phrase = ordered[i];
    const wantChoice = i % 2 === 0;
    let question = wantChoice ? buildChoice(phrase, phrases, rng) : null;
    if (!question) question = buildFill(phrase, rng);
    questions.push(question);
  }
  return questions;
}
