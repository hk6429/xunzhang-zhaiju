#!/usr/bin/env node
/**
 * 尋章摘句 — 關卡產生器 v3（50 關課程表：五章／諺語俗語變長目標／timeLimit＋hintCap）
 *
 * 用法：node tools/generate-levels.mjs <phrases.json路徑> <輸出levels.json路徑> [seed]
 *
 * v3：
 * - 課程表表驅動（tools/curriculum.mjs，照 docs/SCHEMA.md 逐格照抄）：
 *   章/關段/版型/尺寸/內容池/目標數/timeLimit/hintCap/線索曲線。
 * - full 支援 4–9 字變長目標（諺語俗語）；碰撞檢查一律對「全語料 text 集合」掃
 *   （每條語料各以自身長度掃一輪，涵蓋 4–9 字，不會漏掃該關內容池以外的長度）。
 * - cross 支援變長詞交叉（規則不變：E 交 S、恰一交叉、首尾外一格留空、連通）；
 *   大盤面加回溯節點預算，超額即放棄本輪、換一批候選（seed bump 重洗 pool）重試，
 *   30 次 seed 重試上限維持。
 * - 內容池過濾照 SCHEMA（成語·常用/成語·進階/諺語俗語/混合各半/全庫）；跨關優先不重複。
 * - 線索曲線：釋義（關1–2）／輪換創意（現行邏輯）／各半（釋義/情境）／
 *   創意優先／幾乎全創意／全創意（後三檔皆＝有創意型就用、缺料才退釋義）。
 *
 * 確定性：自寫 mulberry32 seeded PRNG，同 seed 同輸出；不使用 Date.now()。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURRICULUM, inPool, isChengyu, charLen, expectedTargetCounts } from './curriculum.mjs';

const CREATIVE_STYLES = ['急轉彎', '典故', '諧音', '情境'];
const DEFAULT_SEED = 20260818;
const MAX_FILL_TRIES = 300;      // full：干擾字重填上限
const MAX_LAYOUT_TRIES = 80;     // full：目標擺盤重試上限
const MAX_SEED_BUMPS = 40;       // 換 seed（＝換一批候選重洗）重試上限
const CROSS_NODE_BUDGET = 500000; // cross：單輪回溯節點預算，超額放棄本輪（v4 大盤面加碼）

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

// ---------- 共用 ----------
function placementCells(start, dir, len) {
  const cells = [];
  for (let i = 0; i < len; i++) {
    cells.push(dir === 'E' ? [start[0], start[1] + i] : [start[0] + i, start[1]]);
  }
  return cells;
}
function cellsInBounds(cells, size) {
  return cells.every(([r, c]) => r >= 0 && r < size && c >= 0 && c < size);
}

// ---------- 線索選擇（v3 六檔曲線） ----------
function pickClueIndex(phrase, curve, slot, usedStyles) {
  const clues = phrase.clues ?? [];
  const idxOf = style => clues.findIndex(c => c.style === style);
  const shiyi = () => { const i = idxOf('釋義'); return i >= 0 ? i : 0; };
  // 現行輪換邏輯：依 slot 輪換創意型、同關 style 盡量不重複；退任一創意；再退釋義
  const creative = () => {
    for (let k = 0; k < CREATIVE_STYLES.length; k++) {
      const style = CREATIVE_STYLES[(slot + k) % CREATIVE_STYLES.length];
      if (usedStyles.has(style)) continue;
      const i = idxOf(style);
      if (i >= 0) { usedStyles.add(style); return i; }
    }
    const i = clues.findIndex(c => CREATIVE_STYLES.includes(c.style));
    if (i >= 0) { usedStyles.add(clues[i].style); return i; }
    return -1;
  };
  switch (curve) {
    case '釋義':
      return shiyi();
    case '各半': { // 釋義/情境各半：偶數 slot 釋義、奇數 slot 情境（缺情境退其他創意，再退釋義）
      if (slot % 2 === 0) return shiyi();
      const i = idxOf('情境');
      if (i >= 0) { usedStyles.add('情境'); return i; }
      const j = creative();
      return j >= 0 ? j : shiyi();
    }
    case '輪換':
    case '創意優先':
    case '幾乎全創意':
    case '全創意': { // 有創意型就用；除非缺料否則不用釋義
      const i = creative();
      return i >= 0 ? i : shiyi();
    }
    default:
      throw new Error(`未知線索曲線：${curve}`);
  }
}
function assignClues(curve, targets, byId) {
  const usedStyles = new Set();
  return targets.map((t, slot) => ({
    ...t,
    clueIndex: pickClueIndex(byId.get(t.phraseId), curve, slot, usedStyles),
  }));
}

// ---------- full：方向掃描＋碰撞檢查 ----------
function gridLines(grid) {
  const size = grid.length;
  const e = grid.map(row => row.join(''));
  const s = [];
  for (let c = 0; c < size; c++) s.push(grid.map(r => r[c]).join(''));
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
 * 碰撞檢查：目標恰出現 1 次；「全語料 text 集合」逐條掃描（每條以自身長度掃，
 * 天然涵蓋 4–9 字變長條目——不是只掃該關內容池會出現的長度）；黑名單含反向。
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

// ---------- full：目標擺盤（回溯法；text 變長 4–9 字皆適用） ----------
function tryFullLayout(phrases, size, rng) {
  const grid = Array.from({ length: size }, () => Array(size).fill(null));
  const targets = [];
  const order = shuffle(phrases, rng);

  function candidates(text) {
    const chars = [...text];
    const out = [];
    for (const dir of ['E', 'S']) {
      const maxR = dir === 'S' ? size - chars.length : size - 1;
      const maxC = dir === 'E' ? size - chars.length : size - 1;
      for (let r = 0; r <= maxR; r++) {
        for (let c = 0; c <= maxC; c++) {
          const cells = placementCells([r, c], dir, chars.length);
          if (cells.every(([rr, cc], i) => grid[rr][cc] === null || grid[rr][cc] === chars[i])) {
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
    const chars = [...p.text];
    for (const cand of shuffle(candidates(p.text), rng)) {
      const prev = cand.cells.map(([r, c]) => grid[r][c]);
      cand.cells.forEach(([r, c], i) => { grid[r][c] = chars[i]; });
      targets.push({ phraseId: p.id, start: cand.start, dir: cand.dir });
      if (backtrack(idx + 1)) return true;
      targets.pop();
      cand.cells.forEach(([r, c], i) => { grid[r][c] = prev[i]; });
    }
    return false;
  }

  return backtrack(0) ? { grid, targets } : null;
}

function buildFullLevel(cfg, targetPhrases, allTexts, distractorPool, blacklist, byId, rng) {
  for (let layoutTry = 0; layoutTry < MAX_LAYOUT_TRIES; layoutTry++) {
    const layout = tryFullLayout(targetPhrases, cfg.size, rng);
    if (!layout) continue;
    const fixed = layout.grid.map(row => row.slice());
    for (let fillTry = 0; fillTry < MAX_FILL_TRIES; fillTry++) {
      const grid = fixed.map(row => row.map(ch => ch === null ? pick(distractorPool, rng) : ch));
      const violations = collisionCheck(grid, targetPhrases.map(p => p.text), allTexts, blacklist);
      if (violations.length === 0) {
        return {
          id: cfg.id, chapter: cfg.chapter, chapterTitle: cfg.chapterTitle,
          size: cfg.size, layout: 'full',
          timeLimit: cfg.timeLimit, hintCap: cfg.hintCap,
          directions: ['E', 'S'], targetDisplay: 'clue',
          targets: assignClues(cfg.curve, layout.targets, byId), grid,
        };
      }
    }
  }
  return null;
}

// ---------- cross：填字擺盤（回溯法；變長詞適用） ----------
/**
 * 演算法：第一個詞放盤面中央附近（E/S 皆可，±1 抖動）；
 * 之後每個詞必須與「已放置的某一個詞」共用恰好一個字交叉（新詞方向與被交叉詞垂直，
 * 即 E 詞交 S 詞），其餘格必須全空，且詞首前一格／詞尾後一格必須為空（避免路徑黏連）。
 * 已是交叉點的格不再被第三個詞使用。挑不出可交叉的詞就回溯換詞。
 * 結果必然連通、每詞至少交叉一次；revealed = 所有交叉格。
 * v3：quota（混合池各半配額）＋節點預算（大盤面回溯壓力大，超額放棄本輪，
 * 由外層 seed bump 重洗 pool＝「換一批候選重試」）。
 */
