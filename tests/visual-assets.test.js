import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateVisualAssets } from '../tools/validate-visuals.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const result = await validateVisualAssets(ROOT);

function assertSectionPasses(section, label) {
  assert.deepEqual(section.errors, [], `${label}：\n${section.errors.map((error) => `- ${error}`).join('\n')}`);
}

test('index.html 與美術 registry 的 SVG／PNG／JPG 圖片參照皆存在', () => {
  assert.ok(result.checks.references.count > 0, '至少應找到一個圖片參照');
  assertSectionPasses(result.checks.references, '圖片參照契約失敗');
});

test('九位 Q 版封神角色皆有 1:1 國風潑墨 metadata', () => {
  assert.equal(result.checks.characters.count, 9);
  assertSectionPasses(result.checks.characters, '角色 metadata 契約失敗');
});

test('首頁、五章密室與通關慶典等七個主要場景配圖齊全', () => {
  assert.equal(result.checks.scenes.count, 7);
  assertSectionPasses(result.checks.scenes, '主要場景契約失敗');
});
