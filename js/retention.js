// js/retention.js — 核心循環與留存資料模型（零 DOM、零儲存副作用）

export const RETENTION_SCHEMA = 1;
export const INK_SOFT_CAP = 30;
export const REST_AFTER_MINUTES = 25;
export const REST_AFTER_LEVELS = 3;

export const PLAY_MODES = Object.freeze({
  explore: Object.freeze({ id: 'explore', label: '悟道', timeMultiplier: 1.2, hintAdjustment: 1, maxStars: 2 }),
  standard: Object.freeze({ id: 'standard', label: '標準', timeMultiplier: 1, hintAdjustment: 0, maxStars: 3 }),
  challenge: Object.freeze({ id: 'challenge', label: '天劫', timeMultiplier: 0.8, hintAdjustment: -1, maxStars: 3 }),
});

export const CULTIVATION_RANKS = Object.freeze([
  Object.freeze({ need: 0, title: '白丁' }),
  Object.freeze({ need: 6, title: '童生' }),
  Object.freeze({ need: 20, title: '秀才' }),
  Object.freeze({ need: 45, title: '舉人' }),
  Object.freeze({ need: 75, title: '貢士' }),
  Object.freeze({ need: 110, title: '進士' }),
  Object.freeze({ need: 140, title: '狀元' }),
]);

const QUEST_DEFS = Object.freeze([
  Object.freeze({ id: 'clear-level', label: '破解 1 座字陣', event: 'level-complete', target: 1 }),
  Object.freeze({ id: 'quiz-correct', label: '研墨答對 5 題', event: 'quiz-correct', target: 5 }),
  Object.freeze({ id: 'find-phrases', label: '尋得 3 句真言', event: 'phrase-found', target: 3 }),
]);

function finiteInt(value, fallback = 0, min = 0) {
  return Number.isFinite(value) ? Math.max(min, Math.floor(value)) : fallback;
}

function textOrNull(value) {
  return typeof value === 'string' && value ? value : null;
}

function uniqueStrings(value) {
  return Array.isArray(value)
    ? [...new Set(value.filter((item) => typeof item === 'string' && item))]
    : [];
}

export function localDateKey(now = new Date()) {
  const date = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(date.getTime())) return localDateKey(new Date());
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function defaultRetention() {
  return {
    schema: RETENTION_SCHEMA,
    treasures: {},
    mastery: {},
    wrongBook: [],
    levelStats: {},
    daily: null,
    streak: { current: 0, best: 0, lastCompletedDate: null },
    activeRun: null,
    lastWrapUp: null,
    activity: {
      lastPlayedAt: null,
      sessionStartedAt: null,
      lastRestAt: null,
      levelsSinceRest: 0,
      activeMinutes: 0,
    },
  };
}

function normalizeDaily(value) {
  if (!value || typeof value !== 'object' || typeof value.dateKey !== 'string') return null;
  const quests = Array.isArray(value.quests) ? value.quests.map((quest) => ({
    id: String(quest?.id || ''),
    label: String(quest?.label || ''),
    event: String(quest?.event || ''),
    target: Math.max(1, finiteInt(quest?.target, 1, 1)),
    progress: finiteInt(quest?.progress),
    completed: !!quest?.completed,
  })).filter((quest) => quest.id && quest.event) : [];
  const quick = value.quickChallenge && typeof value.quickChallenge === 'object'
    ? {
      id: String(value.quickChallenge.id || `quick-${value.dateKey}`),
      phraseIds: uniqueStrings(value.quickChallenge.phraseIds),
      best: value.quickChallenge.best && typeof value.quickChallenge.best === 'object'
        ? {
          score: finiteInt(value.quickChallenge.best.score),
          durationMs: finiteInt(value.quickChallenge.best.durationMs),
          completedAt: textOrNull(value.quickChallenge.best.completedAt),
        }
        : null,
    }
    : null;
  return {
    dateKey: value.dateKey,
    quests,
    quickChallenge: quick,
    quizRewardedPhraseIds: uniqueStrings(value.quizRewardedPhraseIds),
    completedAt: textOrNull(value.completedAt),
  };
}

