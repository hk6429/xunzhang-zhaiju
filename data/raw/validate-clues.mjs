import fs from 'node:fs';

const p = JSON.parse(fs.readFileSync(new URL('../phrases.json', import.meta.url)));
const STYLES = new Set(['釋義', '急轉彎', '典故', '諧音', '情境']);
// 常見簡體字快速偵測（非窮舉，抓明顯誤用）
const SIMPLIFIED = '国学会这来为个门儿两万点区实开关没说话时间发现应对没头体验专门题问动图书业产万东买卖车软广变义气乐从';

let errors = [];
let okCount = 0;

for (const item of p) {
  const id = item.id;
  const text = item.text;
  if (!Array.isArray(item.clues)) { errors.push(`${id}: 缺少 clues`); continue; }
  if (item.clues.length < 3) errors.push(`${id}: clues 少於 3 則 (${item.clues.length})`);
  const hasMeaning = item.clues.some(c => c.style === '釋義');
  if (!hasMeaning) errors.push(`${id}: 缺少「釋義」style`);
  const creativeCount = item.clues.filter(c => c.style !== '釋義').length;
  if (creativeCount < 2) errors.push(`${id}: 創意型少於 2 則`);

  // forbidden substrings: 全成語 + 相鄰兩字
  const forbidden = [text];
  for (let i = 0; i < text.length - 1; i++) forbidden.push(text.slice(i, i + 2));

  for (const [idx, c] of item.clues.entries()) {
    if (!STYLES.has(c.style)) errors.push(`${id}[${idx}]: style 不在枚舉內 "${c.style}"`);
    if (typeof c.text !== 'string' || !c.text.trim()) errors.push(`${id}[${idx}]: text 為空`);
    if (c.text && c.text.length > 45) errors.push(`${id}[${idx}]: 超過45字 (${c.text.length}) "${c.text}"`);
    for (const f of forbidden) {
      if (c.text && c.text.includes(f)) errors.push(`${id}[${idx}]: 含禁用字串「${f}」-> "${c.text}"`);
    }
    if (c.text) {
      for (const ch of SIMPLIFIED) {
        if (c.text.includes(ch)) errors.push(`${id}[${idx}]: 疑似簡體字「${ch}」-> "${c.text}"`);
      }
    }
  }
  okCount++;
}

console.log(`檢查 ${okCount} 條`);
if (errors.length) {
  console.log(`發現 ${errors.length} 個問題:`);
  for (const e of errors) console.log(' - ' + e);
  process.exit(1);
} else {
  console.log('全部通過');
}
