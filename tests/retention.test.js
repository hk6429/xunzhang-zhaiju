import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAdaptiveQuestions } from '../js/learnquiz.js';
import { defaultSave, validateSave } from '../js/progress.js';
import {
  applyModeToLevel,
  calculateQuizInkReward,
  clearUnfinishedRun,
  computeCultivationProgress,
  createDailyQuickChallenge,
  ensureDailyPlan,
  getUnfinishedRun,
  grantTreasureFragment,
  questsForDate,
  recordDailyProgress,
  recordLevelAttempt,
  recordLevelCompletion,
  recordQuickChallengeResult,
  recordQuizAnswer,
  recordRest,
  recordSessionWrapUp,
  saveUnfinishedRun,
  shouldSuggestRest,
  startPlaySession,
} from '../js/retention.js';

const DAY_1 = new Date('2026-08-18T08:00:00+08:00');
const DAY_2 = new Date('2026-08-19T08:00:00+08:00');

function phrase(id, text = id) {
  return { id, text, type: '成語', meaning: `解釋 ${id}` };
}

const phrases = [
  phrase('p1', '一心一意'), phrase('p2', '二話不說'), phrase('p3', '三思而行'),
  phrase('p4', '四海一家'), phrase('p5', '五福臨門'), phrase('p6', '六神無主'),
];

test('舊版 v1 存檔可升級，新增欄位不破壞星數與收藏', () => {
  const old = {
    v: 1,
    levels: { '1': { stars: 2, found: ['p1'] } },
    ink: 4,
    collection: ['p1'],
    quizStats: { answered: 3, correct: 2 },
  };
  const save = validateSave(old);
  assert.equal(save.levels['1'].stars, 2);
  assert.deepEqual(save.collection, ['p1']);
  assert.equal(save.retention.schema, 1);
  assert.deepEqual(save.levels['1'].badges, []);
});

test('共享的稱號、圖鑑練習、每日計數與匿名班級資料可安全往返', () => {
  const input = defaultSave();
  input.preferences = { titleId: 'clear-eyed', playMode: 'challenge', unsafe: '<script>' };
  input.phrasePractice = { p0001: { kind: 'situation', text: '我先想清楚，再採取行動。' } };
  input.daily = { date: '2026-08-18', counters: { practices: 1 } };
  input.classroom = { v: 1, teamCode: 'ABCD-2345', masteredCount: 12, chapter: 2, updatedAt: 8 };
  const save = validateSave(input);
  assert.deepEqual(save.preferences, { titleId: 'clear-eyed', playMode: 'challenge' });
  assert.equal(save.phrasePractice.p0001.kind, 'situation');
  assert.equal(save.daily.counters.practices, 1);
  assert.equal(save.classroom.teamCode, 'ABCD-2345');
});

test('探索／標準／挑戰模式調整時間、提示與星等上限', () => {
  const level = { timeLimit: 300, hintCap: 2 };
  assert.deepEqual(applyModeToLevel(level, 'explore'), {
    mode: 'explore', label: '悟道', timeLimit: 360, hintCap: 3, maxStars: 3,
  });
  assert.deepEqual(applyModeToLevel(level, 'standard'), {
    mode: 'standard', label: '標準', timeLimit: 300, hintCap: 2, maxStars: 3,
  });
  assert.deepEqual(applyModeToLevel(level, 'challenge'), {
    mode: 'challenge', label: '天劫', timeLimit: 240, hintCap: 1, maxStars: 3,
  });
});

test('未完成局可儲存、取得副本並依關卡清除', () => {
  const save = defaultSave();
  saveUnfinishedRun(save, {
    levelId: 7, mode: 'challenge', found: ['p1', 'p1', 'p2'], mistakes: 2,
    hintsUsed: 1, usedReveal: false, remainingMs: 12345,
  }, DAY_1);
  const run = getUnfinishedRun(save, 7);
  assert.deepEqual(run.found, ['p1', 'p2']);
  run.found.push('tamper');
  assert.deepEqual(getUnfinishedRun(save, 7).found, ['p1', 'p2']);
  assert.equal(clearUnfinishedRun(save, 8), false);
  assert.equal(clearUnfinishedRun(save, 7), true);
  assert.equal(getUnfinishedRun(save), null);
});

