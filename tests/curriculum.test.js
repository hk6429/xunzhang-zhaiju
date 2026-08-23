import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLUE_STYLES, CURRICULUM, LIT_TYPES, inPool } from '../tools/curriculum.mjs';

test('新增文類與換句話說線索均屬正式課程規格', () => {
  assert.ok(CLUE_STYLES.includes('換句話說'));
  for (const type of ['歌行', '詞曲', '古文名句']) assert.ok(LIT_TYPES.includes(type));
});

test('第七章納入歌行；第十章納入三國脈絡的卷首詞與古文名句', () => {
  assert.equal(inPool({ type: '歌行' }, '樂府新樂府'), true);
  assert.equal(inPool({ type: '詞曲' }, '三國文獻'), true);
  assert.equal(inPool({ type: '古文名句' }, '三國文獻'), true);
});

test('第一章依目前的新手保護設計採三次提示上限', () => {
  for (const level of CURRICULUM.filter((level) => level.chapter === 1)) {
    assert.equal(level.hintCap, 3, `第 ${level.id} 關應保留三次提示上限`);
  }
});
