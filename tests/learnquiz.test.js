import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildQuestions } from '../js/learnquiz.js';

const fixturePath = fileURLToPath(
  new URL('../data/fixtures/phrases.sample.json', import.meta.url)
);
const sample = JSON.parse(readFileSync(fixturePath, 'utf8'));

// 較大的語料庫（8 條，皆同 type），用於 targetIds 優先權與輪流出題測試
function makePhrase(id, text, meaning) {
  return {
    id,
    text,
    type: '成語',
    level: '常用',
    source: '教育部成語典',
    author: null,
    origin_work: null,
    meaning,
    insight: '',
    textbook: false,
  };
}
const corpus = [
  ...sample,
  makePhrase('p0005', '一帆風順', '比喻非常順利，毫無阻礙。'),
  makePhrase('p0006', '守株待兔', '比喻拘泥守成，不知變通。'),
  makePhrase('p0007', '井底之蛙', '比喻見識淺薄的人。'),
  makePhrase('p0008', '愚公移山', '比喻努力不懈，終能達成目標。'),
];

// 固定 rng：恆回 0.42
const fixedRng = () => 0.42;

// 線性序列 rng：循環吐出固定序列
function seqRng(seq) {
  let i = 0;
  return () => seq[i++ % seq.length];
}

test('固定 rng 下輸出確定（同輸入同 rng → 完全相同）', () => {
  const a = buildQuestions(corpus, ['p0001', 'p0002', 'p0003'], 5, fixedRng);
  const b = buildQuestions(corpus, ['p0001', 'p0002', 'p0003'], 5, fixedRng);
  assert.deepEqual(a, b);
  const c = buildQuestions(corpus, ['p0001', 'p0002', 'p0003'], 5, seqRng([0.1, 0.6, 0.3]));
  const d = buildQuestions(corpus, ['p0001', 'p0002', 'p0003'], 5, seqRng([0.1, 0.6, 0.3]));
  assert.deepEqual(c, d);
});

test('choice 題：options 恰 4 個、含 answer、無重複；prompt=該成語 meaning', () => {
  const qs = buildQuestions(corpus, ['p0001', 'p0002', 'p0003', 'p0004'], 8, seqRng([0.9, 0.2, 0.7, 0.05, 0.5]));
  const byId = new Map(corpus.map((p) => [p.id, p]));
  const choices = qs.filter((q) => q.type === 'choice');
  assert.ok(choices.length > 0, '至少有一題 choice');
  for (const q of choices) {
    assert.equal(q.options.length, 4);
    assert.ok(q.options.includes(q.answer));
    assert.equal(new Set(q.options).size, 4, 'options 不得重複');
    const phrase = byId.get(q.phraseId);
    assert.equal(q.prompt, phrase.meaning);
    assert.equal(q.answer, phrase.text);
    // 干擾選項全部來自語料且非正解
    const texts = new Set(corpus.map((p) => p.text));
    for (const opt of q.options) assert.ok(texts.has(opt));
  }
});

test('fill 題：answer 確為 prompt 挖空位置的原字；全形括號＋全形空格', () => {
  const qs = buildQuestions(corpus, ['p0001', 'p0002', 'p0003', 'p0004'], 8, fixedRng);
  const byId = new Map(corpus.map((p) => [p.id, p]));
  const fills = qs.filter((q) => q.type === 'fill');
  assert.ok(fills.length > 0, '至少有一題 fill');
  for (const q of fills) {
    const phrase = byId.get(q.phraseId);
    assert.ok(q.prompt.includes('［　］'), 'prompt 必含全形［　］');
    const idx = q.prompt.indexOf('［　］');
    // 把 ［　］ 換回 answer 應還原成語原文
    assert.equal(q.prompt.replace('［　］', q.answer), phrase.text);
    // answer 是挖空位置的原字（idx 前的字元數 = 原文中該字的位置）
    assert.equal(Array.from(phrase.text)[Array.from(q.prompt.slice(0, idx)).length], q.answer);
    assert.equal(q.answer.length, 1, '一次只挖一字');
  }
});

