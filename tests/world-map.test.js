import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ROUTE_TYPES,
  availableLevelIds,
  buildWorldMapModel,
  completedLevelIds,
  deriveWorldState,
  evaluateEndings,
  evaluateRequirements,
  getBossForLevel,
  getEventForLevel,
  isLevelUnlocked,
  nextReachableLevels,
  selectDailyEncounter,
  worldInventory,
} from '../js/world-map.js';

// 封神山河圖世界地圖系統的設計範圍固定在原始 5 章 50 關（含第 51 關真結局隱藏關）；
// 第 51-100 關（文林淬鍊卷）是獨立呈現的內容，不進山河圖，故此處只取前 50 關驗證世界地圖不變式。
const levels = JSON.parse(readFileSync(new URL('../data/levels.json', import.meta.url), 'utf8')).levels
  .filter((level) => level.chapter <= 5);
const story = JSON.parse(readFileSync(new URL('../data/story-lore-v2.json', import.meta.url), 'utf8'));
const eventsData = JSON.parse(readFileSync(new URL('../data/events.json', import.meta.url), 'utf8'));

function saveWith(completed = [], extras = {}) {
  const levelState = {};
  for (const id of completed) levelState[String(id)] = { stars: 1, found: [] };
  return { v: 1, levels: levelState, ink: 0, collection: [], quizStats: { answered: 0, correct: 0 }, ...extras };
}

test('每章恰有 6 主線、2 典故支線、2 寶物支線與 1 個章末 Boss', () => {
  for (let chapter = 1; chapter <= 5; chapter += 1) {
    const chapterLevels = levels.filter((level) => level.chapter === chapter);
    assert.equal(chapterLevels.length, 10);
    assert.equal(chapterLevels.filter((level) => level.routeType === ROUTE_TYPES.MAIN).length, 6);
    assert.equal(chapterLevels.filter((level) => level.routeType === ROUTE_TYPES.LORE).length, 2);
    assert.equal(chapterLevels.filter((level) => level.routeType === ROUTE_TYPES.TREASURE).length, 2);
    assert.deepEqual(chapterLevels.filter((level) => level.boss).map((level) => level.id), [chapter * 10]);
  }
});

test('所有路線參照與前置關卡都存在，下一節點不會倒退', () => {
  const ids = new Set(levels.map((level) => level.id));
  for (const level of levels) {
    assert.ok(level.mapPosition && Number.isFinite(level.mapPosition.x) && Number.isFinite(level.mapPosition.y));
    for (const nextId of level.nextIds) {
      assert.ok(ids.has(nextId), `第 ${level.id} 關 nextId ${nextId} 應存在`);
      assert.ok(nextId > level.id, `第 ${level.id} 關不應連回舊節點`);
    }
    for (const requiredId of level.requirements.completedAll) {
      assert.ok(ids.has(requiredId), `第 ${level.id} 關前置 ${requiredId} 應存在`);
      assert.ok(requiredId < level.id, `第 ${level.id} 關前置不得在未來`);
    }
  }
});

test('50 關在 2600x900 山河圖上保留足夠間距，不會疊在一起', () => {
  let closest = Number.POSITIVE_INFINITY;
  for (let i = 0; i < levels.length; i += 1) {
    for (let j = i + 1; j < levels.length; j += 1) {
      const a = levels[i].mapPosition;
      const b = levels[j].mapPosition;
      closest = Math.min(closest, Math.hypot((a.x - b.x) * 26, (a.y - b.y) * 9));
    }
  }
  assert.ok(closest >= 60, `最近節點只相距 ${closest.toFixed(1)}px`);
});

test('五個 Boss 均有三階段資料且能由關卡查回', () => {
  assert.equal(story.bosses.length, 5);
  for (const boss of story.bosses) {
    assert.equal(boss.phases.length, 3);
    assert.ok(boss.phases.every((phase) => phase.name && phase.rule));
    assert.equal(getBossForLevel(story, boss.levelId)?.id, boss.id);
  }
});

test('非戰鬥事件皆有兩個選項，事件節點能解析事件內容', () => {
  assert.equal(eventsData.events.length, 10);
  assert.ok(eventsData.events.every((event) => event.choices.length === 2));
  const eventLevels = levels.filter((level) => level.eventId);
  assert.equal(eventLevels.length, 10);
  for (const level of eventLevels) assert.equal(getEventForLevel(eventsData, level)?.id, level.eventId);
});

