import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTeamCode,
  validateTeamCode,
  makeContribution,
  encodeContribution,
  decodeContribution,
  mergeContributions,
  teamMilestone,
  makePublicAchievement,
} from '../js/classroom.js';

test('匿名隊伍代碼避開易混淆字元且格式固定', () => {
  const code = createTeamCode(() => 0);
  assert.equal(code, 'AAAA-AAAA');
  assert.equal(validateTeamCode(code), code);
  assert.equal(validateTeamCode('含有姓名'), null);
});

test('班級貢獻碼只含隊伍代碼與彙總進度', () => {
  const input = makeContribution({ teamCode: 'ABCD-2345', masteredCount: 38, chapter: 2, updatedAt: 9 });
  const decoded = decodeContribution(encodeContribution(input));
  assert.deepEqual(decoded, input);
  assert.deepEqual(Object.keys(decoded).sort(), ['chapter', 'masteredCount', 'teamCode', 'updatedAt', 'v']);
});

test('合併只接受同隊且不倒退成果', () => {
  const base = makeContribution({ teamCode: 'ABCD-2345', masteredCount: 40, chapter: 3, updatedAt: 10 });
  const older = makeContribution({ teamCode: 'ABCD-2345', masteredCount: 20, chapter: 2, updatedAt: 5 });
  assert.deepEqual(mergeContributions(base, older), base);
  const other = makeContribution({ teamCode: 'WXYZ-6789', masteredCount: 100, chapter: 5 });
  assert.deepEqual(mergeContributions(base, other), base);
});

test('里程碑與公開成果卡不含完整存檔或個人資料', () => {
  assert.deepEqual(teamMilestone(51), { count: 51, next: 100, remaining: 49, completed: false });
  assert.deepEqual(teamMilestone(409), { count: 409, next: 409, remaining: 0, completed: true });
  const card = makePublicAchievement({ title: '典故偵探', totalStars: 21, masteredCount: 44, chapter: 2 });
  assert.deepEqual(Object.keys(card).sort(), ['chapter', 'masteredCount', 'title', 'totalStars', 'v']);
});

test('班級成果上限與 100 關、409 筆語料一致', () => {
  const capped = makeContribution({ teamCode: 'ABCD-2345', masteredCount: 999, chapter: 99 });
  assert.equal(capped.masteredCount, 409);
  assert.equal(capped.chapter, 10);
  const card = makePublicAchievement({ title: '文道旅人', totalStars: 999, masteredCount: 999, chapter: 99 });
  assert.equal(card.totalStars, 300);
  assert.equal(card.masteredCount, 409);
  assert.equal(card.chapter, 10);
});