test('fill 挖空位置由 rng 決定（rng=0 挖可挖池的第一個；rng→1 挖最後一個）', () => {
  // 只給一條語料 → 無法出 choice，全部退化為 fill
  // 註：可挖池只含「在本句中唯一」的字，避免挖掉的答案仍印在題幹上（見下一則測試）。
  const one = [makePhrase('p0101', '守株待兔', '比喻拘泥守成，不知變通。')];
  const first = buildQuestions(one, ['p0101'], 1, () => 0);
  assert.equal(first[0].type, 'fill');
  assert.equal(first[0].prompt, '［　］株待兔');
  assert.equal(first[0].answer, '守');
  const last = buildQuestions(one, ['p0101'], 1, () => 0.999999);
  assert.equal(last[0].prompt, '守株待［　］');
  assert.equal(last[0].answer, '兔');
});

test('fill 不得挖掉在句中重複出現的字（否則答案就印在題幹上）', () => {
  // 一心一意：挖「一」的話題幹還留著另一個「一」，等於直接送分
  const one = [corpus[0]];
  for (let i = 0; i < 20; i++) {
    const q = buildQuestions(one, ['p0001'], 1, () => i / 20)[0];
    assert.equal(q.type, 'fill');
    assert.ok(!q.prompt.includes(q.answer), `挖 ${q.answer} 後題幹仍含該字：${q.prompt}`);
  }
});

test('targetIds 優先於全庫：count ≤ targets 時全部出自 targetIds', () => {
  const targetIds = ['p0002', 'p0005', 'p0007'];
  const qs = buildQuestions(corpus, targetIds, 3, fixedRng);
  assert.equal(qs.length, 3);
  for (const q of qs) assert.ok(targetIds.includes(q.phraseId));
});

test('targetIds 不足 count 才從其餘語料補（targets 全數在前）', () => {
  const targetIds = ['p0003', 'p0006'];
  const qs = buildQuestions(corpus, targetIds, 5, seqRng([0.3, 0.8, 0.1, 0.55]));
  assert.equal(qs.length, 5);
  // 前 2 題必為 targets，其後為補充
  assert.ok(targetIds.includes(qs[0].phraseId));
  assert.ok(targetIds.includes(qs[1].phraseId));
  for (const q of qs.slice(2)) assert.ok(!targetIds.includes(q.phraseId));
  // 不重複出同一條
  assert.equal(new Set(qs.map((q) => q.phraseId)).size, 5);
});

test('count 邊界：0 回空陣列；超過可出題數回能出的最大數量', () => {
  assert.deepEqual(buildQuestions(corpus, ['p0001'], 0, fixedRng), []);
  const qs = buildQuestions(corpus, ['p0001'], 100, fixedRng);
  assert.equal(qs.length, corpus.length); // 8 條語料最多 8 題
  assert.deepEqual(buildQuestions([], [], 5, fixedRng), []);
});

test('輪流出 choice/fill 兩型（語料充足時奇偶交錯）', () => {
  const qs = buildQuestions(corpus, ['p0001', 'p0002', 'p0003', 'p0004'], 6, fixedRng);
  for (let i = 0; i < qs.length; i++) {
    assert.equal(qs[i].type, i % 2 === 0 ? 'choice' : 'fill');
  }
});

test('語料不足 4 條無法出 choice 時退化為只出 fill', () => {
  const three = corpus.slice(0, 3); // 只有 3 條 → 湊不出 4 個選項
  const qs = buildQuestions(three, ['p0001', 'p0002', 'p0003'], 3, fixedRng);
  assert.equal(qs.length, 3);
  for (const q of qs) {
    assert.equal(q.type, 'fill');
    assert.equal(q.options, undefined);
  }
});

test('全程只用傳入的 rng：呼叫期間 Math.random 被觸發就 throw（未被呼叫）', () => {
  const original = Math.random;
  Math.random = () => {
    throw new Error('不得直接呼叫 Math.random');
  };
  try {
    const qs = buildQuestions(corpus, ['p0001', 'p0002'], 6, fixedRng);
    assert.equal(qs.length, 6);
  } finally {
    Math.random = original;
  }
});
