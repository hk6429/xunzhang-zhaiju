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
  6: '漢賦遺韻',
  7: '樂府新聲',
  8: '盛唐詩陣',
  9: '宋詞元曲',
  10: '回目千秋',
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

// ── 第 6 章 漢賦遺韻 ──（創意優先）
add(range(51, 54), 6, 'full',  13, '漢賦十九首', [8, 8, 9, 9],  320, 2, '創意優先');
add(range(55, 57), 6, 'cross', 14, '漢賦十九首', 9,              300, 2, '創意優先');
add(range(58, 60), 6, 'cross', 14, '漢賦十九首', 10,             300, 2, '創意優先');
// ── 第 7 章 樂府新聲 ──（創意優先）
add(range(61, 64), 7, 'full',  14, '樂府新樂府', [9, 9, 10, 10], 300, 2, '創意優先');
add(range(65, 67), 7, 'cross', 15, '樂府新樂府', 10,             290, 1, '創意優先');
add(range(68, 70), 7, 'cross', 15, '樂府新樂府', 11,             290, 1, '創意優先');
// ── 第 8 章 盛唐詩陣 ──（幾乎全創意）
add(range(71, 74), 8, 'full',  15, '唐詩',       [10, 10, 11, 11], 290, 1, '幾乎全創意');
add(range(75, 77), 8, 'cross', 16, '唐詩',       11,             280, 1, '幾乎全創意');
add(range(78, 80), 8, 'cross', 16, '唐詩',       12,             280, 1, '幾乎全創意');
// ── 第 9 章 宋詞元曲 ──（幾乎全創意）
add(range(81, 84), 9, 'full',  16, '宋詞元曲',   [11, 11, 12, 12], 280, 1, '幾乎全創意');
add(range(85, 87), 9, 'cross', 17, '宋詞元曲',   12,             270, 1, '幾乎全創意');
add(range(88, 90), 9, 'cross', 17, '宋詞元曲',   13,             270, 1, '幾乎全創意');
// ── 第 10 章 回目千秋 ──（全創意；關 100 終極魔王＝文學全庫、hintCap=0）
add(range(91, 94), 10, 'full',  18, '章回小說',  [12, 12, 13, 13], 270, 1, '全創意');
add(range(95, 97), 10, 'cross', 18, '章回小說',  13,             260, 1, '全創意');
add(range(98, 99), 10, 'cross', 19, '章回小說',  14,             260, 1, '全創意');
add(range(100, 100), 10, 'cross', 20, '文學全庫', 15,            420, 0, '全創意');

export const CURRICULUM = C;
export const LEVEL_COUNT = C.length; // = 100

export const charLen = t => [...t].length;
export const isChengyu = p => p.type === '成語';

const LIT_TYPES = ['漢賦', '古詩十九首', '樂府詩', '新樂府詩', '唐詩', '宋詞', '元曲', '章回小說'];

/** 內容池成員判定（SCHEMA v3：成語·常用／成語·進階／諺語俗語／混合／全庫；v4：五大文學池） */
export function inPool(p, pool) {
  switch (pool) {
    case '成語常用': return p.type === '成語' && p.level === '常用';
    case '成語進階': return p.type === '成語' && p.level === '進階';
    case '諺語俗語': return p.type === '諺語' || p.type === '俗語';
    case '混合':     return p.type === '成語' || p.type === '諺語' || p.type === '俗語';
    case '全庫':     return p.type === '成語' || p.type === '諺語' || p.type === '俗語';
    case '漢賦十九首': return p.type === '漢賦' || p.type === '古詩十九首';
    case '樂府新樂府': return p.type === '樂府詩' || p.type === '新樂府詩';
    case '唐詩':       return p.type === '唐詩';
    case '宋詞元曲':   return p.type === '宋詞' || p.type === '元曲';
    case '章回小說':   return p.type === '章回小說';
    case '文學全庫':   return LIT_TYPES.includes(p.type);
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
