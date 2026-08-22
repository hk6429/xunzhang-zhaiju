// js/treasure-passives.js — 集齊十片碎片的法寶會給一個「持續生效」的被動。
// 刻意只碰不影響經濟與星等的維度：時間、連擊門檻、複習名額。
// 墨水仍然只能靠答對研墨題賺（SCHEMA 鐵律），法寶不發墨、不代打、不送星。

export const TREASURE_PASSIVES = {
  zhenzhi_shard: { name: '青玉鎮紙', effect: 'extraTimeSec', value: 15, desc: '壓得住浮躁的筆：每關多 15 秒。' },
  zhuxianjian_shard: { name: '誅仙古劍', effect: 'extraTimeSec', value: 20, desc: '劍鞘鎮陣：每關再多 20 秒。' },
  dashanbian_shard: { name: '打神鞭', effect: 'comboThreshold', value: 1, desc: '號令諸神：連擊提前一級亮起。' },
  qiankunquan_shard: { name: '乾坤圈', effect: 'comboThreshold', value: 1, desc: '擲出如流星：連擊再提前一級。' },
  'chengxin-zhi_shard': { name: '澄心堂紙', effect: 'reviewSlots', value: 3, desc: '紙夠寬：每日複習名額 +3 句。' },
  'tinggui-mo_shard': { name: '廷珪墨', effect: 'reviewSlots', value: 2, desc: '墨夠濃：每日複習名額再 +2 句。' },
  // 原本這四件是純裝飾——四章四十關的收集成果換來一句沒有作用的敘述。
  sanjianliangren_shard: { name: '三尖兩刃刀', effect: 'secondChance', value: 1, desc: '鋒銳無匹：研墨選擇題多一次「刪去一個錯的」機會。' },
  yinhundeng_shard: { name: '引魂燈', effect: 'clueExtra', value: 1, desc: '照徹迷局：每關可多看一則線索卡。' },
  'zihao-bi_shard': { name: '宣州紫毫', effect: 'secondChance', value: 1, desc: '筆鋒聽話：研墨選擇題再多一次補救機會。' },
  'duanxi-yan_shard': { name: '端溪硯', effect: 'clueExtra', value: 1, desc: '硯池映文脈：每關再多一則線索卡。' },
};

/** 只有集滿 maxFragments 的法寶才算數；回傳累加後的被動總表 */
export function treasurePassives(retention = {}) {
  const out = { extraTimeSec: 0, comboThreshold: 0, reviewSlots: 0, secondChance: 0, clueExtra: 0, owned: [] };
  const store = retention.treasures || {};
  for (const [id, passive] of Object.entries(TREASURE_PASSIVES)) {
    const item = store[id];
    if (!item) continue;
    const max = item.maxFragments || 10;
    if ((item.sources?.length || 0) < max) continue;
    out[passive.effect] += passive.value;
    out.owned.push({ id, ...passive });
  }
  return out;
}