function tryCrossLayout(pool, want, size, rng, quota) {
  const grid = Array.from({ length: size }, () => Array(size).fill(null));
  const placed = []; // { phrase, start, dir, cells }
  const ownerCount = new Map(); // 'r,c' -> 共用該格的詞數
  const key = (r, c) => `${r},${c}`;
  const filled = (r, c) => r >= 0 && r < size && c >= 0 && c < size && grid[r][c] !== null;
  const remain = quota ? { ...quota } : null;
  let nodes = 0;
  let aborted = false;

  function firstCandidates(text) {
    const len = charLen(text);
    const out = [];
    for (const dir of ['E', 'S']) {
      const baseR = dir === 'E' ? Math.floor(size / 2) : Math.floor((size - len) / 2);
      const baseC = dir === 'E' ? Math.floor((size - len) / 2) : Math.floor(size / 2);
      for (const dr of [0, -1, 1]) {
        for (const dc of [0, -1, 1]) {
          const start = [baseR + dr, baseC + dc];
          const cells = placementCells(start, dir, len);
          if (cellsInBounds(cells, size)) out.push({ start, dir, cells });
        }
      }
    }
    return out;
  }

  function crossCandidates(text) {
    const chars = [...text];
    const out = [];
    const seen = new Set();
    for (const w of placed) {
      const ndir = w.dir === 'E' ? 'S' : 'E';
      for (const [r, c] of w.cells) {
        if ((ownerCount.get(key(r, c)) ?? 0) > 1) continue; // 已是交叉點，不三疊
        const ch = grid[r][c];
        for (let i = 0; i < chars.length; i++) {
          if (chars[i] !== ch) continue;
          const start = ndir === 'E' ? [r, c - i] : [r - i, c];
          const sig = `${start[0]},${start[1]},${ndir}`;
          if (seen.has(sig)) continue;
          const cells = placementCells(start, ndir, chars.length);
          if (!cellsInBounds(cells, size)) continue;
          // 恰好一個交叉：除第 i 格外全空
          if (!cells.every(([rr, cc], k) => k === i || grid[rr][cc] === null)) continue;
          // 詞首前／詞尾後必須空，避免同線黏連
          const [er, ec] = cells[cells.length - 1];
          const before = ndir === 'E' ? [start[0], start[1] - 1] : [start[0] - 1, start[1]];
          const after = ndir === 'E' ? [er, ec + 1] : [er + 1, ec];
          if (filled(...before) || filled(...after)) continue;
          seen.add(sig);
          out.push({ start, dir: ndir, cells });
        }
      }
    }
    return out;
  }

  function place(p, cand) {
    const chars = [...p.text];
    cand.cells.forEach(([r, c], i) => {
      grid[r][c] = chars[i];
      ownerCount.set(key(r, c), (ownerCount.get(key(r, c)) ?? 0) + 1);
    });
    placed.push({ phrase: p, start: cand.start, dir: cand.dir, cells: cand.cells });
  }
  function unplace() {
    const { cells } = placed.pop();
    for (const [r, c] of cells) {
      const n = ownerCount.get(key(r, c)) - 1;
      if (n === 0) { ownerCount.delete(key(r, c)); grid[r][c] = null; }
      else ownerCount.set(key(r, c), n);
    }
  }

  const usedIds = new Set();
  function backtrack(count) {
    if (aborted) return false;
    if (++nodes > CROSS_NODE_BUDGET) { aborted = true; return false; }
    if (count === want) return true;
    for (const p of pool) {
      if (usedIds.has(p.id)) continue;
      const cat = isChengyu(p) ? 'c' : 'y';
      if (remain && remain[cat] <= 0) continue; // 混合池配額用罄
      const cands = count === 0 ? firstCandidates(p.text) : crossCandidates(p.text);
      for (const cand of shuffle(cands, rng)) {
        usedIds.add(p.id);
        if (remain) remain[cat]--;
        place(p, cand);
        if (backtrack(count + 1)) return true;
        unplace();
        if (remain) remain[cat]++;
        usedIds.delete(p.id);
        if (aborted) return false;
      }
    }
    return false;
  }

  if (!backtrack(0)) return null;

  const revealed = [...ownerCount.entries()]
    .filter(([, n]) => n >= 2)
    .map(([k]) => k.split(',').map(Number))
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return {
    grid,
    revealed,
    targets: placed.map(w => ({ phraseId: w.phrase.id, start: w.start, dir: w.dir })),
    usedPhrases: placed.map(w => w.phrase),
  };
}

