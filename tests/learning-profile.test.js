import test from 'node:test';
import assert from 'node:assert/strict';
import {
  availableTitles,
  normalizePhrasePractice,
  savePhrasePractice,
  dailyMissions,
  missionStatus,
  sessionSummary,
} from '../js/learning-profile.js';

test('多元稱號依學習行為解鎖且一定保留文道旅人', () => {
  const titles = availableTitles({ masteredCount: 25, proverbCount: 13, crossWins: 5, accuracy: 0.95, answered: 20 });
  assert.deepEqual(titles.map((x) => x.id), ['traveler', 'idiom-detective', 'proverb-ranger', 'grid-artisan', 'clear-eyed']);
});

test('圖鑑微任務只保留三種型態與 80 字本機內容', () => {
  const saved = savePhrasePractice({}, 'p0001', 'situation', '下雨天記得帶傘');
  assert.deepEqual(saved.p0001, { kind: 'situation', text: '下雨天記得帶傘', mastered: true });
  assert.deepEqual(normalizePhrasePractice({ bad: { kind: 'x', text: '資料' } }), {});
});

test('每日任務同日固定且恰好三項', () => {
  const a = dailyMissions('2026-08-18');
  const b = dailyMissions('2026-08-18');
  assert.deepEqual(a, b);
  assert.equal(a.length, 3);
  assert.equal(new Set(a.map((x) => x.id)).size, 3);
  assert.equal(missionStatus(a, { levels: 10, correct: 10, phrases: 10, practices: 10, independent: 10 }).every((x) => x.done), true);
});

test('收尾摘要正規化下一關與本次收穫', () => {
  assert.deepEqual(sessionSummary({ found: 3, mastered: 2, nextLevel: 99, favorite: '一心一意' }), {
    found: 3, mastered: 2, nextLevel: 51, favorite: '一心一意',
  });
});
