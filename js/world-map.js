// 封神山河卷：世界地圖、路線、事件與結局的純資料／純函式層。
// 本模組不碰 DOM、fetch 或 localStorage；呼叫端自行載入 JSON 並傳入。

export const ROUTE_TYPES = Object.freeze({
  MAIN: 'main',
  LORE: 'lore',
  TREASURE: 'treasure',
});

function unique(values) {
  return [...new Set(values)];
}

function levelRecord(save, id) {
  return save?.levels?.[String(id)] || null;
}

export function completedLevelIds(save = {}) {
  return Object.entries(save.levels || {})
    .filter(([, record]) => Number(record?.stars) > 0)
    .map(([id]) => Number(id))
    .filter(Number.isInteger)
    .sort((a, b) => a - b);
}

export function totalStars(save = {}) {
  return Object.values(save.levels || {})
    .reduce((sum, record) => sum + Math.max(0, Number(record?.stars) || 0), 0);
}

export function worldInventory(save = {}) {
  const world = save.world || {};
  const rawEvents = world.eventsSeen ?? save.eventsSeen ?? [];
  const rawTreasures = world.treasures ?? save.treasures ?? [];
  const rawLore = world.loreUnlocked ?? save.loreUnlocked ?? [];

  const treasureIds = Array.isArray(rawTreasures)
    ? rawTreasures
    : Object.entries(rawTreasures)
      .filter(([, count]) => Number(count) > 0)
      .map(([id]) => id);

  return {
    eventsSeen: unique(Array.isArray(rawEvents) ? rawEvents : []),
    treasureIds: unique(treasureIds),
    loreUnlocked: unique(Array.isArray(rawLore) ? rawLore : []),
  };
}

function hasEvery(haystack, needles = []) {
  const set = new Set(haystack);
  return needles.every((value) => set.has(value));
}

function hasAny(haystack, needles = []) {
  if (!needles.length) return true;
  const set = new Set(haystack);
  return needles.some((value) => set.has(value));
}

/**
 * 評估共用 requirements schema。未知欄位不會被默默判為通過。
 * 支援 completedAll/completedAny/minTotalStars/eventsSeenAll/treasuresAll/bossMinStars。
 */
export function evaluateRequirements(requirements = {}, save = {}) {
  const completed = completedLevelIds(save);
  const inventory = worldInventory(save);
  const failures = [];

  if (!hasEvery(completed, requirements.completedAll || [])) {
    failures.push({ type: 'completedAll', expected: requirements.completedAll });
  }
  if (!hasAny(completed, requirements.completedAny || [])) {
    failures.push({ type: 'completedAny', expected: requirements.completedAny });
  }
  if (Number.isFinite(requirements.minTotalStars) && totalStars(save) < requirements.minTotalStars) {
    failures.push({ type: 'minTotalStars', expected: requirements.minTotalStars });
  }
  if (!hasEvery(inventory.eventsSeen, requirements.eventsSeenAll || [])) {
    failures.push({ type: 'eventsSeenAll', expected: requirements.eventsSeenAll });
  }
  if (!hasEvery(inventory.treasureIds, requirements.treasuresAll || [])) {
    failures.push({ type: 'treasuresAll', expected: requirements.treasuresAll });
  }
  if (Number.isFinite(requirements.bossMinStars)) {
    const weakBosses = (requirements.bossLevels || [])
      .filter((id) => Number(levelRecord(save, id)?.stars || 0) < requirements.bossMinStars);
    if (weakBosses.length) {
      failures.push({ type: 'bossMinStars', expected: requirements.bossMinStars, levelIds: weakBosses });
    }
  }

  const knownKeys = new Set([
    'completedAll', 'completedAny', 'minTotalStars', 'eventsSeenAll',
    'treasuresAll', 'bossMinStars', 'bossLevels',
  ]);
  const unknownKeys = Object.keys(requirements).filter((key) => !knownKeys.has(key));
  if (unknownKeys.length) failures.push({ type: 'unsupported', keys: unknownKeys });

  return { met: failures.length === 0, failures };
}

export function isLevelUnlocked(level, save = {}) {
  if (!level) return false;
  if (level.id === 1) return true;
  return evaluateRequirements(level.requirements || {}, save).met;
}

export function lockPreview(level, save = {}) {
  const result = evaluateRequirements(level?.requirements || {}, save);
  return {
    locked: !isLevelUnlocked(level, save),
    title: level?.lockPreview?.title || `第 ${level?.id ?? '?'} 關`,
    hint: level?.lockPreview?.hint || '完成前置節點後解鎖',
    rewardPreview: level?.lockPreview?.rewardPreview || null,
    failures: result.failures,
  };
}

export function availableLevelIds(levels = [], save = {}) {
  return levels.filter((level) => isLevelUnlocked(level, save)).map((level) => level.id);
}

export function nextReachableLevels(levels = [], currentId, save = {}) {
  const byId = new Map(levels.map((level) => [level.id, level]));
  const current = byId.get(currentId);
  return (current?.nextIds || [])
    .map((id) => byId.get(id))
    .filter(Boolean)
    .filter((level) => isLevelUnlocked(level, save));
}

export function getBossForLevel(story, levelId) {
  return story?.bosses?.find((boss) => boss.levelId === levelId) || null;
}

