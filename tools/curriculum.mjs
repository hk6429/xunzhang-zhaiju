/**
 * 尋章摘句 — 50 關課程表（SCHEMA v3 凍結表；產生器與驗證器共用，單一事實來源）
 *
 * 每列欄位照 docs/SCHEMA.md「50 關課程表」逐格照抄：
 * 章 / 版型 / 尺寸 / 內容池 / 目標數 / timeLimit / hintCap / 線索曲線。
 */

export const CHAPTER_TITLES = {
  1: '初窺門徑',
  2: '廟口智慧',
  3: '成語風雲',
  4: '龍虎混戰',
  5: '宗師試煉',
};

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

const C = [];
function add(ids, chapter, layout, size, pool, targets, timeLimit, hintCap, curve) {
  ids.forEach((id, i) => C.push({
    id,
    chapter,
    chapterTitle: CHAPTER_TITLES[chapter],
    layout,
    size,
    pool,
    targets: Array.isArray(targets) ? targets[i] : targets,
    timeLimit,
    hintCap,
    curve: typeof curve === 'function' ? curve(id) : curve,
  }));
}

// ── 第 1 章 初窺門徑 ──（關1–2 釋義；3 起輪換創意）
add(range(1, 5),   1, 'full',  5,  '成語常用', [3, 3, 4, 4, 4], null, null, id => (id <= 2 ? '釋義' : '輪換'));
add(range(6, 7),   1, 'cross', 7,  '成語常用', 4,               null, null, '輪換');
add(range(8, 10),  1, 'cross', 8,  '成語常用', 5,               null, null, '輪換');
// ── 第 2 章 廟口智慧 ──（釋義/情境各半）
add(range(11, 14), 2, 'full',  7,  '諺語俗語', [4, 4, 5, 5],    300, 3, '各半');
add(range(15, 17), 2, 'cross', 9,  '諺語俗語', 4,               300, 3, '各半');
add(range(18, 20), 2, 'cross', 10, '諺語俗語', 5,               330, 3, '各半');
// ── 第 3 章 成語風雲 ──（創意優先）
add(range(21, 24), 3, 'full',  8,  '成語進階', [5, 5, 6, 6],    270, 2, '創意優先');
add(range(25, 27), 3, 'cross', 9,  '成語進階', 5,               270, 2, '創意優先');
add(range(28, 30), 3, 'cross', 10, '成語進階', 6,               300, 2, '創意優先');
// ── 第 4 章 龍虎混戰 ──（創意優先）
add(range(31, 34), 4, 'full',  9,  '混合',     [6, 6, 7, 7],    270, 2, '創意優先');
add(range(35, 37), 4, 'cross', 10, '混合',     6,               270, 2, '創意優先');
add(range(38, 40), 4, 'cross', 11, '混合',     6,               300, 1, '創意優先');
// ── 第 5 章 宗師試煉 ──（幾乎全創意；關 50 全創意）
add(range(41, 44), 5, 'full',  10, '全庫',     [7, 7, 8, 8],    240, 1, '幾乎全創意');
add(range(45, 47), 5, 'cross', 11, '全庫',     7,               270, 1, '幾乎全創意');
add(range(48, 49), 5, 'cross', 12, '全庫',     7,               270, 1, '幾乎全創意');
add(range(50, 50), 5, 'cross', 12, '全庫',     8,               300, 1, '全創意');

export const CURRICULUM = C;
export const LEVEL_COUNT = C.length; // = 50

export const charLen = t => [...t].length;
export const isChengyu = p => p.type === '成語';

/** 內容池成員判定（SCHEMA v3：成語·常用／成語·進階／諺語俗語／混合／全庫） */
export function inPool(p, pool) {
  switch (pool) {
    case '成語常用': return p.type === '成語' && p.level === '常用';
    case '成語進階': return p.type === '成語' && p.level === '進階';
    case '諺語俗語': return p.type === '諺語' || p.type === '俗語';
    case '混合':     return p.type === '成語' || p.type === '諺語' || p.type === '俗語';
    case '全庫':     return true;
    default: throw new Error(`未知內容池：${pool}`);
  }
}

/**
 * 依課程表與現有語料，算出該關「應有」的目標數（含語料不足時的退化）。
 * 混合池：兩池各半、餘數成語多一（SCHEMA v3）；池量不足則該側 clamp。
 * 回傳 { total, chengyu, yanyu }（非混合池 chengyu/yanyu 為 null）。
 */
export function expectedTargetCounts(cfg, phrases) {
  const fits = phrases.filter(p => inPool(p, cfg.pool) && charLen(p.text) <= cfg.size);
  if (cfg.pool !== '混合') {
    return { total: Math.min(cfg.targets, fits.length), chengyu: null, yanyu: null };
  }
  const cAvail = fits.filter(isChengyu).length;
  const yAvail = fits.length - cAvail;
  const chengyu = Math.min(Math.ceil(cfg.targets / 2), cAvail);   // 餘數成語多一
  const yanyu   = Math.min(Math.floor(cfg.targets / 2), yAvail);
  return { total: chengyu + yanyu, chengyu, yanyu };
}
