#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_CONTENT_FILES = [
  'data/events.json',
  'data/levels.json',
  'data/phrases.json',
  'data/story-lore-v2.json',
];

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export function buildManifest(repoRoot) {
  const files = {};
  for (const relativePath of APP_CONTENT_FILES) {
    const buffer = readFileSync(path.join(repoRoot, relativePath));
    files[relativePath] = {
      sha256: sha256(buffer),
      bytes: buffer.byteLength,
    };
  }

  const phrases = JSON.parse(readFileSync(path.join(repoRoot, 'data/phrases.json'), 'utf8'));
  const levelsDocument = JSON.parse(readFileSync(path.join(repoRoot, 'data/levels.json'), 'utf8'));
  const levels = levelsDocument.levels;

  if (!Array.isArray(phrases) || !Array.isArray(levels)) {
    throw new TypeError('App 內容格式錯誤：phrases 必須是陣列，levels.json 必須包含 levels 陣列');
  }

  return {
    schemaVersion: 1,
    content: {
      phraseCount: phrases.length,
      levelCount: levels.length,
      targetCount: levels.reduce((sum, level) => sum + (Array.isArray(level.targets) ? level.targets.length : 0), 0),
    },
    files,
  };
}

export function serializeManifest(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function manifestMatches(repoRoot) {
  try {
    const checkedIn = readFileSync(path.join(repoRoot, 'data/app-content-manifest.json'), 'utf8');
    return checkedIn === serializeManifest(buildManifest(repoRoot));
  } catch {
    return false;
  }
}

function main() {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
    console.error('用法：node tools/build-app-content-manifest.mjs [--check]');
    process.exitCode = 2;
    return;
  }

  if (args[0] === '--check') {
    if (!manifestMatches(repoRoot)) {
      console.error('App 內容 manifest 已過期；請執行 node tools/build-app-content-manifest.mjs 重建');
      process.exitCode = 1;
      return;
    }
    console.log('App 內容 manifest 已同步 ✔');
    return;
  }

  const outputPath = path.join(repoRoot, 'data/app-content-manifest.json');
  writeFileSync(outputPath, serializeManifest(buildManifest(repoRoot)));
  console.log(`已更新 ${path.relative(repoRoot, outputPath)}`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) main();