export function getEventForLevel(eventsData, level) {
  if (!level?.eventId) return null;
  return eventsData?.events?.find((event) => event.id === level.eventId) || null;
}

export function getTreasureAbility(story, treasureId) {
  return story?.treasures?.find((treasure) => treasure.id === treasureId) || null;
}

/** 由舊 v1 存檔即可推導世界外觀；擴充的 world 欄位只影響事件與法寶。 */
export function deriveWorldState(levels = [], save = {}, story = {}) {
  const inventory = worldInventory(save);
  const available = new Set(availableLevelIds(levels, save));
  const regions = (story.chapters || []).map((chapter) => {
    const chapterLevels = levels.filter((level) => level.chapter === chapter.id);
    const completed = chapterLevels.filter((level) => Number(levelRecord(save, level.id)?.stars) > 0);
    const bossStars = Number(levelRecord(save, chapter.id * 10)?.stars || 0);
    const completedByRoute = {
      main: completed.filter((level) => level.routeType === ROUTE_TYPES.MAIN).length,
      lore: completed.filter((level) => level.routeType === ROUTE_TYPES.LORE).length,
      treasure: completed.filter((level) => level.routeType === ROUTE_TYPES.TREASURE).length,
    };
    const allComplete = chapterLevels.length > 0 && completed.length === chapterLevels.length;
    const state = allComplete
      ? 'mastered'
      : bossStars > 0
        ? 'restored'
        : chapterLevels.some((level) => available.has(level.id))
          ? 'open'
          : 'sealed';
    return {
      chapter: chapter.id,
      mapRegion: chapter.mapRegion,
      position: chapter.position,
      state,
      completedCount: completed.length,
      totalCount: chapterLevels.length,
      inkedPercent: chapterLevels.length ? Math.round((completed.length / chapterLevels.length) * 100) : 0,
      completedByRoute,
      bossStars,
      treasureOwned: inventory.treasureIds.includes(chapter.treasureId),
    };
  });

  const completedCount = completedLevelIds(save).filter((id) => id <= 50).length;
  return {
    regions,
    completedCount,
    totalCount: levels.length,
    repairedPercent: levels.length ? Math.round((completedCount / levels.length) * 100) : 0,
    totalStars: totalStars(save),
    availableLevelIds: [...available],
    inventory,
  };
}

function dateKey(dateLike) {
  if (typeof dateLike === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateLike)) return dateLike;
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike ?? Date.now());
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function stableHash(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** 同一日期與玩家種子必定得到同一奇遇；不依賴 Math.random。 */
export function selectDailyEncounter(eventsData, worldState, dateLike = new Date(), playerSeed = 'guest') {
  const encounters = eventsData?.dailyEncounters || [];
  if (!encounters.length) return null;
  const key = dateKey(dateLike);
  const encounter = encounters[stableHash(`${key}|${playerSeed}|event`) % encounters.length];
  const candidateRegions = (worldState?.regions || []).filter((region) => region.state !== 'sealed');
  const region = candidateRegions.length
    ? candidateRegions[stableHash(`${key}|${playerSeed}|region`) % candidateRegions.length]
    : null;
  return { ...encounter, dateKey: key, chapter: region?.chapter ?? 1, mapRegion: region?.mapRegion ?? null };
}

/** 真結局條件達成後開第 51 關；完成第 51 關才將 currentEnding 切為真結局。 */
export function evaluateEndings(save = {}, story = {}) {
  const normalRule = story?.endings?.normal?.requirements || { completedAll: [50] };
  const trueRule = story?.endings?.true?.requirements || {};
  const normal = evaluateRequirements(normalRule, save);
  const trueRequirements = evaluateRequirements(trueRule, save);
  const hiddenLevelCompleted = Number(levelRecord(save, story?.hiddenLevel?.id || 51)?.stars || 0) > 0;
  return {
    normalUnlocked: normal.met,
    trueRequirementsMet: trueRequirements.met,
    hiddenLevelUnlocked: trueRequirements.met,
    hiddenLevelCompleted,
    currentEnding: hiddenLevelCompleted
      ? story?.endings?.true?.id || 'ending-words-return'
      : normal.met
        ? story?.endings?.normal?.id || 'ending-investiture'
        : null,
    missingForNormal: normal.failures,
    missingForTrue: trueRequirements.failures,
  };
}

export function buildWorldMapModel(levels = [], save = {}, story = {}, eventsData = {}, options = {}) {
  const state = deriveWorldState(levels, save, story);
  const nodes = levels.map((level) => {
    const stars = Number(levelRecord(save, level.id)?.stars || 0);
    const unlocked = isLevelUnlocked(level, save);
    return {
      id: level.id,
      chapter: level.chapter,
      routeType: level.routeType || ROUTE_TYPES.MAIN,
      mapPosition: level.mapPosition || null,
      nextIds: level.nextIds || [],
      boss: Boolean(level.boss),
      eventId: level.eventId || null,
      status: stars > 0 ? 'done' : unlocked ? 'available' : 'locked',
      stars,
      preview: lockPreview(level, save),
    };
  });
  return {
    ...state,
    nodes,
    dailyEncounter: selectDailyEncounter(
      eventsData,
      state,
      options.date,
      options.playerSeed || 'guest',
    ),
    endings: evaluateEndings(save, story),
  };
}
