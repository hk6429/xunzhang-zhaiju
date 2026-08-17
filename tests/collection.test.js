import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCollection } from '../js/collection.js';

test('初始為存檔值；預設空', () => {
  assert.deepEqual(createCollection().list(), []);
  assert.deepEqual(createCollection(['p0001', 'p0002']).list(), ['p0001', 'p0002']);
});

test('add 冪等：重複加同一 id 不改變內容與順序', () => {
  const c = createCollection();
  c.add('p0001');
  c.add('p0001');
  c.add('p0002');
  c.add('p0001');
  assert.deepEqual(c.list(), ['p0001', 'p0002']);
  // 存檔本身含重複也去重
  assert.deepEqual(createCollection(['p0001', 'p0001', 'p0002']).list(), ['p0001', 'p0002']);
});

test('has 正確反映收藏狀態', () => {
  const c = createCollection(['p0003']);
  assert.equal(c.has('p0003'), true);
  assert.equal(c.has('p0001'), false);
  c.add('p0001');
  assert.equal(c.has('p0001'), true);
});

test('list 依加入順序（含存檔在前、新加在後）', () => {
  const c = createCollection(['p0005', 'p0002']);
  c.add('p0009');
  c.add('p0001');
  assert.deepEqual(c.list(), ['p0005', 'p0002', 'p0009', 'p0001']);
});

test('serialize 隔離性：回傳副本，外部改動不影響內部狀態', () => {
  const c = createCollection(['p0001']);
  const snap = c.serialize();
  snap.push('駭入');
  snap[0] = '竄改';
  assert.deepEqual(c.serialize(), ['p0001']);
  assert.deepEqual(c.list(), ['p0001']);
  // list 也是副本
  const l = c.list();
  l.length = 0;
  assert.deepEqual(c.list(), ['p0001']);
  // 建構時傳入的陣列事後被改也不影響內部
  const saved = ['p0007'];
  const c2 = createCollection(saved);
  saved.push('p0008');
  assert.deepEqual(c2.list(), ['p0007']);
});

test('serialize 往返：serialize 值重建後內容一致', () => {
  const c = createCollection();
  c.add('p0002');
  c.add('p0004');
  const c2 = createCollection(c.serialize());
  assert.deepEqual(c2.list(), ['p0002', 'p0004']);
});
