#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const TOOL_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = path.resolve(TOOL_DIR, '..');
const IMAGE_EXTENSIONS = new Set(['.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp']);

export const REQUIRED_CHARACTER_IDS = [
  'jiang-taigong',
  'nezha',
  'yang-jian',
  'su-daji',
  'shen-gongbao',
  'lei-zhenzi',
  'taiyi-zhenren',
  'moling',
  'tuxing-sun',
];

export const REQUIRED_SCENE_IDS = [
  'palace-hero-banner',
  'chamber-taiji',
  'chamber-huanghe',
  'chamber-shijue',
  'chamber-chaoge',
  'chamber-wanxian',
  'victory-celebration',
];

function normalizeAssetPath(value) {
  if (typeof value !== 'string' || /^(?:data:|https?:|\/\/)/i.test(value)) return null;
  const clean = value.split(/[?#]/, 1)[0];
  return IMAGE_EXTENSIONS.has(path.extname(clean).toLowerCase()) ? clean : null;
}

function collectImagePaths(value, label, output, seen = new Set()) {
  if (typeof value === 'string') {
    const assetPath = normalizeAssetPath(value);
    if (assetPath) output.push({ path: assetPath, source: label });
    return;
  }
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  for (const [key, nested] of Object.entries(value)) {
    collectImagePaths(nested, `${label}.${key}`, output, seen);
  }
}

export function inspectImageAsset(rootDir, relativePath) {
  const absolutePath = path.resolve(rootDir, relativePath);
  const expectedRoot = `${path.resolve(rootDir)}${path.sep}`;
  if (absolutePath !== path.resolve(rootDir) && !absolutePath.startsWith(expectedRoot)) {
    return `圖片路徑逸出專案：${relativePath}`;
  }
  if (!existsSync(absolutePath)) return `缺少圖片：${relativePath}`;
  if (!statSync(absolutePath).isFile()) return `圖片路徑不是檔案：${relativePath}`;
  if (statSync(absolutePath).size === 0) return `圖片是空檔：${relativePath}`;
  return null;
}

function htmlImageReferences(html) {
  const references = [];
  const quotedPath = /["']([^"']+\.(?:gif|jpe?g|png|svg|webp)(?:[?#][^"']*)?)["']/gi;
  for (const match of html.matchAll(quotedPath)) {
    const assetPath = normalizeAssetPath(match[1]);
    if (assetPath) references.push({ path: assetPath, source: 'index.html' });
  }
  return references;
}

function uniqueReferences(references) {
  const result = new Map();
  for (const reference of references) {
    const sources = result.get(reference.path) ?? new Set();
    sources.add(reference.source);
    result.set(reference.path, sources);
  }
  return [...result].map(([assetPath, sources]) => ({ path: assetPath, sources: [...sources] }));
}

function isSixteenToTen(value) {
  return typeof value === 'string' && /^16\s*:\s*10(?:\b|\s|$)/.test(value);
}

async function importProjectModule(rootDir, relativePath) {
  return import(`${pathToFileURL(path.join(rootDir, relativePath)).href}?visual-check=${Date.now()}`);
}

export async function validateVisualAssets(rootDir = DEFAULT_ROOT) {
  const resolvedRoot = path.resolve(rootDir);
  const [characterModule, sceneModule, itemModule, brandModule] = await Promise.all([
    importProjectModule(resolvedRoot, 'assets/characters/character-registry.js'),
    importProjectModule(resolvedRoot, 'assets/art/scenes/scenes-registry.js'),
    importProjectModule(resolvedRoot, 'assets/items/items-registry.js'),
    importProjectModule(resolvedRoot, 'assets/brand/brand-registry.js'),
  ]);
  const artDoc = JSON.parse(readFileSync(path.join(resolvedRoot, 'assets/art/characters/characters-art.json'), 'utf8'));

  const referenceErrors = [];
  const references = htmlImageReferences(readFileSync(path.join(resolvedRoot, 'index.html'), 'utf8'));
  collectImagePaths(characterModule.CHARACTERS, 'CHARACTERS', references);
  collectImagePaths(characterModule.GROUP_ILLUSTRATIONS, 'GROUP_ILLUSTRATIONS', references);
  collectImagePaths(sceneModule.SCENE_SYSTEM.scenes, 'SCENE_SYSTEM.scenes', references);
  collectImagePaths(itemModule.ITEMS, 'ITEMS', references);
  collectImagePaths(brandModule.BRAND_SYSTEM.assets, 'BRAND_SYSTEM.assets', references);
  const unique = uniqueReferences(references);
  for (const reference of unique) {
    const problem = inspectImageAsset(resolvedRoot, reference.path);
    if (problem) referenceErrors.push(`${problem}；來源：${reference.sources.join(', ')}`);
  }

  const characterErrors = [];
  if (!isSixteenToTen(artDoc?.styleSpec?.ratio)) characterErrors.push('characters-art.json styleSpec.ratio 必須宣告 16:10');
  const artStyle = artDoc?.styleSpec?.artStyle ?? '';
  if (!artStyle.includes('國風') || !/(?:潑墨|水墨)/.test(artStyle)) {
    characterErrors.push('characters-art.json styleSpec.artStyle 必須宣告國風潑墨／水墨風格');
  }
  const artCharacters = new Map((artDoc?.characters ?? []).map((character) => [character.id, character]));
  const registryCharacters = new Map((characterModule.CHARACTERS ?? []).map((character) => [character.id, character]));
  for (const id of REQUIRED_CHARACTER_IDS) {
    const artCharacter = artCharacters.get(id);
    const registryCharacter = registryCharacters.get(id);
    if (!artCharacter) characterErrors.push(`characters-art.json 缺少角色：${id}`);
    if (!registryCharacter) characterErrors.push(`CHARACTERS registry 缺少角色：${id}`);
    if (artCharacter && !isSixteenToTen(artCharacter.ratio)) characterErrors.push(`${id} 的 art metadata ratio 必須為 16:10`);
    if (registryCharacter && !isSixteenToTen(registryCharacter.ratio)) characterErrors.push(`${id} 的 registry ratio 必須為 16:10`);
    if (registryCharacter && (!registryCharacter.style?.includes('國風') || !/(?:潑墨|水墨)/.test(registryCharacter.style))) {
      characterErrors.push(`${id} 的 registry style 必須為國風潑墨／水墨風格`);
    }
  }

  const sceneErrors = [];
  if (!(sceneModule.SCENE_SYSTEM?.theme ?? '').includes('封神')) sceneErrors.push('SCENE_SYSTEM.theme 必須明確包含封神背景');
  const scenes = new Map((sceneModule.SCENE_SYSTEM?.scenes ?? []).map((scene) => [scene.id, scene]));
  for (const id of REQUIRED_SCENE_IDS) {
    const scene = scenes.get(id);
    if (!scene) {
      sceneErrors.push(`缺少主要場景：${id}`);
      continue;
    }
    if (scene.aspectRatio !== '16:9') sceneErrors.push(`${id} 的 aspectRatio 必須為 16:9`);
    if (!scene.path) sceneErrors.push(`${id} 缺少圖片 path`);
    if (!scene.description) sceneErrors.push(`${id} 缺少故事場景 description`);
    if (!Array.isArray(scene.visualElements) || scene.visualElements.length < 3) sceneErrors.push(`${id} 至少需要 3 個 visualElements`);
  }

  const errors = [...referenceErrors, ...characterErrors, ...sceneErrors];
  return {
    errors,
    checks: {
      references: { count: unique.length, errors: referenceErrors },
      characters: { count: REQUIRED_CHARACTER_IDS.length, errors: characterErrors },
      scenes: { count: REQUIRED_SCENE_IDS.length, errors: sceneErrors },
    },
  };
}

async function main() {
  const rootDir = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_ROOT;
  const result = await validateVisualAssets(rootDir);
  if (result.errors.length) {
    console.error(`美術資產驗證失敗（${result.errors.length} 項）：`);
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(`美術資產驗證通過：${result.checks.references.count} 個圖片參照、${result.checks.characters.count} 位 16:10 滿版 Q 版角色、${result.checks.scenes.count} 個封神主要場景。`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
