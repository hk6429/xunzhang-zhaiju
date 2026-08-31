#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { targetPath, snappedPath } from '../js/grid.js';
import { createHintEngine } from '../js/hints.js';
import {
  applyModeToLevel,
  calculateStars,
  createDailyQuickChallenge,
  questsForDate,
} from '../js/retention.js';
import { mergeProgressSummaries, normalizeProgressSummary } from '../js/sync-merge.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputPath = path.join(root, 'data/fixtures/native-parity/core-rules.json');
const phrases = JSON.parse(readFileSync(path.join(root, 'data/phrases.json'), 'utf8')).slice(0, 12);

const pathInputs = [
  { start: [0, 1], dir: 'S', length: 4, size: 5 },
  { start: [2, 0], dir: 'E', length: 5, size: 7 },
  { start: [4, 4], dir: 'E', length: 2, size: 5 },
];
const snapInputs = [
  { from: [1, 1], to: [2, 4], size: 6 },
  { from: [1, 1], to: [5, 2], size: 6 },
  { from: [3, 3], to: [3, 0], size: 6 },
];
const starInputs = [
  { usedReveal: false, usedHint: false, maxStars: 3 },
  { usedReveal: false, usedHint: true, maxStars: 3 },
  { usedReveal: true, usedHint: true, maxStars: 3 },
];
const modeLevel = { timeLimit: 300, hintCap: 2 };
const hintOperations = [
  { action: 'earn', value: 'fill' },
  { action: 'spend', value: 'flash' },
  { action: 'spend', value: 'reveal' },
  { action: 'earn', value: 'choice' },
];
const hintEngine = createHintEngine(4);
const hintResults = hintOperations.map((operation) => {
  const accepted = operation.action === 'earn'
    ? (hintEngine.earn(operation.value), true)
    : hintEngine.spend(operation.value);
  return { ...operation, accepted, ink: hintEngine.getInk() };
});

const left = {
  levels: { 1: { stars: 2, found: ['p0001'], badges: ['swift'], modes: ['standard'], bestDurationMs: 90000, fewestMistakes: 2 } },
  collection: ['p0001'], treasures: ['dashen-bian'], eventsSeen: ['event-a'], chapters: [1],
  quizStats: { answered: 3, correct: 2 }, ink: 99,
};
const right = {
  levels: { 1: { stars: 3, found: ['p0002'], badges: ['insight'], modes: ['challenge'], bestDurationMs: 80000, fewestMistakes: 1 }, 2: { stars: 1, found: ['p0003'] } },
  collection: ['p0002'], treasures: ['qiankun-quan'], eventsSeen: ['event-b'], chapters: [1, 2],
  quizStats: { answered: 2, correct: 2 }, ink: 1,
};
const inkEvents = [
  { id: 'ink-1', kind: 'earned', amount: 3 },
  { id: 'ink-2', kind: 'spent', amount: 5 },
  { id: 'ink-1', kind: 'earned', amount: 3 },
];
const normalizationInput = { ...left, levels: { ...left.levels, bad: { stars: 9 } } };

const fixture = {
  schemaVersion: 1,
  targetPaths: pathInputs.map((input) => ({ ...input, expected: targetPath(input, input.length, input.size) })),
  snappedPaths: snapInputs.map((input) => ({ ...input, expected: snappedPath(input.from, input.to, input.size) })),
  modes: ['explore', 'standard', 'challenge'].map((mode) => ({ mode, expected: applyModeToLevel(modeLevel, mode) })),
  stars: starInputs.map((input) => ({ ...input, expected: calculateStars(input) })),
  hintRun: { initialInk: 4, operations: hintResults },
  daily: {
    dateKey: '2026-09-01',
    phraseIDs: phrases.map((phrase) => phrase.id),
    questIDs: questsForDate('2026-09-01').map((quest) => quest.id),
    quickPhraseIDs: createDailyQuickChallenge(phrases, { dateKey: '2026-09-01', count: 5 }).phraseIds,
  },
  normalization: { input: normalizationInput, expected: normalizeProgressSummary(normalizationInput) },
  merge: { left, right, inkEvents, expected: mergeProgressSummaries(left, right, inkEvents) },
};

const serialized = `${JSON.stringify(fixture, null, 2)}\n`;
if (process.argv.includes('--check')) {
  const current = readFileSync(outputPath, 'utf8');
  if (current !== serialized) {
    console.error('原生 parity fixture 已過期，請重新產生');
    process.exit(1);
  }
  console.log('原生 parity fixture 已同步 ✔');
} else {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, serialized);
  console.log(path.relative(root, outputPath));
}