export function normalizeRetention(value) {
  const out = defaultRetention();
  if (!value || typeof value !== 'object') return out;

  if (value.treasures && typeof value.treasures === 'object' && !Array.isArray(value.treasures)) {
    for (const [id, item] of Object.entries(value.treasures)) {
      if (!id || !item || typeof item !== 'object') continue;
      out.treasures[id] = {
        name: typeof item.name === 'string' ? item.name : id,
        sources: uniqueStrings(item.sources),
        maxFragments: Math.max(1, finiteInt(item.maxFragments, 10, 1)),
        firstObtainedAt: textOrNull(item.firstObtainedAt),
      };
    }
  }

  if (value.mastery && typeof value.mastery === 'object' && !Array.isArray(value.mastery)) {
    for (const [phraseId, item] of Object.entries(value.mastery)) {
      if (!phraseId || !item || typeof item !== 'object') continue;
      out.mastery[phraseId] = {
        answered: finiteInt(item.answered),
        correct: finiteInt(item.correct),
        wrong: finiteInt(item.wrong),
        correctStreak: finiteInt(item.correctStreak),
        mastered: !!item.mastered,
        lastAnsweredAt: textOrNull(item.lastAnsweredAt),
        nextReviewAt: textOrNull(item.nextReviewAt),
      };
    }
  }
  out.wrongBook = uniqueStrings(value.wrongBook);

  if (value.levelStats && typeof value.levelStats === 'object' && !Array.isArray(value.levelStats)) {
    for (const [levelId, item] of Object.entries(value.levelStats)) {
      if (!/^\d+$/.test(levelId) || !item || typeof item !== 'object') continue;
      out.levelStats[levelId] = {
        attempts: finiteInt(item.attempts),
        completions: finiteInt(item.completions),
        bestStars: Math.min(3, finiteInt(item.bestStars)),
        badges: uniqueStrings(item.badges),
        bestDurationMs: item.bestDurationMs == null ? null : finiteInt(item.bestDurationMs),
        fewestMistakes: item.fewestMistakes == null ? null : finiteInt(item.fewestMistakes),
        modesCleared: uniqueStrings(item.modesCleared).filter((mode) => PLAY_MODES[mode]),
        lastCompletedAt: textOrNull(item.lastCompletedAt),
      };
    }
  }

  out.daily = normalizeDaily(value.daily);
  const streak = value.streak && typeof value.streak === 'object' ? value.streak : {};
  out.streak = {
    current: finiteInt(streak.current),
    best: finiteInt(streak.best),
    lastCompletedDate: textOrNull(streak.lastCompletedDate),
  };

  if (value.activeRun && typeof value.activeRun === 'object' && /^\d+$/.test(String(value.activeRun.levelId))) {
    out.activeRun = {
      levelId: Number(value.activeRun.levelId),
      mode: PLAY_MODES[value.activeRun.mode] ? value.activeRun.mode : 'standard',
      found: uniqueStrings(value.activeRun.found),
      mistakes: finiteInt(value.activeRun.mistakes),
      hintsUsed: finiteInt(value.activeRun.hintsUsed),
      usedReveal: !!value.activeRun.usedReveal,
      remainingMs: value.activeRun.remainingMs == null ? null : finiteInt(value.activeRun.remainingMs),
      startedAt: textOrNull(value.activeRun.startedAt),
      updatedAt: textOrNull(value.activeRun.updatedAt),
      replay: !!value.activeRun.replay,
    };
  }

  if (value.lastWrapUp && typeof value.lastWrapUp === 'object') {
    out.lastWrapUp = {
      endedAt: textOrNull(value.lastWrapUp.endedAt),
      levelsCompleted: finiteInt(value.lastWrapUp.levelsCompleted),
      phrasesFound: finiteInt(value.lastWrapUp.phrasesFound),
      quizCorrect: finiteInt(value.lastWrapUp.quizCorrect),
      inkEarned: finiteInt(value.lastWrapUp.inkEarned),
      nextLevelId: value.lastWrapUp.nextLevelId == null ? null : finiteInt(value.lastWrapUp.nextLevelId, 1, 1),
    };
  }

  const activity = value.activity && typeof value.activity === 'object' ? value.activity : {};
  out.activity = {
    lastPlayedAt: textOrNull(activity.lastPlayedAt),
    sessionStartedAt: textOrNull(activity.sessionStartedAt),
    lastRestAt: textOrNull(activity.lastRestAt),
    levelsSinceRest: finiteInt(activity.levelsSinceRest),
    activeMinutes: finiteInt(activity.activeMinutes),
  };
  return out;
}

