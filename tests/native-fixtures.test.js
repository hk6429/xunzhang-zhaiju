import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const fixture = JSON.parse(readFileSync(new URL('../data/fixtures/native-parity/core-rules.json', import.meta.url)));

test('native parity fixture 固定核心規則輸出', () => {
  assert.equal(fixture.schemaVersion, 1);
  assert.equal(fixture.targetPaths.length, 3);
  assert.equal(fixture.snappedPaths.length, 3);
  assert.deepEqual(fixture.stars.map((item) => item.expected), [3, 2, 1]);
  assert.equal(fixture.merge.expected.levels['1'].stars, 3);
  assert.equal(fixture.merge.expected.ink, 0);
});

test('repository fixture 與 JavaScript 現行規則一致', () => {
  assert.doesNotThrow(() => execFileSync(
    process.execPath,
    ['tools/generate-native-fixtures.mjs', '--check'],
    { cwd: new URL('..', import.meta.url), stdio: 'pipe' },
  ));
});
