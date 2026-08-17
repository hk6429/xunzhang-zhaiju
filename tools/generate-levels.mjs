#!/usr/bin/env node
/**
 * 尋章摘句 — 關卡產生器（MVP 第 1 章 10 關，5×5，E/S 方向）
 *
 * 用法：node tools/generate-levels.mjs <phrases.json路徑> <輸出levels.json路徑> [seed]
 *
 * 確定性：自寫 mulberry32 seeded PRNG，同 seed 同輸出；不使用 Date.now()。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SIZE = 5;
const LEVEL_COUNT = 10;
const TARGET_COUNTS = [3, 3, 4, 4, 4, 4, 5, 5, 5, 5]; // 關1-2=3、關3-6=4、關7-10=5
const DEFAULT_SEED = 20260818;
const MAX_FILL_TRIES = 300;   // 干擾字重填上限
const MAX_LAYOUT_TRIES = 80;  // 目標擺盤重試上限
const MAX_SEED_BUMPS = 30;    // 換 seed 重擺上限

// 約 100 字國中常用字池（干擾字備用，避免生僻字）
const COMMON_CHARS = [...new Set(
  '山水風雲花草樹木春夏秋冬日月星辰天地人心手足口目耳年時東西南北中上下左右大小多少高低長短前後內外遠近新舊今古文字詩書畫筆紙墨學問思言語行走飛鳥魚馬牛羊光影聲色香味形體金石土火江河湖海雨雪霜露晴陰明暗動靜開合來去進出安樂喜怒'
)];

// ---------- seeded PRNG ----------
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pick(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }

// ---------- 方向掃描 ----------
function gridLines(grid) {
  const e = grid.map(row => row.join(''));                       // E：每列左→右
  const s = [];                                                  // S：每行上→下
  for (let c = 0; c < SIZE; c++) s.push(grid.map(r => r[c]).join(''));
  return { e, s };
}
function countSub(lines, word) {
  let n = 0;
  for (const line of lines) {
    for (let i = 0; i + word.length <= line.length; i++) {
      if (line.slice(i, i + word.length) === word) n++;
    }
  }
  return n;
}

/**
 * 意外詞碰撞檢查。回傳違規訊息陣列（空陣列＝通過）。
 * (a) 每個目標成語在 E∪S 恰好出現一次（路徑唯一）
 * (b) 非目標的語料成語不得意外出現（E∪S）
 * (c) blacklist 詞不得出現（E、S、W、N 四方向）
 */
function collisionCheck(grid, targetTexts, allTexts, blacklist) {
  const { e, s } = gridLines(grid);
  const es = [...e, ...s];
  const wn = [...e.map(l => [...l].reverse().join('')), ...s.map(l => [...l].reverse().join(''))];
  const violations = [];
  const targetSet = new Set(targetTexts);

  for (const t of targetTexts) {
    const n = countSub(es, t);
    if (n !== 1) violations.push(`目標「${t}」在 E∪S 出現 ${n} 次（須恰好 1 次）`);
  }
  for (const t of allTexts) {
    if (targetSet.has(t)) continue;
    const n = countSub(es, t);
    if (n > 0) violations.push(`非目標語料「${t}」意外出現 ${n} 次`);
  }
  for (const w of blacklist) {
    const n = countSub(es, w) + countSub(wn, w);
    if (n > 0) violations.push(`黑名單詞「${w}」出現 ${n} 次（含反向掃描）`);
  }
  return violations;
}

// ---------- 目標擺盤（回溯法） ----------
function placementCells(start, dir, len) {
  const cells = [];
  for (let i = 0; i < len; i++) {
    cells.push(dir === 'E' ? [start[0], start[1] + i] : [start[0] + i, start[1]]);
  }
  return cells;
}
function tryLayout(phrases, rng) {
  // grid：null=空格；回溯擺入所有成語（可共用交叉字）
  const grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  const targets = [];
  const order = shuffle(phrases, rng);

  function candidates(text) {
    const out = [];
    for (const dir of ['E', 'S']) {
      const maxR = dir === 'S' ? SIZE - text.length : SIZE - 1;
      const maxC = dir === 'E' ? SIZE - text.length : SIZE - 1;
      for (let r = 0; r <= maxR; r++) {
        for (let c = 0; c <= maxC; c++) {
          const cells = placementCells([r, c], dir, text.length);
          if (cells.every(([rr, cc], i) => grid[rr][cc] === null || grid[rr][cc] === text[i])) {
            out.push({ start: [r, c], dir, cells });
          }
        }
      }
    }
    return out;
  }

  function backtrack(idx) {
    if (idx === order.length) return true;
    const p = order[idx];
    for (const cand of shuffle(candidates(p.text), rng)) {
      const prev = cand.cells.map(([r, c]) => grid[r][c]);
      cand.cells.forEach(([r, c], i) => { grid[r][c] = p.text[i]; });
      targets.push({ phraseId: p.id, start: cand.start, dir: cand.dir });
      if (backtrack(idx + 1)) return true;
      targets.pop();
      cand.cells.forEach(([r, c], i) => { grid[r][c] = prev[i]; });
    }
    return false;
  }

  return backtrack(0) ? { grid, targets } : null;
}