export function ensureRetention(save) {
  if (!save || typeof save !== 'object') throw new TypeError('save must be an object');
  const value = save.retention;
  const complete = value && value.schema === RETENTION_SCHEMA
    && value.treasures && value.mastery && Array.isArray(value.wrongBook)
    && value.levelStats && value.streak && value.activity;
  if (!complete) {
    save.retention = normalizeRetention(save.retention);
  }
  return save.retention;
}

export function getModeRules(mode = 'standard') {
  return PLAY_MODES[mode] || PLAY_MODES.standard;
}

export function applyModeToLevel(level, mode = 'standard') {
  const rules = getModeRules(mode);
  const rawTime = Number.isFinite(level?.timeLimit) && level.timeLimit > 0 ? level.timeLimit : null;
  const rawCap = Number.isFinite(level?.hintCap) && level.hintCap >= 0 ? level.hintCap : null;
  return {
    mode: rules.id,
    label: rules.label,
    timeLimit: rawTime == null ? null : Math.max(1, Math.round(rawTime * rules.timeMultiplier)),
    hintCap: rawCap == null ? null : Math.max(0, rawCap + rules.hintAdjustment),
    maxStars: rules.maxStars,
  };
}

export function calculateBadges({ mistakes = 0, remainingMs = 0, timeLimitMs = 0, quizCorrect = 0, quizAnswered = 0 } = {}) {
  const badges = [];
  if (finiteInt(mistakes) === 0) badges.push('insight');
  if (timeLimitMs > 0 && remainingMs / timeLimitMs >= 0.35) badges.push('swift');
  if (quizAnswered >= 3 && quizCorrect === quizAnswered) badges.push('scholar');
  return badges;
}

export function saveUnfinishedRun(save, run, now = new Date()) {
  const retention = ensureRetention(save);
  if (!run || !Number.isFinite(Number(run.levelId))) return null;
  retention.activeRun = {
    levelId: Number(run.levelId),
    mode: PLAY_MODES[run.mode] ? run.mode : 'standard',
    found: uniqueStrings(run.found),
    mistakes: finiteInt(run.mistakes),
    hintsUsed: finiteInt(run.hintsUsed),
    usedReveal: !!run.usedReveal,
    remainingMs: run.remainingMs == null ? null : finiteInt(run.remainingMs),
    startedAt: textOrNull(run.startedAt) || new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString(),
    replay: !!run.replay,
  };
  retention.activity.lastPlayedAt = new Date(now).toISOString();
  return { ...retention.activeRun, found: retention.activeRun.found.slice() };
}

export function getUnfinishedRun(save, levelId = null) {
  const run = ensureRetention(save).activeRun;
  if (!run || (levelId != null && Number(levelId) !== run.levelId)) return null;
  return { ...run, found: run.found.slice() };
}

export function clearUnfinishedRun(save, levelId = null) {
  const retention = ensureRetention(save);
  if (!retention.activeRun) return false;
  if (levelId != null && Number(levelId) !== retention.activeRun.levelId) return false;
  retention.activeRun = null;
  return true;
}

export function grantTreasureFragment(save, {
  treasureId,
  name = treasureId,
  sourceId,
  maxFragments = 10,
  now = new Date(),
} = {}) {
  if (!treasureId || !sourceId) return { granted: false, total: 0, complete: false };
  const retention = ensureRetention(save);
  const item = retention.treasures[treasureId] || {
    name,
    sources: [],
    maxFragments: Math.max(1, finiteInt(maxFragments, 10, 1)),
    firstObtainedAt: new Date(now).toISOString(),
  };
  item.name = name || item.name;
  item.maxFragments = Math.max(1, finiteInt(maxFragments, item.maxFragments, 1));
  const granted = !item.sources.includes(sourceId) && item.sources.length < item.maxFragments;
  if (granted) item.sources.push(sourceId);
  retention.treasures[treasureId] = item;
  return { granted, total: item.sources.length, complete: item.sources.length >= item.maxFragments };
}

