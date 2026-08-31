import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildManifest,
  manifestMatches,
  serializeManifest,
} from '../tools/build-app-content-manifest.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('App 內容 manifest 鎖定完整語料與關卡統計', () => {
  const manifest = buildManifest(repoRoot);

  assert.equal(manifest.schemaVersion, 1);
  assert.deepEqual(manifest.content, {
    phraseCount: 409,
    levelCount: 100,
    targetCount: 832,
  });
  assert.deepEqual(Object.keys(manifest.files), [
    'data/events.json',
    'data/levels.json',
    'data/phrases.json',
    'data/story-lore-v2.json',
  ]);
  for (const metadata of Object.values(manifest.files)) {
    assert.match(metadata.sha256, /^[a-f0-9]{64}$/);
    assert.ok(metadata.bytes > 0);
  }
});

test('版本庫內 manifest 與目前內容完全一致', () => {
  const expected = serializeManifest(buildManifest(repoRoot));
  const checkedIn = readFileSync(path.join(repoRoot, 'data/app-content-manifest.json'), 'utf8');
  assert.equal(checkedIn, expected);
  assert.equal(manifestMatches(repoRoot), true);
});

test('任一 App 資料檔變動都會判定 manifest 過期', () => {
  const scratch = mkdtempSync(path.join(tmpdir(), 'xzzj-manifest-'));
  cpSync(path.join(repoRoot, 'data'), path.join(scratch, 'data'), { recursive: true });
  writeFileSync(
    path.join(scratch, 'data/app-content-manifest.json'),
    serializeManifest(buildManifest(scratch)),
  );

  const phrasesPath = path.join(scratch, 'data/phrases.json');
  writeFileSync(phrasesPath, `${readFileSync(phrasesPath, 'utf8')}\n`);

  assert.equal(manifestMatches(scratch), false);
});