function buildCrossLevel(cfg, want, pool, byId, rng, quota) {
  const layout = tryCrossLayout(pool, want, cfg.size, rng, quota);
  if (!layout) return null;
  return {
    level: {
      id: cfg.id, chapter: cfg.chapter, chapterTitle: cfg.chapterTitle,
      size: cfg.size, layout: 'cross',
      timeLimit: cfg.timeLimit, hintCap: cfg.hintCap,
      directions: ['E', 'S'], targetDisplay: 'clue',
      targets: assignClues(cfg.curve, layout.targets, byId),
      grid: layout.grid,
      revealed: layout.revealed,
    },
    usedPhrases: layout.usedPhrases,
  };
}

// ---------- 內容池選料（跨關優先不重複） ----------
function orderByUnused(list, usedIds, rng) {
  const un = list.filter(p => !usedIds.has(p.id));
  const used = list.filter(p => usedIds.has(p.id));
  return [...shuffle(un, rng), ...shuffle(used, rng)];
}
function poolFits(phrases, cfg) {
  return phrases.filter(p => inPool(p, cfg.pool) && charLen(p.text) <= cfg.size);
}
function chooseFullTargets(cfg, exp, phrases, usedIds, rng) {
  const fits = poolFits(phrases, cfg);
  if (cfg.pool === '混合') {
    const c = orderByUnused(fits.filter(isChengyu), usedIds, rng).slice(0, exp.chengyu);
    const y = orderByUnused(fits.filter(p => !isChengyu(p)), usedIds, rng).slice(0, exp.yanyu);
    return shuffle([...c, ...y], rng);
  }
  return orderByUnused(fits, usedIds, rng).slice(0, exp.total);
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
  const byId = new Map(phrases.map(p => [p.id, p]));
  const allTexts = phrases.map(p => p.text);
  const blacklistPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'blacklist.json');
  const blacklist = JSON.parse(readFileSync(blacklistPath, 'utf8'));

  // 干擾字池：全語料出現過的字 ＋ 國中常用字池（僅 full 關使用）
  const distractorPool = [...new Set([...allTexts.join(''), ...COMMON_CHARS])];

  const levels = [];
  let seed = baseSeed;
  let rng = mulberry32(seed);
  const usedIds = new Set(); // 跨關優先不重複（各池共用一份使用紀錄）

  for (const cfg of CURRICULUM) {
    const exp = expectedTargetCounts(cfg, phrases);
    if (exp.total < cfg.targets) {
      console.warn(`[警告] 語料不足：第 ${cfg.id} 關（池=${cfg.pool}，尺寸 ${cfg.size}）目標數 ${cfg.targets} → 退化為 ${exp.total}`);
    }
    if (exp.total === 0) {
      console.error(`[錯誤] 第 ${cfg.id} 關內容池「${cfg.pool}」無可用語料（長度 ≤ ${cfg.size}），中止。`);
      process.exit(1);
    }

    let level = null;
    let bumps = 0;
    while (!level) {
      if (cfg.layout === 'full') {
        const chosen = chooseFullTargets(cfg, exp, phrases, usedIds, rng);
        level = buildFullLevel(cfg, chosen, allTexts, distractorPool, blacklist, byId, rng);
        if (level) chosen.forEach(p => usedIds.add(p.id));
      } else {
        const fits = poolFits(phrases, cfg);
        const pool = orderByUnused(fits, usedIds, rng);
        const quota = cfg.pool === '混合' ? { c: exp.chengyu, y: exp.yanyu } : null;
        const built = buildCrossLevel(cfg, exp.total, pool, byId, rng, quota);
        if (built) {
          level = built.level;
          built.usedPhrases.forEach(p => usedIds.add(p.id));
        }
      }
      if (!level) {
        bumps++;
        if (bumps > MAX_SEED_BUMPS) {
          console.error(`[錯誤] 第 ${cfg.id} 關在 ${MAX_SEED_BUMPS} 次換 seed 後仍無法收斂，中止。`);
          process.exit(1);
        }
        seed += 1;
        console.warn(`[警告] 第 ${cfg.id} 關擺盤/填充未收斂，換 seed=${seed} 重擺（重洗候選）`);
        rng = mulberry32(seed);
      }
    }
    levels.push(level);
  }

  writeFileSync(outPath, JSON.stringify({ levels }, null, 2) + '\n', 'utf8');
  console.log(`已產出 ${levels.length} 關 → ${outPath}（seed=${baseSeed}）`);
  const uniqueTargets = new Set(levels.flatMap(l => l.targets.map(t => t.phraseId)));
  console.log(`目標條目共 ${levels.reduce((n, l) => n + l.targets.length, 0)} 個（不重複 ${uniqueTargets.size} 條）`);
}

main();