export function recordLevelAttempt(save, levelId) {
  const retention = ensureRetention(save);
  const key = String(levelId);
  const stats = retention.levelStats[key] || {
    attempts: 0, completions: 0, bestStars: 0, badges: [], bestDurationMs: null,
    fewestMistakes: null, modesCleared: [], lastCompletedAt: null,
  };
  stats.attempts += 1;
  retention.levelStats[key] = stats;
  return { ...stats, badges: stats.badges.slice(), modesCleared: stats.modesCleared.slice() };
}

export function recordLevelCompletion(save, {
  levelId,
  stars,
  mode = 'standard',
  mistakes = 0,
  durationMs = null,
  remainingMs = 0,
  timeLimitMs = 0,
  quizCorrect = 0,
  quizAnswered = 0,
  treasure = null,
  now = new Date(),
} = {}) {
  if (!Number.isFinite(Number(levelId))) throw new TypeError('levelId is required');
  const retention = ensureRetention(save);
  const key = String(levelId);
  const level = save.levels[key] || { stars: 0, found: [] };
  const cappedStars = Math.min(getModeRules(mode).maxStars, Math.min(3, finiteInt(stars)));
  level.stars = Math.max(finiteInt(level.stars), cappedStars);
  level.found = uniqueStrings(level.found);
  const newBadges = calculateBadges({ mistakes, remainingMs, timeLimitMs, quizCorrect, quizAnswered });
  level.badges = uniqueStrings([...(level.badges || []), ...newBadges]);
  level.best = level.best && typeof level.best === 'object' ? level.best : {};
  if (durationMs != null && (level.best.durationMs == null || durationMs < level.best.durationMs)) {
    level.best.durationMs = finiteInt(durationMs);
  }
  if (level.best.mistakes == null || mistakes < level.best.mistakes) level.best.mistakes = finiteInt(mistakes);
  level.best.modes = uniqueStrings([...(level.best.modes || []), mode]);
  save.levels[key] = level;

  const stats = retention.levelStats[key] || {
    attempts: 1, completions: 0, bestStars: 0, badges: [], bestDurationMs: null,
    fewestMistakes: null, modesCleared: [], lastCompletedAt: null,
  };
  stats.completions += 1;
  stats.bestStars = Math.max(stats.bestStars, level.stars);
  stats.badges = uniqueStrings([...stats.badges, ...newBadges]);
  if (durationMs != null && (stats.bestDurationMs == null || durationMs < stats.bestDurationMs)) stats.bestDurationMs = finiteInt(durationMs);
  if (stats.fewestMistakes == null || mistakes < stats.fewestMistakes) stats.fewestMistakes = finiteInt(mistakes);
  stats.modesCleared = uniqueStrings([...stats.modesCleared, mode]);
  stats.lastCompletedAt = new Date(now).toISOString();
  retention.levelStats[key] = stats;
  retention.activity.levelsSinceRest += 1;
  retention.activity.lastPlayedAt = new Date(now).toISOString();
  clearUnfinishedRun(save, levelId);

  const treasureResult = treasure ? grantTreasureFragment(save, {
    ...treasure,
    sourceId: treasure.sourceId || `level:${levelId}`,
    now,
  }) : null;
  recordDailyProgress(save, 'level-complete', 1, now);
  return {
    bestStars: level.stars,
    earnedStars: cappedStars,
    badges: level.badges.slice(),
    newBadges,
    treasure: treasureResult,
  };
}

function addDays(dateKey, delta) {
  const [y, m, d] = String(dateKey).split('-').map(Number);
  const date = new Date(y, m - 1, d + delta, 12, 0, 0);
  return localDateKey(date);
}