test('分支解鎖由 requirements 決定，不再依賴數字相鄰', () => {
  const empty = saveWith([]);
  assert.equal(isLevelUnlocked(levels[0], empty), true);
  assert.deepEqual(availableLevelIds(levels, empty), [1]);

  const afterOne = saveWith([1]);
  assert.equal(isLevelUnlocked(levels.find((level) => level.id === 2), afterOne), true);
  assert.equal(isLevelUnlocked(levels.find((level) => level.id === 3), afterOne), true);
  assert.deepEqual(nextReachableLevels(levels, 1, afterOne).map((level) => level.id), [2, 3]);
});

test('世界狀態可只用舊 levels 星等推導 sealed/open/restored/mastered', () => {
  const completedChapter = saveWith([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const world = deriveWorldState(levels, completedChapter, story);
  assert.equal(world.regions[0].state, 'mastered');
  assert.equal(world.regions[0].inkedPercent, 100);
  assert.equal(world.regions[1].state, 'open');
  assert.equal(world.repairedPercent, 20);
});

test('每日奇遇對同日同玩家固定，且只落在已開啟區域', () => {
  const world = deriveWorldState(levels, saveWith([1]), story);
  const first = selectDailyEncounter(eventsData, world, '2026-08-18', 'student-7');
  const second = selectDailyEncounter(eventsData, world, '2026-08-18', 'student-7');
  assert.deepEqual(first, second);
  assert.ok(eventsData.dailyEncounters.some((event) => event.id === first.id));
  assert.equal(world.regions.find((region) => region.chapter === first.chapter)?.state === 'sealed', false);
});

test('擴充世界物品相容陣列與數量物件兩種法寶格式', () => {
  assert.deepEqual(worldInventory({ treasures: ['dashen-bian'] }).treasureIds, ['dashen-bian']);
  assert.deepEqual(
    worldInventory({ world: { treasures: { 'dashen-bian': 2, 'qiankun-quan': 0 } } }).treasureIds,
    ['dashen-bian'],
  );
});

test('真結局須五場 Boss 至少二星、五段故事與五件法寶，完成 51 才切換結局', () => {
  const completed = [10, 20, 30, 40, 50];
  const save = saveWith(completed, {
    world: {
      eventsSeen: story.endings.true.requirements.eventsSeenAll,
      treasures: story.endings.true.requirements.treasuresAll,
    },
  });
  for (const id of completed) save.levels[String(id)].stars = 2;
  const before51 = evaluateEndings(save, story);
  assert.equal(before51.normalUnlocked, true);
  assert.equal(before51.trueRequirementsMet, true);
  assert.equal(before51.hiddenLevelUnlocked, true);
  assert.equal(before51.currentEnding, story.endings.normal.id);

  save.levels['51'] = { stars: 1, found: [] };
  assert.equal(evaluateEndings(save, story).currentEnding, story.endings.true.id);
});

test('世界地圖模型一次提供節點、鎖定預告、每日奇遇與結局狀態', () => {
  const model = buildWorldMapModel(levels, saveWith([1]), story, eventsData, {
    date: '2026-08-18',
    playerSeed: 'class-801-seat-07',
  });
  assert.equal(model.nodes.length, 50);
  assert.equal(model.nodes.find((node) => node.id === 1).status, 'done');
  assert.equal(model.nodes.find((node) => node.id === 2).status, 'available');
  assert.equal(model.nodes.find((node) => node.id === 4).status, 'locked');
  assert.ok(model.nodes.find((node) => node.id === 4).preview.rewardPreview);
  assert.ok(model.dailyEncounter);
  assert.equal(model.endings.normalUnlocked, false);
});

test('requirements 回報缺少條件，方便 UI 顯示鎖定原因', () => {
  const result = evaluateRequirements({ completedAll: [3], minTotalStars: 5 }, saveWith([1]));
  assert.equal(result.met, false);
  assert.deepEqual(result.failures.map((failure) => failure.type), ['completedAll', 'minTotalStars']);
  assert.deepEqual(completedLevelIds(saveWith([3, 1])), [1, 3]);
});
