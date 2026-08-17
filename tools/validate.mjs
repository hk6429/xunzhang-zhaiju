#!/usr/bin/env node
/**
 * 尋章摘句 — 關卡硬性驗證 v2
 *
 * 用法：node tools/validate.mjs <phrases.json路徑> <levels.json路徑>
 *
 * v2 增驗：
 * - phrases：clues ≥3、必含一則「釋義」、style 枚舉、線索硬規則
 *  （不含完整成語、不含成語任兩相鄰字連用）、無簡體。
 * - levels：layout 枚舉＋第一章配置；full 維持 v1 全部檢查；
 *   cross：非 null 格皆屬目標路徑、依 start/dir 讀出===成語、交叉格字元一致、
 *   revealed 恰等於被 2+ 目標共用的格集合、每詞至少交叉一次且整體連通、
 *   交叉必為 E 詞交 S 詞、clueIndex 有效。
 *
 * 任一違規：非零 exit code＋列出每一條違規明細；全過：印出摘要統計。
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LEVEL_CONFIG = [
  { layout: 'full',  size: 5, targets: 3 },
  { layout: 'full',  size: 5, targets: 3 },
  { layout: 'full',  size: 5, targets: 4 },
  { layout: 'full',  size: 5, targets: 4 },
  { layout: 'full',  size: 5, targets: 4 },
  { layout: 'cross', size: 7, targets: 4 },
  { layout: 'cross', size: 7, targets: 4 },
  { layout: 'cross', size: 8, targets: 5 },
  { layout: 'cross', size: 8, targets: 5 },
  { layout: 'cross', size: 8, targets: 5 },
];
const LEVEL_COUNT = LEVEL_CONFIG.length;
const CLUE_STYLES = new Set(['釋義', '急轉彎', '典故', '諧音', '情境']);

// 常見簡體字元黑名單（僅收與繁體字形不同的簡化字）
const SIMPLIFIED_RE = /[万与专业丛东丝两严个临为丽举义乐书买乱亏亚产亲亿仅从仑仓们价众优会伞伟传伤体余佣侠侣侧侨俭债倾偿儿兰关兴养兽内冈写军农冲决况净凑凤凭刘则刚创删别剧劝办务动励劳势医华协单卖占卫厂厅历厉压厌县发变叙后吓吗听启员响哑唤啸国图圆圣场坏块坚坛垒垫壶处备复够头夸夺奋奖妆妇妈娄娱婶学宁宝实审宪宫对导寻将尔尘尝尽层岁岛币师带帮干开异张弹归当录彻径徽忆忧怀态总恋恳恶悬惊惧惨惩愿慑懒戏战户扑执扩扫扬扰抚抛拟拢拣拥挂挚挥损换据捣掷摄摆摊敌数斋斗断无旧时显晓暂书术机杀杂权条来杨极构枢标栏树样桥检楼欢欧歼归残杀毁气汇汉污汤沟没泞泪泼泽洁浊测济浏涂涛润涨渐渔湾溃满滚滞漏潜灭灯灵灾炀点炼烁烂烦烧热爱爷牍牵犊状犹独狈狮狱猎猫献玛环现琼疗疟疡疯痒盖盘卢眍着睁瞒矫矶础矿码砖硕确离种积称笔笋筑筛简箩类粜粪紧絷纠红纤约级纪纫纬纯纱纲纳纵纷纸纹纺线练组绅细织终绍经绑绒结绕绘给络绝绞统绣继绩绪续绳维绵综缄缅缆缉缎缓缔缕编缘缚缝缠缩缴缸罚罢罗羁翘耻聂聋职联聪肃肠肤肿胀胁胆脉脏脑脱脸腊舆舰舱艰节芜苏苹范茎荐荡荣药莲获莹营萧蒙蓝蔷蕴薮虏虑虚虫蚀蚁蚂蜗蝇蝉衅补装裆裤见观规视览觉誉计订认讥讨让训议讯记讲许论讼讽设访诀证评识诉词译试诗诚话诞询该详语误说诵请诸读课谁调谈谊谋谐谓谜谢谣谦谨谬谭谱谴贝贞负贡财责贤败货质贩贪贫购贮贯贱贴贵贷贸费贺贼贾资赋赌赏赐赔赖赚赛赞赠赢赵趋践跃踊车轧轨转轮软轻载较辅辆辈辉辞辩辫边辽达迁过迈运还这进远违连迟适选逊递逻遗邓邮邻郑鉴钉针钓钟钢钥钦钱钻铁铃铅铜铝银铸铺链销锁锄锅锋错锦锻镇镜长门闪闭问闯闲间闷闸闹闻阀阁阅队阳阴阵阶际陆陈险随隐隶难雏雾韩页顶顷项顺须顽顾顿颁颂预颅领颇频颖颗题颜额风飘飞饥饭饮饰饱饲饶馆马驰驱驳驶驹驻驾骂骄骆验骏骑骗骚骤骨髅魇鱼鲁鲜鸟鸡鸣鸦鸿鹃鹅鹊鹰麦黄龄齐龙龟]/;

const CJK_SINGLE_RE = /^[㐀-䶿一-鿿豈-﫿]$/u;

function gridLines(grid) {
  const e = grid.map(row => row.join(''));
  const s = [];
  for (let c = 0; c < grid[0].length; c++) s.push(grid.map(r => r[c]).join(''));
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
function pathCells(start, dir, len) {
  const cells = [];
  for (let i = 0; i < len; i++) {
    cells.push(dir === 'E' ? [start[0], start[1] + i] : [start[0] + i, start[1]]);
  }
  return cells;
}

function main() {
  const [phrasesPath, levelsPath] = process.argv.slice(2);
  if (!phrasesPath || !levelsPath) {
    console.error('用法：node tools/validate.mjs <phrases.json路徑> <levels.json路徑>');
    process.exit(2);
  }
  const violations = [];
  const V = msg => violations.push(msg);

  const phrases = JSON.parse(readFileSync(phrasesPath, 'utf8'));
  const levelsDoc = JSON.parse(readFileSync(levelsPath, 'utf8'));
  const blacklistPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'blacklist.json');
  const blacklist = JSON.parse(readFileSync(blacklistPath, 'utf8'));

  // ---------- phrases schema ----------
  if (!Array.isArray(phrases)) {
    console.error('違規：phrases.json 根節點必須是陣列');
    process.exit(1);
  }
  const REQUIRED = ['id', 'text', 'type', 'level', 'source', 'meaning', 'insight'];
  const seenIds = new Set();
  const seenTexts = new Set();
  for (const [i, p] of phrases.entries()) {
    const tag = `phrases[${i}]（${p?.id ?? '?'}）`;
    for (const k of REQUIRED) {
      if (p[k] === undefined || p[k] === null || p[k] === '') V(`${tag}：缺必填欄位 ${k}`);
    }
    if (!/^p\d{4}$/.test(p.id ?? '')) V(`${tag}：id 格式錯誤（須 p+四位數字）`);
    if (seenIds.has(p.id)) V(`${tag}：id 重複`);
    seenIds.add(p.id);
    if (typeof p.text === 'string') {
      if ([...p.text].length !== 4) V(`${tag}：text「${p.text}」不是四字`);
      if (seenTexts.has(p.text)) V(`${tag}：text「${p.text}」重複`);
      seenTexts.add(p.text);
      const m = p.text.match(SIMPLIFIED_RE);
      if (m) V(`${tag}：text「${p.text}」含簡體字「${m[0]}」`);
    }
    for (const field of ['meaning', 'insight', 'source']) {
      if (typeof p[field] === 'string') {
        const m = p[field].match(SIMPLIFIED_RE);
        if (m) V(`${tag}：${field} 含簡體字「${m[0]}」`);
      }
    }

    // ----- v2：clues -----
    if (!Array.isArray(p.clues) || p.clues.length < 3) {
      V(`${tag}：clues 須為至少 3 則的陣列（現為 ${Array.isArray(p.clues) ? p.clues.length : typeof p.clues}）`);
      continue;
    }
    if (!p.clues.some(c => c?.style === '釋義')) V(`${tag}：clues 缺少「釋義」型線索`);
    const chars = typeof p.text === 'string' ? [...p.text] : [];
    const bigrams = chars.slice(0, -1).map((ch, k) => ch + chars[k + 1]);
    for (const [j, c] of p.clues.entries()) {
      const ctag = `${tag} clues[${j}]`;
      if (!c || typeof c.text !== 'string' || c.text === '') { V(`${ctag}：缺 text`); continue; }
      if (!CLUE_STYLES.has(c.style)) V(`${ctag}：style「${c.style}」不在枚舉內`);
      const m = c.text.match(SIMPLIFIED_RE);
      if (m) V(`${ctag}：含簡體字「${m[0]}」`);
      if (typeof p.text === 'string' && c.text.includes(p.text)) V(`${ctag}：含完整成語「${p.text}」`);
      for (const bg of bigrams) {
        if (c.text.includes(bg)) V(`${ctag}：含成語相鄰兩字「${bg}」`);
      }
    }
  }
  // id 連號檢查
  const nums = phrases.map(p => parseInt(String(p.id).slice(1), 10)).filter(Number.isFinite).sort((a, b) => a - b);
  for (let i = 0; i < nums.length; i++) {
    if (nums[i] !== nums[0] + i) { V(`phrases id 不連號：在 p${String(nums[0] + i).padStart(4, '0')} 處斷號`); break; }
  }

  // ---------- levels schema ----------
  const byId = new Map(phrases.map(p => [p.id, p]));
  const allTexts = phrases.map(p => p.text);
  const levels = levelsDoc?.levels;
  if (!Array.isArray(levels)) {
    console.error('違規：levels.json 須有 levels 陣列');
    process.exit(1);
  }
  if (levels.length !== LEVEL_COUNT) V(`關數=${levels.length}，須為 ${LEVEL_COUNT}`);

  for (const lv of levels) {
    const tag = `第 ${lv.id} 關`;
    const cfg = LEVEL_CONFIG[lv.id - 1];
    if (!cfg) { V(`${tag}：id 超出第一章範圍（1–${LEVEL_COUNT}）`); continue; }
    if (!['full', 'cross'].includes(lv.layout)) { V(`${tag}：layout「${lv.layout}」不在枚舉 full/cross`); continue; }
    if (lv.layout !== cfg.layout) V(`${tag}：layout=${lv.layout}，第一章配置須為 ${cfg.layout}`);
    if (lv.size !== cfg.size) V(`${tag}：size=${lv.size}，須為 ${cfg.size}`);
    if (lv.targetDisplay !== 'clue') V(`${tag}：targetDisplay=${lv.targetDisplay}，v2 須為 "clue"`);
    const targets = lv.targets ?? [];
    if (targets.length !== cfg.targets) V(`${tag}：目標數=${targets.length}，須為 ${cfg.targets}`);

    const size = cfg.size;
    if (!Array.isArray(lv.grid) || lv.grid.length !== size ||
        lv.grid.some(row => !Array.isArray(row) || row.length !== size)) {
      V(`${tag}：grid 尺寸錯誤（須 ${size}×${size}）`);
      continue;
    }

    // 共通：target 基本檢查（phraseId、clueIndex、同關不重複）
    const seenPhrase = new Set();
    let targetsOk = true;
    for (const [ti, t] of targets.entries()) {
      const p = byId.get(t.phraseId);
      if (!p) { V(`${tag}：targets[${ti}] phraseId=${t.phraseId} 不存在於語料`); targetsOk = false; continue; }
      if (seenPhrase.has(t.phraseId)) V(`${tag}：targets[${ti}] phraseId=${t.phraseId} 同關重複`);
      seenPhrase.add(t.phraseId);
      if (!Number.isInteger(t.clueIndex) || t.clueIndex < 0 || t.clueIndex >= (p.clues?.length ?? 0)) {
        V(`${tag}：targets[${ti}]（${p.text}）clueIndex=${t.clueIndex} 無效（clues 共 ${p.clues?.length ?? 0} 則）`);
      }
    }
    if (!targetsOk) continue;

    if (lv.layout === 'full') {
      // ----- full：v1 全部檢查 -----
      let gridOk = true;
      lv.grid.forEach((row, r) => row.forEach((cell, c) => {
        if (typeof cell !== 'string' || !CJK_SINGLE_RE.test(cell)) {
          V(`${tag}：grid[${r}][${c}]=「${cell}」不是單一中文字`);
          gridOk = false;
        } else if (SIMPLIFIED_RE.test(cell)) {
          V(`${tag}：grid[${r}][${c}]=「${cell}」是簡體字`);
        }
      }));
      if (!gridOk) continue;
      if (lv.revealed !== undefined) V(`${tag}：full 關不得有 revealed 欄位`);

      const { e, s } = gridLines(lv.grid);
      const es = [...e, ...s];
      const wn = [...e.map(l => [...l].reverse().join('')), ...s.map(l => [...l].reverse().join(''))];
      const targetTexts = new Set();

      for (const t of targets) {
        const p = byId.get(t.phraseId);
        targetTexts.add(p.text);
        const cells = pathCells(t.start, t.dir, [...p.text].length);
        if (cells.some(([r, c]) => r < 0 || r >= size || c < 0 || c >= size)) {
          V(`${tag}：${t.phraseId} 路徑超出盤面（start=[${t.start}], dir=${t.dir}）`);
          continue;
        }
        const read = cells.map(([r, c]) => lv.grid[r][c]).join('');
        if (read !== p.text) V(`${tag}：${t.phraseId} 依 start/dir 讀出「${read}」≠「${p.text}」`);
        const n = countSub(es, p.text);
        if (n !== 1) V(`${tag}：目標「${p.text}」在 E∪S 出現 ${n} 次（須恰好 1 次）`);
      }
      for (const text of allTexts) {
        if (targetTexts.has(text)) continue;
        const n = countSub(es, text);
        if (n > 0) V(`${tag}：非目標語料「${text}」意外出現 ${n} 次`);
      }
      for (const w of blacklist) {
        const n = countSub(es, w) + countSub(wn, w);
        if (n > 0) V(`${tag}：黑名單詞「${w}」出現 ${n} 次（含 W/N 反向）`);
      }
    } else {
      // ----- cross：v2 檢查 -----
      let gridOk = true;
      lv.grid.forEach((row, r) => row.forEach((cell, c) => {
        if (cell === null) return;
        if (typeof cell !== 'string' || !CJK_SINGLE_RE.test(cell)) {
          V(`${tag}：grid[${r}][${c}]=「${cell}」須為 null 或單一中文字`);
          gridOk = false;
        } else if (SIMPLIFIED_RE.test(cell)) {
          V(`${tag}：grid[${r}][${c}]=「${cell}」是簡體字`);
        }
      }));
      if (!gridOk) continue;

      // 每目標路徑：界內、讀出===成語；建 owner map
      const owners = new Map(); // 'r,c' -> [{ti, dir, ch}]
      let pathsOk = true;
      for (const [ti, t] of targets.entries()) {
        const p = byId.get(t.phraseId);
        const chars = [...p.text];
        const cells = pathCells(t.start, t.dir, chars.length);
        if (cells.some(([r, c]) => r < 0 || r >= size || c < 0 || c >= size)) {
          V(`${tag}：${t.phraseId} 路徑超出盤面（start=[${t.start}], dir=${t.dir}）`);
          pathsOk = false;
          continue;
        }
        const read = cells.map(([r, c]) => lv.grid[r][c] ?? '□').join('');
        if (read !== p.text) V(`${tag}：${t.phraseId} 依 start/dir 讀出「${read}」≠「${p.text}」`);
        cells.forEach(([r, c], i) => {
          const k = `${r},${c}`;
          if (!owners.has(k)) owners.set(k, []);
          owners.get(k).push({ ti, dir: t.dir, ch: chars[i] });
        });
      }
      if (!pathsOk) continue;

      // 非 null 格皆屬某目標路徑
      lv.grid.forEach((row, r) => row.forEach((cell, c) => {
        if (cell !== null && !owners.has(`${r},${c}`)) {
          V(`${tag}：grid[${r}][${c}]=「${cell}」不屬於任何目標路徑（cross 不得有干擾字）`);
        }
      }));

      // 交叉格：字元一致＋須為 E 詞交 S 詞；收集交叉格集合
      const crossingKeys = new Set();
      for (const [k, list] of owners) {
        if (list.length < 2) continue;
        crossingKeys.add(k);
        const chs = new Set(list.map(o => o.ch));
        if (chs.size > 1) V(`${tag}：交叉格 [${k}] 兩詞字元不一致（${[...chs].join('／')}）`);
        const dirs = new Set(list.map(o => o.dir));
        if (dirs.size < 2) V(`${tag}：交叉格 [${k}] 共用的詞方向相同（須 E 詞交 S 詞）`);
      }

      // revealed 恰等於交叉格集合
      if (!Array.isArray(lv.revealed) ||
          lv.revealed.some(x => !Array.isArray(x) || x.length !== 2 || !x.every(Number.isInteger))) {
        V(`${tag}：cross 關 revealed 須為 [row,col] 陣列`);
      } else {
        const revealedKeys = new Set(lv.revealed.map(([r, c]) => `${r},${c}`));
        if (revealedKeys.size !== lv.revealed.length) V(`${tag}：revealed 有重複座標`);
        for (const k of crossingKeys) {
          if (!revealedKeys.has(k)) V(`${tag}：交叉格 [${k}] 未列入 revealed`);
        }
        for (const k of revealedKeys) {
          if (!crossingKeys.has(k)) V(`${tag}：revealed [${k}] 不是交叉格（revealed 須恰等於交叉格集合）`);
        }
      }

      // 每詞至少交叉一次＋整體連通
      const adj = targets.map(() => new Set());
      for (const list of owners.values()) {
        if (list.length < 2) continue;
        for (const a of list) for (const b of list) if (a.ti !== b.ti) adj[a.ti].add(b.ti);
      }
      for (const [ti, t] of targets.entries()) {
        if (adj[ti].size === 0) V(`${tag}：${t.phraseId} 未與任何詞交叉`);
      }
      if (targets.length > 0) {
        const seen = new Set([0]);
        const stack = [0];
        while (stack.length) {
          for (const nb of adj[stack.pop()]) {
            if (!seen.has(nb)) { seen.add(nb); stack.push(nb); }
          }
        }
        if (seen.size !== targets.length) {
          V(`${tag}：詞網不連通（連通 ${seen.size}/${targets.length} 詞）`);
        }
      }
    }
  }

  if (violations.length > 0) {
    console.error(`驗證失敗，共 ${violations.length} 條違規：`);
    for (const v of violations) console.error(`  - ${v}`);
    process.exit(1);
  }

  const totalTargets = levels.reduce((n, l) => n + (l.targets?.length ?? 0), 0);
  const uniqueTargets = new Set(levels.flatMap(l => (l.targets ?? []).map(t => t.phraseId)));
  const fullN = levels.filter(l => l.layout === 'full').length;
  const crossN = levels.filter(l => l.layout === 'cross').length;
  console.log('驗證全數通過 ✔');
  console.log(`摘要：語料 ${phrases.length} 條（clues 共 ${phrases.reduce((n, p) => n + p.clues.length, 0)} 則）；` +
    `關卡 ${levels.length} 關（full ${fullN}／cross ${crossN}）；目標 ${totalTargets} 個（不重複 ${uniqueTargets.size} 條）；黑名單 ${blacklist.length} 詞掃描無命中`);
}

main();