function hashSeed(text) {
  let hash = 2166136261;
  for (const ch of String(text)) {
    hash ^= ch.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededShuffle(items, seedText) {
  let state = hashSeed(seedText) || 1;
  const rng = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function createDailyQuickChallenge(phrases, { dateKey = localDateKey(), count = 5 } = {}) {
  const ids = uniqueStrings(Array.isArray(phrases) ? phrases.map((phrase) => phrase?.id) : []);
  return {
    id: `quick-${dateKey}`,
    phraseIds: seededShuffle(ids, `xzzj:${dateKey}`).slice(0, Math.max(1, finiteInt(count, 5, 1))),
    best: null,
  };
}

export function ensureDailyPlan(save, { now = new Date(), phrases = [], quickCount = 5 } = {}) {
  const retention = ensureRetention(save);
  const dateKey = localDateKey(now);
  if (retention.daily?.dateKey === dateKey) return retention.daily;
  retention.daily = {
    dateKey,
    quests: QUEST_DEFS.map((quest) => ({ ...quest, progress: 0, completed: false })),
    quickChallenge: createDailyQuickChallenge(phrases, { dateKey, count: quickCount }),
    quizRewardedPhraseIds: [],
    completedAt: null,
  };
  return retention.daily;
}

export function recordDailyProgress(save, event, amount = 1, now = new Date()) {
  const daily = ensureDailyPlan(save, { now });
  for (const quest of daily.quests) {
    if (quest.event !== event || quest.completed) continue;
    quest.progress = Math.min(quest.target, quest.progress + finiteInt(amount, 1));
    quest.completed = quest.progress >= quest.target;
  }
  if (!daily.completedAt && daily.quests.length && daily.quests.every((quest) => quest.completed)) {
    daily.completedAt = new Date(now).toISOString();
    const streak = ensureRetention(save).streak;
    const yesterday = addDays(daily.dateKey, -1);
    streak.current = streak.lastCompletedDate === yesterday ? streak.current + 1 : 1;
    streak.best = Math.max(streak.best, streak.current);
    streak.lastCompletedDate = daily.dateKey;
  }
  return daily.quests.map((quest) => ({ ...quest }));
}

export function recordQuickChallengeResult(save, { score = 0, durationMs = 0, now = new Date() } = {}) {
  const daily = ensureDailyPlan(save, { now });
  const previous = daily.quickChallenge.best;
  const candidate = { score: finiteInt(score), durationMs: finiteInt(durationMs), completedAt: new Date(now).toISOString() };
  const better = !previous || candidate.score > previous.score
    || (candidate.score === previous.score && candidate.durationMs < previous.durationMs);
  if (better) daily.quickChallenge.best = candidate;
  return { improved: better, best: { ...(daily.quickChallenge.best || candidate) } };
}

export function recordQuizAnswer(save, phraseId, { correct, now = new Date() } = {}) {
  if (!phraseId) return { rewardEligible: false, mastered: false, inWrongBook: false };
  const retention = ensureRetention(save);
  const daily = ensureDailyPlan(save, { now });
  const item = retention.mastery[phraseId] || {
    answered: 0, correct: 0, wrong: 0, correctStreak: 0, mastered: false,
    lastAnsweredAt: null, nextReviewAt: null,
  };
  item.answered += 1;
  item.lastAnsweredAt = new Date(now).toISOString();
  if (correct) {
    item.correct += 1;
    item.correctStreak += 1;
    item.mastered = item.correctStreak >= 3;
    const reviewDays = item.mastered ? 7 : Math.min(3, item.correctStreak);
    item.nextReviewAt = new Date(new Date(now).getTime() + reviewDays * 86400000).toISOString();
    if (item.correctStreak >= 2) retention.wrongBook = retention.wrongBook.filter((id) => id !== phraseId);
    recordDailyProgress(save, 'quiz-correct', 1, now);
  } else {
    item.wrong += 1;
    item.correctStreak = 0;
    item.mastered = false;
    item.nextReviewAt = new Date(new Date(now).getTime() + 10 * 60000).toISOString();
    if (!retention.wrongBook.includes(phraseId)) retention.wrongBook.push(phraseId);
  }
  retention.mastery[phraseId] = item;
  const rewardEligible = !!correct && !daily.quizRewardedPhraseIds.includes(phraseId);
  if (rewardEligible) daily.quizRewardedPhraseIds.push(phraseId);
  return {
    rewardEligible,
    mastered: item.mastered,
    inWrongBook: retention.wrongBook.includes(phraseId),
    mastery: { ...item },
  };
}

export function calculateQuizInkReward({ currentInk = 0, kind = 'choice', rewardEligible = false, cap = INK_SOFT_CAP } = {}) {
  if (!rewardEligible) return 0;
  const base = kind === 'fill' ? 2 : 1;
  return Math.max(0, Math.min(base, finiteInt(cap, INK_SOFT_CAP) - finiteInt(currentInk)));
}

export function computeCultivationProgress(save) {
  const levels = save?.levels && typeof save.levels === 'object' ? Object.values(save.levels) : [];
  const totalStars = levels.reduce((sum, level) => sum + Math.min(3, finiteInt(level?.stars)), 0);
  const collected = uniqueStrings(save?.collection).length;
  const badges = levels.reduce((sum, level) => sum + uniqueStrings(level?.badges).length, 0);
  const treasureSets = Object.values(ensureRetention(save).treasures).filter((item) => item.sources.length >= item.maxFragments).length;
  const score = totalStars + Math.floor(collected / 10) + badges + treasureSets * 3;
  let current = CULTIVATION_RANKS[0];
  let next = null;
  for (const rank of CULTIVATION_RANKS) {
    if (score >= rank.need) current = rank;
    else { next = rank; break; }
  }
  return {
    score, totalStars, collected, badges, treasureSets, current,
    next,
    remaining: next ? next.need - score : 0,
  };
}

export function startPlaySession(save, now = new Date()) {
  const retention = ensureRetention(save);
  const iso = new Date(now).toISOString();
  retention.activity.sessionStartedAt = iso;
  retention.activity.lastPlayedAt = iso;
  return { ...retention.activity };
}

export function shouldSuggestRest(save, now = new Date()) {
  const activity = ensureRetention(save).activity;
  const started = activity.sessionStartedAt ? new Date(activity.sessionStartedAt).getTime() : NaN;
  const minutes = Number.isFinite(started) ? Math.max(0, Math.floor((new Date(now).getTime() - started) / 60000)) : 0;
  return {
    shouldRest: activity.levelsSinceRest >= REST_AFTER_LEVELS || minutes >= REST_AFTER_MINUTES,
    levelsSinceRest: activity.levelsSinceRest,
    sessionMinutes: minutes,
  };
}

export function recordRest(save, now = new Date()) {
  const retention = ensureRetention(save);
  retention.activity.lastRestAt = new Date(now).toISOString();
  retention.activity.sessionStartedAt = new Date(now).toISOString();
  retention.activity.levelsSinceRest = 0;
  return { ...retention.activity };
}

export function recordSessionWrapUp(save, summary = {}, now = new Date()) {
  const retention = ensureRetention(save);
  retention.lastWrapUp = {
    endedAt: new Date(now).toISOString(),
    levelsCompleted: finiteInt(summary.levelsCompleted),
    phrasesFound: finiteInt(summary.phrasesFound),
    quizCorrect: finiteInt(summary.quizCorrect),
    inkEarned: finiteInt(summary.inkEarned),
    nextLevelId: summary.nextLevelId == null ? null : Math.max(1, finiteInt(summary.nextLevelId, 1, 1)),
  };
  const started = retention.activity.sessionStartedAt ? new Date(retention.activity.sessionStartedAt).getTime() : NaN;
  if (Number.isFinite(started)) {
    retention.activity.activeMinutes += Math.max(0, Math.floor((new Date(now).getTime() - started) / 60000));
  }
  retention.activity.lastPlayedAt = new Date(now).toISOString();
  retention.activity.sessionStartedAt = null;
  return { ...retention.lastWrapUp };
}
