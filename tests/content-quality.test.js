import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const phrases = JSON.parse(readFileSync(new URL('../data/phrases.json', import.meta.url), 'utf8'));
const byId = new Map(phrases.map((phrase) => [phrase.id, phrase]));

test('已知宋詞元曲文字與釋義校訂保留', () => {
  const lotus = byId.get('p0337');
  assert.equal(lotus.author, '周邦彥');
  assert.match(lotus.meaning, /荷葉迎風挺立/);
  assert.doesNotMatch(lotus.meaning, /水珠/);
  assert.equal(byId.get('p0358').text, '普天下有情的都成了眷屬');
  assert.match(byId.get('p0358').meaning, /以「願」領起/);
});

test('三國演義卷首詞選句標示原作者楊慎', () => {
  for (const id of ['p0370', 'p0371', 'p0372', 'p0373', 'p0374']) {
    assert.equal(byId.get(id).author, '楊慎', `${id} 應標示〈臨江仙〉原作者楊慎`);
  }
});

test('選擇題題幹（meaning）不得直接寫出答案原文——否則題目自己講出解答', () => {
  const leaks = phrases.filter((p) => typeof p.meaning === 'string' && p.meaning.includes(p.text));
  assert.deepEqual(leaks.map((p) => p.id), [], `以下語料的 meaning 包含 text 原文，形同洩題：${leaks.map((p) => p.id).join('、')}`);
});

test('近義成語叢集（如 一心一意／專心致志／全神貫注）不得同時出現在同一題選項中', async () => {
  const { buildQuestions } = await import('../js/learnquiz.js');
  const clusters = [
    ['一心一意', '專心致志', '全神貫注'],
    ['群策群力', '齊心協力', '同心協力'],
  ];
  const targetIds = phrases
    .filter((p) => clusters.some((c) => c.includes(p.text)))
    .map((p) => p.id);
  let seed = 1;
  const rng = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let round = 0; round < 50; round++) {
    const qs = buildQuestions(phrases, targetIds, targetIds.length, rng);
    for (const q of qs) {
      if (q.type !== 'choice') continue;
      for (const cluster of clusters) {
        const hits = q.options.filter((opt) => cluster.includes(opt));
        assert.ok(hits.length <= 1, `同義叢集同時出現在選項：${JSON.stringify(q.options)}`);
      }
    }
  }
});
