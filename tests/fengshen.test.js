import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FENGSHEN_ARRAYS,
  getArrayByChapter,
  getArrayByLevelId,
  getRandomQuote,
  getExaminer,
  renderGuardianSvg,
  CHARACTERS,
  getCharacterById,
  getCharacterAvatar,
} from '../js/fengshen.js';

test('CHARACTERS 註冊表包含至少 8 位 Q 版封神角色', () => {
  assert.ok(CHARACTERS.length >= 8, '應包含至少 8 位角色');
  const ids = CHARACTERS.map((c) => c.id);
  const expected = [
    'jiang-taigong',
    'nezha',
    'yang-jian',
    'su-daji',
    'shen-gongbao',
    'lei-zhenzi',
    'taiyi-zhenren',
    'tuxing-sun',
  ];
  for (const exp of expected) {
    assert.ok(ids.includes(exp) || (exp === 'taiyi-zhenren' && ids.includes('taiyi')), `應包含角色 ${exp}`);
  }
});

test('每位角色皆具備 4 種漫畫表情路徑與專屬台詞', () => {
  const moods = ['idle', 'thinking', 'victory', 'panic'];
  for (const char of CHARACTERS) {
    assert.ok(char.name, `${char.id} 應有 name`);
    assert.ok(char.title, `${char.id} 應有 title`);
    assert.ok(char.expressions, `${char.id} 應有 expressions`);
    assert.ok(char.quotes, `${char.id} 應有 quotes`);
    for (const m of moods) {
      assert.ok(char.expressions[m], `${char.id} 應有 ${m} 表情路徑`);
      assert.ok(char.quotes[m], `${char.id} 應有 ${m} 專屬台詞`);
    }
  }
});

test('九位角色的四種狀態共用 companions-v4 滿版 PNG 橫幅', () => {
  const moods = ['idle', 'thinking', 'victory', 'panic'];
  const ids = [
    'jiang-taigong',
    'nezha',
    'yang-jian',
    'su-daji',
    'shen-gongbao',
    'lei-zhenzi',
    'taiyi-zhenren',
    'tuxing-sun',
    'moling',
  ];

  for (const id of ids) {
    const char = getCharacterById(id);
    const expectedPath = `assets/art/companions-v4/${id}.png`;
    for (const mood of moods) {
      assert.equal(char.expressions[mood], expectedPath, `${id} 的 ${mood} 應共用新版 PNG`);
    }
  }
});

test('五大陣法配置正確的守護角色（含第4陣與第5陣雙人駐守）', () => {
  assert.equal(FENGSHEN_ARRAYS.length, 5, '五大密室陣法');
  
  // 第 1 陣：姜太公
  const arr1 = getArrayByChapter(1);
  assert.equal(arr1.guardians[0].id, 'jiang-taigong');

  // 第 2 陣：哪吒
  const arr2 = getArrayByChapter(2);
  assert.equal(arr2.guardians[0].id, 'nezha');

  // 第 3 陣：楊戩
  const arr3 = getArrayByChapter(3);
  assert.equal(arr3.guardians[0].id, 'yang-jian');

  // 第 4 陣：蘇妲己 與 申公豹
  const arr4 = getArrayByChapter(4);
  assert.equal(arr4.guardians.length, 2);
  const g4Ids = arr4.guardians.map((g) => g.id);
  assert.ok(g4Ids.includes('su-daji'));
  assert.ok(g4Ids.includes('shen-gongbao'));

  // 第 5 陣：雷震子 與 太乙真人
  const arr5 = getArrayByChapter(5);
  assert.equal(arr5.guardians.length, 2);
  const g5Ids = arr5.guardians.map((g) => g.id);
  assert.ok(g5Ids.includes('lei-zhenzi'));
  assert.ok(g5Ids.includes('taiyi'));
});

test('getArrayByLevelId 能正確對應 50 關之章節陣法', () => {
  assert.equal(getArrayByLevelId(1).chapter, 1);
  assert.equal(getArrayByLevelId(10).chapter, 1);
  assert.equal(getArrayByLevelId(11).chapter, 2);
  assert.equal(getArrayByLevelId(25).chapter, 3);
  assert.equal(getArrayByLevelId(35).chapter, 4);
  assert.equal(getArrayByLevelId(50).chapter, 5);
});

test('getExaminer 能取得太乙真人與姜太公輪流出題考官', () => {
  const ex1 = getExaminer(1);
  assert.equal(ex1.id, 'taiyi');
  assert.equal(ex1.avatar, 'assets/art/companions-v4/taiyi-zhenren.png');
  assert.equal(ex1.happyAvatar, 'assets/art/companions-v4/taiyi-zhenren.png');
  assert.equal(ex1.panicAvatar, 'assets/art/companions-v4/taiyi-zhenren.png');
  assert.ok(ex1.speech);
  assert.ok(ex1.correctQuote);

  const ex2 = getExaminer(2);
  assert.equal(ex2.id, 'jiang-taigong');
  assert.equal(ex2.avatar, 'assets/art/companions-v4/jiang-taigong.png');
  assert.equal(ex2.happyAvatar, 'assets/art/companions-v4/jiang-taigong.png');
  assert.equal(ex2.panicAvatar, 'assets/art/companions-v4/jiang-taigong.png');
  assert.ok(ex2.speech);
  assert.ok(ex2.correctQuote);
});

test('renderGuardianSvg 產生包含正確 class、data 屬性與路徑之立繪標籤', () => {
  const htmlIdle = renderGuardianSvg('nezha', 'idle');
  assert.ok(htmlIdle.includes('assets/art/companions-v4/nezha.png'));
  assert.ok(htmlIdle.includes('fengshen-avatar-img'));
  assert.ok(htmlIdle.includes('data-mood="idle"'));

  const htmlPanic = renderGuardianSvg('taiyi', 'panic');
  assert.ok(htmlPanic.includes('assets/art/companions-v4/taiyi-zhenren.png'));
  assert.ok(htmlPanic.includes('data-mood="panic"'));

  const htmlMoling = renderGuardianSvg('moling', 'victory');
  assert.ok(htmlMoling.includes('assets/art/companions-v4/moling.png'));
  assert.ok(htmlMoling.includes('data-mood="victory"'));
});

test('getCharacterAvatar 能取得對應表情之資產路徑', () => {
  assert.equal(getCharacterAvatar('jiang-taigong', 'idle'), 'assets/art/companions-v4/jiang-taigong.png');
  assert.equal(getCharacterAvatar('moling', 'panic'), 'assets/art/companions-v4/moling.png');
});
