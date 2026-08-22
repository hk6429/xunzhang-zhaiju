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

// 誘答評分：同難度層級最優先，其次「與正解有共用字」，其次字數相同。
// 原本是同 type 全域隨機，結果 71.9% 的題目誘答與正解毫無共用字——
// 對程度好的學生一眼刪三個、對程度弱的學生四個都沒看過，兩邊都學不到東西。
function distractorScore(candidate, phrase) {
  let score = 0;
  if (candidate.level && phrase.level && candidate.level === phrase.level) score += 4;
  const chars = new Set(Array.from(phrase.text));
  const shared = Array.from(new Set(Array.from(candidate.text))).filter((c) => chars.has(c)).length;
  score += Math.min(3, shared) * 2;
  if (Array.from(candidate.text).length === Array.from(phrase.text).length) score += 1;
  return score;
}

// 部分近義成語措辭不同、字面重疊率低，字元 Jaccard 抓不到，但語意幾乎相同——
// 同時出現在同一題會變成「兩個選項都對」的爭議題（例：一心一意／專心致志／全神貫注）。
// 人工標記已知叢集；尚未窮舉全庫，後續發現新的爭議組合可直接加進這裡。
const SYNONYM_CLUSTERS = [
  ['一心一意', '專心致志', '全神貫注'],
  ['群策群力', '齊心協力', '同心協力'],
];
const synonymClusterOf = new Map();
for (const cluster of SYNONYM_CLUSTERS) {
  for (const text of cluster) synonymClusterOf.set(text, cluster);
}

// 語意過於接近的同義叢集不可同時出現，否則會出現「兩個選項都對」的爭議題。
function tooSimilar(candidate, phrase) {
  const cluster = synonymClusterOf.get(phrase.text);
  if (cluster && cluster.includes(candidate.text)) return true;
  const a = String(phrase.meaning || '');
  const b = String(candidate.meaning || '');
  if (!a || !b) return false;
  if (b.includes(phrase.text) || a.includes(candidate.text)) return true; // 釋義直接提到對方
  const setA = new Set(Array.from(a));
  const setB = new Set(Array.from(b));
  const inter = [...setA].filter((c) => setB.has(c)).length;
  const union = new Set([...setA, ...setB]).size;
  return union > 0 && inter / union >= 0.55;
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
      candidates.push(p);
    }
  }
  if (candidates.length < 3) return null; // 語料不足，無法出 choice
  const usable = candidates.filter((p) => !tooSimilar(p, phrase));
  const source = usable.length >= 3 ? usable : candidates;
  // 先洗牌再依分數穩定排序：同分者仍然隨機，避免每次都是同一批誘答。
  const ranked = shuffle(source, rng)
    .map((p, i) => ({ p, i, s: distractorScore(p, phrase) }))
    .sort((a, b) => (b.s - a.s) || (a.i - b.i))
    .map((item) => item.p.text);
  // tooSimilar 只比對「候選 vs 正解」，抓不到兩個候選彼此互為同義叢集的情況
  // （例如正解是「三心二意」，但候選裡的「同心協力」「齊心協力」互為近義詞）——
  // 這裡再補一層：同一題的誘答彼此也不可以來自同一個叢集。
  const distractors = [];
  const usedClusters = new Set();
  for (const text of ranked) {
    const cluster = synonymClusterOf.get(text);
    if (cluster && usedClusters.has(cluster)) continue;
    distractors.push(text);
    if (cluster) usedClusters.add(cluster);
    if (distractors.length === 3) break;
  }
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
  // 只挖「在本句中唯一」的字：原本隨機挖，導致「一心一意」挖掉「一」、
  // 「百發百中」挖掉「百」——答案就印在題幹上，9.7% 的字位是白挖的。
  const unique = chars.map((c, i) => i).filter((i) => chars.filter((c) => c === chars[i]).length === 1);
  const pool = unique.length ? unique : chars.map((c, i) => i);
  const idx = pool[Math.min(pool.length - 1, Math.floor(rng() * pool.length))];
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
