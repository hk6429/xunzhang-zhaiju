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