// ---------- 產生單一關卡 ----------
function buildLevel(id, targetPhrases, allTexts, distractorPool, blacklist, rng) {
  for (let layoutTry = 0; layoutTry < MAX_LAYOUT_TRIES; layoutTry++) {
    const layout = tryLayout(targetPhrases, rng);
    if (!layout) continue;
    const fixed = layout.grid.map(row => row.slice());
    for (let fillTry = 0; fillTry < MAX_FILL_TRIES; fillTry++) {
      const grid = fixed.map(row => row.map(ch => ch === null ? pick(distractorPool, rng) : ch));
      const violations = collisionCheck(grid, targetPhrases.map(p => p.text), allTexts, blacklist);
      if (violations.length === 0) {
        return {
          id, chapter: 1, size: SIZE,
          directions: ['E', 'S'], targetDisplay: 'text',
          targets: layout.targets, grid
        };
      }
    }
    // 干擾字重填未收斂 → 換一個擺盤再試
  }
  return null;
}

// ---------- 主流程 ----------
function main() {
  const [phrasesPath, outPath, seedArg] = process.argv.slice(2);
  if (!phrasesPath || !outPath) {
    console.error('用法：node tools/generate-levels.mjs <phrases.json路徑> <輸出levels.json路徑> [seed]');
    process.exit(2);
  }
  const baseSeed = seedArg !== undefined ? Number(seedArg) : DEFAULT_SEED;
  if (!Number.isFinite(baseSeed)) {
    console.error(`seed 必須是數字：${seedArg}`);
    process.exit(2);
  }

  const phrases = JSON.parse(readFileSync(phrasesPath, 'utf8'));
  const allTexts = phrases.map(p => p.text);
  const blacklistPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'blacklist.json');
  const blacklist = JSON.parse(readFileSync(blacklistPath, 'utf8'));

  // 干擾字池：全語料出現過的字 ＋ 國中常用字池
  const distractorPool = [...new Set([...allTexts.join(''), ...COMMON_CHARS])];

  const levels = [];
  let seed = baseSeed;
  let rng = mulberry32(seed);
  let unused = phrases.slice(); // 跨關盡量不重複

  for (let i = 0; i < LEVEL_COUNT; i++) {
    let want = TARGET_COUNTS[i];
    if (want > phrases.length) {
      console.warn(`[警告] 語料只有 ${phrases.length} 條，第 ${i + 1} 關目標數 ${want} → 退化為 ${phrases.length}`);
      want = phrases.length; // 語料不足的退化情況
    }
    if (unused.length < want) unused = phrases.slice(); // 語料耗盡 → 允許跨關重複
    const chosen = shuffle(unused, rng).slice(0, want);
    const chosenIds = new Set(chosen.map(p => p.id));
    unused = unused.filter(p => !chosenIds.has(p.id));

    let level = null;
    let bumps = 0;
    while (!level) {
      level = buildLevel(i + 1, chosen, allTexts, distractorPool, blacklist, rng);
      if (!level) {
        bumps++;
        if (bumps > MAX_SEED_BUMPS) {
          console.error(`[錯誤] 第 ${i + 1} 關在 ${MAX_SEED_BUMPS} 次換 seed 後仍無法收斂，中止。`);
          process.exit(1);
        }
        seed += 1;
        console.warn(`[警告] 第 ${i + 1} 關擺盤/填充未收斂，換 seed=${seed} 重擺`);
        rng = mulberry32(seed);
      }
    }
    levels.push(level);
  }

  writeFileSync(outPath, JSON.stringify({ levels }, null, 2) + '\n', 'utf8');
  console.log(`已產出 ${levels.length} 關 → ${outPath}（seed=${baseSeed}）`);
  const uniqueTargets = new Set(levels.flatMap(l => l.targets.map(t => t.phraseId)));
  console.log(`目標成語共 ${levels.reduce((n, l) => n + l.targets.length, 0)} 個（不重複 ${uniqueTargets.size} 條）`);
}

main();