test('通關只保留最佳星數、最佳時間、最低錯誤與多維星章', () => {
  const save = defaultSave();
  save.levels['1'] = { stars: 0, found: ['p1'] };
  recordLevelAttempt(save, 1);
  const first = recordLevelCompletion(save, {
    levelId: 1, stars: 3, mistakes: 0, durationMs: 90000,
    remainingMs: 50000, timeLimitMs: 100000, quizCorrect: 3, quizAnswered: 3, now: DAY_1,
  });
  assert.deepEqual(first.newBadges, ['insight', 'swift', 'scholar']);
  recordLevelAttempt(save, 1);
  recordLevelCompletion(save, {
    levelId: 1, stars: 1, mistakes: 4, durationMs: 120000, mode: 'explore', now: DAY_2,
  });
  assert.equal(save.levels['1'].stars, 3);
  assert.equal(save.levels['1'].best.durationMs, 90000);
  assert.equal(save.levels['1'].best.mistakes, 0);
  assert.deepEqual(save.levels['1'].badges, ['insight', 'swift', 'scholar']);
  assert.equal(save.retention.levelStats['1'].attempts, 2);
  assert.equal(save.retention.levelStats['1'].completions, 2);
});

test('法寶碎片依來源冪等落盤，達上限後完成', () => {
  const save = defaultSave();
  const one = grantTreasureFragment(save, {
    treasureId: 'whip', name: '打神鞭', sourceId: 'level:1', maxFragments: 2, now: DAY_1,
  });
  const duplicate = grantTreasureFragment(save, {
    treasureId: 'whip', name: '打神鞭', sourceId: 'level:1', maxFragments: 2, now: DAY_1,
  });
  const two = grantTreasureFragment(save, {
    treasureId: 'whip', name: '打神鞭', sourceId: 'level:2', maxFragments: 2, now: DAY_2,
  });
  assert.deepEqual(one, { granted: true, total: 1, complete: false });
  assert.deepEqual(duplicate, { granted: false, total: 1, complete: false });
  assert.deepEqual(two, { granted: true, total: 2, complete: true });
});

test('mastery、錯題簿與每日同題防刷共同運作，精熟需含填空題', () => {
  const save = defaultSave();
  const wrong = recordQuizAnswer(save, 'p1', { correct: false, now: DAY_1 });
  assert.equal(wrong.inWrongBook, true);
  const firstCorrect = recordQuizAnswer(save, 'p1', { correct: true, now: DAY_1 });
  const repeated = recordQuizAnswer(save, 'p1', { correct: true, now: DAY_1 });
  assert.equal(firstCorrect.rewardEligible, true);
  assert.equal(repeated.rewardEligible, false);
  assert.equal(repeated.inWrongBook, false);
  const third = recordQuizAnswer(save, 'p1', { correct: true, now: DAY_2 });
  assert.equal(third.rewardEligible, true);
  assert.equal(third.mastered, false); // 三連對但全是選擇題，還不算精熟
  const fill = recordQuizAnswer(save, 'p1', { correct: true, kind: 'fill', now: DAY_2 });
  assert.equal(fill.mastered, true);
});

test('舊存檔已精熟的語句不因新填空門檻被降級', () => {
  const input = defaultSave();
  input.retention.mastery = {
    p1: { answered: 3, correct: 3, wrong: 0, correctStreak: 3, mastered: true },
  };
  const save = validateSave(input);
  assert.equal(save.retention.mastery.p1.fillCorrect, 1);
  const next = recordQuizAnswer(save, 'p1', { correct: true, now: DAY_1 });
  assert.equal(next.mastered, true);
});

test('墨水柔性上限會截斷獎勵，重複題不給獎', () => {
  assert.equal(calculateQuizInkReward({ currentInk: 28, kind: 'fill', rewardEligible: true }), 2);
  assert.equal(calculateQuizInkReward({ currentInk: 29, kind: 'fill', rewardEligible: true }), 1);
  assert.equal(calculateQuizInkReward({ currentInk: 30, kind: 'choice', rewardEligible: true }), 0);
  assert.equal(calculateQuizInkReward({ currentInk: 0, kind: 'fill', rewardEligible: false }), 0);
});

