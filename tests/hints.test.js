import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COSTS, EARN, createHintEngine } from '../js/hints.js';

test('常數表與 SCHEMA.md 一致', () => {
  assert.deepEqual(COSTS, { circle: 1, flash: 3, reveal: 5 });
  assert.deepEqual(EARN, { choice: 1, fill: 2 });
});

test('初始餘額 = 存檔值；預設 0', () => {
  assert.equal(createHintEngine().getInk(), 0);
  assert.equal(createHintEngine(7).getInk(), 7);
  assert.equal(createHintEngine(7).serialize(), 7);
});

test('墨水只能由 earn 增加（API 面：走遍全部操作，餘額只在 earn 後上升）', () => {
  const e = createHintEngine(0);
  // 除了 earn 之外的所有公開操作都不會讓餘額上升
  e.getInk();
  e.canSpend('circle');
  e.canSpend('flash');
  e.canSpend('reveal');
  e.spend('circle');
  e.spend('flash');
  e.spend('reveal');
  e.serialize();
  assert.equal(e.getInk(), 0);
  const after = e.earn('choice');
  assert.equal(after, 1);
  assert.equal(e.getInk(), 1);
});

test('earn 回傳新餘額且累加正確', () => {
  const e = createHintEngine(0);
  assert.equal(e.earn('choice'), 1); // +1
  assert.equal(e.earn('fill'), 3); // +2
  assert.equal(e.earn('fill'), 5); // +2
  assert.equal(e.getInk(), 5);
});

test('earn 非法 kind 會 throw 且不改餘額', () => {
  const e = createHintEngine(3);
  assert.throws(() => e.earn('reveal'));
  assert.throws(() => e.earn(''));
  assert.throws(() => e.earn(undefined));
  assert.throws(() => e.earn('toString')); // 原型鏈污染防護
  assert.equal(e.getInk(), 3);
});

test('spend 不足回 false 且不扣款；餘額永不為負', () => {
  const e = createHintEngine(2);
  assert.equal(e.canSpend('flash'), false);
  assert.equal(e.spend('flash'), false);
  assert.equal(e.getInk(), 2); // 沒被扣
  assert.equal(e.spend('reveal'), false);
  assert.equal(e.getInk(), 2);
  // 花到 0 之後任何 spend 都失敗，不會變負
  assert.equal(e.spend('circle'), true);
  assert.equal(e.spend('circle'), true);
  assert.equal(e.getInk(), 0);
  assert.equal(e.spend('circle'), false);
  assert.ok(e.getInk() >= 0);
});

test('spend 成功精確扣 COSTS 對應值', () => {
  const e = createHintEngine(10);
  assert.equal(e.spend('circle'), true);
  assert.equal(e.getInk(), 9); // -1
  assert.equal(e.spend('flash'), true);
  assert.equal(e.getInk(), 6); // -3
  assert.equal(e.spend('reveal'), true);
  assert.equal(e.getInk(), 1); // -5
});

test('canSpend 與餘額一致；非法 tier 回 false', () => {
  const e = createHintEngine(3);
  assert.equal(e.canSpend('circle'), true);
  assert.equal(e.canSpend('flash'), true);
  assert.equal(e.canSpend('reveal'), false);
  assert.equal(e.canSpend('nope'), false);
  assert.equal(e.spend('nope'), false);
  assert.equal(e.getInk(), 3);
});

test('serialize 回傳目前餘額（存檔用）', () => {
  const e = createHintEngine(4);
  e.earn('fill'); // 6
  e.spend('flash'); // 3
  assert.equal(e.serialize(), 3);
  // 用 serialize 值重建 → 餘額相同（存檔往返）
  assert.equal(createHintEngine(e.serialize()).getInk(), 3);
});