test('每日任務按日期建立、累積完成並維持連續紀錄', () => {
  const save = defaultSave();
  const completePlan = (day) => {
    const plan = ensureDailyPlan(save, { now: day, phrases });
    for (const quest of plan.quests) recordDailyProgress(save, quest.event, quest.target, day);
  };
  completePlan(DAY_1);
  assert.ok(save.retention.daily.completedAt);
  assert.equal(save.retention.streak.current, 1);
  completePlan(DAY_2);
  assert.equal(save.retention.streak.current, 2);
  assert.equal(save.retention.streak.best, 2);
});

test('每日任務同日固定、跨日輪替且三事件各佔一格', () => {
  assert.deepEqual(questsForDate('2026-08-18'), questsForDate('2026-08-18'));
  const combos = new Set();
  for (let day = 1; day <= 14; day++) {
    const quests = questsForDate(`2026-08-${String(day).padStart(2, '0')}`);
    assert.deepEqual(
      quests.map((quest) => quest.event),
      ['level-complete', 'quiz-correct', 'phrase-found'],
    );
    combos.add(quests.map((quest) => quest.id).join('|'));
  }
  assert.ok(combos.size >= 2, '兩週內任務組合應該至少輪出兩種');
});

test('每日快陣同日同語料結果固定，最佳成績只向上更新', () => {
  const a = createDailyQuickChallenge(phrases, { dateKey: '2026-08-18', count: 5 });
  const b = createDailyQuickChallenge(phrases, { dateKey: '2026-08-18', count: 5 });
  assert.deepEqual(a, b);
  assert.equal(a.phraseIds.length, 5);
  const save = defaultSave();
  ensureDailyPlan(save, { now: DAY_1, phrases });
  assert.equal(recordQuickChallengeResult(save, { score: 4, durationMs: 90000, now: DAY_1 }).improved, true);
  assert.equal(recordQuickChallengeResult(save, { score: 3, durationMs: 50000, now: DAY_1 }).improved, false);
  assert.equal(recordQuickChallengeResult(save, { score: 4, durationMs: 80000, now: DAY_1 }).improved, true);
});

test('修為同時計入星數、收藏、星章與完整法寶', () => {
  const save = defaultSave();
  save.levels['1'] = { stars: 3, found: [], badges: ['insight', 'swift'] };
  save.collection = Array.from({ length: 10 }, (_, i) => `p${i}`);
  grantTreasureFragment(save, { treasureId: 'whip', sourceId: 'l1', maxFragments: 1 });
  const progress = computeCultivationProgress(save);
  assert.equal(progress.score, 9); // 3 星 + 1 收藏點 + 2 星章 + 3 完整法寶
  assert.equal(progress.current.title, '童生');
  assert.equal(progress.next.title, '秀才');
});

test('休息建議、歇腳重置與收尾資料可供畫面直接讀取', () => {
  const save = defaultSave();
  startPlaySession(save, new Date('2026-08-18T00:00:00Z'));
  save.retention.activity.levelsSinceRest = 3;
  assert.equal(shouldSuggestRest(save, new Date('2026-08-18T00:10:00Z')).shouldRest, true);
  recordRest(save, new Date('2026-08-18T00:11:00Z'));
  assert.equal(save.retention.activity.levelsSinceRest, 0);
  const summary = recordSessionWrapUp(save, {
    levelsCompleted: 3, phrasesFound: 12, quizCorrect: 5, inkEarned: 6, nextLevelId: 4,
  }, new Date('2026-08-18T00:30:00Z'));
  assert.equal(summary.nextLevelId, 4);
  assert.equal(save.retention.activity.sessionStartedAt, null);
});

test('自適應出題優先目前關卡錯題，且仍保持題型交錯', () => {
  const profile = {
    wrongBook: ['p2', 'p6'],
    mastery: { p1: { mastered: true, nextReviewAt: '2099-01-01T00:00:00Z' } },
  };
  const questions = buildAdaptiveQuestions(phrases, ['p1', 'p2', 'p3'], 4, profile, () => 0.42, DAY_1);
  assert.equal(questions[0].phraseId, 'p2');
  assert.equal(questions[0].type, 'choice');
  assert.equal(questions[1].type, 'fill');
  assert.equal(new Set(questions.map((question) => question.phraseId)).size, 4);
});
